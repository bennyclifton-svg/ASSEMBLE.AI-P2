# High-Level Strategy Direction

## Purpose

This document records the recommended strategic direction for migrating Sitewise from its current SaaS-oriented, multi-agent project workspace into a local-first, single-user product for construction PM workflows. It is intended to be read alongside `CODEBASE_B.md` before a planning or grill-me session.

The recommendation is deliberately selective. It adopts the parts of the proposed roadmap that have technical and product merit, rejects the parts that create premature complexity, and reframes the migration around one core product promise:

> Sitewise should become a private project record system where an AI project officer helps one PM keep the job coherent, grounded, evidenced, and ready to issue.

## Executive Verdict

The move toward a local-first, single-user Sitewise has merit. The target customer reality supports it: many boutique PM firms, client-side PMs, consultants, and smaller D&C teams assign one PM to one project. Collaboration often happens through issued artefacts - reports, minutes, transmittals, recommendations, correspondence - rather than through multiple people concurrently editing the same workspace.

However, Sitewise should not jump straight to a polished Electron desktop app, a full local-only architecture, or a rebuilt specialist-agent suite. The better near-term product shape is a **single-user project appliance**:

- Sitewise app
- local or private Postgres
- local file storage
- pgvector-backed document search
- background workers
- optional frontier model APIs
- a local agent bridge
- approval-gated writes through Sitewise actions

This appliance can run on a PM's machine, a small office server, or a private managed instance. That keeps the product local-first in spirit while avoiding the operational trap of making every early user manage a full database/worker stack alone.

## Strategic Position

Sitewise should not compete first as generic construction SaaS. It should compete as a private AI-assisted project record system for one PM.

The core product loop should be:

1. The PM adds project facts, documents, correspondence, and judgement.
2. Sitewise stores those facts in deterministic schema-backed records.
3. The AI reads the schema, documents, and project memory.
4. The AI proposes structured outputs or record changes.
5. The PM edits, approves, rejects, or issues.
6. Sitewise stores the final judgement, evidence, and audit trail.

The agent is not the product by itself. The product is the issued project record system. The agent is the drafter, analyst, checker, questioner, and project officer.

## What To Adopt From The Proposed Roadmap

### Adopt: Local-First / Single-User Direction

This aligns with actual PM practice and reduces the need to build expensive multi-user collaboration before there is evidence it matters.

Adopt this, but define "local-first" carefully:

- local/private data plane first
- optional cloud frontier reasoning
- single-user and single-project assumptions first
- no real-time collaboration in early product
- strong export, backup, and handoff instead of multi-user editing

### Adopt: Action Registry As The Agent Write Surface

The Action Registry should become the mandatory write path for agent and workflow writes. It owns validation, proposed diffs, approval policy, application logic, audit, and event emission.

This should not immediately require rewriting every UI route. For now:

- agent and workflow writes must use actions
- old agent applicators should be retired progressively
- UI routes can converge later, starting with high-risk domains

### Adopt: Stop Treating SKILL.md Files As Runtime Skills

The 38 `docs/skills/*/SKILL.md` files are misleading in their current location and naming. They are not runtime skills. They are source/reference material.

The recommendation is not to delete all of them immediately. Instead:

- move them out of `docs/skills`
- mark them as archived source material
- mine useful domain material into curated knowledge libraries, action specs, or product documentation
- delete stale desktop-harness/Python/project.db assumptions

The goal is codebase honesty, not knowledge destruction.

### Adopt: Runner Guard Reduction, But Incrementally

`runner.ts` contains many regex guards and recovery heuristics because the tool/action surface has been incomplete. Do not rewrite it all at once.

Recommended policy:

- stop adding new regex guard surfaces
- replace guard logic with stronger tool schemas, action policies, and approval constraints
- delete each guard section only when a safer typed path exists

### Adopt: Grill-Me / Briefing As A Core Product Moment

The grill-me / briefing pattern is one of the strongest product ideas. It fits construction PM work because many critical decisions are not simple form fills. They are judgement calls.

This should be implemented as a product workflow, not as a markdown skill:

- read project state
- read attached documents through RAG and targeted full extracts where needed
- ask one question at a time
- offer recommended answers
- separate conversation from structured extraction
- write only through explicit actions/approvals
- store the user's final judgement as project memory or record state

### Adopt: Demand-Driven Specialist Agents

Do not build specialist agents because the org chart looks complete. Build them when a real project workflow demands them.

The early question should be:

> What issued output or project decision does this workflow improve?

Not:

> Which agent persona are we missing?

## What To Modify Or Reject

### Modify: Record-Type Rationalisation

Typed records are important, but the proposed roadmap tries to move too many at once.

Do not convert RFI, Notice, EOT, Defect, and Review Note together in the first horizon. Pick one typed-record pilot and take it end to end:

- schema
- migration
- UI
- agent read tools
- agent proposed writes
- approval card
- export/reporting
- audit
- lazy promotion from old notes

Recommended first typed record: **RFI or Notice**, not EOT.

EOT is high-value but too coupled for the first pilot. A credible EOT record wants contract clauses, notices, delay events, critical path logic, evidence, time bars, superintendent assessment, and correspondence. It is a tempting first demo but a poor first schema pattern.

Use RFI or Notice to prove the record architecture. Then apply the pattern to EOT once program/evidence/contract context is stronger.

### Modify: Local Packaging

Electron-wrapping the app too early is risky. The hard part is not the window frame. The hard part is reliably packaging:

- Postgres
- pgvector
- Redis
- workers
- file storage
- model keys
- migrations
- backups
- upgrades
- crash/error reporting

Recommended path:

1. Local developer appliance with Docker Compose.
2. Concierge private installs for early users.
3. Single-command local launcher.
4. Only then consider Electron/Tauri polish.

Do not migrate to SQLite. Sitewise depends on Postgres and pgvector patterns. SQLite would create a second product.

### Modify: Frontier Model Strategy

Use frontier models for deep judgement workflows, but do not pin the roadmap to a named model. Model availability, pricing, and capability will change.

Recommended abstraction:

- routine model tier
- drafting model tier
- deep reasoning model tier
- extraction model tier

The product decides task class and budget. The admin/model router maps that to the current best provider/model.

### Reject: Full Specialist-Agent Expansion Before Product Proof

Do not build Planning, Design, Finance, Procurement, Delivery, Correspondence, Feasibility, and Coordinator as full agents in sequence.

Instead, build one deep workflow at a time. A workflow is done when it produces a useful issued artefact or structured project decision.

### Reject: Xero / Accounting Integration In The Early Roadmap

Accounting integration is real value eventually, but it is a distraction now. Start with CSV import/export and manually reviewed cost-plan pushes.

### Reject: 40-User Rollout As A Planning Assumption

Firm-wide adoption may happen, but the roadmap should not assume it by week 40. Local-first products need reliable install, updates, backups, support, and user education before broad rollout.

Use staged adoption gates instead of calendar optimism.

## Recommended Roadmap

## Phase 0 - Strategic Pin-Down

Duration: 1 week.

Goal: decide the product shape before changing architecture.

Decisions:

- Sitewise is a single-user project appliance first.
- The PM is the accountable professional.
- The AI is a project officer, not an autonomous PM.
- The schema and files are canonical.
- Memory is preference/context only, never project truth.
- Multi-user collaboration is deferred.
- SaaS is deferred except as optional private managed hosting.

Deliverables:

- one-page product positioning statement
- one-page deployment model decision
- list of first three workflows
- decision on first typed-record pilot
- decision on what "local-first" means operationally

Gate:

If the product cannot be explained in one sentence to a PM, do not start packaging.

## Phase 1 - Codebase Honesty And Agent Write Discipline

Duration: 4-8 weeks.

Goal: remove architectural confusion without entering a broad rewrite.

Work:

- Archive or rename `docs/skills` so they are no longer presented as runtime skills.
- Make Action Registry mandatory for agent/workflow writes.
- Stop adding new legacy agent write tools.
- Retire old applicators progressively when action parity exists.
- Freeze new regex guard growth in `runner.ts`.
- Fix local database bootstrap and migration reliability.
- Add backup/restore basics.
- Create a short living architecture note derived from `CODEBASE_B.md`.
- Build one typed-record pilot end to end.

Recommended typed-record pilot:

- RFI or Notice first.
- EOT later.

Gate:

One typed record can be manually created, proposed by the agent, approved, exported, audited, searched, and promoted from a legacy note.

## Phase 2 - Local/Private Single-User Appliance

Duration: 6-10 weeks.

Goal: make Sitewise privately runnable by one PM.

Work:

- Keep Postgres and pgvector.
- Package app, database, Redis, workers, file storage, and migrations as one local/private appliance.
- Add health checks.
- Add backup verification.
- Add restore.
- Add model key setup.
- Add project export/import bundle.
- Support local files by default.
- Keep Supabase/cloud storage optional.

Preferred early packaging:

- Docker/private appliance first.
- Installer polish later.

Gate:

A non-developer can run Sitewise with guided setup once, then continue using it without developer intervention.

## Phase 3 - Agentic Wedge Workflows

Duration: 8-12 weeks.

Goal: prove Sitewise feels meaningfully different from a normal PM tool.

Build one flagship workflow first:

1. Briefing / grill-me refinement
2. Weekly project briefing and report draft
3. Tender evaluation deep job

Recommended order:

Start with **briefing / grill-me refinement** because it exercises the product thesis:

- structured project state
- document grounding
- frontier reasoning
- recommended-answer interaction
- human judgement capture
- approval-gated writes

Then build **weekly project briefing/report draft**, because it maps directly to how PMs collaborate through issued artefacts.

Tender evaluation should follow once RAG, artefact storage, stable evaluation rows, and action writes are reliable.

Persistent memory:

- store PM preferences and writing style
- store recurring assumptions only when approved
- keep memory editable and reviewable
- never let memory override schema facts

Gate:

Two or three real PMs use one workflow weekly and would be annoyed to lose it.

## Phase 4 - Pilot Hardening

Duration: 3-6 months after early workflow proof.

Goal: make the product boring enough to trust.

Work:

- error reporting
- failed-job recovery
- backup monitoring
- versioned issued outputs
- project handoff
- in-app onboarding
- short workflow-specific training
- curated firm knowledge packs
- reviewable AI memory
- reliability fixes from real usage

Still defer:

- real-time collaboration
- mobile apps
- council portal automation
- full accounting integrations
- speculative agents
- public marketing infrastructure

Gate:

Five to ten PMs use Sitewise on live projects, and the product survives real reporting pressure.

## Phase 5 - Strategic Choice

Do not decide this now.

After real usage, choose one:

- remain internal and deepen
- sell private single-tenant installs to similar firms
- offer managed private cloud
- build team/multi-user tier
- pursue strategic sale

The choice should be driven by evidence from actual PM usage, not by the current architecture.

## First Work To Start

Do not start with Electron. Do not start with EOT. Do not start with more agents.

Start with three parallel decisions/work items:

1. **Define the local/private appliance target.**
   - What runs where?
   - How are backups handled?
   - Where are files stored?
   - How are model keys configured?

2. **Make agent writes action-only from this point forward.**
   - No new legacy mutating tools.
   - Every new agent write is an action.

3. **Build one typed-record pilot.**
   - Prefer RFI or Notice.
   - Take it through schema, UI, action, approval, export, audit, and old-note promotion.

## Questions For The Grill-Me Session

1. Is local-first a real user requirement, or a reaction against SaaS complexity?
   - Recommended answer: local/private single-tenant first, not pure desktop-only.

2. What is the first workflow PMs will use every week?
   - Recommended answer: briefing/reporting before deep tender AI.

3. What is the agent allowed to write?
   - Recommended answer: only through Action Registry and approval gates.

4. What is canonical: chat, memory, documents, or schema?
   - Recommended answer: schema and files. Memory is preference/context only.

5. Which typed record proves the pattern without legal overreach?
   - Recommended answer: RFI or Notice first; EOT later.

6. What makes Sitewise better than a chatbot over project files?
   - Recommended answer: deterministic records, approvals, audit, issued artefacts, and captured PM judgement.

7. What would make beta fail?
   - Recommended answer: bad setup, flaky ingestion, uncited AI claims, lost data, or outputs requiring too much rework.

8. What should not be built yet?
   - Recommended answer: mobile, real-time collaboration, council portal automation, full accounting integration, speculative agents.

9. What is the product's wedge?
   - Recommended answer: one PM producing better project records faster, with AI help that remains grounded in project truth.

10. What must be true before firm-wide rollout?
    - Recommended answer: reliable backups, reliable updates, stable ingestion, versioned outputs, and at least one workflow PMs use weekly.

## Final Recommendation

Migrate Sitewise toward a local-first, single-user product, but do it through a private project-appliance architecture rather than a rushed desktop rewrite.

The immediate priority is not more agents. It is trust:

- trustworthy data shapes
- trustworthy writes
- trustworthy document grounding
- trustworthy local/private operation
- trustworthy issued outputs

Once those are in place, the agentic layer becomes much more valuable. Without them, more agent capability will only add surface area to an already drifting architecture.

