# Tender Evaluation AI Blueprint V0.2

Date: 2026-05-11
Status: Planning record, foundation slice partially implemented

## Purpose

This plan captures the agreed tender evaluation AI design before implementation starts.
It should be treated as the working blueprint for the first build pass and as the source of truth if conversation context is compacted.

The goal is to build a tender-specific AI evaluation pipeline that starts after tender documents are attached to an evaluation. V1 focuses on:

- Full tender package ingestion.
- Price evaluation.
- Adds and Subs.
- Value Management.
- Clarification generation and responses.
- Recommendation state.
- TRR linkage.
- Explicit cost plan push after award.

Non-price comparative scoring remains compatible but is not part of the first AI build slice.

## Core Principles

- Minimum new schema, maximum commercial value.
- V1 is tender-specific, not a general project-wide planning agent.
- The database stores canonical product state only.
- Large AI material stays outside core SQL as linked artefacts.
- Refresh Evaluation updates evaluation data, not TRR prose.
- TRR generation remains a separate user action.
- Awarding a firm and pushing values to the cost plan are separate actions.
- The AI can update AI-created unlocked rows, but it cannot delete or directly edit user-created rows.
- Row locking is row-level only for V1.

## Current Repo Anchors

Current tender evaluation data lives around:

- `src/lib/db/pg-schema.ts`: `evaluation_price`, `evaluations`, `tender_submissions`, `evaluation_rows`, `evaluation_cells`, `trr`.
- `src/components/evaluation/EvaluationPriceTab.tsx`: current price page with Initial Price and Adds and Subs tables.
- `src/components/evaluation/EvaluationSheet.tsx`: shared row/cell grid.
- `src/app/api/evaluation/[projectId]/[contextType]/[contextId]/route.ts`: fetch and update evaluation data.
- `src/app/api/firms/award/route.ts`: currently awards firms and silently updates cost lines.
- `src/app/api/trr/[id]/generate/route.ts`: current TRR generation.
- `src/components/procurement/ProcurementWorkflowLayout.tsx`: procurement section navigation.

## V1 Domain Model

### Evaluation

The overall procurement evaluation for a stakeholder discipline or trade package.

### Evaluation Price Instance

The numbered price comparison instance already represented by `evaluation_price`.
Avoid calling this a UI tab in implementation docs where possible, because "tab" is overloaded.

### Tender Submission Package

One package per tenderer per evaluation. This represents the tenderer response as a package, not a single PDF.

### Tender Submission File

An attached document/version/file asset inside a tenderer package.
V1 must support multiple files per tenderer because real submissions may include a main submission, price schedule, methodology, programme, returnable schedules, acknowledgements, and later clarification response material.

### Full Ingestion Artefact

Reusable full extracted text tied to an immutable file asset.

### Package Interpretation Artefact

AI-owned package-level interpretation tied to the tenderer package. It is not user-edited.
User edits happen in visible outputs such as rows, cells, clarifications, VM, and TRR prose.

### Evaluation Rows and Cells

Visible commercial comparison tables.

### Clarification Item

A structured 1:1 procurement question and response record.

### TRR

Tender Recommendation Report prose generated from the latest evaluation state.
The existing UI has numbered TRR records using `trr.trrNumber`; there is no separate TRR tab table.

## Schema Direction

Do not hard-replace `tender_submissions` in one move. Evolve it.

Recommended V1 shape:

- Add `tender_submission_packages`.
- Retain and evolve `tender_submissions` into the package file / parse record.
- Extend `evaluation_rows`.
- Extend `evaluation_cells`.
- Add clarification tables.
- Add thin AI artefact pointer rows if needed.
- Store large artefacts through the existing storage abstraction rather than giant JSON/text columns.

## Evaluation Row Extensions

`evaluation_rows.tableType` already exists. V1 should treat this as a value migration/backfill rather than a new column.

Allowed table types:

- `initial_price`
- `adds_subs`
- `value_management`

Candidate new or rationalised fields:

- `aiStableKey`
- `isLocked`
- `category`
- `sourceDocumentId`
- `sourceFileAssetId`
- `vmAdoptionStatus`: `adopted`, `tbd`, `not_adopted`
- `vmEmbeddedInBase`: boolean
- `vmOrigin`: `tenderer_proposed`, `pm_client_proposed`, `ai_identified`, `tender_wide_option`

The existing `source` field should be rationalised rather than adding a third synonym for authorship.
Align values with the broader `actionInvocations.actorKind` model where appropriate.

Recommended row/cell source values:

- `manual`
- `ai`
- `cost_plan`
- `system`

## Evaluation Cell Extensions

Cells need richer states than numeric amount only.

Allowed `valueType` values:

- `amount`
- `included`
- `assumed_included`
- `excluded`
- `tbc`
- `na`
- `blank`

`amountCents` should remain the amount field for `amount` cells.
For V1, all commercial amounts are AUD cents, ex-GST.
If GST basis is unclear, raise a clarification rather than trying to infer GST.

## Value Management

VM is a third table type using the existing evaluation row/cell grid, not a standalone table.

Rules:

- VM appears below Adds and Subs.
- VM rows have adoption status: Adopted, TBD, Not adopted.
- New AI-created VM rows default to TBD.
- VM total includes only adopted items.
- Embedded-in-base VM does not contribute to the VM total.
- Adopted non-embedded VM can contribute to award basis where selected.
- Not adopted rows remain visible.
- VM rows are lockable at row level.
- VM items need at least a source file/document reference when AI-created.
- VM appears in a separate TRR section before recommendation.

## Total Formulas

Totals are deterministic. The AI must never author totals.

Comparable tender total:

```text
Initial Price + Adds and Subs
```

VM total:

```text
Adopted VM only, excluding embedded-in-base VM
```

Award basis total:

```text
Comparable tender total + selected adopted non-embedded VM
```

The hard-coded reconciler owns these calculations.

## AI Stable Keys

`aiStableKey` is mandatory for AI-created rows.

Generation rule:

- Generated by server logic, not freehand model text.
- Based on table type, category, normalised commercial issue, affected firm/package scope, and source file ids.
- Not based on description alone, because descriptions may be reworded.

Refresh behaviour:

- Refresh updates AI-created unlocked rows in place where the stable key matches.
- Refresh leaves locked rows unchanged.
- Refresh never deletes or directly edits user-created rows.
- Superseded AI rows are hidden from the visible grid rather than repeatedly recreated.
- Merged rows must retain absorbed stable keys so old AI rows do not reappear after refresh.

Test target:

- A second Refresh Evaluation with unchanged inputs produces no visible row diffs.

## Deterministic Validator

The AI proposes structured changes. The validator applies or rejects them.

Validator checks:

- Schema validity.
- Valid table type and cell value type.
- Row ownership rules.
- Lock rules.
- No AI edits or deletes to user-created rows.
- Every AI-created commercial or clarification item has a source document/file reference.
- Amount cells contain valid numbers.
- Status cells do not accidentally contribute to totals.
- Package pricing arithmetic reconciles where possible.
- VM embedded-in-base rows do not affect VM total.
- Adopted non-embedded VM affects VM total only in the VM/award-basis calculation.
- A no-input-change refresh should be idempotent.

## Tenderer Packages and Ingestion

User-facing rule:

- Refresh Evaluation uses the latest attached tenderer package files.

Behind the scenes:

- Package files reference `documentId`, `versionId`, and `fileAssetId`.
- The system records which file assets were used for evidence and repeatability.
- A changed file can be re-extracted while reusing existing artefacts for unchanged files.
- V1 does not need to expose partial refresh modes.

The AI should not automatically add documents from the repo to a tenderer package.
It may flag likely missing documents for user action.

## AI Artefact Storage

Large AI material should not go into core SQL.

Store through the existing storage abstraction:

- Full text extraction.
- File-level interpretation.
- Package-level interpretation.
- Prompt/retrieval trace.
- Issue snapshot artefacts.

SQL stores only:

- artefact id or pointer
- kind
- hash
- status
- created date
- relationship to file/package/evaluation/action invocation

`tender_submissions.rawExtractedItems` should not become the long-term home for large AI traces.

## Refresh Evaluation Pipeline

Refresh Evaluation is a controlled pipeline, not an open-ended roaming agent.

Steps:

1. Load evaluation and active evaluation price instance.
2. Load issued RFT/addenda basis.
3. Load user-attached tenderer packages.
4. Full-ingest missing package files and chunk/search where needed.
5. Build or refresh AI-owned package interpretations.
6. Generate/update Adds and Subs rows.
7. Generate/update VM rows.
8. Generate/update 1:1 clarification candidates.
9. Update recommendation state.
10. Validate proposed changes.
11. Apply only valid diffs.
12. Record lightweight action/service history.
13. Return a changed-items summary.

## Clarifications

Clarifications get their own Procurement section, inserted before TRR.

Procurement order:

1. Request for Tender
2. Addendum
3. Evaluation Price
4. Evaluation Non-Price
5. Clarifications
6. Tender Recommendation Report

V1 clarification rule:

- Clarifications are 1:1 with one tenderer.
- Remove selected-tenderer clarification bundles from V1.
- Tender-wide ambiguity should become an Addendum candidate, not a multi-party clarification.
- The user chooses whether to promote an issue to Addendum.

Clarification fields:

- evaluation id
- tenderer id
- question text
- category
- materiality
- status: draft, issued, responded, closed
- response text
- response document/file reference
- linked Adds and Subs / VM row ids where relevant
- optional Addendum link if promoted

Clarification response rule:

- The original base tender price stays unchanged.
- Commercial effects flow into Adds and Subs or VM.

## Recommendation State

States:

- Draft
- Conditional
- Final

Transitions:

- Draft to Conditional: unresolved high-materiality clarification exists.
- Conditional to Final: all high-materiality clarifications resolved and user confirms final.
- Final to Draft: new tender file attached, package refreshed, or active evaluation price instance changed.
- Final to Conditional: new high-materiality clarification is raised.

Materiality is AI-suggested and user-editable.

TRR can still be generated with unresolved clarifications, but unresolved material items make the recommendation Conditional.

## TRR Rules

TRR generation is separate from Refresh Evaluation.

Rules:

- Refresh Evaluation updates commercial data only.
- Generate/Update TRR updates report prose.
- TRR uses the latest TRR record by default.
- TRR should use the selected/active `evaluationPriceId`, not first/latest accidentally.
- New TRR should copy latest TRR content and clear `reportDate`.
- `reportDate` is treated as issue date.
- If AI rewrites the latest TRR, clear `reportDate`.
- Material unresolved clarifications flow into the TRR clarifications section automatically.
- User can edit TRR prose freely.

Snapshot model:

- Use A-light for V1.
- On issue date, create a lightweight issue snapshot artefact containing key totals, selected price basis, recommendation state, and source references.
- Do not build a full legal-grade archive system in V1.

## Audit Trail and Service History

No user-facing audit history screen in V1.

AI refreshes should use existing action/service scaffolding where practical:

- `actionInvocations` for the refresh action.
- actor kind/id.
- model id.
- prompt hash.
- input artefact hashes.
- before/after row diffs.
- linked artefact ids.

Heavy traces stay in storage, not SQL.

## Cost Plan Push

Important correction:

- The current award route silently updates cost lines.
- V1 must remove that behaviour before adding the push modal.

Rules:

- Award toggle records the winning firm only.
- Award toggle can still sync firm/company/stakeholder contact details.
- Cost plan values are updated only by explicit `Push Awarded Price to Cost Plan`.
- Button is visible in the Evaluation Price header and disabled until a firm is awarded.
- Push uses the active evaluation price instance.

Push modal:

- Simple flat checklist.
- Groups: Price, Adds and Subs, Adopted VM.
- No tree selector.
- No extra preview screen.
- No description editing in the modal.
- Default: set budget and approved contract to awarded values.
- Pushed rows replace existing cost-plan sub-items for the awarded stakeholder/package.
- Once pushed, cost plan lines are normal editable cost plan lines.

## V1 Deferrals

- General project-schema planner.
- Full non-price AI scoring.
- Selected-tenderer clarification bundles.
- Consortium/JV tenderers.
- Full GST handling beyond ex-GST baseline.
- Cell-level locking.
- Full legal-grade immutable audit archive.
- User-facing evaluation run history.
- Full evidence span/chunk UI.

## Implementation Order

1. Schema migration and backfill plan.
2. Total formula and hard-coded reconciler tests.
3. `aiStableKey` spec and idempotency tests.
4. Validator spec and tests.
5. Tender submission package parent and file attachment flow.
6. AI artefact storage path.
7. Refresh Evaluation pipeline through action/service logging.
8. VM table UI as third `EvaluationSheet`.
9. Clarifications procurement section, 1:1 only.
10. Recommendation state machine.
11. TRR linkage and A-light issue snapshot.
12. Remove silent award-to-cost-plan update.
13. Add explicit cost plan push modal.
14. Real tender dry-run.

## Implementation Checklist

### Completed

- [x] Save this blueprint as a durable repo planning record.
- [x] Add deterministic tender commercial helper module.
- [x] Add tests for comparable totals, VM totals, stable keys, and validator guardrails.
- [x] Extend evaluation types for `value_management`, cell `valueType`, row locks, VM fields, and AI stable keys.
- [x] Extend database schema definition for VM/status/lock/source scaffolding.
- [x] Add SQL migration file for the tender evaluation AI foundation fields.
- [x] Update evaluation cell API to persist `valueType`.
- [x] Allow manual `value_management` rows to be created through the existing row API.
- [x] Add row-level lock/unlock support through the row PATCH API.
- [x] Add `valueManagementRows` to the evaluation hook.
- [x] Add Value Management as a third `EvaluationSheet` in the Evaluation Price UI.
- [x] Replace the old Grand Total display with Comparable Total and Award Basis Total.
- [x] Add row lock controls to the evaluation grid.
- [x] Remove the silent cost-plan update from the award route.
- [x] Update consultant/contractor award toast copy so award no longer claims to record cost-plan values.
- [x] Run focused helper tests.
- [x] Run focused lint check on touched files.
- [x] Apply and verify the new DB migration in the target environment.
- [x] Freeze cost-plan row sync once tender pricing cells exist, so post-award cost-plan pushes do not churn the evaluation comparison.
- [x] Add the `Push Awarded Price to Cost Plan` button in the Evaluation Price header.
- [x] Build the explicit cost-plan push modal with grouped flat checklist: Price, Adds and Subs, Adopted VM.
- [x] Implement cost-plan push API/action to replace awarded stakeholder/package sub-items deliberately.
- [x] Run focused lint and helper tests for the cost-plan push slice.
- [x] Add explicit VM adoption controls: Adopted, TBD, Not adopted.
- [x] Add VM embedded-in-base row control.
- [x] Persist VM adoption and embedded-in-base row changes through the row API.
- [x] Add cell status editing UI for Included, Assumed Included, Excluded, TBC, N/A, and Blank.
- [x] Add deterministic cell input parser for status text, normal amounts, and bracketed negative amounts.
- [x] Add tender submission package parent model.
- [x] Add SQL migration for tender submission packages and backfill existing submissions.
- [x] Link price and non-price parse uploads to tenderer packages while preserving the current drag/drop workflow.
- [x] Route price-ingest AI rows into Price, Adds and Subs, and VM tables instead of defaulting every new row to base price.
- [x] Add parser classification tests for base deliverables, Adds and Subs, and Value Management rows.

### Remaining

- [ ] Add a clearer double-counting warning/help affordance for embedded-in-base VM if needed.
- [ ] Add VM origin metadata controls where needed.
- [ ] Add lightweight source indicator behaviour for AI-created rows beyond the existing AI marker.
- [ ] Evolve `tender_submissions` into package file / parse records.
- [ ] Add package file attachment flow for multiple tenderer files.
- [ ] Add AI artefact storage path for full extraction and package interpretation.
- [ ] Build Refresh Evaluation pipeline shell.
- [ ] Wire Refresh Evaluation through existing action/service history.
- [ ] Add structured AI row proposal application using the deterministic validator.
- [ ] Add idempotency tests for unchanged Refresh Evaluation runs.
- [ ] Add Clarifications section to the Procurement workflow.
- [ ] Add clarification tables and 1:1 clarification UI.
- [ ] Add Addendum candidate path for tender-wide ambiguity.
- [ ] Add recommendation state machine: Draft, Conditional, Final.
- [ ] Update TRR generation to use selected/active `evaluationPriceId`.
- [ ] Update TRR creation so new TRRs copy latest content and clear `reportDate`.
- [ ] Clear `reportDate` when AI rewrites the latest TRR.
- [ ] Add A-light issue snapshot artefact when `reportDate` is set.
- [ ] Run real tender dry-run and review row stability, VM totals, clarification flow, TRR linkage, and cost-plan push.

## First Build Pass

The first implementation pass should avoid the full AI pipeline and start with deterministic foundations:

1. Add total/reconciler helpers and tests.
2. Add stable key helpers and tests.
3. Add validator helpers and tests.
4. Extend types for VM/status/locks without wiring all UI yet.
5. Add VM as a third table in the evaluation UI.
6. Remove silent cost-line update on award.

This creates a reliable landing zone for AI-generated rows before any model output is allowed to mutate tender evaluation data.

## Acceptance Criteria For V1

- Refresh Evaluation creates stable AI rows.
- Re-running with unchanged inputs produces no visible row churn.
- User-created rows are not deleted or directly edited by AI.
- Locked rows are not changed by AI.
- VM totals do not double count embedded-in-base VM.
- Clarifications are 1:1 only.
- Tender-wide ambiguity routes to Addendum candidate.
- TRR generation uses the selected evaluation price instance.
- Setting or changing issue date creates/updates lightweight issue snapshot artefact.
- Award no longer updates cost plan silently.
- Cost plan updates only through explicit push action.
