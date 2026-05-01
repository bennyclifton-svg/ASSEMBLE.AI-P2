# Adding AI Agents to assemble.ai — A Plain-English Plan

## What you asked

You want to add a chat box at the bottom of the app. The user can keep clicking through tabs like normal, OR talk to the chat box. When they talk to it, AI "agents" (specialist construction-management helpers — Feasibility, Design, Finance, Program, Procurement, Delivery, Correspondence, plus an Orchestrator that routes between them) do work on their behalf and update the screen live.

You also asked: do we rebuild from scratch, or extend what we've got? And do we need both "agents" and "skills" as concepts in the app?

## Short answers first

**1. Yes, this is possible.** It's a real feature, not science fiction. Big tech companies build things like this all the time.

**2. Don't rebuild — extend.** assemble.ai already has nearly every piece we need: the AI client, the document search, the background workers, the live-update plumbing. Throwing it away to start over would waste roughly six months of work for no gain. We can add the agentic layer on top.

**3. Keep "agents" — drop "skills" as a runtime thing.** Agents are real personas (Finance Agent, Design Agent, etc.) with their own knowledge and a list of things they're allowed to do. Skills are different — in the old desktop harness, skills were files an agent loaded on demand. In a web app, that extra layer is just plumbing. Each of the 38 skills in `docs/skills/` becomes one of four things — see the section below. The `docs/skills/` folder stays as documentation; it doesn't become a live system.

**4. Time and cost estimate.** First useful version (just chat, read-only): **1–2 weeks**. Full system with all 8 agents and proactive monitoring: **3–4 months**.

## The three rules you confirmed

1. **Nothing happens without your approval.** When an agent wants to change anything in the database — a cost line, a milestone date, a transmittal — it shows you exactly what it wants to do, and you click Approve or Reject. Reading is free; writing is gated.

2. **Adapt the existing specs to the existing stack.** The agent specs in `docs/agents/` were written assuming a different setup (SQLite databases, files on disk, Outlook). We translate them to use what assemble.ai already has (PostgreSQL, the existing upload system, the existing email export).

3. **Start tiny.** First version is just one agent (Finance) that can answer questions about your project. No changes, no risk. We learn from that, then expand.

---

## What happens when you type in the chat

```
You type a message in the chat box at the bottom of the screen
              │
              ▼
The message is saved to the database
              │
              ▼
The Orchestrator (a "manager" agent) reads your message
and decides which specialist should handle it
              │
              ▼
The specialist (e.g., Finance Agent) reads the relevant
project data, searches your uploaded documents, and starts
working
              │
              ▼
If it just needs to look something up → it does and replies
If it wants to change something → it shows you a draft and
waits for your Approve / Reject click
              │
              ▼
You see the agent's reply streaming in (like ChatGPT)
If the agent updates a cost line, the cost-plan table on
your screen refreshes by itself — no reload needed
```

---

## How the 38 skills get absorbed

Each skill in `docs/skills/` becomes one of four things. We do **not** build a "skill loader" or a "skill plugin system" — that's unnecessary complexity for a web app.

### Bucket A — Already built (5 skills)

These are already done in assemble.ai. The skill markdown is just documentation describing something that already runs.

| Skill | What it already is in assemble.ai |
|---|---|
| `report-indexer` | Your existing document search (RAG). When you upload a PDF, it gets chunked, embedded, and made searchable. |
| `spec-indexer` | Same system, with a small tweak for trade-section-aware chunking. |
| `dxf-parser` | Your existing drawing-extraction worker. |
| `file-watcher` | Replaced by your existing upload system — the user uploads, and the system processes it. No need to watch a folder. |
| `outlook-integration` | Replaced by your existing transmittal/email export. (Real Outlook live-send is a future thing if ever.) |

### Bucket B — Becomes a "tool" the agent can use (~22 skills)

A "tool" is just a function the AI is allowed to call. Like giving the AI a button labelled "Look up cost lines" or "Draft an RFI". Each skill in this bucket becomes one or more buttons.

| Skill | Tools the agent gets |
|---|---|
| `correspondence-register` | List correspondence, add a new entry |
| `email-drafting` | Draft an email |
| `formal-letters` | Draft a formal letter on letterhead |
| `rfi-management` | Draft an RFI, list open RFIs, mark a response received |
| `transmittals` | Draft a transmittal, list transmittals |
| `site-instructions` | Draft a site instruction |
| `document-register` | List documents, query the document register |
| `drawing-compare` | Compare two revisions of a drawing |
| `master-programme` | List milestones, propose a baseline |
| `milestone-tracking` | List milestone variance |
| `critical-path-delay` | Assess delay impact |
| `programme-reporting` | Generate a programme report |
| `cashflow-funding` | Compute cashflow curve, flag facility utilisation |
| `dev-pro-forma` | Compute pro forma, run sensitivity matrix |
| `financial-reporting` | Generate cost report, compute contingency drawdown |
| `final-account` | Prepare final account summary |
| `tender-evaluation` | Score tender on non-price, compare tender prices |
| `procurement-process` | Draft RFT package, register addendum |
| `quality-completion` | Record PC checklist state, list open defects |
| `consultant-brief-mgmt` | Compare consultant fees, register an appointment |
| `report-extractor` | Extract key facts from a report |
| `stakeholder-mapping` | Register a stakeholder, list stakeholders by influence |

### Bucket C — Becomes "knowledge" baked into the agent's brief (~10 skills)

These are pure reference material — clause tables, checklists, NCC rules. They get pasted into the relevant agent's system prompt (the agent's "job description" that it reads before every task) so the agent has the knowledge available. We pull straight from the same `docs/skills/*/SKILL.md` files so there's only one copy of the knowledge.

| Skill | Which agent gets this knowledge |
|---|---|
| `contract-admin` | Delivery agent — when discussing variations, EOT, PC, DLP |
| `contract-formation` | Procurement agent — during tender → contract phase |
| `ncc-compliance` | Design agent — loaded on demand because it's long |
| `da-approvals` | Design agent — DA-related tasks |
| `planning-risk` | Feasibility agent — site/planning analysis |
| `environmental-dd` | Feasibility agent — due diligence |
| `risk-schedule` | Always loaded for the Program agent |
| `site-assessment` | Always loaded for the Feasibility agent |
| `cost-planning` | Always loaded for the Finance agent |
| `contact-management` | Always loaded for the Correspondence agent |

### Bucket D — Becomes a UI form on a project tab (~6 skills)

These are user-facing artifacts (like an RFI form). The chat can ask the agent to "draft me an RFI about X", but the actual form lives as a normal screen on the project. The agent fills it in, you review and tweak it like any other form, then approve.

| Skill | UI form |
|---|---|
| `rfi-management` | RFI form (new — modelled on existing addenda form) |
| `transmittals` | Existing transmittal form |
| `formal-letters` | Letter editor (new) |
| `tender-evaluation` | Tender evaluation table (new) |
| `financial-reporting` | Cost report dashboard (you may already have this) |
| `dev-pro-forma` | Pro forma editor (new) |

### Things the skills imply we'll need that don't exist yet

The skills mention some construction-domain tables we don't have yet. These get added in the matching phase below, but none of them break anything that exists:

- A **defects register** (Phase 5)
- An **EOT claims register** (Phase 5)
- A **practical-completion checklist** (Phase 5)
- ~~A **consultant register** and **stakeholder register**~~ — already exist (consultants in `knowledge/lists`, stakeholders in `stakeholders`); Correspondence and Feasibility agents will read from these
- A **watchdog alerts table** and **soft-gate states table** (Phase 4)

---

## How we roll it out — six small phases

Each phase ships something useful by itself. You don't have to commit to all six up front.

### Phase 1 — Just chat, read-only (1–2 weeks) ← START HERE

**What you'll be able to do:** Open the chat at the bottom, ask "what's our cost variance?" or "what does the geotech report say about water table levels?", and get a sensible answer with citations. Only one agent (Finance), only reading — it can't change anything.

**What we build:**
- A chat box at the bottom of the app (collapsible).
- Four small new database tables to track conversations.
- A "tool-use loop" — the basic mechanics that let an AI call functions and feed the results back into its next thought.
- Two read-only tools: search uploaded documents, list cost lines.
- One agent (Finance) with its system prompt taken straight from `docs/agents/Agent-Finance.md`.
- Live streaming of the AI's reply (like ChatGPT typing) using the same plumbing your existing report generator uses.

**Why start here:** It proves the whole loop works end-to-end on real data with zero risk to your data. If it works, we expand. If it doesn't, we've spent two weeks not six months.

### Phase 2 — Add the Orchestrator and two more read-only agents (2 weeks)

**What you'll be able to do:** Ask "give me a project status briefing" and the Orchestrator will fan out to Finance, Program, and Design at the same time, then combine their answers into one reply.

**What we build:**
- The Orchestrator agent that decides which specialist handles a given message.
- Design agent and Program agent (both read-only).
- A "project memory" — a short summary of project state (current phase, key metrics, recent activity) that gets fed to every agent so they have context.
- Concurrent execution (multiple agents working at once).

### Phase 3 — Mutating tools with the approval gate (2 weeks)

**This is where the "live updates" promise lands.**

**What you'll be able to do:** Say "update the slab cost line to $250k", and the agent prepares the change, shows you the before/after, you click Approve, the database updates, and the cost-plan table on your other open tab refreshes by itself.

**What we build:**
- A new `approvals` table to record pending changes.
- A small version number on each row of the tables agents touch (so we know if you and an agent are editing the same row at once).
- "Mutating tools" — `update_cost_line`, `create_variation`, `update_milestone_dates`, `register_correspondence`. None of them write directly. They submit a draft, the chat shows you the diff, you approve.
- An approval card in the chat (Approve / Reject / Edit-and-approve buttons).
- A second live-update channel that pushes "this row just changed" events to your open tabs so they refresh automatically.

**Hybrid behaviour problem solved here:** if you happen to be editing the same row when an agent finishes its proposal, the row's version number will have changed and the system spots the conflict. It re-asks the agent to take another look at the up-to-date data.

### Phase 4 — Watchdogs and soft gates (1.5 weeks)

**What you'll be able to do:** See alerts at the top of the screen like "Cost variance trending +6% — Finance Agent flagged 2 days ago". The agents check on the project every 15 minutes in the background and raise yellow/red/critical alerts when thresholds are breached.

**What we build:**
- A scheduled job that runs every 15 minutes per active project, asks Finance and Program to check their thresholds, writes alerts.
- A bell in the top bar showing open alerts.
- Soft-gate UI — when you ask "are we ready to move from Schematic to Design Development?", the relevant agent runs through the gate checklist and tells you what's missing.

### Phase 5 — Correspondence, Procurement, Delivery, Feasibility (2 weeks)

**What you'll be able to do:** The full eight-agent system. Delivery agent assesses a variation; Correspondence agent wraps it in a Superintendent's Direction format; you approve; it's logged in the register.

**What we build:**
- The remaining four agents.
- The handoff pattern from `docs/agents/Agent-Correspondence.md` — when Delivery wants to issue a formal direction, it doesn't write the email itself; it hands the content to Correspondence, which formats it properly and presents it for your approval.
- The new domain tables listed earlier (defects register, EOT claims, etc.).

### Phase 6 — Reliability and admin (1.5 weeks)

**What you'll be able to do:** See agent activity, costs, and toggles in `/admin/agents`. Long-running multi-agent tasks no longer time out the page.

**What we build:**
- Move heavy multi-agent runs to a background worker queue (so the page returns immediately and updates stream in over time).
- Admin dashboard showing run history, token costs per agent, ability to disable agents.

---

## What we re-use vs build new

**Re-used as-is (the bulk of the work is already done):**
- The AI client that talks to Anthropic and OpenRouter
- The model registry (so you can pick which AI model each agent uses from `/admin/models`)
- The context assembler (gathers cost plan, program, risks, etc. into one block)
- The document search / RAG pipeline
- The background worker queue (BullMQ)
- The live-update streaming pattern (the same one your report generator uses)
- Login and multi-tenant security (`getCurrentUser()`)
- The Inngest scheduled-jobs system (currently only used for payment webhooks; we add the watchdog cron alongside)
- The existing register tables (transmittals, addenda, RFTs, TRRs, variations, invoices)

**New (Phase 1 only):**
- Four chat tables in the database.
- A folder of agent code: the runner, the registry, the Finance agent, the knowledge fragments.
- A folder of tool code: cost lines, documents.
- A handful of new chat API endpoints.
- A folder of chat UI components: the dock, message list, message bubbles, tool-call cards.

---

## The five biggest risks and how we handle them

| Risk | What we do about it |
|---|---|
| **AI cost runs away.** Multi-agent runs can stack 5+ AI calls per question. | Per-org monthly token caps in `/admin/models`. Every call's cost is logged. A budget bar appears in `/admin/agents` (Phase 6). |
| **Latency.** A multi-agent run can take 20 seconds. | Stream every step so the user sees something happening immediately. Heavy runs go to a background queue with live progress updates. |
| **Hallucination — the agent invents a cost line.** | Mandatory approval gate on every change. Tool inputs are validated against schemas. Each agent has a strict whitelist of tools it can call. |
| **Multi-tenant safety — agent reads another customer's data.** | Every tool call asserts the project belongs to the current user's organisation. A lint rule blocks tool code that skips this check. Database-level row security as a second line of defence. |
| **Scope creep — "while we're here, let's add Outlook".** | Phase boundaries are firm. Each phase ships standalone value. The agent specs in `docs/agents/` are the contract — anything outside is out. |

---

## How we'll know it works

- **Phase 1 acceptance test:** An automated browser test opens the chat, asks a question, sees streaming reply, sees a tool-call card render, confirms no data was changed.
- **Tool unit tests:** Every tool has tests including "calling from one customer's account can never read another customer's data".
- **Approval gate test (Phase 3):** Test that approve writes the data, reject doesn't, and a concurrent user edit is detected and re-proposed.
- **Cost dashboard (Phase 6):** Median and p95 token spend per agent, alerts if it jumps >25% week-on-week.

---

## What we explicitly are NOT doing

- Live Outlook send (Phase 5 uses your existing transmittal export; real Outlook is a future adapter).
- Microsoft Project (.mpp) export.
- Building a "skill registry" runtime — explicitly rejected.
- Migrating data into a SQLite project.db file.
- Sending any correspondence without your explicit approval.

---

## The mental model in one picture

```
        ┌──────────────────┐
        │   Chat box at    │  ← you type here
        │   bottom of app  │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │   Orchestrator   │  ← decides who handles it
        └────────┬─────────┘
                 │
                 ▼
   ┌──────────────────────────┐
   │ Specialist agent         │  ← Finance, Design, etc.
   │ • system prompt from     │     each is a "persona"
   │   docs/agents/           │
   │ • knowledge from         │
   │   docs/skills/           │
   └────────┬─────────────────┘
            │
            ▼
   ┌─────────────────────────┐
   │  Tools (functions       │
   │  the agent can call)    │
   │                         │
   │  Read tools → run free  │
   │  Write tools → propose, │
   │                wait for │
   │                Approve  │
   └────────┬────────────────┘
            │
            ▼
   ┌─────────────────────────┐
   │  Database & existing    │
   │  services (cost plan,   │
   │  RAG, transmittals,     │
   │  drawings, …)           │
   └─────────────────────────┘
```

**Two abstractions only:**
1. **Agents** — each is a persona with a system prompt, a list of allowed tools, and a model assignment.
2. **Tools** — each is a validated function that does one thing (read or propose-write).

**Skills are NOT a third abstraction.** They are source material. They get compiled into either an agent's prompt (Bucket C) or a tool (Bucket B) or already exist as infrastructure (Bucket A) or become a UI form (Bucket D).

---

## Implementation log

A running record of what was actually shipped, deviations from the plan, and what's still outstanding. Updated as work lands.

### Shipped

**Phase 1 — read-only Q&A (2026-04-29).** ChatDock at the bottom of the project workspace, scoped per project. One specialist (Finance) with two read tools (`search_rag`, `list_cost_lines`). Tool-use loop, multi-tenant guard, SSE event stream, project-scoped routing. New tables: `chat_threads`, `chat_messages`, `agent_runs`, `tool_calls` (migration `drizzle-pg/0039_agents_chat_tables.sql`). Verified end-to-end against real project data — Finance agent correctly reads cost lines and uploaded documents, replies with citations, no hallucinated values.

**Phase 3 — approval gate + mutating tools (2026-04-29).** `update_cost_line` mutating tool that proposes diffs through the approval gate, never writing directly. New `approvals` table + `row_version` columns on `cost_lines`, `variations`, `program_activities`, `transmittals` (migration `drizzle-pg/0040_agent_approvals.sql`). `POST /api/chat/approvals/[id]/respond` applies under optimistic-locking, returns 409 on conflict. Inline `ApprovalGate` card in the chat with Approve/Reject buttons. Verified: propose → approve → DB writes; concurrent-edit conflict path correctly rejected.

**Phase 3.1 follow-on — `create_cost_line` (2026-04-29).** Same approval-gate pattern as `update_cost_line`. Computes next `sortOrder` within the section on apply. Finance now has `[search_rag, list_cost_lines, update_cost_line, create_cost_line]`.

**Phase 3.2 follow-on — `record_invoice` (2026-04-29).** Finance can propose invoice/progress-claim records through the same approval gate. The applicator inserts into `invoices`; the runtime guards against text-only "awaiting approval" claims by forcing a corrective tool turn when an invoice request stops without a `record_invoice` call.

**Phase 3.5 — Cross-tab live updates (2026-04-29).** Per-project SSE channel at `/api/projects/[projectId]/events` emits `entity_updated` on agent-approved writes. `useCostPlan` subscribes and refetches on cost-line events; the 10-second poll remains as fallback for non-agent writes. The event bus now covers cost lines, invoices, notes, risks, variations, programme activities/milestones, and stakeholders for future tab refresh wiring. Same in-process `globalThis`-pinned Map pattern as the chat events bus.

**Phase 2 — Orchestrator + Design/Program read-only (2026-04-29).** Reactivated after the Phase 3/3.5 approval work. The default chat agent is now the Orchestrator, which deterministically routes user requests to Finance, Program, and/or Design. Multi-domain status/readiness requests fan out concurrently to quiet specialist runs and return one attributed Orchestrator reply. Added read-only Design and Program specialists, `list_program`, and context injection from the existing project context orchestrator rather than a separate `PROJECT_MEMORY.md`/SQLite memory file. Finance write intents (`add/record/create invoices`, claims, fees, cost lines, variations) override design/program keywords because cost-line names often contain terms like "architect", "scheme design", or "DA".

**Phase 3X — broad write tools (2026-04-30).** Extended the approval-gate pattern to notes, risks, variations, programme activities/milestones, and stakeholder brief/scope fields. Added read tools for notes, risks, variations, stakeholders, and meetings. Row-version optimistic locking added to the editable tables; Finance, Program, and Design prompts/tool lists were updated; Phase 5 agent specs now list which Phase 3X tools they can inherit.

**Agent knowledge access + granular model groups (2026-04-30).** Added `search_knowledge_library` over curated knowledge domain libraries, wired it into Finance/Program/Design, and split model feature groups into `agent_finance`, `agent_program`, `agent_design`, `agent_orchestrator`, and `objectives_generation`. Agent model resolution now uses `getProviderAndModelFor()` through the AI registry.

**Live-refresh wiring + edit-and-approve (2026-05-01).** `useVariations` and `useProgram` now subscribe to the project event bus; agent-approved variation and programme writes refresh those panels immediately without a reload. `ApprovalGate` gains an "Edit" button that reveals per-field inputs so users can tweak a proposed value before approving. Clicking "Save & approve" sends `overrideInput` to the respond route, which merges it with the original tool input before applying. Only the changed fields are overridable; the entity `id` and `expectedRowVersion` are preserved from the original approval.

**Tests:** 85 passing across 11 agent suites (`src/lib/agents`). Multi-tenant cross-org rejection locked via tests at the tool, runner, and API surfaces.

### Deviations from the plan

- **Phase 2 shipped after Phase 3/3.5.** Went straight from Phase 1 to Phase 3 initially because mutating-cost-plan delivered more day-to-day value sooner. Phase 2 was then reactivated on top of the approval-enabled runtime, so the Orchestrator preserves the existing approval gate instead of replacing it.
- **`agents-schema.ts` deleted.** Originally the agent tables lived in their own schema file with cross-imports from `pg-schema.ts`. Turbopack on Next 16 doesn't tolerate ESM cycles well — inlined the tables directly into `pg-schema.ts` to eliminate the cycle. Same approach used for the Phase 3 `approvals` table.
- **SSE `connections` Map pinned to `globalThis`.** Without this, Next.js dev mode hot-reloads produced multiple Map instances; the SSE route registered controllers in instance A while the runner emitted into instance B and events vanished silently. Standard Next.js dev-mode singleton pattern.
- **SSE replay of pending approvals on connect.** Added so the UI rehydrates after page reloads, dock collapse-and-reopen, or network blips. Without it, approvals already in the DB but proposed before this connection are invisible.
- **`ChatDock` anchored to center panel via `ResizeObserver` + RAF retry loop.** Not in the original plan — emerged from the user requesting "make it fit the middle column only". `react-resizable-panels` mounts asynchronously, so the dock polls `requestAnimationFrame` until the anchor element exists with a non-zero width, then attaches the observer.
- **`ApprovalGate` uses inline styles, not Tailwind.** A flex-collapse bug caused the original Tailwind-styled card to render with zero content height (the user saw thin orange lines). Switched to explicit inline styles with `minHeight: 140` so the card can never collapse. Design tokens (`var(--color-*)`) are still used for colors — the lesson was structural, not stylistic.

### Outstanding (in priority order)

1. **Domain-repo retrieval tool** (`search_domain_repos`). `search_knowledge_library` now covers curated seed/org knowledge libraries; standalone domain repositories still need their own agent-facing tool if they should be queried separately from the curated library path.
2. **Prompt hardening** — model occasionally states a dollar amount in chat text without including it as `budgetCents` in the tool call. Strengthened the prompt 2026-04-29 but worth monitoring.
3. **Phase 4** (Watchdogs + soft gates), **Phase 5** (Correspondence + remaining specialists), **Phase 6** (BullMQ for long runs + admin observability). All on hold pending lived experience with what's shipped.

### Files touched

- DB migrations: `drizzle-pg/0039_agents_chat_tables.sql`, `drizzle-pg/0040_agent_approvals.sql`, `drizzle-auth/0003_agent_feature_groups.sql`
- Schema: chat + approvals tables inlined in `src/lib/db/pg-schema.ts`; new feature groups in `src/lib/ai/types.ts`
- Agent runtime: `src/lib/agents/{runner,completion,events,model,registry,approvals,applicators,orchestrator,types}.ts`
- Specialists: `src/lib/agents/specialists/{orchestrator,finance,design,program}.ts`
- Tools: `src/lib/agents/tools/{_context,catalog,search-rag,list-cost-lines,list-program,update-cost-line,create-cost-line,index}.ts`
- API routes: `src/app/api/chat/threads/`, `src/app/api/chat/approvals/[id]/respond/`
- UI: `src/components/chat/{ChatDock,ChatDockMount,MessageList,MessageBubble,ToolCallCard,AgentBadge,ApprovalGate}.tsx`
- Hook: `src/lib/hooks/use-chat-stream.ts`
- Layout marker: `src/components/layout/ResizableLayout.tsx` (`data-chat-dock-anchor="center"`)
- Per-project layout: `src/app/projects/[projectId]/layout.tsx` (mounts dock + auth check)
