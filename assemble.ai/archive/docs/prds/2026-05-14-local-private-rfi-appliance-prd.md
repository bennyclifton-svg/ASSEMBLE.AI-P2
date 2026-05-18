# PRD: Local/private project appliance with action-only writes and RFI pilot

**Date:** 2026-05-14
**Status:** Draft - ready for triage
**Triage label:** `needs-triage`
**Reference inputs:** `HIGH_LEVEL_STRATEGY.md`, `CODEBASE_B.md`, grill-me strategy session

---

## Problem Statement

Sitewise is moving from a SaaS-oriented, multi-agent project workspace toward a sharper product promise: a private project record system where an AI project officer helps one PM keep a live project coherent, evidenced, and ready to issue.

The current codebase already contains much of the right substrate: PostgreSQL, pgvector-backed RAG, local file storage fallback, agents, approvals, workflows, action definitions, document ingestion, project records, and briefing work. But the product and architecture are not yet aligned around the new single-user/local-private direction.

The user-facing problem is trust. A PM will not rely on Sitewise for real project records if setup is fragile, AI claims are uncited, writes bypass approvals, documents and schema disagree, typed records are only text notes, backups are unproven, or issued outputs still need too much rework. The codebase also carries confusing historical material: markdown skill files that are not runtime skills, stale deployment assumptions, partial provider abstraction, parallel write paths, runner guard heuristics, and missing typed registers for contract-administration records such as RFIs.

The immediate need is not a desktop wrapper or more speculative specialist agents. The immediate need is to make Sitewise boringly trustworthy around one project, one accountable PM, one typed-record pilot, and one weekly AI-assisted workflow.

## Solution

Build a staged local/private single-user appliance around Sitewise's strongest product loop:

1. The PM adds project facts, documents, correspondence, and judgement.
2. Sitewise stores project truth in schema-backed records and stored files.
3. The AI reads project records, documents, RAG excerpts, and approved memory.
4. The AI proposes record changes or issued artefacts through registered actions.
5. The PM reviews, edits, approves, rejects, or issues.
6. Sitewise stores the final decision, evidence, audit trail, and exportable artefact.

The first implementation horizon should lock the strategic shape and prove it through an RFI typed-record pilot:

- local/private appliance first, not pure desktop-only and not public SaaS-first
- one PM running one live project as the design centre
- schema and files as canonical truth
- memory limited to editable preferences and recurring context
- agent and workflow writes only through the Action Registry and approval gates
- direct UI writes migrated later, starting with high-risk/shared domains
- RFI as the first typed contract-administration record
- briefing/reporting as the first flagship weekly workflow
- Docker/private appliance before Electron
- codebase honesty around archived skill source material, deployment docs, local bootstrap, and secret hygiene

The outcome should be a PM-facing product that feels less like a generic chatbot over files and more like a controlled project record system with a useful AI project officer sitting inside it.

## User Stories

1. As a project manager, I want Sitewise to run as a private project appliance, so that my project records stay under my control.
2. As a project manager, I want to use Sitewise for one live project without needing my whole firm onboarded, so that I can prove value quickly.
3. As a project manager, I want schema-backed records and stored files to be the source of truth, so that chat history never becomes the project record.
4. As a project manager, I want AI memory to store only preferences and recurring context, so that it cannot override project facts.
5. As a project manager, I want every AI-proposed change to appear as an approval card, so that I can review before anything changes.
6. As a project manager, I want approval cards to show clear before/after diffs, so that I understand what will change.
7. As a project manager, I want to edit an AI proposal before applying it, so that the final judgement is mine.
8. As a project manager, I want rejected AI proposals to leave an audit trail, so that later project history remains explainable.
9. As a project manager, I want RFIs to be first-class records rather than generic notes, so that I can track responsibility, status, due dates, responses, and evidence.
10. As a project manager, I want to create an RFI manually, so that the register works even when I do not use AI.
11. As a project manager, I want the AI to draft an RFI from project context and documents, so that routine contract-administration drafting is faster.
12. As a project manager, I want an AI-drafted RFI to remain pending until I approve it, so that no contractual communication is issued accidentally.
13. As a project manager, I want an RFI number and status, so that the register is easy to scan.
14. As a project manager, I want to assign an RFI to a stakeholder, so that responsibility is visible.
15. As a project manager, I want to set an RFI due date, so that follow-up is not dependent on memory.
16. As a project manager, I want to link documents, correspondence, drawings, meeting items, and notes to an RFI, so that the evidence is available in one place.
17. As a project manager, I want to record an RFI response, so that the RFI can move from open to responded or closed.
18. As a project manager, I want to export or issue an RFI artefact, so that collaboration can continue through normal project correspondence.
19. As a project manager, I want legacy RFI notes to be promoted into typed RFIs, so that old data is not stranded.
20. As a project manager, I want promotion from a legacy note to preserve the original note link, so that history is not erased.
21. As a project manager, I want RFI changes to refresh the project UI automatically, so that the register reflects approved changes immediately.
22. As a project manager, I want the AI to cite project documents when recommending RFI content, so that I can check the basis of its draft.
23. As a project manager, I want the AI to ask one branch-setting question only when a required RFI fact is genuinely ambiguous, so that the workflow stays concise.
24. As a project manager, I want the RFI register to support filters for open, overdue, responded, closed, and draft records, so that I can manage current work.
25. As a project manager, I want overdue RFIs to be obvious, so that I can follow up before they create programme or cost risk.
26. As a project manager, I want weekly project briefing/reporting to use current records and documents, so that reporting starts from project truth.
27. As a project manager, I want the briefing workflow to ask one question at a time with a recommended answer, so that capturing judgement is quick.
28. As a project manager, I want accepted briefing answers to become approved memory or records, so that useful judgement persists.
29. As a project manager, I want a weekly report draft grounded in RFIs, cost, program, risks, correspondence, and documents, so that issued reports need less rework.
30. As a project manager, I want report drafts to distinguish facts, assumptions, and recommendations, so that I know what needs review.
31. As a project manager, I want generated reports to cite evidence where relevant, so that the output can withstand project scrutiny.
32. As a project manager, I want final issued outputs to be versioned, so that the project record shows what was actually issued.
33. As a project manager, I want the local appliance to include backups, so that I can recover if something fails.
34. As a project manager, I want restore to be tested, so that backups are not false comfort.
35. As a project manager, I want model keys to be configured clearly, so that setup is not a developer-only task.
36. As a project manager, I want health checks for the app, database, workers, storage, Redis, and RAG, so that I can see when the appliance is ready.
37. As a project manager, I want local file storage to work by default, so that the product does not require cloud storage just to start.
38. As a project manager, I want project export/import bundles, so that I can hand over or archive a project.
39. As a project manager, I want errors from ingestion or AI jobs to be visible and recoverable, so that failed background work does not silently weaken the record.
40. As a project manager, I want the product to avoid ungrounded AI claims, so that I can trust what appears in reports and recommendations.
41. As an admin, I want deployment documentation to match the real local/private appliance model, so that setup instructions are not misleading.
42. As an admin, I want secrets removed from docs and build arguments, so that no customer data is put at risk.
43. As an admin, I want the markdown skill files to be archived as source material, so that nobody mistakes them for live runtime capabilities.
44. As an admin, I want useful skill-domain content mined into knowledge libraries, action specs, prompts, or product docs, so that knowledge is preserved without false runtime claims.
45. As an admin, I want model routing to use task classes rather than hard-coded named models, so that model choices can change without roadmap churn.
46. As a developer, I want all new agent and workflow writes to go through registered actions, so that validation, approval, audit, and event emission are consistent.
47. As a developer, I want legacy mutating tools to stop growing, so that the migration does not create more surfaces to retire.
48. As a developer, I want runner regex guards to be frozen and retired incrementally, so that typed schemas and action policies replace fragile recovery logic.
49. As a developer, I want the RFI pilot to prove schema, migration, UI, actions, approvals, export, audit, search, and legacy promotion together, so that later typed records follow a known pattern.
50. As a developer, I want EOTs to wait until contract, programme, notice, delay, evidence, and assessment context is stronger, so that the first typed-record pilot does not overreach.
51. As a developer, I want direct UI routes to migrate after agent/workflow writes, so that the team can reduce risk without a broad rewrite.
52. As a developer, I want a living architecture note derived from the codebase review, so that future work starts from current truth.
53. As a developer, I want local database bootstrap to be reliable from a fresh checkout, so that early private installs are repeatable.
54. As a developer, I want RAG schema setup to be explicit and migration-backed, so that document search does not depend on tribal knowledge.
55. As a developer, I want appliance health checks to be automatable, so that support can diagnose setup failures quickly.
56. As a beta user, I want one weekly workflow that is obviously useful, so that Sitewise earns trust before expanding into more modules.

## Implementation Decisions

- Sitewise is positioned as a local/private single-user project appliance first. It may run on a PM's machine, a small office server, or a private managed instance. It is not pure desktop-only and not public SaaS-first.
- The first accountable user is one PM running one live project. Firm-wide rollout is a later gate, not the initial design centre.
- Canonical truth is structured schema plus stored files. Chat is interaction history. AI memory is editable preference/context only.
- Agent and workflow writes become action-only from this point forward. New mutating tools must be registered application actions with validation, preview, approval policy, apply logic, audit, and event emission.
- Existing direct UI writes can remain temporarily. They should converge onto actions later, starting with typed records, approvals, variations, program, correspondence, and issued artefacts.
- RFI is the first typed-record pilot. It is concrete enough to prove the pattern and less coupled than EOT.
- EOT, defects, site instructions, progress claims, determinations, and notices remain future typed records until the RFI pattern is proven.
- The RFI record should capture, at minimum, project, number, title, question/request text, status, priority, raised-by party, assigned/responsible party, due date, issued date, response date, response text, linked evidence, source note when promoted, audit metadata, and timestamps.
- The RFI lifecycle should distinguish draft, open/issued, responded, closed, cancelled, and overdue-derived display state.
- RFI attachments and evidence links should reuse the existing document and communication artefact concepts rather than creating an isolated file model.
- Legacy RFI notes should be lazily promotable into typed RFI records. Promotion must preserve a link to the source note and avoid deleting the note during the first migration horizon.
- The RFI action set should include create, update, record response, close/reopen, link evidence, export/issue artefact, and promote from legacy note.
- RFI actions should be available to manual UI, agents, and workflows through a stable domain service. The service should own invariants such as status transitions, numbering, due-date handling, and evidence-link validation.
- Approval previews for RFI actions should show user-readable diffs and flag external-facing or contractual-risk changes.
- RFI export should produce an issued artefact that is versioned and auditable. Actual email sending remains out of scope.
- The briefing/reporting loop is the first flagship workflow. It should read project state, ask one question at a time with a recommended answer, capture final PM judgement, and write approved outcomes through actions.
- The existing briefing PRD remains a narrower subfeature reference. This PRD broadens the product strategy around briefing/reporting, RFI records, and appliance trust.
- Weekly reporting should use structured project records, documents, RAG excerpts, and approved memory. It should not rely on chat transcript as truth.
- AI memory should have a review/edit/delete surface and should never override schema facts or document evidence.
- Model strategy should avoid pinning to named frontier models. The product should route by task class such as routine, drafting, deep reasoning, and extraction, mapped to current providers/models by admin configuration.
- Provider abstraction gaps should be closed progressively, especially extraction paths that still hard-code a provider/model.
- The local/private appliance should continue to use PostgreSQL and pgvector. SQLite is not introduced as a second product.
- The first packaging target is Docker/private appliance: app, database, pgvector, Redis, workers, file storage, migrations, model-key setup, health checks, backup, restore, and project export/import.
- Electron or Tauri should wait until the database, worker, storage, backup, migration, and recovery experience is reliable.
- Local database bootstrap should stop depending on stale initialization assumptions. Fresh setup should have one documented, repeatable path.
- RAG schema setup should be migration-backed or otherwise explicitly automated in the appliance flow.
- The markdown skill files should be archived or renamed as source/reference material, not runtime skills. Useful material should be mined into knowledge libraries, prompts, action specs, or product docs.
- Deployment and operational docs should be scrubbed of secrets and aligned to the local/private appliance direction.
- Runner regex guards and recovery heuristics should be frozen. Each guard should be retired only after a typed action/tool schema, approval policy, or deterministic validator replaces it.
- Specialist agents should remain demand-driven. New specialists are added only when a real workflow or issued artefact proves the need.

## Testing Decisions

- Good tests for this horizon should exercise external behaviour: approved writes change records, rejected writes do not; RFI lifecycle transitions are valid; legacy notes promote without data loss; backups restore usable project data; briefing/reporting produces grounded output from records and evidence.
- Tests should avoid pinning prompt wording, private implementation details, or UI styling that is expected to evolve.
- The Action Registry policy should be tested so new agent/workflow mutating paths cannot bypass registered actions.
- The RFI domain service should be tested for numbering, status transitions, due-date handling, responsible-party assignment, evidence-link validation, and source-note preservation.
- RFI action definitions should be tested for validation, preview diffs, approval policy, apply behaviour, audit rows, and project event emission.
- RFI legacy-note promotion should be tested against realistic note records, including missing optional fields and duplicate promotion attempts.
- RFI export should be tested for stable issued-output content and versioning metadata.
- The agent RFI workflow should be tested with a fake model client that emits scripted read, question, proposal, and approval events.
- The briefing/reporting workflow should be tested at the workflow boundary with fake model output and real project records, confirming that accepted judgement is stored only through approved writes.
- AI memory should be tested for edit/delete behaviour and for precedence rules where memory conflicts with schema facts.
- Appliance operations should have smoke tests for fresh setup, migrations, health checks, backup creation, restore into a clean environment, document ingestion, and worker startup.
- Secret hygiene should have a lightweight automated check that flags committed production credentials in operational docs.
- Codebase honesty changes should have a documentation check or review checklist confirming archived skill material is no longer described as runtime capability.
- Prior art to mirror: existing action registry tests, action dispatch tests, workflow runner tests, issue-variation workflow tests, and the briefing PRD's fake-model approach.

## Out of Scope

- Electron or Tauri desktop packaging.
- Mobile apps.
- Real-time multi-user collaboration.
- Firm-wide rollout planning.
- Public SaaS launch work.
- Xero or accounting integration.
- Council portal automation.
- Full mailbox polling or external email sending.
- EOT as the first typed record.
- Defect, site instruction, progress claim, determination, and notice registers beyond follow-on design notes.
- Building a broad roster of speculative specialist agents.
- Natural-language approval for writes.
- SQLite migration.
- Cross-project memory or precedent retrieval.
- Full communication-artifact unification beyond what the RFI pilot needs.
- Complete replacement of all direct UI mutation routes.

## Further Notes

- North-star sentence: Sitewise is a private project record system where an AI project officer helps one PM keep the job coherent, evidenced, and ready to issue.
- The RFI pilot is the architectural proof, not the whole product. It should establish a reusable path for later typed records.
- The beta-killer risks to design against first are bad setup, flaky ingestion, uncited AI claims, lost data, weak backups, model-key confusion, approval bypasses, and outputs requiring too much rework.
- Broader rollout should wait for restore-tested backups, stable updates and migrations, reliable ingestion, versioned issued outputs, export/import handoff, health checks, error reporting, and at least one weekly workflow PMs would miss if removed.
- This PRD intentionally defers the strategic choice between internal product, private single-tenant installs, managed private cloud, team tier, or sale until real PM usage produces evidence.
