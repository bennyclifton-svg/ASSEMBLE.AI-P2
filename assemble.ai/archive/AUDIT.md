# Archive Audit

**Date:** 2026-05-14
**Auditor:** Claude (single pass)
**Scope:** Every document under `archive/` reviewed for content that is still load-bearing for the current direction (local/private single-user appliance, RFI typed-record pilot, briefing/reporting flagship workflow).

**Method:** Each archived document was checked against current truth (`../CODEBASE.md`, `../README.md`, `../CLAUDE.md`, `../docs/strategy/local-private-appliance.md`, `../docs/adr/`, `../docs/setup/`, `../docs/issues/`) to identify facts that are (a) still true, (b) not already captured in current docs, and (c) load-bearing for future work. Load-bearing facts have been promoted into current docs; this file is the trail.

## Verdict summary

| Document | Status | Promoted to current docs? |
|---|---|---|
| `docs/prds/2026-05-14-local-private-rfi-appliance-prd.md` | Foundational input. Almost fully distilled into `docs/strategy/local-private-appliance.md` and `docs/issues/2026-05-14-local-private-rfi-appliance/`. | Yes — beta-killer risks list, rollout gates, model-by-task-class direction. |
| `docs/prds/2026-05-12-briefing-grill-me-prd.md` | Design detail for briefing flow; schema shipped (migration `0053`). | No — shipped state lives in code; CODEBASE.md already captures the briefing surface. |
| `docs/plans/2026-05-12-briefing-grill-me-design.md` | Companion design doc for the briefing PRD. | No — same reason. |
| `docs/plans/2026-05-12-tender-evaluation-ai-remaining-prd.md` | Tender-eval V1 next-slice design. Partially shipped. | Yes — tender-eval domain rules (totals, stable keys, VM, clarifications, recommendation FSM, push rules) into CODEBASE.md §4. |
| `docs/plans/2026-05-11-tender-evaluation-ai-blueprint.md` | Foundational tender-eval design. Foundation already shipped. | Same as above — facts promoted once into CODEBASE.md §4. |
| `docs/plans/2026-05-11-client-side-pivot-landing.md` | Landing/health-check/pricing pivot. Fully shipped per CODEBASE §10. | No — code is source of truth; CODEBASE already covers it. |
| `docs/plans/2026-05-11-landing-animation.md` | Tiny UI plan; shipped. | No. |
| `docs/plans/2026-05-08-brief-app-shell-port.md` | Brief app-shell port; shipped. | No — fully reflected in `src/components/brief/`. |
| `docs/plans/2026-05-07-brief-building-tab-port.md` | Brief building tab port; shipped. | No. |
| `docs/plans/2026-05-06-delivery-lite-inbound-variation-ddc-plan.md` | Delivery-lite DDC plan; fully shipped per CODEBASE §7. | No — every checklist item is done; the DDC cycle log in `docs/ddc/issue-variation/cycles/` is the live trail. |
| `docs/plans/2026-05-05-briefing-pack-objectives.md` | Pre-cursor to briefing PRD. | No — superseded by the briefing PRD/design. |
| `docs/plans/2026-05-03-objectives-*` (3 files) | Objectives per-row migration; shipped. | No — `projectObjectives` per-row model lives in code. |
| `docs/plans/2026-05-03-chat-window-purpose.md` | Conceptual input to ADR 0002. | No — ADR 0002 carries the decisions. |
| `docs/plans/2026-05-02-chat-as-control-surface-operating-model.md` | Operating-model design for action registry + workflow engine. | No — ADR 0002 + CODEBASE §5/§7 carry it. |
| `docs/plans/2026-05-02-chat-control-adopted-implementation-plan.md` | Phase 1 task list. Done. | No. |
| `docs/plans/2026-05-01-outstanding-agent-items.md` | Live-refresh and edit-and-approve. Done. | No. |
| `docs/plans/2026-04-30-phase-3x-broad-write-tools.md` | Broad write tools across notes/meetings/reports/etc. Shipped. | No — CODEBASE §7 catalogs the resulting agents/tools. |
| `docs/plans/2026-04-30-agent-knowldge-access.md` | Knowledge-library access for agents. Shipped (`search_knowledge_library` tool). | No — CODEBASE §5 covers it. |
| `docs/plans/2026-04-29-phase-3-5-cross-tab-live-updates.md` | Per-project SSE bus. Shipped. | No — CODEBASE §8 covers it. |
| `docs/plans/2026-04-29-agent-integration.md` | Master plan that allocated 38 skills to buckets A/B/C/D. Source for the skills inventory in CODEBASE §6. | No — CODEBASE §6 already carries the bucket table for all 38 skills. |
| `docs/plans/2026-04-27-*` (3 files) | Notes sort/view, date headers, document download. Shipped. | No. |
| `docs/plans/2026-04-26-admin-page-design.md` | Admin panel design. Shipped. | No — `/admin/models`, `/admin/products`, `/admin/users` live in `src/app/admin/`. |
| `docs/plans/2026-02-27-*` (3 files) | Design categories + document repo nav. Shipped. | No. |
| `docs/plans/2026-02-25-discipline-knowledge-seeds-plan.md` | Knowledge-library seeding plan. Source material for knowledge domains. | No — `src/lib/constants/knowledge-domains.ts` is the live config. |
| `docs/plans/2026-02-22-knowledge-domain-retrieval-plan.md` | Retrieval mechanics for knowledge domains. Shipped. | No — `src/lib/rag/` is the live implementation. |
| `docs/plans/2026-02-21-*` (5 files) | Coaching engine, context orchestrator, inline instructions, knowledge domain system, wire-up. Largely shipped; some partial. | No — CODEBASE §5 (orchestrator) and the knowledge-domains constants are the live truth. |
| `docs/plans/2026-02-16-ai-prompt-architecture-design.md` | Defined `BASE_SYSTEM_PROMPT` + feature layers in `src/lib/prompts/system-prompts.ts`. | Yes — AI content-generation conventions (PM persona, AU context, inference marking) into CODEBASE.md §5. |
| `docs/plans/2026-02-14-apply-budget-estimate-design.md` | Apply-budget-estimate UI. Shipped. | No. |
| `docs/plans/2026-02-13-objectives-document-extraction-{design,impl}.md` | Objectives extraction from documents. Superseded by briefing. | No — the briefing flow now owns this surface. |
| `docs/plans/2026-01-31-project-details-middle-panel-{design,full}.md` | Earliest workspace layout plan. Long superseded. | No. |
| `docs/research/architectural-trades-research-report.md` | AU domain reference; AS standards, defect data, trade specs. | No — earmarked as knowledge-library source material per `docs/strategy/local-private-appliance.md`. |
| `docs/research/civil-engineering-research-report.md` | Same — AU civil engineering reference. | No — same. |
| `docs/research/mep-services-research-report.md` | Same — AU MEP reference. | No — same. |
| `docs/research/structural-engineering-research-report.md` | Same — AU structural engineering reference. | No — same. |
| `docs/research/trade-interfaces-research-report.md` | Same — interface coordination reference. | No — same. |
| `specs/000-brainstorm` through `specs/025-intelligent-report-generation` | Pre-2026-05 spec-kit feature backlog. SaaS-era; some partially shipped, most superseded by current direction. | No — what shipped lives in code; what didn't is intentionally deferred by current strategy. |
| `HIGH_LEVEL_STRATEGY.md` | Strategic input for the May 2026 pivot. | Yes — phased rollout gates, beta-killer risks, model-by-task-class promoted into strategy doc. |
| `CONTEXT.md` | Domain glossary written as the ADR companion. | Yes — domain glossary section promoted into `docs/strategy/local-private-appliance.md`. ADR 0001 reference updated. |
| `CODEBASE_B.md` | Earlier draft of the codebase review. | No — `../CODEBASE.md` is the current, more detailed version. |
| `DEPLOYMENT.md` | Pre-pivot deployment doc. | No — issue `014-scrub-deployment-docs-and-add-secret-hygiene-check.md` will replace it. |
| `walkthrough.md` | Pre-rebrand product walkthrough. | No — superseded by README + CODEBASE. |
| `before_profiler.tsx` | Orphaned component snapshot. | No — purely a historical file. |

## What was promoted, and where

Five facts were promoted into current docs. The diffs are intentionally surgical — the archive remains the long-form source.

### 1. Domain glossary → `docs/strategy/local-private-appliance.md`

`CONTEXT.md` carried compact one-line definitions of: project workspace, project profiler, project workspace entity, application action, approval gate, agent system, canonical project truth, typed-record pilot, flagship workflow, communication artifact, document repository, RAG ingestion, knowledge library, context assembly. These are the domain-specific terms current docs use without defining. A compact `## Glossary` section was added to the strategy doc.

### 2. Beta-killer risks → `docs/strategy/local-private-appliance.md`

From `HIGH_LEVEL_STRATEGY.md` Q7 and the RFI-appliance PRD §Further Notes: bad setup, flaky ingestion, uncited AI claims, lost data, weak backups, model-key confusion, approval bypasses, outputs requiring too much rework. These name what the current horizon is specifically engineered to prevent — they should be visible alongside the "first proof points" list.

### 3. Broader-rollout gates → `docs/strategy/local-private-appliance.md`

From the RFI-appliance PRD §Further Notes: rollout should wait for restore-tested backups, stable updates and migrations, reliable ingestion, versioned issued outputs, export/import handoff, health checks, error reporting, and at least one weekly workflow PMs would miss if removed. Captured as the explicit gating list before broader adoption.

### 4. Model strategy by task class → `docs/strategy/local-private-appliance.md`

From the RFI-appliance PRD and `HIGH_LEVEL_STRATEGY.md`: the product should route by task class (routine / drafting / deep reasoning / extraction) rather than pin to named models. `../CODEBASE.md` §5 already notes the current three feature groups (`extraction`, `generation`, `chat`); the strategy doc now records the intended direction.

### 5. Tender evaluation domain rules → `../CODEBASE.md` §4 (data model)

The tender-evaluation blueprint and the remaining-V1-slice PRD encode operational rules that are not derivable from the schema alone:

- **Total formulas** — comparable tender total = initial price + adds and subs; VM total = adopted VM excluding embedded-in-base; award basis total = comparable + selected adopted non-embedded VM.
- **AI stable keys** — generated server-side from table type, category, normalised commercial issue, affected firm/package scope, and source file ids; never from description text alone. Refresh updates AI-created unlocked rows in place; never deletes or edits user-created rows; hides superseded AI rows rather than recreating them.
- **Cell value types** — `amount`, `included`, `assumed_included`, `excluded`, `tbc`, `na`, `blank`. Only `amount` cells contribute to totals.
- **Row sources** — `manual`, `ai`, `cost_plan`, `system`.
- **VM rules** — adoption status (`adopted`/`tbd`/`not_adopted`); `embedded_in_base` does not contribute to VM total; adopted non-embedded VM can be selected for award basis.
- **VM origin** — `tenderer_proposed`, `pm_client_proposed`, `ai_identified`, `tender_wide_option`.
- **Clarifications** — 1:1 with one tenderer; statuses `draft`/`issued`/`responded`/`closed`; tender-wide ambiguity routes to an Addendum candidate, not bundled clarifications; clarification responses leave the base price unchanged and flow commercial effects into Adds-and-Subs or VM.
- **Recommendation FSM** — Draft → Conditional (unresolved high-materiality clarification), Conditional → Final (resolved + user confirm), Final → Draft (new tender file / refresh / active price-instance change), Final → Conditional (new high-materiality clarification).
- **Award separation** — Award records the winning firm only and does not touch the cost plan. The explicit `Push Awarded Price to Cost Plan` action is the only path that updates cost lines from a tender.
- **Procurement section order** — RFT → Addendum → Evaluation Price → Evaluation Non-Price → Clarifications → TRR.

### 6. AI content-generation conventions → `../CODEBASE.md` §5 (AI infrastructure)

The shared content-generation persona in `src/lib/prompts/system-prompts.ts` (`BASE_SYSTEM_PROMPT`) is centrally wired into all 13 content-generation features. The convention is worth noting because it shapes every AI-drafted artefact:

- First-person plural, senior PM voice, AU construction context (NCC, AS, state planning frameworks).
- Inverted pyramid, active voice, specific over generic, flag risks, do not invent facts.
- Mark inferences with `[Based on typical Class 2 projects...]` or `[Subject to confirmation...]`.
- Feature-specific layers append on top for meetings / reports / notes / RFT / TRR.

### 7. ADR 0001 cross-reference fix

ADR 0001 closed with "Future architecture reviews should use `CONTEXT.md` and this ADR as the starting point." `CONTEXT.md` is now archived, so the reference was updated to point at `docs/strategy/local-private-appliance.md` and `CODEBASE.md`, which are the current entry points.

## What was deliberately NOT promoted

- **Phased rollout sequence from `HIGH_LEVEL_STRATEGY.md` (Phase 0–5).** Superseded by the actual issue list in `docs/issues/2026-05-14-local-private-rfi-appliance/`. Recording the same gating in two places would drift.
- **38-skill bucket allocation from `2026-04-29-agent-integration.md`.** Already present as a complete table in `CODEBASE.md` §6.
- **Detailed module/file plans (e.g. briefing tool list, action-registry phase 1B file changes).** The code is the source of truth; CODEBASE.md describes the wired surface.
- **Research reports.** Long-form domain reference material. Strategy explicitly retains them as source material for future knowledge-library work; no fact in them belongs in product docs today.
- **Pre-2026-05 specs.** Either shipped (and visible in code/CODEBASE.md) or intentionally deferred by current strategy. No need to re-document deferrals.

## Caveats

This was a single-pass audit. The plans corpus is ~600 KB of dense text; massive plans (`2026-02-21-coaching-engine-design.md` at 77 KB; `2026-02-21-context-orchestrator-design.md` at 97 KB) were verdict-classified from their structure and shipped-status in CODEBASE.md, not read in full. Anything genuinely load-bearing in their bodies that survived implementation will already be in the code; anything that did not survive is intentionally not promoted.
