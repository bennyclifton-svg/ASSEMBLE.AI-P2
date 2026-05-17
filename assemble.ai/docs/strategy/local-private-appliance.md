# Local/Private Project Appliance Strategy

This note is the short implementation context for the current local/private Sitewise direction. It summarizes the product and architecture decisions from the local/private RFI appliance PRD, the high-level strategy note, the current codebase review, and the accepted architecture ADRs.

Public SaaS launch work is now tracked as a separate reintegration path in `docs/strategy/public-saas-reintegration.md`. That path keeps the current app as the base and treats old SaaS-era material as reference only.

## North Star

Sitewise is a private project record system where an AI project officer helps one PM keep the job coherent, evidenced, and ready to issue.

The first design center is one accountable project manager running one live project. Firm-wide rollout, real-time collaboration, and public SaaS scale can come later only after the single-project appliance is trustworthy.

## Product Shape

Sitewise should be treated as a local/private single-user project appliance, not a pure desktop app and not a public SaaS-first product. Early deployments may run on a PM's machine, a small office server, or a private managed instance.

The appliance shape includes:

- the Next.js application
- PostgreSQL for project records
- pgvector-backed document search
- Redis-backed background workers
- stored project files through the existing storage abstraction
- optional external model providers for AI reasoning, drafting, extraction, and embeddings
- explicit health, backup, restore, and export/import paths before broader rollout

Electron or Tauri packaging is deferred until the database, worker, storage, migration, backup, and recovery experience is reliable.

## Truth Hierarchy

Structured schema records and stored files are canonical project truth.

Chat is interaction history. It can explain, ask, draft, and propose, but it is not the project record.

AI memory is limited to editable preferences and recurring context. It must not override schema facts, document evidence, or issued artefacts.

## Write Discipline

New agent and workflow writes should go through registered application actions and approval gates. Application actions own validation, preview diffs, approval policy, apply logic, event emission, and audit.

Existing direct UI writes can remain during migration, but they should converge onto actions over time, starting with high-risk and shared domains. New legacy mutating agent tools should not be added.

The enforcement policy and current legacy exemption inventory live in `docs/strategy/action-only-writes-policy.md`.

## First Proof Points

RFI is the first typed contract-administration record pilot. It now has a schema-backed register, evidence links, source-note promotion, response/close/reopen lifecycle audit, immutable issued-output versions, and an approval-gated `create_rfi` action for AI-drafted proposals. It should prove the reusable pattern before EOTs, defects, site instructions, progress claims, determinations, or notices are attempted.

Briefing/reporting is the first flagship weekly workflow. The current tracer is an action-backed weekly report draft that reads current project records, typed RFIs, documents/RAG excerpts, and approved memory, then creates reviewable report sections that separate facts, assumptions, recommendations, open questions, and citations.

## Current Codebase Reality

The current codebase has the right substrate for this direction: PostgreSQL, pgvector-backed RAG, local file storage fallback, background workers, agents, approvals, workflows, action definitions, document ingestion, project records, typed RFIs, reviewable AI memory, and weekly report draft foundations.

It is not yet fully aligned. The Action Registry migration is still partial for direct UI routes, backup/restore is a first smokeable project format rather than a complete archive product, document ingestion still needs real-project hardening, and some agent/persona/source docs remain historical material. RFI is now the typed-record proof point; notices, EOTs, defects, site instructions, progress claims, and determinations are still future candidates.

The `docs/skills/*/SKILL.md` files are archived source/reference material only. Useful domain material can be mined into knowledge libraries, prompts, action specs, workflow specs, or product docs, but those markdown files are not live runtime skills and are not loaded by the app. The archive index at `docs/skills/README.md` explains how to translate stale desktop-harness assumptions into current Sitewise concepts.

## Deferred Scope

The following are out of scope for the current horizon:

- SQLite as a product data platform
- Electron or Tauri desktop packaging
- public SaaS launch work inside the local/private appliance horizon; see `docs/strategy/public-saas-reintegration.md` for the separate reintegration track
- firm-wide rollout as the immediate design center
- real-time multi-user collaboration
- Xero or accounting integration
- council portal automation
- external email sending as part of RFI export
- speculative specialist agents not tied to a proven workflow
- EOT-first typed record work
- broad replacement of all direct UI mutation routes

PostgreSQL and pgvector remain the data platform. Introducing SQLite would create a second product and is not part of this direction.

## Beta-Killer Risks

The current horizon is engineered specifically against these failure modes. If any one of them is true at beta time, the product loses trust faster than it earns it:

- bad first-time setup
- flaky document ingestion
- AI claims that cannot be cited back to project evidence
- lost or corrupted project data
- backups that exist but have never been restored
- model-key configuration that requires developer help
- approval-gate bypasses, even accidental ones
- issued outputs that need so much rework the AI did not actually save time

## Broader Rollout Gates

Before Sitewise moves past the one-PM/one-project design centre, all of the following should be true:

- backups are routine and have been restored end-to-end at least once
- updates and database migrations apply cleanly on a real install
- document ingestion is reliable enough that PMs stop watching it
- issued artefacts (reports, RFIs, transmittals) are versioned
- project export/import handoff works for a real handover
- health checks and error reporting cover app, database, workers, storage, Redis, RAG
- at least one weekly workflow is useful enough that real PMs would actively miss it if removed

## Model Strategy

Model routing should be by task class, not by named frontier model. The product decides task class and budget; the admin/model registry maps that to the current best provider/model. Intended task classes:

- routine
- drafting
- deep reasoning
- extraction

Today the codebase uses three feature groups (`extraction`, `generation`, `chat`); see `CODEBASE.md` for the current implementation map. The direction is to widen this into the four task classes above so model choices can change without roadmap churn.

## Glossary

Compact definitions of terms the rest of the docs assume:

- **Project workspace** - the main authenticated workspace for one project: details, profile, objectives, cost plan, variations, invoices, program, risks, notes, meetings, reports, stakeholders, procurement records, documents, knowledge libraries.
- **Project profiler** - the structured project classification model (building class, subclass, project type, scale, region/state, procurement route, complexity, inferred objectives). Drives domain tag resolution, knowledge filtering, objectives generation, and context assembly.
- **Project workspace entity** - any editable project record in the workspace (cost line, variation, invoice, program activity/milestone, objective, risk, note, meeting, report, stakeholder, document, transmittal, addendum, RFT, TRR, tender evaluation).
- **Application action** - a registered project operation that owns validation, preview diff, approval policy, apply logic, event emission, and audit. New agent and workflow writes go through actions; existing direct UI routes converge onto actions over time.
- **Approval gate** - the user-control mechanism for proposed writes. Higher-risk operations produce an approval record and a diff card before data changes; apply uses optimistic row-version locking where the target entity supports it.
- **Agent system** - the chat-based AI layer. Specialists use read tools freely and mutating tools only through approval-gated paths. Long-form `docs/agents/*.md` files may describe wired or unwired specialists; `CODEBASE.md` names the current runtime shape.
- **Canonical project truth** - structured PostgreSQL records and stored files. Chat is interaction history. AI memory is editable preference/context only.
- **Typed-record pilot** - RFI. The current implementation is schema-backed and includes evidence, lifecycle audit, issued artefact versions, and action-backed AI proposals. EOTs, defects, site instructions, progress claims, determinations, and notices wait until the RFI pattern is proven.
- **Flagship workflow** - briefing/reporting. The current implementation is the weekly report draft tracer.
- **Communication artifact** - a note, meeting, or project report. These share lifecycle behaviour around creation, editing, copy, attendees/distribution, sections, transmittals, exports, and AI-assisted content generation.
- **Document repository** - the project document store. Documents have versions, file assets, categories/subcategories, optional drawing metadata, and can be attached to communication artifacts or document sets.
- **RAG ingestion** - the pipeline that makes documents searchable: parse -> chunk (construction-aware structure) -> embed -> persist in the RAG database -> track sync status.
- **Knowledge library** - a curated domain library covering AU construction practice, contracts, cost management, program, procurement, NCC/AS references, and discipline-specific guidance. Shares ingestion with project documents.
- **Context assembly** - gathering project workspace facts, RAG excerpts, knowledge-library excerpts, and cross-module insights for an AI task. `assembleContext()` is the intended single external interface.
