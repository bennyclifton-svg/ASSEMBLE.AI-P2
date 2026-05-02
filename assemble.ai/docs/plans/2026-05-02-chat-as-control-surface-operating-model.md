# Chat-as-Universal-Control-Surface — Operating Model & Phase 1 Plan

## Context

The existing chat/agent loop already has the right shape: thread → user message → agent run → tool calls → proposed mutation → approval gate → apply with row-version locking → broadcast project event. The limitation is that **every new agent capability needs bespoke tool code, bespoke applicator code, bespoke event mapping, and prompt updates** — and the UI surface (~210 mutation routes, plain controlled inputs, direct fetch) is wholly parallel to the agent surface, so any "chat controls everything" attempt either duplicates or hand-waves.

The strategic answer is **not** to make the agent click DOM buttons. It is to invert the relationship: every meaningful user operation becomes a registered **Application Action**, and both UI buttons and chat agents are equal consumers of that single command surface. One registry, one validation, one diff, one approval policy, one event emission, one audit row, one test surface — many entry points.

This unlocks the longer-term goal (chaining workflows together for full agentic operation) because workflows become DAGs of actions instead of ad-hoc scripts, and the orchestrator can route declaratively instead of imperatively.

## Operating Model — The Five Layers

### Layer 1: Application Action Registry (server)

Every action is a single registered object:

```ts
defineAction({
  id: "finance.cost_plan.update_line",
  domain: "finance",
  risk: "propose",                  // safe | confirm | propose | sensitive
  inputSchema: zodSchema,
  preview(ctx, input) => Diff,      // for approval card; agents and UI both use it
  apply(ctx, input) => Output,      // unified mutation
  emits: [{ entity: "cost_line", op: "updated" }],
  uiTarget: { tab: "cost-planning", focusEntity: "cost_line" },
  agentAccess: ["finance", "orchestrator"],
  description: "Update an existing cost-plan line item",
})
```

The risk field is a **flow selector**, not a tag:
- **safe** — runs immediately from button or chat (rename note title)
- **confirm** — UI shows native confirm; chat shows one-tap approve chip
- **propose** — every invocation, UI or chat, generates an approval card the user reviews. This is the unification: clicking "Update" in the cost-plan grid produces the same proposed-diff card the agent produces.
- **sensitive** — written justification + second-party approval (variation execution, contract sign-off)

### Layer 2: Universal Invocation Contract (client + server)

- **Server endpoint**: `POST /api/actions/[id]/run` (safe/confirm) and `POST /api/actions/[id]/propose` (propose/sensitive). Single dispatcher reads the registry by id.
- **Client hook**: `const { run, propose, isPending, lastError } = useAction(id)`. Every button/cell editor imports by id. The action is the source of truth for input schema, optimistic state, error coercion, toast copy.
- **Agent tool surface**: auto-generated from the same registry. Same id becomes tool name; same `inputSchema` becomes tool schema; same `preview` produces the diff for the approval card. **Adding a new action automatically exposes it to both UI and agents.**

Read actions register with the same shape minus `preview`/`apply`/`emits` — same hook (`useAction("finance.cost_plan.list")`), same agent surface as read tools.

### Layer 3: Live View Context

A structured payload attached to every chat turn:

```ts
{
  projectId: string,
  route: string,                   // e.g. "/projects/abc/cost-plan"
  tab?: string, sub?: string,
  focusedEntity?: { kind, id },
  pendingApprovalIds: string[],    // ordered; lets agent resolve "the second proposal"
  recentlyViewedIds: string[],
  visibleSnapshot?: unknown,       // small JSON of what's on screen
}
```

Published to the chat thread by a `<ChatContextProvider>` in the root layout, kept in sync via a thin `useViewContext()` hook. The agent **sees this on every turn** as structured input (not prose). Resolves "approve the second proposal", "create a cost line *here*", "open the variation we just discussed".

### Layer 4: Capability Discovery + UI Intent Channel

- **`list_available_actions({ domain?, currentRoute?, query? })`** — agent introspects the registry on demand; descriptions live with actions, not in the system prompt.
- **`emit_ui_intent`** — registered action that doesn't touch state, just emits typed events on the existing chat event bus: `{ type: "ui_intent", command: "navigate" | "focus_entity" | "open_modal" | "select_row" | "scroll_to" }`. The root layout subscribes via [use-project-events.ts](../../src/lib/hooks/use-project-events.ts) and dispatches.

No DOM clicking. No new event channel — same SSE bus, new event variant.

### Layer 5: Workflow Engine (DAG, not stream)

Workflow runs are durable, with explicit state machine:

- `workflow_runs` (id, user_goal, status, active_agent, current_step_ids[], started_at)
- `workflow_steps` (id, run_id, action_id, input, output, approval_id, dependency_ids[], state, failure_policy)
- **Step states**: `pending | running | awaiting_approval | applied | skipped | rejected | failed`
- **Per-step failure policy**: `abort_workflow | continue | retry_n | ask_user`
- **Rejection branch**: when user rejects step 2, the engine consults the workflow definition's rejection routing (wait, abort, recovery substep)

Workflows are **TS modules** (typed, debuggable, vitest-able), not YAML — for a 1-2 dev team the "declarative" win of YAML is illusory once you have conditionals.

### Approval-as-chat-control (UX)

Ship **suggestion chips** above the chat input when approvals are pending: `[Approve all 3] [Reject 2nd] [Edit 1st]`. Zero parsing, zero ambiguity. Defer the Haiku-based NL classifier ("change to $120k then approve") to phase 2 once telemetry justifies the latency + cost.

### Skill manifest split

Split the existing `docs/skills/*` model into two manifest kinds:

- **Workflow skills** (`procurement-process`, `master-programme`) — declare `when_applies`, `owner_agent`, `actions_used[]`, `evidence_required[]`, `approval_level`, `output_artifact`, `handoffs[]`. Consumed by orchestrator + workflow engine.
- **Knowledge skills** (`contract-admin`, `cost-planning`) — declare `domain`, `tier`, `lookup_keys[]`, `agents`. Consumed as RAG-style reference at agent turn time.

Both live under `docs/skills/`; same orchestrator reads both via different loaders.

### One audit table

`action_invocations` (id, action_id, actor_kind: "user" | "agent", actor_id, run_id?, workflow_step_id?, input, output, approval_id?, view_context, created_at). **Every invocation writes one row** — button clicks, agent tool calls, workflow steps. Single query for full provenance.

## Phase 1 — Foundation (target: ~2 weeks)

Goal: prove the registry pattern across breadth, then drive variations end-to-end.

### Phase 1A — Registry infrastructure

1. Create `src/lib/actions/define.ts` — `defineAction()` factory, type definitions, registry map (mirrors pattern in [catalog.ts](../../src/lib/agents/tools/catalog.ts)).
2. Create `src/lib/actions/registry.ts` — `getAction(id)`, `listActions(filter)`, `getActionsForAgent(agentName)`.
3. Create `src/app/api/actions/[id]/run/route.ts` and `.../propose/route.ts` — single dispatcher; uses ctx (orgId, userId, projectId) from session; returns either applied output or proposed approval id. Reuse [approvals.ts](../../src/lib/agents/approvals.ts) `proposeApproval()` for `propose`/`sensitive` paths.
4. Create `src/lib/hooks/use-action.ts` — `useAction(id)` client hook returning `{ run, propose, isPending, lastError }`. Optimistic state via [use-project-events.ts](../../src/lib/hooks/use-project-events.ts) integration.
5. Create `drizzle-pg/migrations/NNNN_action_invocations.sql` — `action_invocations` table per spec above.
6. Wire registry → agent tool surface: extend [registry.ts](../../src/lib/agents/registry.ts) `AgentSpec` to derive `tools` from `getActionsForAgent(name)` instead of hand-rolled `allowedTools` arrays.

### Phase 1B — Migrate 5 actions across 5 domains (breadth proof)

Convert to registered actions:
- `correspondence.note.create` (currently in [catalog.ts](../../src/lib/agents/tools/catalog.ts) `create_note`)
- `planning.objectives.set` (currently part of [Agent-Program.md](../agents/Agent-Program.md) toolset)
- `finance.cost_plan.update_line` (currently `update_cost_line`)
- `finance.variations.create` (currently `create_variation`)
- `program.activity.update` (currently `update_program_activity`)

For each: register the action, generate the matching tool, replace existing applicator dispatch in [applicators.ts](../../src/lib/agents/applicators.ts) with registry lookup.

### Phase 1C — Live view context

7. Create `src/lib/contexts/view-context.tsx` — provider + `useViewContext()` hook reading URL state and selected-entity state from existing per-page providers (e.g. `stakeholder-refresh-context`, future `selected-variation-context`).
8. Modify [ChatDock.tsx](../../src/components/chat/ChatDock.tsx) message-send path to attach view context to every POST `/api/chat/threads/[threadId]/messages` body.
9. Modify [runner.ts](../../src/lib/agents/runner.ts) (line ~194 tool loop entry) to inject view context into agent input as a structured `<view_context>...</view_context>` block.

### Phase 1D — UI intent channel

10. Register `view.navigate`, `view.focus_entity`, `view.open_modal` as actions (risk: `safe`, no preview, no apply — just emit event).
11. Add `ui_intent` event variant to chat event bus types in [events.ts](../../src/lib/agents/events.ts).
12. Subscribe at root layout: `app/projects/[projectId]/layout.tsx` consumes ui_intent events and dispatches via existing route helpers + entity-focus context.

### Phase 1E — Variations workflow end-to-end (depth proof)

13. Add 2 more variation actions: `finance.variations.update`, `finance.variations.assess_impact` (cross-entity: pulls cost-line + program-activity refs).
14. Add suggestion chips in [ChatDock.tsx](../../src/components/chat/ChatDock.tsx) above input — query pending approvals for current thread, render `[Approve N] [Reject N] [Edit N]` buttons that POST to existing `/api/chat/approvals/[id]/respond`.
15. Define first workflow as TS module: `src/lib/workflows/issue-variation.ts` — sequence: assess_impact → propose update_cost_line → propose update_program_activity → propose create_correspondence_note. Skipped if not driven from chat in this phase; included to validate the workflow engine API.
16. Build minimum workflow engine in `src/lib/workflows/runner.ts` — reads workflow module, executes steps respecting dependency_ids and risk-level approval gates. Persists to `workflow_runs` + `workflow_steps`.

## Critical files (Phase 1)

**New:**
- `src/lib/actions/{define,registry,types}.ts`
- `src/lib/hooks/use-action.ts`
- `src/lib/contexts/view-context.tsx`
- `src/lib/workflows/{runner,issue-variation}.ts`
- `src/app/api/actions/[id]/{run,propose}/route.ts`
- `drizzle-pg/migrations/NNNN_action_invocations.sql`
- `drizzle-pg/migrations/NNNN_workflow_runs_steps.sql`

**Modified:**
- [src/lib/agents/registry.ts](../../src/lib/agents/registry.ts) — derive tools from action registry
- [src/lib/agents/applicators.ts](../../src/lib/agents/applicators.ts) — collapse hand-rolled dispatch into registry lookup
- [src/lib/agents/tools/catalog.ts](../../src/lib/agents/tools/catalog.ts) — convert 5 chosen tools to action-derived
- [src/lib/agents/runner.ts](../../src/lib/agents/runner.ts) — inject view context into turn input
- [src/lib/agents/events.ts](../../src/lib/agents/events.ts) — add `ui_intent` event variant
- [src/components/chat/ChatDock.tsx](../../src/components/chat/ChatDock.tsx) — attach view context, render approval chips
- `src/app/projects/[projectId]/layout.tsx` — subscribe to ui_intent events

**Reuse (do not reinvent):**
- [approvals.ts](../../src/lib/agents/approvals.ts) `proposeApproval()` — already does row-version capture, diff packaging
- [ApprovalGate.tsx](../../src/components/chat/ApprovalGate.tsx) edit-and-approve — already handles `overrideInput`
- [use-project-events.ts](../../src/lib/hooks/use-project-events.ts) — existing real-time refresh hook; wire useAction success to it

## Phases 2–5 (sketched)

**Phase 2 — Workflow rigor + skill split (~1 week).** Formalize workflow state machine (states, failure_policy, rejection branches). Migrate `procurement-process` and `master-programme` skills to workflow-skill manifest. Migrate `contract-admin` and `cost-planning` to knowledge-skill manifest. Loaders in `src/lib/skills/{workflow-loader,knowledge-loader}.ts`.

**Phase 3 — Migrate remaining ~30 mutation routes to actions (~2-3 weeks).** Mechanical conversion. UI tables (UsersTable, ProductsTable, ModelSettingsForm, NotesPanel, etc.) refactored to use `useAction()`. Old `/api/[domain]/...` routes either deleted or kept as thin shims that call the same action. By end of phase, every button uses an action.

**Phase 4 — Workflow streaming across agents (~2 weeks).** Multi-agent DAG workflows: orchestrator routes user goal → fans out to Design + Program + Finance + Correspondence in parallel where dependencies allow. Approval gates render correctly when multiple proposals fan in. Capability discovery scoped per-agent.

**Phase 5 — Observability + chat UX polish (~1 week).** Action-invocation analytics dashboard at `/admin/actions`. Cost telemetry per chat turn (token + LLM-call budget meter). Haiku-based NL approval classifier for "change to $X then approve". Voice input considered only after all of the above stable.

## Verification

**Phase 1A (registry infrastructure):**
- `npm run typecheck` clean across new files
- `npm run test src/lib/actions` — round-trip test: defineAction + run + invocation row written
- `curl -X POST /api/actions/finance.cost_plan.update_line/propose -d '{...}'` returns approval id; row appears in `approvals` table

**Phase 1B (5 migrated actions):**
- Existing chat UX continues to work (regression): in dev, post chat message that triggers `create_note` → approval renders → approve → note created. Same for the other 4.
- Action-invocation row written for each (verify in Drizzle Studio: `npm run db:studio`)
- Old applicator code paths in [applicators.ts](../../src/lib/agents/applicators.ts) deleted, no broken references (`npm run build`)

**Phase 1C (live view context):**
- Open dev tools, send chat message → `/api/chat/threads/[threadId]/messages` request body includes `viewContext: { projectId, route, tab, ... }`
- Test "approve the second proposal" by opening 3 proposals and asking agent to approve the second — agent resolves correctly via `pendingApprovalIds`

**Phase 1D (UI intent):**
- Ask chat agent "open the cost-plan tab" → URL updates to `?tab=cost-planning` without page reload
- Ask "show me variation V-003" → tab switches and entity panel focuses

**Phase 1E (variations workflow + chips):**
- Approval chips render above chat input when ≥1 approvals pending
- Click `Approve all` → all pending approvals applied, chips disappear, project events fire
- Drive variation issuance entirely from chat (no manual button clicks): "create a variation for additional excavation, $40k" → propose create_variation → approve → propose update_cost_line → approve → propose update_program_activity → approve → workflow run logged in `workflow_runs`, all 3 steps in `workflow_steps`

**End-to-end smoke (full Phase 1):**
- `npm run db:up && npm run dev`
- Open project, open chat, drive variation workflow chat-only, verify:
  - All mutations recorded in `action_invocations` with `actor_kind="agent"`
  - Workflow run in `workflow_runs` with `state="applied"` and 3 child steps
  - UI updated in real-time via existing project-event refresh
  - View context attached to every chat turn (verify in dev tools network tab)

## Decisions deferred

- **NL approval classifier** (Haiku-based) — phase 5 only if telemetry shows chip approvals miss > X% of intents
- **Voice input** — out of scope until all five phases stable; would be a thin STT shim in front of the same input
- **Removing buttons entirely** — explicitly NOT pursued. Buttons remain as the cheapest UX for "I'm looking right at this thing, do this thing to it." Chat is the high-leverage path; manual is the fallback.
- **Mode toggle (chat-only vs hybrid per user)** — rejected, doubles maintenance with no clear win
- **Universal undo** — skipped; edit-and-approve already covers the 80% need
- **Redis pub/sub for chat event bus** — phase 6+, only when load demands; in-process Map is fine through phase 5
