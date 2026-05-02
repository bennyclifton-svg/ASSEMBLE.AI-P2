# Chat Control Surface - Adopted Implementation Plan

## Decision

Proceed with chat as a universal control surface by introducing a shared Application Action Registry. Agents should not click DOM controls. UI controls and chat agents should invoke the same server-side actions, with shared validation, preview diffs, approval policy, application logic, events, and audit records.

The operating decision is captured in [ADR 0002: Chat as Hybrid Primary Operator](../adr/0002-chat-as-hybrid-primary-operator.md). In short: chat is a primary way to operate the app, the manual UI remains available, and both surfaces converge on registered application actions.

This plan adopts the operating model from `2026-05-02-chat-as-control-surface-operating-model.md` with the following corrections:

- Internal action ids may be dotted, e.g. `finance.cost_plan.update_line`, but generated LLM tool names must be provider-safe aliases, e.g. `action_finance_cost_plan_update_line`, or use a generic `invoke_action` later.
- Approval policy is actor-aware. A human UI edit can often apply immediately while the same mutation from an agent should propose an approval card.
- UI navigation/focus intents belong on the project workspace event surface, not as DOM clicks.
- Durable workflow engine work starts after the action registry and view context are proven.
- Legacy `toolName` approvals remain supported while new action-backed approvals are introduced.

## Target Model

Every meaningful operation is an action:

```ts
defineAction({
  id: 'finance.cost_plan.update_line',
  toolName: 'action_finance_cost_plan_update_line',
  domain: 'finance',
  actorPolicies: {
    user: 'run',
    agent: 'propose',
  },
  inputSchema,
  preview(ctx, input) => diff,
  apply(ctx, input) => output,
  emits: [{ entity: 'cost_line', op: 'updated' }],
  uiTarget: { tab: 'cost-planning', focusEntity: 'cost_line' },
  agentAccess: ['finance', 'orchestrator'],
})
```

Risk policies:

- `run`: apply immediately after validation.
- `confirm`: UI can show lightweight confirmation; chat can show an explicit chip.
- `propose`: create an approval record and wait for user approval.
- `sensitive`: require richer justification and future second-party approval.

## Stage 1 - Registry Foundation

Deliverable: actions can be registered, listed, audited, run, and proposed without replacing the existing agent tools yet.

Tasks:

1. Add `src/lib/actions/{types,define,registry}.ts`.
2. Add `action_invocations` table and migration.
3. Add `POST /api/actions/[id]/run`.
4. Add `POST /api/actions/[id]/propose`.
5. Keep existing `approvals` and `applicators` paths intact.

Acceptance:

- A test action can be registered and invoked.
- An `action_invocations` row is written for each run or proposal.
- Existing chat approvals still work unchanged.

## Stage 2 - First Action Migration

Deliverable: one existing approval-gated operation is powered by the registry end to end.

Initial action:

- `correspondence.note.create`

Why this first:

- It is low-risk, already has `create_note`, has clear approval card behavior, and refreshes through existing note project events.

Tasks:

1. Register `correspondence.note.create`.
2. Generate or wrap an agent tool alias for it.
3. Add legacy applicator compatibility if needed.
4. Verify chat creates an approval card and approval creates the note.

## Stage 3 - Five-Action Breadth Proof

Migrate these actions:

- `planning.objectives.set`
- `finance.cost_plan.update_line`
- `finance.variations.create`
- `program.activity.update`
- `correspondence.note.create`

Acceptance:

- Each can be called from the action API.
- Each can be proposed by chat.
- Each writes `action_invocations`.
- Existing UI refreshes from project events.

## Stage 4 - Live View Context

Deliverable: every chat turn includes structured screen context.

Context shape:

```ts
{
  projectId: string,
  route: string,
  tab?: string,
  sub?: string,
  focusedEntity?: { kind: string, id: string },
  pendingApprovalIds: string[],
  recentlyViewedIds: string[],
}
```

Tasks:

1. Add `ViewContextProvider`.
2. Attach view context to chat message POST body.
3. Inject it into agent turns as structured context.
4. Use it to resolve approval references and "do it here" instructions.

## Stage 5 - Approval Chips

Deliverable: users can control approval state from the chat input without natural-language parsing.

Chips:

- `Approve all`
- `Reject all`
- `Approve 1st`
- `Reject 2nd`
- `Edit 1st`

Natural-language approval parsing is deferred until telemetry proves the chips are insufficient.

For workflows, approval chips are complemented by a plan-first preview card. The card explains the understood goal, evidence used, step dependencies, per-step previews, and risk classifications before any approval controls appear.

## Stage 6 - UI Intent Actions

Deliverable: chat can navigate and focus the application without DOM automation.

Actions:

- `view.navigate`
- `view.focus_entity`
- `view.open_modal`
- `view.select_documents`

These emit typed project events such as `ui_intent`, and the project workspace responds by changing URL state or local selection state.

## Stage 7 - Workflow Engine

Deliverable: durable multi-step workflows over actions.

Tables:

- `workflow_runs`
- `workflow_steps`

Workflow modules are TypeScript, not YAML. Steps reference action ids and dependency ids. Rejection branches and failure policies are explicit.

Workflow operating rules:

- The Orchestrator owns workflow state; specialists own domain steps.
- Workflow write steps use registered application actions only.
- Workflow modules expose `previewPlan()` so the user sees a plan card before execution.
- Workflows are evidence-first and ask one branch-setting question only when needed.
- Each workflow begins with a short execution brief before approvals appear.
- Approvals are dependency-aware and individually editable/rejectable.
- Edits and rejections adapt downstream steps by aborting, skipping, recalculating, or asking the user.
- Applied steps verify that the expected project state actually changed.
- Effective org/project operating preferences are snapshotted on each workflow run.
- Workflow runs should link to a workflow-specific chat thread when the threading model is implemented.

First workflow:

- `issue-variation`: assess variation impact, propose variation, propose cost-plan update, propose programme update, propose correspondence note.

Next workflow catalog candidates:

- `raise-and-track-rfi`
- `assess-progress-claim`
- `issue-site-instruction`
- `create-transmittal`

## Stage 8 - Chat Intake And Persona Surface

Deliverable: the chat window feels like the Project Manager front-door and can receive work inputs directly.

Tasks:

1. Update header, placeholder, and prompt copy to present one Project Manager voice.
2. Keep specialist identity informational, not a required user choice.
3. Default the dock to expanded on project pages unless usability testing shows it obstructs core work.
4. Add paste and file drop support to the dock, routed through the existing upload/indexing pipeline.
5. Show attachment and indexing status before workflows or Q&A rely on uploaded content.
6. Keep retrieval project-bounded by default.

## Skill Model

Split existing `docs/skills/*` into two manifest styles over time:

- Workflow skills: declare owner agent, trigger conditions, actions used, required evidence, output artifacts, handoffs, and approval level.
- Knowledge skills: declare domain, tier, lookup keys, and eligible agents; loaded as RAG-style reference at turn time.

## Deferred

- Voice input.
- Haiku or small-model natural-language approval classifier.
- Proactive background monitoring.
- Removing UI buttons entirely.
- Redis/pubsub replacement for the in-process event bus.
- Universal undo.

## Implementation Progress

2026-05-02:

- Stage 1 foundation implemented: action registry, action run/propose endpoints, and `action_invocations`.
- Stage 2 proof implemented: `correspondence.note.create`, using the legacy `create_note` tool name for approval compatibility.
- Stage 3 breadth proof implemented: `planning.objectives.set`, `finance.cost_plan.update_line`, `finance.variations.create`, and `program.activity.update` are registered with provider-safe action tool names.
- Stage 4 first pass implemented: chat sends a sanitized current view snapshot, the project workspace contributes active tab/sub-view and selected document ids, and agent prompts receive the current app view.
- Stage 5 first pass implemented: chat input approval chips can approve/reject all pending approvals or the first pending approval, and can seed an edit instruction for the first approval.
- Discrete workflow hardening added: `attach_documents_to_note` lets chat resolve an existing note plus document filters such as "all mechanical documents" into one approval-gated note attachment proposal, reusing the existing note applicator and project refresh events.
- New-note attachment hardening added: `create_note` now accepts discipline/category document filters such as "all electrical documents", resolves them into attachment ids before proposal, and blocks note content that claims documents were attached unless ids or filters are present.
