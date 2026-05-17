# Tender Evaluation AI — Remaining V1 Slice PRD

Date: 2026-05-12
Status: PRD draft, references blueprint `docs/plans/2026-05-11-tender-evaluation-ai-blueprint.md`
Scope: The Remaining checklist items in the blueprint, plus the dry-run validation step.

## Problem Statement

Client-side architects and procurement leads running tender evaluations in Sitewise have a deterministic foundation — VM as a third table type, status cells, row locks, AI stable keys, the validator, cost-plan push, and price-ingest classification all exist. What they do not yet have is the AI pipeline that those foundations were built to land. They cannot press one button to re-run the AI against the current tenderer package and trust that the comparison will refresh without churning user-edited rows. They cannot capture procurement clarifications inside the workflow next to the evaluation — clarifications still live in email and side notes. They cannot see at a glance whether their recommendation is Draft, Conditional, or Final, and the TRR can drift from the evaluation price instance the user actually selected. Each refresh, each clarification, each TRR issue date sets up another reconciliation step the user has to do by hand.

## Solution

Build the rest of the V1 tender evaluation AI slice on top of the deterministic foundation already in the repo:

- Restructure tender submissions into Tender Submission Packages with multiple Tender Submission Files per tenderer.
- Add an AI artefact storage path so full extractions and package-level interpretations live outside core SQL.
- Build a Refresh Evaluation pipeline that runs the controlled 12-step flow, proposes structured row mutations, runs them through the existing deterministic validator, applies only valid diffs, and logs the run through `action_invocations`.
- Add a Clarifications section to the procurement workflow, between Evaluation Non-Price and Tender Recommendation Report, with 1:1 clarification records, materiality, and an Addendum candidate path for tender-wide ambiguity.
- Add a Recommendation State Machine with Draft / Conditional / Final and the transitions the blueprint defines.
- Wire TRR generation and creation to the active Evaluation Price Instance, copy latest TRR content into new TRRs with `reportDate` cleared, and clear `reportDate` when AI rewrites the latest TRR.
- On TRR issue date, build a lightweight A-light Issue Snapshot Artefact capturing key totals, selected price basis, recommendation state, and source references.
- Add small VM polish: embedded-in-base double-counting warning, VM origin metadata controls, and an AI-source indicator beyond the existing marker.
- Validate the whole slice with a real tender dry-run.

The user-facing pitch is a single Refresh Evaluation button that the user can press repeatedly without fear, a Clarifications section that lives where the work happens, and a Recommendation that reflects reality.

## User Stories

1. As an architect running a tender, I want one Refresh Evaluation button so that I can update the comparison without manually rebuilding rows.
2. As an architect, I want a Refresh that uses the latest attached tenderer package files, so that I do not have to think about which file version is active.
3. As an architect, I want re-running Refresh Evaluation with no new uploads to produce no visible row diffs, so that I can re-run it freely without churn.
4. As an architect, I want Refresh Evaluation never to touch rows I created or edited, so that my judgment is preserved through every AI pass.
5. As an architect, I want Refresh Evaluation never to touch locked rows, so that locking is a real safety mechanism.
6. As an architect, I want each AI-created row to keep its `aiStableKey` across refreshes, so that updates land in the same row rather than as duplicates.
7. As an architect, I want AI rows that no longer apply to disappear from the visible grid rather than be recreated next time, so that the comparison stays clean.
8. As an architect, I want every AI-created commercial item to be linked to a source document or file asset, so that I can audit where it came from.
9. As an architect, I want a Tender Submission Package per tenderer per evaluation, so that I can collect a tenderer's response as a package and not as a single PDF.
10. As an architect, I want to attach multiple files to a tenderer package (main submission, price schedule, methodology, programme, returnable schedules, clarification responses), so that the AI can interpret the whole submission.
11. As an architect, I want to add or replace tenderer files without re-running unchanged work, so that re-extraction is reused when the file asset has not changed.
12. As an architect, I want large AI artefacts (full extractions, package interpretations, prompt traces) to live in storage with pointers in SQL, so that the database stays small and queryable.
13. As an architect, I want a Clarifications section in the procurement workflow between Evaluation Non-Price and TRR, so that I can manage clarifications next to the evaluation.
14. As an architect, I want each Clarification Item to belong to one tenderer (1:1), so that the workflow matches real procurement practice and avoids leaky multi-party clarifications.
15. As an architect, I want each clarification to record question text, category, materiality, status (draft, issued, responded, closed), response text, response file reference, and links to any related Adds and Subs or VM rows, so that the record stands on its own.
16. As an architect, I want to promote a clarification to an Addendum candidate when the issue is tender-wide, so that I do not abuse clarifications as a quiet RFI broadcast.
17. As an architect, I want the original base tender price to stay unchanged after a clarification, with commercial effects flowing only into Adds and Subs or VM rows, so that the comparison stays stable.
18. As an architect, I want the recommendation state to show as Draft, Conditional, or Final, so that I can see at a glance whether the recommendation is safe to issue.
19. As an architect, I want Draft to move to Conditional when an unresolved high-materiality clarification exists, so that the system enforces what I would otherwise track by hand.
20. As an architect, I want Conditional to move to Final once high-materiality clarifications are resolved and I confirm, so that going Final is a deliberate act.
21. As an architect, I want Final to drop back to Draft when a new tender file is attached, the package is refreshed, or the active Evaluation Price Instance changes, so that stale Final recommendations cannot survive new inputs.
22. As an architect, I want Final to drop to Conditional if a new high-materiality clarification is raised, so that the state stays honest.
23. As an architect, I want materiality to be AI-suggested and user-editable, so that I keep the final call.
24. As an architect, I want TRR generation to use the selected/active Evaluation Price Instance, so that the prose I generate matches the price comparison I am looking at.
25. As an architect, I want a new TRR to copy the latest TRR's prose and clear `reportDate`, so that I can iterate without losing context.
26. As an architect, I want `reportDate` to be cleared automatically when AI rewrites the latest TRR, so that prose drift does not silently inherit the old issue date.
27. As an architect, I want unresolved material clarifications to flow into the TRR clarifications section automatically, so that I do not have to copy them by hand.
28. As an architect, I want to set or change a TRR `reportDate` and have a lightweight issue snapshot created or updated, capturing key totals, selected price basis, recommendation state, and source references, so that I have a reproducible record of what the report meant on the day it was issued.
29. As an architect, I want the issue snapshot to be lightweight (A-light), not a full legal-grade archive, so that V1 ships.
30. As an architect, I want a clear double-counting warning on embedded-in-base VM rows, so that I do not accidentally count VM both in base and as adopted.
31. As an architect, I want VM origin metadata on VM rows (`tenderer_proposed`, `pm_client_proposed`, `ai_identified`, `tender_wide_option`), so that I can filter and explain VM in the TRR.
32. As an architect, I want a visible source indicator for AI-created rows beyond the existing marker, so that I can quickly distinguish AI rows from manual rows without opening each one.
33. As an architect, I want every Refresh Evaluation run logged with model id, prompt hash, input artefact hashes, and before/after row diffs through `action_invocations`, so that audit and rerun are possible later even without a user-facing history screen.
34. As an architect running a real project, I want to dry-run the whole slice end-to-end (Refresh → VM totals → Clarifications → TRR linkage → Cost Plan push) and have the team review row stability, so that V1 ships against reality and not against a fixture set.

## Implementation Decisions

### Modules

**Tender Submission Package + File model**
- `tender_submission_packages` already exists. Treat `tender_submissions` as the per-file parse record going forward. No new "submission file" table; the existing row is the file record.
- A package can have many submission files, each pointing to `documentId`, `versionId`, `fileAssetId`.
- A submission file is immutable once parsed; re-parse creates a new file record. Re-extraction skips work when the underlying `fileAssetId` is unchanged.
- The AI does not auto-add documents from the project repo to a tenderer package. It may flag likely missing documents.

**AI Artefact Store**
- A single thin pointer table records AI artefact metadata: `kind` (full_extraction, file_interpretation, package_interpretation, prompt_trace, issue_snapshot), `hash`, `status`, `created date`, plus relationship columns linking to file/package/evaluation/`actionInvocation` rows as relevant. The actual payload lives in storage via the existing `fileAssets`/storage abstraction.
- `tender_submissions.rawExtractedItems` stops being a destination for new large traces.
- The artefact store is a deep module: a single `storeArtefact({ kind, content, relations })` / `loadArtefact(id)` interface that callers do not need to know the storage layout to use.

**Refresh Evaluation Pipeline**
- One orchestrator with the 12 steps in the blueprint: load → load RFT/addenda basis → load packages → ingest missing → build/refresh package interpretations → generate Adds/Subs → generate VM → generate clarification candidates → update recommendation state → validate → apply only valid diffs → record action history → return changed-items summary.
- The orchestrator depends on injectable adapters for ingestion, AI proposal generation, the validator (which exists), and the artefact store. This is what makes it testable in isolation.
- Apply-diffs uses the existing `validateAiEvaluationMutations` in `src/lib/evaluation/tender-commercial.ts`, extended only if new mutation kinds are required for VM origin and recommendation state changes.
- `action_invocations` is the audit substrate. Each refresh writes one invocation row with `actionId` = refresh action, `actorKind` = `ai`, model id and prompt hash in `input`, before/after diffs and artefact pointers in `output`.

**Clarification model**
- New `clarifications` table: id, evaluation id, tenderer id (firm id + firm type), question text, category, materiality, status (`draft`, `issued`, `responded`, `closed`), response text, response document/file references, linked Adds and Subs / VM row ids, optional addendum link.
- Clarifications are 1:1 with one tenderer. No bundled clarifications in V1.
- New procurement navigation entry between `evaluation-non-price` and `tender-recommendation-report` in `ProcurementWorkflowLayout`.
- Promotion to Addendum candidate is a user action, not automatic. The clarification keeps a reference to the resulting addendum id when promoted.

**Recommendation State Machine**
- Pure FSM owning the (state, event) → state map. States: Draft, Conditional, Final. Events: high-materiality clarification raised/resolved, refresh applied, new tender file attached, active price instance changed, user confirms final.
- State stored on the evaluation (or on the active price instance — to be chosen during implementation; lean toward the evaluation so it does not vanish when a new price instance opens).
- The FSM is consumed by both the Clarifications module (raise/resolve events) and the Refresh Evaluation pipeline (refresh applied, file attached, price instance changed).

**TRR linkage helpers**
- A small set of pure functions: `selectActiveTrrEvaluationPrice(state)` returning the price instance to use, `createNewTrrFromLatest(latest)` returning the prose-copied record with `reportDate: null`, and `clearReportDateOnAiRewrite(trr)` applied at the AI rewrite boundary.
- Existing TRR generation route (`src/app/api/trr/[id]/generate/route.ts`) currently picks `priceInstances[0]`. That line is replaced with the helper.

**A-light Issue Snapshot Builder**
- Pure function `buildIssueSnapshot({ trr, evaluation, activePriceInstance, recommendationState })` returning a snapshot payload containing key totals, selected price basis, recommendation state, source references.
- Snapshot is persisted as an artefact through the artefact store; pointer recorded against the TRR id.
- Setting or changing `reportDate` triggers snapshot creation or update; clearing `reportDate` does not delete prior snapshots.

**VM polish UI**
- Inline warning chip when a VM row is marked embedded-in-base while having a non-zero amount, with help text explaining the rule.
- VM origin segmented control (no dropdown, per existing UI feedback): `tenderer_proposed`, `pm_client_proposed`, `ai_identified`, `tender_wide_option`.
- AI-source indicator on rows: a small badge on AI-created rows, distinct from the existing marker, that surfaces source file count and last refresh timestamp on hover.

### Schema changes

- `clarifications` table per fields above. Indexes on (evaluation id), (evaluation id, status), (linked addendum id).
- AI artefact pointer table per the AI Artefact Store description above.
- Recommendation state column on the evaluation (or active price instance, decided during implementation).
- New `vm_origin` value coverage is already supported by the existing `vm_origin` column on `evaluation_rows`; UI just exposes it.
- TRR table: no schema change. `reportDate` is already a text column and remains user-set; new behaviour is in code, not schema.

### API contracts

- `POST /api/evaluation/.../refresh` runs the Refresh Evaluation pipeline for the active evaluation + price instance. Returns a changed-items summary (counts of created, updated, removed rows by table type; clarification candidates; recommendation state before/after).
- `POST /api/clarifications` (within evaluation context) creates a clarification draft.
- `PATCH /api/clarifications/[id]` updates status, response, materiality, or links.
- `POST /api/clarifications/[id]/promote-to-addendum` creates an addendum candidate and links it back.
- TRR creation endpoint accepts an explicit `evaluationPriceId` and copies latest TRR content when one exists.
- TRR generate endpoint uses the active-price helper instead of `priceInstances[0]`.

### Specific interactions

- Award still records the winning firm only. Award does not touch the cost plan. The cost-plan push button (already built) remains the only path that writes to cost lines.
- Recommendation transitions happen automatically on the relevant events, with one user-driven transition: Conditional → Final.
- Refresh Evaluation is the only entry point that mutates the AI-created rows. No other surface allows AI row mutation, ensuring stable-key invariants are not bypassed.

## Testing Decisions

A good test here exercises external behaviour: pipeline contracts, FSM transitions, helper purity, snapshot content. We do not test that a row got written via a specific SQL call or that a particular React state setter fired. The validator and stable-key helpers already have tests in `src/lib/evaluation/__tests__/tender-commercial.test.ts` — we extend that style.

**Refresh Evaluation Pipeline (incl. idempotency)**
- Black-box: given a fixed evaluation, fixed package files, and a stub AI proposal generator that produces the same proposals each call, two consecutive refreshes produce zero visible row diffs in the second run.
- Locked rows are never changed by a refresh, even when the AI proposes changes to them.
- User-created rows are never changed by a refresh.
- A refresh that adds a new submission file changes only the rows the new file affects.
- A refresh records one `action_invocations` row with the right `actorKind`, model id, prompt hash, and before/after summary.
- Prior art: `src/lib/evaluation/__tests__/tender-commercial.test.ts` for the helper-test style; `src/lib/actions/definitions/__tests__/tender-firms.test.ts` for action-level testing patterns.

**Recommendation State Machine**
- Pure FSM unit tests for every transition the blueprint specifies: Draft → Conditional on high-materiality raised; Conditional → Final on user confirm with no unresolved high-materiality items; Final → Draft on new file, refresh applied, or active price instance changed; Final → Conditional on new high-materiality raised; no-op transitions on unrelated events.
- Tests assert state as a function of (current state, event), not via UI side effects.

**TRR Linkage Helpers**
- `selectActiveTrrEvaluationPrice` returns the user-selected instance when set, falls back to the active instance otherwise, never to `[0]` when other candidates exist.
- `createNewTrrFromLatest` copies executive summary, clarifications, and recommendation text but returns `reportDate: null`.
- `clearReportDateOnAiRewrite` zeros `reportDate` when applied to the latest TRR record.

**A-light Issue Snapshot Builder**
- Snapshot payload contains the comparable total, the award basis total, the selected price instance id, the recommendation state, and the source artefact references for every AI-created row referenced in the TRR.
- Setting `reportDate` produces a snapshot; clearing `reportDate` leaves the prior snapshot intact.

Out of scope for tests: snapshot capture of UI rendering, validator extensions beyond what already has coverage, exhaustive ingestion-format edge cases (those belong in `tender-parser` tests).

## Out of Scope

- General project-schema planner agent.
- Full non-price AI scoring.
- Selected-tenderer (bundled) clarification flows.
- Consortium/JV tenderer modelling.
- GST handling beyond the AUD ex-GST baseline. GST ambiguity raises a clarification.
- Cell-level locking. Locking remains row-level.
- Full legal-grade immutable audit archive. A-light snapshot only.
- User-facing evaluation run history screen.
- Full evidence span / chunk UI for AI-extracted facts.
- Partial-refresh modes exposed to the user.
- Replacement of the existing `tender_submissions` row shape in one move; it is evolved, not hard-replaced.

## Further Notes

- The deterministic foundation (totals, stable keys, validator, cost-plan push, VM as third table, status cells, parser classification) is already in place. Every new module in this PRD lands on top of that foundation, not next to it.
- Heavy AI traces stay in storage and never grow `tender_submissions.rawExtractedItems`.
- The Refresh Evaluation pipeline depends on injectable adapters so that the pipeline orchestrator itself is testable without a live AI client, live database, or live storage.
- VM and clarification UI choices follow the existing UI guidance to prefer segmented controls over dropdowns and to use TESSERA design tokens.
- The dry-run is the only step that explicitly requires a live project. Schedule it after the rest of the slice has landed and tests are green.
- Acceptance criteria from the blueprint are inherited verbatim: stable AI rows; idempotent refresh; user/locked rows untouched; no double-counted embedded VM; 1:1 clarifications; tender-wide ambiguity routes to Addendum candidate; TRR uses selected price instance; snapshot on issue date; award no longer updates cost plan silently; cost plan updates only through explicit push.
