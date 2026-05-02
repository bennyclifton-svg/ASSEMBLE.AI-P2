# ADR 0002: Chat as Hybrid Primary Operator

## Status

Accepted

## Date

2026-05-03

## Context

The chat feature has moved beyond read-only Q&A. It now has specialist agents, an Orchestrator, tool use, approval-gated writes, project-event refresh, approval chips, live view context, and the first Application Action Registry migration.

The strategic question is no longer whether chat can answer project questions. It is whether chat should become a primary way to operate the application while preserving the direct-manipulation UI that users already rely on.

The chat window purpose work further clarifies the product role: chat should feel like a senior Project Manager front-door for the principal, not a miscellaneous assistant panel or a visible committee of specialists.

## Decision

Adopt chat as a **hybrid primary operator**.

Chat should be able to pursue operational outcomes across the project workspace, while the manual UI remains available for fast direct edits and inspection. Both entry points should converge on the same server-side Application Action Registry. To the user, chat presents as one Project Manager voice; the Orchestrator coordinates specialists and workflows behind that surface.

The operating model is:

1. Chat pursues the operational outcome, not just the literal first action. For example, an instruction to create a variation may also imply cost, programme, risk, note, and correspondence steps.
2. Chat may freely read, plan, and generate approval-ready proposals. It should stop for a clarifying question only at genuine branch points.
3. Writes proposed by chat must be staged through explicit approval controls. Natural-language approval is deferred.
4. Grouped approvals are dependency-aware workflows, not a flat stack of cards.
5. Edits and rejections should adapt the remaining workflow by aborting, skipping, recalculating, or asking the user where needed.
6. Chat may control reversible UI state, such as navigation, focus, modal opening, row selection, scrolling, and document selection. It must not use UI control as a substitute for registered data actions.
7. Chat remains reactive for now. Proactive background monitoring is deferred.
8. Action authority is enforced per domain/action by the registry, not only by prompts.
9. The Orchestrator owns cross-domain workflow state. Specialists own domain-specific steps.
10. The first dependency-aware workflow is `issue variation`.
11. Durable workflow state starts from day one, but minimal: `workflow_runs`, `workflow_steps`, and step states of `pending`, `running`, `awaiting_approval`, `applied`, `skipped`, `rejected`, and `failed`.
12. Durable workflow write steps must use registered application actions. Legacy agent tools may remain during migration, but should not be the write surface for new workflows.
13. Workflows should be evidence-first. The agent gathers available project data before asking one branch-setting question only if needed.
14. Every workflow should show a short execution brief before approval cards appear.
15. Every applied workflow step should verify that the app state actually changed, then produce a concise completion summary.
16. Chat/workflow operating preferences live as organization/project settings, and each workflow run snapshots the effective settings for auditability.
17. The chat surface should use workflow discovery chips/templates as hints, never gates. Users can type free-form outcomes; chips teach the bounded catalog.
18. Chat has a grounded Q&A fallback when a request is not an actionable workflow. Answers should come from project artefacts and owned/licensed reference corpora, not unconstrained general knowledge where project evidence is required.
19. Off-menu requests should receive a graceful in-persona refusal and a project-related redirection.
20. Workflow proposals should use a plan-first preview card: understood goal, evidence used, step DAG, dependencies, per-step preview, and risk classification. This does not remove explicit approval controls; it makes them legible.
21. One persistent Q&A thread per project plus one audit thread per workflow run is the target threading model. Workflow threads should link back to their register entry or affected artefact.
22. Chat is a primary intake surface. Text, paste, and file drop should be supported and routed through the existing upload/indexing pipeline before workflows or Q&A rely on the content.
23. Chat is strictly project-bounded in Phase 1. Cross-project memory or precedent retrieval is deferred and must be explicit when introduced.
24. The dock should be visible as a project workspace affordance, not hidden as an occasional utility. Expanded-by-default is the preferred Phase 1 posture unless usability testing shows it obstructs core work.

## Consequences

- The Application Action Registry is the command surface for chat, UI controls, and workflows.
- Existing UI routes and agent tools should progressively become adapters over registered actions.
- The workflow engine should be built around dependency-aware approval steps, not around chat-message parsing.
- Workflow modules should expose a preview-plan capability before execution starts.
- The project event surface should gain typed reversible UI intents such as navigation, focus, modal, selection, and scroll.
- The Orchestrator should move from deterministic routing toward Project Manager front-door workflow ownership.
- The `issue variation` workflow is the tracer bullet for operational agency; RFI raise and track, progress claim assessment, site instruction issuance, and transmittal are the next workflow catalog candidates.
- Approval UX should prioritise explicit controls before natural-language approval.
- Action risk classes must be deliberately chosen: `safe` for read-only/cosmetic/trivially reversible actions, `confirm` for low-impact single-entity writes, `propose` for money or schedule impact, and `sensitive` for contractual commitment or external-facing issuance.
- The chat header, placeholder, and prompt language should reinforce the Project Manager role and one-voice model. Specialist badges may be informational, but users should not need to pick a specialist for normal work.
- Workflow runs should carry thread linkage, current workflow context, and preference snapshots so the conversation becomes part of the audit trail.
- File intake through chat requires attachment status, indexing status, and clear limitations when content is still processing.
- Retrieval should default to the current project. Any future `projectIds[]` expansion must default to `[currentProjectId]`.
- Future proactive monitoring should wait until the reactive workflow model is stable.
