# Chat Window — Purpose & Phase 1 Design Decisions

> Companion to [2026-05-02-chat-as-control-surface-operating-model.md](2026-05-02-chat-as-control-surface-operating-model.md) and [2026-05-02-chat-control-adopted-implementation-plan.md](2026-05-02-chat-control-adopted-implementation-plan.md). The operating-model doc answers *how the chat is built*. This doc answers *what the chat is for* — the product decisions that shape the system prompt, the UX surface, the workflow catalog, and the scoping line for Phase 1.

## Purpose statement

The chat window is the **Project Manager front-door** for the project's principal. The PM speaks with one voice, coordinating the specialist agents (Finance, Program, Design, Procurement, Delivery, Correspondence) invisibly. The principal delegates **outcomes in natural language**, and the PM routes each turn between:

1. A **bounded catalog of 5 workflows** — variation issuance, RFI raise & track, progress claim assessment, site instruction issuance, transmittal — surfaced as discovery chips above the input but never gating it.
2. A **Q&A fallback** answering from indexed project artefacts plus an indexed contract / standards / NCC reference corpus.

Off-menu requests get a graceful in-persona refusal. Off-piste ambiguity gets **one clarifying question, then the PM acts**.

Mutations follow a **plan-first approval pattern**: the PM presents the entire workflow as a single plan card (every step, each with a preview and a risk classification); the principal approves the plan once; the engine executes — auto-running `safe`/`confirm` steps and gating `propose`/`sensitive` steps as they're reached.

Conversations are organised as **one persistent Q&A thread per project + one thread per workflow run** — each workflow thread is the audit record for its register entry. The PM **posts unsolicited messages back into existing threads** for approval-staleness reminders and event-on-record reactions, but never invents new threads on the user's behalf in Phase 1.

The PM lives in a **bottom dock, expanded by default**, on every project page. The existing UI stays as the fast-path for "I'm looking right at it." Inputs accept **drag-drop and paste**, routed through the existing indexing pipeline. The PM is **strictly project-bounded** — no cross-project memory in Phase 1.

## Decision log

Each row records a foundational design decision, the option chosen, the rejected alternatives, and the reasoning. Numbering matches the grilling session that produced the decisions.

| # | Decision | Chosen | Rejected | Why |
|---|---|---|---|---|
| 1 | Primary identity | **Orchestrator front-door** — user delegates outcomes; orchestrator coordinates specialists | Universal command surface; Domain expert assistant; Hybrid | Aligns with the 7 named CM agents, the existing `runOrchestrator` branch in [messages/route.ts](../../src/app/api/chat/threads/[threadId]/messages/route.ts), and the multi-step variation workflow as the depth proof |
| 2 | Voice | **Orchestrator-only** — single voice, no specialist picker; `AgentBadge` informational only | Manual handoff allowed; Always pick agent | Forcing pre-selection re-introduces the cognitive load the orchestrator exists to remove. `DEFAULT_AGENT_NAME = orchestrator.name` already in [registry.ts:33](../../src/lib/agents/registry.ts#L33) — half-shipped at API level |
| 3 | Scope of jobs | **Bounded outcome catalog + Q&A fallback** | Anything (read+write); Outcomes-only; Domain-driven | Catalog gives a concrete scope to ship; Q&A handles the long tail of "what does the spec say about flashings here?" |
| 4 | Workflow vs Q&A routing | **Implicit classification by orchestrator; chips as discovery hints, not gates** | Explicit chip selection; Hybrid; Slash commands | Pre-routing via chip click defeats orchestrator's purpose. Chip-as-template (clicking inserts text) gives discovery without enforcement. Honors the "no dropdowns" preference |
| 5 | Phase-1 catalog content | **5 workflows, breadth proof — variation issuance, RFI raise & track, progress claim assessment, site instruction issuance, transmittal** | One workflow deep (variations only); Wide & shallow (10+ single-step); User-driven | Each candidate touches a different specialist, validating the multi-agent thesis. Variation stays the depth exemplar; the other four can ship as 1–2 step DAGs and grow |
| 6 | Threading model | **Thread per workflow run + one persistent Q&A thread per project** | One persistent thread per project (status quo); Topic-driven user-named; Time-boxed sessions | Each workflow has a durable artefact whose thread becomes its audit record. Single thread becomes a 10k-message wall under (Q5) load. **Largest scope expansion in this tree — see Tensions** |
| 7 | Q&A scope | **Project artefacts + indexed contract / standards / NCC reference corpus** | Project artefacts only; + general LLM knowledge; + web search | Maps to the plan's skill-manifest split. AS-standards licensing is a real legal question — start with project + owned/licensed contract + NCC; AS standards stay out until licensing settled |
| 8 | Approval discipline | **Plan-first preview, executed end-to-end; sensitivity-tiered per the existing `risk` field** | Strict sequential per-step approve; Pure DAG-batched; Always-escalate | One decision point matches the CM mental model of "issue this variation". The existing `risk` field is the lever that makes "approve plan" actually one click for most workflows |
| 9 | Reactivity | **Proactive in-thread only — writes only into existing threads, never invents new ones** | Reactive only; + notification surface; + autonomous action proposal | Smallest step that makes the chat feel alive without operating a notifications product. Bounded triggers in Phase 1: approval > 24h, blocked workflow > 1h, project event referencing an entity discussed in an open thread |
| 10 | Persona | **Project Manager** (senior, decisive, coordinates specialists as their lead) | Anonymous tool; Junior contracts admin; Senior peer; Multi-persona; Named brand | A PM is a defined CM role with a known authority shape. Header text changes to "Project Manager"; placeholder becomes verb-led ("What needs doing?"); system prompt anchors on role |
| 11 | Decision authority | **Status quo — `safe`/`confirm`/`propose`/`sensitive` risk-tier model** | Dollar/time/audience thresholds; Per-step authority in workflow modules; Always-escalate | Smallest infrastructure change. **See Tensions — the persona promise is hostage to honest risk classification during Phase 1B migration** |
| 12 | User scope | **Single principal only — Phase 1** | Single-user-per-org status quo; Project-shared; Hybrid (private + shared) | Avoids the "two PMs giving different answers" problem before it starts; matches today's per-user threading; clean migration path to project-shared later. Requires a designated principal/owner field on `projects` |
| 13 | Placement | **Bottom dock, expanded by default** | Status quo (collapsed); Right-side rail; Dedicated tab; Hybrid | Smallest change with the largest UX shift — one-line `useState(false)` flip. Right-rail is correct long-term but a meaningful refactor of `ResizableLayout` |
| 14 | Failure mode for ambiguity | **Ask one clarifying question, then act** | Refuse cleanly; Best-effort + show working; Multi-question; Refuse to act unless 100% sure | Conversational, single-turn. Persona requires explicit prompt language about *when* to ask vs. when to draft-with-assumptions — see Tensions |
| 15 | Inputs | **Text + file drop + paste, routed through existing indexing** | Text only (status quo); + @mention entities; + voice | Reuses report-indexer / dxf-parser / spec-indexer. Drag-drop is the smallest credible step that lets a CM say "draft a variation from this quote" without the 4-step Documents-tab dance. **Commits the chat as a primary intake surface, not just a query/control surface** |
| 16 | Cross-project scope | **Strictly project-bounded — Phase 1** | + read-only cross-project precedent; + portfolio PM at org level; Both | Phase 1 should not expand surface; Phase 2 candidate is read-only cross-project precedent. **Constraint: retrieval interface should accept `projectIds[]` defaulting to `[currentProjectId]` so (b) is a flag-flip later** |

## Tensions worth carrying forward

These are not problems to solve now — they are second-order consequences of the chosen options that affect implementation discipline.

### 1. PM persona vs. authority model (Q10 vs Q11)

The persona promises *"I'll get this done"*. The risk-tier authority model means most things still gate on `propose`. The chat's perceived autonomy is hostage to honest classification of the 5 migrated actions during Phase 1B. Mark everything `propose` to be safe and the persona evaporates — you'll have shipped a junior contracts admin in a PM jacket.

**How to apply:** during the Phase 1B action migration, every action's `risk` field gets *deliberately* chosen against this rubric:
- `safe` — read-only, cosmetic, or trivially reversible (rename note title, update milestone label)
- `confirm` — single-entity write with no $ or schedule impact (draft a routine notice, log a meeting attendee)
- `propose` — single-entity write with $ or schedule impact (update cost line, reschedule activity)
- `sensitive` — multi-entity contractual commitment, or anything addressed to principal/architect/superintendent (issue variation, sign off claim)

### 2. PM persona vs. clarifying-question failure mode (Q10 vs Q14)

A senior PM tends to draft-with-assumptions; a clarifying question is a junior reflex. The system prompt must be explicit:

> *Ask a clarifying question only when even a templated plan card would be guesswork. Otherwise, draft the plan with your best assumptions clearly stated and let the principal edit before approving.*

Otherwise the LLM will over-ask and the persona will erode within a week.

### 3. Plan-first execution requires upfront diff computation (Q8)

Steps that depend on prior step outputs need *templated* previews ("update cost line for variation V-{generated} by +$40,000"). The workflow engine in [src/lib/workflows/runner.ts](../../src/lib/workflows/runner.ts) (per the operating-model plan) needs a `previewPlan()` API per workflow module that returns the step DAG with previews. Build this from day one — retrofitting from sequential-only to plan-first is hard.

### 4. Thread-per-workflow exceeds the current Phase 1 scope (Q6)

This is the one decision in the tree that materially expands the scope of [2026-05-02-chat-control-adopted-implementation-plan.md](2026-05-02-chat-control-adopted-implementation-plan.md) as written. You're committing to:

- Schema for `workflow_run.thread_id` linkage (or vice versa)
- A thread-switcher navigation surface in the dock (or thread access from each register entry)
- Splitting the existing "load latest thread" logic in [ChatDock.tsx:191-221](../../src/components/chat/ChatDock.tsx#L191-L221) into "load Q&A thread vs. load workflow thread"
- Modifying message-send to attach the workflow run id when in a workflow thread
- Growing view context with `currentWorkflowRunId`

Either accept the scope expansion in Phase 1 or sequence (b) for Phase 2 and stay on single-thread-per-project for the first pass.

## Phase-1 scoping decisions explicitly flagged as *temporary*

Each of the following is a deliberate Phase-1 narrowing, not a permanent stance. Document so future feature requests can be pointed at the deferred plan instead of accidentally widening Phase 1.

| Decision | Phase 1 stance | Future expansion |
|---|---|---|
| User scope (Q12) | Single principal only | Project-shared with role-aware authoring; per-message `userId` already discriminates speakers |
| Cross-project scope (Q16) | Strictly project-bounded | Read-only cross-project precedent retrieval (mutations stay project-bounded); enabled by `projectIds[]` retrieval interface |
| Reactivity (Q9) | Reactive + in-thread proactive only | Notification surface (browser/desktop); autonomous workflow proposals on event triggers |
| Authority (Q11) | Risk-tier (`safe`/`confirm`/`propose`/`sensitive`) | Dollar/time/audience-threshold delegation matrix configured per project |
| Inputs (Q15) | Text + drop + paste | + `@mention` entity picker; + voice (per operating-model plan Phase 5) |
| Placement (Q13) | Bottom dock | Right-rail panel (correct long-term placement; meaningful refactor of `ResizableLayout`) |

## Implications for the operating-model implementation plan

Cross-references back to [2026-05-02-chat-control-adopted-implementation-plan.md](2026-05-02-chat-control-adopted-implementation-plan.md):

- **Phase 1A registry infrastructure** — unchanged. The `risk` field on `defineAction()` is now load-bearing for the PM persona's perceived autonomy. Document the rubric above in `src/lib/actions/types.ts`.
- **Phase 1B 5 migrated actions** — classification of the 5 must follow the rubric in Tension 1 above. `create_note` is `confirm` (or `propose` if addressed to principal). `update_cost_line` is `propose`. `create_variation` is `sensitive`. Honest classification matters more than safe defaults.
- **Phase 1C live view context** — view context schema grows `currentWorkflowRunId` (per Q6), and the retrieval interface accepts `projectIds[]` (per Q16). Set the scaffolding now even if both default to a single value in Phase 1.
- **Phase 1D UI intent channel** — unchanged.
- **Phase 1E variations workflow + chips** — the **plan-card UX** (Q8) replaces the per-step approval dance described in the verification text. The workflow engine grows `previewPlan()` per Tension 3. Existing chip UI in [ChatDock.tsx:560-612](../../src/components/chat/ChatDock.tsx#L560-L612) survives for unbatched approvals (single off-workflow mutations during Q&A) and per-step `sensitive` gates inside a workflow.
- **New Phase 1F (proposed)** — thread-per-workflow plumbing (Q6). Schema migration for `chat_threads.workflow_run_id`; thread switcher UI; workflow-aware message-send. **Or defer to Phase 2** and stay on single-thread-per-project for Phase 1 — explicit decision required.
- **New Phase 1G (proposed)** — file drop + paste in the dock (Q15). Drop-zone overlay, upload endpoint that calls existing indexer, message-attachment data model, "processing…" status. Lower scope than 1F; could ship in 1B's window.
- **New Phase 1H (proposed)** — persona surface (Q10): header copy, placeholder copy, system prompt rewrite anchored on PM role. Dock defaults to expanded (Q13). One-line `useState(false)` for `collapsed`.
- **Defer to later phases** — single-principal gating UX (Q12), proactive triggers (Q9), expanded Q&A reference corpus loading (Q7).

## Verification — purpose alignment

These are *purpose-level* acceptance checks. Implementation-level verifications stay in the operating-model plan.

- Open the dock on a fresh project — header reads "Project Manager", dock is expanded, placeholder is verb-led, no agent picker visible.
- Type *"draft a variation for $40k extra excavation"* — orchestrator routes to the variation workflow, returns a single plan card with all proposed mutations previewed; one approval click executes the whole plan; only `sensitive` steps re-prompt.
- Type *"what does the contract say about EOT notice periods?"* — orchestrator routes to Q&A; answer cites a contract reference, not a project artefact.
- Type *"order me a coffee"* — orchestrator refuses in PM voice ("That's outside what I handle on this project — anything project-related I can help with?"), no failure-trace UX.
- Type *"variation for the rebar issue"* — orchestrator asks one clarifying question (value? scope?), then proceeds with a draft once answered.
- Drop a PDF subby quote into the dock — file uploads, "processing…" inline status, then orchestrator can answer questions about it or draft a variation from it without the user leaving the chat.
- Approve a workflow plan — workflow thread is created (if Q6 phased into Phase 1); register entry links back to the thread.
- Wait 24 hours on a pending approval — orchestrator posts a reminder into the thread; no notification surface fires.
- Open the same project as a non-principal user — chat dock does not render (or renders disabled with explanation).
- Open `/projects` (project list) or `/dashboard` — no chat dock.
