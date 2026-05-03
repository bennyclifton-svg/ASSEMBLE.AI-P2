# Objectives — Profile Propagation Design

**Date:** 2026-05-03
**Status:** Design — ready for implementation breakdown
**Origin:** User reported that switching `projectType` from `new` → `advisory` and changing work-scope items produced no change in generated objectives. Root-cause analysis revealed a broader class of silent-failure bugs where profiler selections do not reliably reach the AI prompt.

---

## 1. Problem statement

The objectives module fails to propagate profile selections to the AI in three distinct ways:

1. **`workScope` is silently discarded for `new` and `advisory` project types** — the route at [generate/route.ts:110](../../src/app/api/projects/[projectId]/objectives/generate/route.ts#L110) sets `isWsApplicable = projectType === 'refurb' || projectType === 'remediation'`, dropping work-scope from the prompt entirely. The `workScopeOptions` data file already declares advisory as an applicable project type ([profile-templates.json:2464](../../src/lib/data/profile-templates.json#L2464)) — the code is the bug, not the data.

2. **The 175-rule inference engine has zero project-type awareness** — rules in [inference-rules.json](../../src/lib/data/inference-rules.json) match on `building_class`, `subclass`, `scale`, `complexity` but never on `project_type`. Switching project type does not change which rules fire. Advisory engagements receive build-flavoured suggested items.

3. **The four-bucket section schema (`functional/quality/planning/compliance`) is wrong-shaped for advisory** — advisory engagements are services contracts characterised by Scope of Advice, Cadence, and Deliverable Form, not by physical building attributes.

4. **Polish (long-form) never reads attached documents** — for advisory specifically, the data room is the engagement input. Polish ignores it entirely, so long-form output cannot quote the engagement letter or scope clauses.

5. **No staleness detection** — `objectiveGenerationSessions.profilerSnapshot` records the profile at generation time but no code anywhere compares it to the current profile. Profile drift is invisible until the user notices the mismatch by hand.

6. **Empty-section silent-preserve** — at [generate/route.ts:443-444](../../src/app/api/projects/[projectId]/objectives/generate/route.ts#L443-L444), if the AI returns no bullets for a section, the soft-delete is skipped and prior rows persist. Visually identical to "didn't regenerate."

## 2. Goal

Every selection made in the building profiler — including `projectType`, `workScope[]`, and all `complexity` dimensions — must reliably reach the AI prompt and produce objectives that are **relevant** (project-type-appropriate semantics), **reliable** (regression-protected by tests), and **concise** (within strict per-project-type word/count budgets).

## 3. Architecture decisions

### 3.1 Schema routing — reuse, don't migrate

Repurpose the existing profile slots for advisory:

| Field | Build projects | Advisory projects |
|---|---|---|
| `workScope[]` | Physical work scope | **Scope of Advice** (multi-select: Technical Review, Planning DD, Cost Plan Review, Programme Review, Procurement Review, Contract Review, Peer Review, Feasibility Review, Expert Witness, ESD Review, Fire Engineering Review, Remediation Review, etc.) |
| `complexity.cadence` | (unused) | One-off / Milestone-gated / Monthly monitoring / Continuous PCG / On-demand |
| `complexity.deliverable_form` | (unused) | Multi-select: Written report, PCG attendance, Monthly status update, Ad-hoc memos, Presentation, Dashboard updates, Sign-off letters, Expert witness statement |

Add per-project-type label overrides in `profile-templates.json` so UI and prompts can render *"Scope of Advice"* instead of *"Work Scope"* without renaming the underlying field.

**No DB migration required** — `workScope` is already a generic array column; `complexity` is already a free-form `Record<string, string | string[]>` bag.

### 3.2 Section semantics — per-project-type bucket re-labels

The four DB columns (`functional / quality / planning / compliance`) stay. Their *displayed labels* and the *prompt section definitions* become project-type-aware via a single mapping table (the "central lookup table" referenced throughout this doc). For advisory:

| DB column | Advisory label | Definition for the AI |
|---|---|---|
| `functional` | **Scope of Advice** | What aspects of the development are being reviewed |
| `quality` | **Review Standards & Methodology** | Benchmarks and criteria against which the advice is given (e.g. AIQS rates for cost benchmarking, NCC compliance check basis) |
| `planning` | **Deliverables** | Physical outputs the client receives (reports, PCG attendance, monthly updates, sign-off letters, presentations) |
| `compliance` | **Engagement Conditions** | Cadence, PI insurance, independence, governance reporting line, limitations & assumptions |

The mapping table lives in a single file and is consumed by:
- `SectionGroup.tsx` (UI labels)
- The generate prompt builder ([generate/route.ts:218-242](../../src/app/api/projects/[projectId]/objectives/generate/route.ts#L218-L242))
- The polish prompt builder ([prompt-builder.ts](../../src/app/api/projects/[projectId]/objectives/polish/prompt-builder.ts))
- The polish-fresh prompt builder ([polish-fresh-prompt-builder.ts](../../src/app/api/projects/[projectId]/objectives/polish/polish-fresh-prompt-builder.ts))

### 3.3 Document policy — warn-but-allow with scope-derived queries

For all project types:

- **No documents attached → generate proceeds, with a passive banner** worded as *"Draft from your scope selections — refine after attaching reference material"*. Soft framing, no "no documents attached" language.
- **Documents attached → retrieval queries are derived from the user's scope selections, not hardcoded broad strings.** A `Record<workScopeItem, { sectionQueries: Record<ObjectiveType, string[]> }>` map provides ~5-10 keywords per advisory scope item. Example for `cost_plan_review`:

  ```
  Scope of Advice:        ["cost plan", "elemental costs", "contingency", "escalation"]
  Standards & Methodology: ["cost benchmarks", "AIQS rates", "first-principles"]
  Deliverables:           ["reporting requirements", "status reports", "sign-off"]
  Engagement Conditions:  ["professional indemnity", "independence", "scope limitations"]
  ```

- **Empty retrieval → write a placeholder row** (e.g. *"Insufficient data-room content to generate cost plan review scope — add cost plan documents and regenerate"*) rather than silent-skip. Eliminates the empty-section silent-preserve bug.

The build-project flow keeps its current static queries for now; the same mechanism is available later if scope-derived build queries become valuable.

### 3.4 Inference rules — `applicableProjectTypes` field

Add an optional top-level field to each rule:

```json
{
  "id": "ofa-001",
  "applicableProjectTypes": ["advisory"],
  "condition": { ... },
  "infer": [ ... ]
}
```

- Rules without the field apply to all project types (preserves existing 175 rules with no retrofit).
- Rules with the field are filtered before condition evaluation. ~5-line engine change in [inference-engine.ts:243](../../src/lib/services/inference-engine.ts#L243).
- Composable: `["advisory", "remediation"]` for rules that span types.

**Initial advisory corpus: ~40-60 rules.** Content authored by the user (CM/QS judgement); JSON translation by an agent.

**Authoring style: prescriptive with sensible Australian-market defaults.** E.g. *"PI insurance ≥ $20M for residential apartments"* rather than *"PI insurance per firm policy"*. Users can edit; prescriptive output gives a strong starting point.

### 3.5 Polish path — full symmetry with generate

Bring the polish route into the same shape as generate:

1. **Polish reads attached documents** for all project types. Adds ~300ms latency (negligible against Claude's 4-6s response time).
2. **Domain library tag selection becomes project-type-aware.** [resolveProfileDomainTags](../../src/lib/constants/knowledge-domains.ts#L574) currently always seeds `['ncc', 'regulatory', 'as-standards']`. For advisory, swap that seed to `['cost-management', 'contracts', 'procurement', 'programming']` plus tags from `workScope` items.
3. **Polish prompt instructions branch on project type** via the same lookup table. Advisory prompt:

| Concern | Build instruction | Advisory instruction |
|---|---|---|
| Citation source | "cite NCC 2022, BCA, AS standards" | "cite engagement-letter / data-room clauses where present; otherwise AIQS or applicable professional standards" |
| Measurable framing | "make measurable where possible (quantities, percentages, ratings, timeframes)" | "make scope-bounded where possible (areas reviewed, comparables sampled, cadence) — avoid implying construction performance metrics" |
| Voice | "professional, formal, suitable for tender documentation" | "professional, formal, suitable for an engagement letter or scope of services" |

Same treatment applies to [long-fresh-handler.ts](../../src/app/api/projects/[projectId]/objectives/polish/long-fresh-handler.ts).

### 3.6 New knowledge domain — AIQS Practice / Professional Services

Required for polish citations to land correctly for advisory. Without it, polish will cite NCC clauses where it should cite AIQS scope-of-services standards.

- Tags: `['advisory', 'professional-services', 'cost-management']` (new `professional-services` tag may need adding to the canonical list)
- Applicable project types: `['advisory']`
- Content (out of scope for this design — separate authoring task): AIQS Australian Cost Management Manual references, scope of services standards, PI insurance market norms, independence requirements, fee structures, engagement letter conventions.

Sister domain to consider later: **Project Monitor / Bank Funder Reference** for funder-facing advisory.

### 3.7 Staleness detection — tiered response

`objectiveGenerationSessions.profilerSnapshot` already exists. Add server-side drift comparison in the `GET /objectives` response:

```ts
{
  ...,
  staleness: {
    isStale: boolean,
    severity: 'high' | 'medium' | 'none',
    changedFields: string[]
  }
}
```

Tiered field-impact map:

| Severity | Fields | UI response |
|---|---|---|
| **High** | `projectType`, `buildingClass`, `subclass[]` add/remove, `workScope[]` add/remove | **Modal** — *"These changes invalidate your objectives. Regenerate now or keep current?"* Cannot dismiss silently. |
| **Medium** | `complexity` dimension changes, `scale` numeric changes, **document attached** | **Passive badge** — *"Profile changed — regenerate to refresh"* on each section header |
| **None** | `region`, project metadata fields | No signal |

When the user accepts a regenerate after profile drift, **stack the existing manual-edits confirmation on top** if applicable: *"We detected manual edits. Regenerate will discard them. Continue?"*. Reuses the `hasManualEdits` mechanism in [ObjectivesWorkspace.tsx:287](../../src/components/profiler/objectives/ObjectivesWorkspace.tsx#L287).

V2 enhancement (deferred): preserve manually-edited rows during regenerate, regenerate only AI-sourced rows. Requires a `wasEdited` flag or per-row text comparison.

### 3.8 Conciseness — per-project-type budgets, median few-shot

Add to the per-project-type lookup table:

| Project type | Short form | Long form | Bullets per section |
|---|---|---|---|
| Build (`new` / `refurb` / `extend` / `remediation`) | 2-4 words | 8-12 words | 3-5 |
| Advisory | 4-7 words | 12-18 words | 3-5 |

**Few-shot examples in prompts target the *median* of the range, not the upper bound.** Example for advisory short: *"Cost plan independent review"*, *"Programme stress-test against baseline"*. Example for advisory long: *"Independent review of stage 3 cost plan against AIQS benchmarks and three comparable projects"*.

**Drop the cross-section deduplication instruction.** Concepts that genuinely span sections (e.g. "DA lodgement" is both a planning *deliverable* and a planning *milestone*) are honestly reported as overlap; the user owns dedup.

The conciseness budgets are AI-generation targets, not section caps — users can manually add items beyond the budget via the existing add-item flow.

### 3.9 Testing — regression-prevention layer

Two tiers:

**(A) Pure-function unit tests** for `resolveProfileDomainTags`, `buildProfileSearchQuery`, `evaluateRules`, the new project-type-aware rule filter, the new section-label lookup table, the new scope-keyword query map. ~30-50 small tests.

**(B) Targeted-assertion snapshot tests** for prompt assembly. Per test case, define `mustContain[]` and `mustNotContain[]` strings; assert against the assembled prompt before `aiComplete` is called.

**Initial 5-case advisory matrix:**

| # | Profile | mustContain | mustNotContain |
|---|---|---|---|
| 1 | `new + apartments + workScope=[]` | "Project Type: new", "Functional", "Quality" | "Scope of Advice" |
| 2 | `advisory + apartments + workScope=[]` | "Project Type: advisory", "Scope of Advice", "Engagement Conditions" | "Functional", "Premium material selection" |
| 3 | `advisory + apartments + workScope=[cost_plan_review, programme_review]` | "Cost Plan Review", "Programme Review", "Independent review of cost plan" | — |
| 4 | (3) → re-run with `workScope=[procurement_review]` | "Procurement Review" | "Cost Plan Review" |
| 5 | `advisory + apartments + workScope=[cost_plan_review] + documentIds=[mock-doc-1]` | "## Retrieved Content" derived from cost-plan keywords | — |

**Test case 4 is the regression test for the originally-reported bug.** It would fail loudly if anyone reintroduces a silent-skip, a workscope filter, or any other change that breaks profile→prompt propagation.

**Defer indefinitely:** property-based / matrix tests (over-engineering until needed), live AI integration tests (flaky and expensive in CI; use as manual smoke checks instead).

## 4. Rollout — phased bundles

**Phase 1 — Hotfix (ship independently, immediately):**
- Remove the `isWsApplicable` filter at [generate/route.ts:110](../../src/app/api/projects/[projectId]/objectives/generate/route.ts#L110).
- Add advisory work-scope template items to [profile-templates.json](../../src/lib/data/profile-templates.json) (`workScopeOptions.advisory`).
- Add unit test for the workscope-flow case.
- **Resolves the user's immediately-reported bug.** Ships in days.

**Phase 2 — Foundation + advisory rule corpus:**
- Per-project-type lookup table (section labels, definitions, conciseness targets, polish instructions, all in one file).
- `applicableProjectTypes` field on inference rules + ~5-line engine filter.
- Author ~40-60 advisory rules (content by user, JSON by agent).
- Scope-keyword query map for advisory work-scope items.
- Generate route consumes all of the above.
- Snapshot tests for the 5-case matrix.

**Phase 3 — Polish symmetry:**
- Polish route reads attached documents.
- Project-type-aware tag seeding in `resolveProfileDomainTags`.
- Project-type-aware polish prompt instructions.
- Same treatment for `long-fresh-handler.ts`.
- Does not block on AIQS domain content — polish output improves immediately even without it. AIQS is purely additive when it lands.

**Phase 4 — Staleness detection + protection:**
- Server-side drift comparison in `GET /objectives` response.
- Frontend tiered response (high → modal, medium → badge).
- Document-attach as medium-impact trigger.
- Auto-mark all existing advisory objectives as stale on rollout (one-line behaviour, falls out of the staleness mechanism).
- Two-step manual-edits confirmation stacked onto drift modal.

**Out of scope for these phases (separate authoring tasks):**
- AIQS Practice knowledge domain content authoring.
- Project Monitor / Bank Funder knowledge domain (later).
- V2 manual-edit-preserving regenerate.

## 5. Open content-authoring decisions (deferred to PR-review time)

These are content decisions, not architecture decisions, and are best made with concrete content in front of the reviewer:

- Exact list of advisory work-scope items beyond the headline set (Cost Plan Review, Programme Review, etc.).
- Exact wording of the staleness modal copy and the document-attached banner copy.
- Specific advisory rule content — the substantive scope/methodology language for ~40-60 rules.
- AIQS Practice knowledge domain document selection and chunking strategy.
- Cadence enum values (One-off / Milestone-gated / Monthly monitoring / Continuous PCG / On-demand) — confirm these match how the user actually scopes engagements.

## 6. Files materially affected

Generate path:
- [src/app/api/projects/[projectId]/objectives/generate/route.ts](../../src/app/api/projects/[projectId]/objectives/generate/route.ts) — remove `isWsApplicable` filter; consume per-project-type lookup; consume scope-keyword query map; placeholder rows on empty retrieval.
- [src/app/api/projects/[projectId]/objectives/route.ts](../../src/app/api/projects/[projectId]/objectives/route.ts) — add `staleness` field to GET response.

Polish path:
- [src/app/api/projects/[projectId]/objectives/polish/route.ts](../../src/app/api/projects/[projectId]/objectives/polish/route.ts) — read attached documents; project-type-aware tags + instructions.
- [src/app/api/projects/[projectId]/objectives/polish/long-fresh-handler.ts](../../src/app/api/projects/[projectId]/objectives/polish/long-fresh-handler.ts) — same treatment.
- [src/app/api/projects/[projectId]/objectives/polish/prompt-builder.ts](../../src/app/api/projects/[projectId]/objectives/polish/prompt-builder.ts) — accept `projectType`, branch instructions.
- [src/app/api/projects/[projectId]/objectives/polish/polish-fresh-prompt-builder.ts](../../src/app/api/projects/[projectId]/objectives/polish/polish-fresh-prompt-builder.ts) — same.

Inference + retrieval:
- [src/lib/services/inference-engine.ts](../../src/lib/services/inference-engine.ts) — `applicableProjectTypes` filter (~5 LOC).
- [src/lib/data/inference-rules.json](../../src/lib/data/inference-rules.json) — append ~40-60 advisory rules.
- [src/lib/constants/knowledge-domains.ts](../../src/lib/constants/knowledge-domains.ts) — project-type-aware seeding in `resolveProfileDomainTags`; new AIQS domain definition.

Templates + UI:
- [src/lib/data/profile-templates.json](../../src/lib/data/profile-templates.json) — `workScopeOptions.advisory`, `complexityOptions.advisory`, per-project-type label overrides.
- New file: per-project-type lookup table (section labels, definitions, conciseness targets, polish instructions).
- [src/components/profiler/objectives/SectionGroup.tsx](../../src/components/profiler/objectives/SectionGroup.tsx) — consume per-project-type labels.
- [src/components/profiler/objectives/ObjectivesWorkspace.tsx](../../src/components/profiler/objectives/ObjectivesWorkspace.tsx) — consume `staleness` field; render badge / modal.

Tests:
- New: `src/app/api/projects/[projectId]/objectives/generate/__tests__/route.test.ts` — 5-case advisory matrix.
- New: `src/lib/services/__tests__/inference-engine.test.ts` — `applicableProjectTypes` filter.
- New: `src/lib/constants/__tests__/knowledge-domains.test.ts` — project-type-aware tag seeding.
