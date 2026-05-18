# Briefing (grill-me) — Design

**Date:** 2026-05-12
**Status:** Validated design, ready for implementation plan
**User-facing name:** Briefing
**Internal pattern:** `grill-me` skill (Matt Pollack)

---

## 1. Vision and scope

### Problem

Briefs are filled in upfront by users who don't know what they don't know. Scope gaps surface later — during design — when they're hard to fold back into the consultants brief. The current flow expects users to make full profile selections, then triggers an inference-rule + LLM pass to generate provisional objectives. That two-stage system is hard to maintain and pushes work onto the user that an LLM can do better.

### What Briefing does

The user configures only what they know in the profiler (skipping anything uncertain) and optionally **attaches briefing documents** (client letters, feasibility reports, draft scopes) to the brief via a new "Attach documents" module at the bottom of the objectives workspace, then clicks **"Start Briefing"** at the top of the objectives table. A chat-style streaming Q&A panel opens. The LLM reads the saved profile, any existing objective drafts, and the metadata of attached documents, then walks the user through one targeted question at a time — each with a recommended answer pre-filled. When an answer would benefit from material in an attached document, the agent searches those documents via a read-only RAG tool and cites the source in its rationale. The user accepts, edits, or replaces. Answers are written back to profile fields and `projectObjectives` rows in real time. The session is resumable; it ends when the agent judges every objective category (planning, functional, quality, compliance) adequately covered, or when the user clicks "End interview."

### What it replaces

The existing `src/lib/services/inference-engine.ts` rule evaluation plus the `/api/projects/[id]/objectives/generate` endpoint become obsolete for **new** briefs. The rules themselves are retained but demoted to **prompt material** — the agent consults them as a checklist of likely gaps, but doesn't run them as code. One pipeline replaces two.

### Out of scope for v1

- Writes to `consultantDisciplines`, cost plan, programme, cashflow
- DA submission checklist (use case #2) — covered in a follow-up design

---

## 2. User flow and UX

### Entry point

The "Start Briefing" button lives at the top of the objectives table inside `src/components/profiler/objectives/ObjectivesWorkspace.tsx`. Button label changes based on session state:

- No session yet → **"Start Briefing"**
- Session in progress → **"Resume Briefing"** with subtext "n questions answered"
- Session completed → **"Review Briefing"** (read-only history)

### Attach documents module (new — bottom of objectives workspace)

A new "Attach documents" module is added at the bottom of `ObjectivesWorkspace.tsx`, reusing the existing `AttachmentSection` + `AttachmentTable` components from `src/components/notes-meetings-reports/shared/` — the same pattern used at the bottom of notes, meetings, reports, RFT and TRR. The module:

- Lists currently attached briefing documents (title, type, ingest status, attached-by, attached-at)
- Provides an "Attach document" action that opens the existing document picker (choose from repository or upload new)
- On upload, hands off to the existing doc-worker pipeline (OCR + RAG indexing); the row shows a "Processing…" badge until ingestion completes
- Provides a "Detach" action per row (removes the `brief_attachments` join row; does NOT delete the document from the repository)

The module is functional independently of Briefing — users can attach documents at any time. Attached documents are read by the Briefing agent when a session is started or resumed.

### Chat panel

Clicking the button opens a **side panel** (not modal) so the brief preview pane stays visible on the right. Reuses the existing `ResizableLayout` pattern. Layout top to bottom:

1. **Progress strip** — four pill badges for planning / functional / quality / compliance, each turning solid once the agent judges them covered.
2. **Message stream** — assistant questions and user answers, scrollable. Each assistant question is followed by:
   - A short rationale ("Most multi-residential projects need…")
   - A **recommended answer** in an editable text box, pre-filled
   - Three actions: **Accept** (commits as-is), **Edit & send** (modify then commit), **Skip** ("I don't know — make a reasonable assumption and continue")
3. **Composer** at the bottom — free-text input for asking the agent a question back or going off-script. Always available.
4. **End controls** — "End briefing" link, with a confirm dialog if coverage isn't complete.

### Writes are visible

When an answer is committed, a small toast appears: *"Saved → objectives.planning #2"* or *"Saved → profile.subclass"*. The agent's behaviour is transparent — the user can see exactly where each answer landed.

### Completion screen

When coverage is complete, the panel shows a summary: which objectives were filled, which profile fields were updated, and a CTA back to the brief preview.

---

## 3. Architecture and data flow

### Server agent

New server-side agent in `src/lib/ai/briefing-agent.ts`, built on the existing `aiCompleteStream` from `src/lib/ai/client.ts`. Single model call per turn. The model is resolved via `getModelFor('chat')` from `src/lib/ai/registry.ts` — Briefing inherits the **chat** feature group, configurable from `/admin/models` without redeploy. No new admin row needed.

System prompt assembled from:

- The full saved profile (JSON)
- Current `projectObjectives` rows (treated as facts; only gaps are probed)
- The retired inference rules, serialised as a **gap checklist** ("for this project class, likely gaps are X, Y, Z…")
- **Attached-document metadata** — for each row in `brief_attachments`, the document's title, type, page count, and ingest status. The agent knows *what's available to search* but does **not** receive the full text inline.
- Conversation history (all prior `briefing_messages` for this session)
- Tool definitions (below)

### Tool-call writes and the search tool

The agent uses Anthropic tool use to interact with the project. **Four** tools — three writers and one read-only searcher:

- `updateProfileField(field, value, rationale)` — writes to `projectProfiles` / `projectDetails`
- `upsertObjective(category, text, rationale)` — writes a draft row to `projectObjectives` (`status='draft'`)
- `markCategoryCovered(category)` — flips a coverage flag on the session
- `searchBriefingDocuments(query)` — **read-only**; wraps the existing `src/lib/agents/tools/search-rag.ts` tool, scoped to documents currently in `brief_attachments` for this project. Returns ranked chunks with document title and page reference so the agent can cite the source in its next question's rationale.

When the agent emits a *write* tool call, the API executes the write inside a transaction, streams the result back as a confirmation event, and the client shows a toast. When it emits the *search* tool call, the result is returned to the agent only (no toast) and the chunks influence the next question. The agent never writes via free-text — every write is an explicit, traceable tool call.

### Turn cycle

1. Client opens session (resume or create) → loads message history
2. User clicks Accept/Edit/Skip → POSTs the answer to `/api/projects/[id]/briefing/messages`
3. Server appends user message, calls model with full context + tools
4. Model streams: any tool calls execute eagerly; final text becomes the next question
5. Server appends assistant message, streams back to client via SSE
6. Loop until model calls `markCategoryCovered` four times **or** judges coverage complete and emits no further question

No background workers. Synchronous request/response; the doc-worker / draw-worker queues stay out of this. Session state is just rows in Postgres.

---

## 4. Schema changes

Two new tables. Schema names use `briefing_*` to match the user-facing label.

### `briefing_sessions`

```
id            uuid pk
project_id    uuid fk → projects (NOT NULL)
status        enum('active','completed','abandoned')  default 'active'
coverage      jsonb  default '{"planning":false,"functional":false,"quality":false,"compliance":false}'
started_at    timestamptz default now()
completed_at  timestamptz nullable
ended_by      enum('agent','user') nullable
```

Partial unique index on `(project_id) WHERE status = 'active'` — enforces "one open session per project."

### `briefing_messages`

```
id           uuid pk
session_id   uuid fk → briefing_sessions (NOT NULL, on delete cascade)
role         enum('system','assistant','user','tool')
content      text
tool_calls   jsonb nullable     -- [{name, input, output, error?}] for assistant turns
created_at   timestamptz default now()
```

Index on `(session_id, created_at)` for fast history reload.

### Optional addition to `project_objectives`

```
source  enum('manual','inference','briefing')  default 'manual'
```

Adds provenance — useful for analytics and to inform agent prompts on re-runs. Backfill existing rows to `'inference'` since they were generated by the old pipeline. Cheap to add now, painful to add later.

### `brief_attachments` (new join table)

```
id           uuid pk
project_id   uuid fk → projects (NOT NULL)
document_id  uuid fk → documents (NOT NULL)
attached_by  uuid fk → users (NOT NULL)
attached_at  timestamptz default now()
```

Unique constraint on `(project_id, document_id)` — a document can be attached to a brief only once. Index on `project_id` for fast lookup when assembling the agent's system prompt.

No changes to `documents`, `file_assets`, or `versions` — the existing repository tables are reused as-is. Ingestion is unchanged: upload → doc-worker → OCR + RAG index, exactly as for any other document.

### No changes to `project_profiles` / `project_details`

Briefing writes use existing columns; the only difference is that fields can now arrive from a tool call instead of a form post.

### Migration

Standard `drizzle-pg/` migration; `npm run db:push` per CLAUDE.md.

---

## 5. API surface

All under `/api/projects/[projectId]/briefing`. Auth reuses existing `requireProjectAccess(projectId, userId)`.

### `GET /api/projects/[projectId]/briefing`

Returns `{ session, messages }` for the active session, or `{ session: null }` if none exists. Drives the "Start Briefing" vs "Resume Briefing" button state.

### `POST /api/projects/[projectId]/briefing/start`

Creates a `briefing_sessions` row (rejected by the partial unique index if one is already active). Returns SSE stream containing the agent's first turn — opening question + recommended answer + any initial tool calls.

### `POST /api/projects/[projectId]/briefing/messages`

Body: `{ content: string, action: 'accept' | 'edit' | 'skip' }`. Server:

1. Appends user message row.
2. Loads full session context (profile + objectives + message history + inference rules as gap checklist).
3. Calls model via `aiCompleteStream` with tool definitions; model resolved via `getModelFor('chat')`.
4. As the model streams: tool calls execute eagerly in a transaction (write to profile/objectives, then write a `role:'tool'` message row); text deltas stream straight to client over SSE.
5. After model finishes, appends final assistant message row. Stream closes.

Client receives a mixed SSE stream: text deltas, tool-call results (each becomes a toast), and a terminal "done" event.

### `POST /api/projects/[projectId]/briefing/end`

Body: `{ reason: 'user' | 'agent' }`. Flips session status to `'completed'` (agent declared coverage) or `'abandoned'` (user stopped early). Returns the final session state.

### Retired (but kept callable for now)

`POST /api/projects/[projectId]/objectives/generate` — the inference-engine endpoint. Still exists for legacy projects; new projects never hit it. Removed in a follow-up after one release of soak.

---

## 6. Retirement, error handling, testing, deferred work

### Inference engine retirement, phased

1. **Ship Briefing.** New projects use it; existing projects keep the legacy "generate" path. Behind a feature flag (`BRIEFING_ENABLED`) for the first release.
2. **Migrate UI.** Remove the "Generate objectives" button from the brief panel; "Start Briefing" replaces it.
3. **Remove API + engine.** After ~one release of soak with no regressions, delete `/api/projects/[id]/objectives/generate`, `inference-engine.ts`, and the rule config. The rules' *content* persists as a markdown gap-checklist consumed by the agent prompt.

### Error handling

- **Model stream errors:** the last assistant message row is marked `status='error'`; UI shows a retry button that re-POSTs the user's prior answer.
- **Tool call failures:** the tool message row records the error in `tool_calls.error`; the agent gets the error in its next turn and can adjust.
- **Network drops mid-stream:** client reconnects via `GET /briefing` and resumes from the last persisted message — sessions are durable by construction.
- **Stale browser tab:** server is source of truth; on reload the client just replays `messages` rows.

### Testing

- **Unit:** tool-call handlers (write to profile / objectives) — exercise existing-fact precedence and category-covered logic.
- **Integration:** a fake model client that emits a scripted tool-call sequence — verifies session lifecycle, write transactions, and SSE event shape end-to-end.
- **Manual smoke:** one full session per major project class (residential / commercial / industrial) before each release.

### Deferred: DA submission checklist (use case #2)

Soon after the brief is established, an AI flow that extends the consultant list and prepares a schedule of deliverables for DA lodgement. Distinct in scope (writes to `consultantDisciplines` + a new DA-deliverables table), distinct in trigger (post-brief milestone, not a chat), and would muddy this design. Once Briefing is shipped, we run a fresh brainstorming pass for it — and Briefing's tool-call + session pattern becomes the template.

### Open items to resolve during plan-writing

- Exact admin/feature-flag plumbing
- SSE library choice (raw Web API vs `eventsource-parser`)
- Coverage-judgement prompt wording

---

## Decision log

| Decision | Choice | Rationale |
|---|---|---|
| Role vs inference engine | **Replace** | Single pipeline; LLM-first; rules demoted to prompt material |
| Interview UX | **Chat-style streaming Q&A** | Closest to grill-me; recommended answer pre-filled |
| Write scope (v1) | **Profile + objectives only** | Smallest blast radius; sets the pattern for v2 |
| Stop condition | **Coverage of 4 categories + user escape** | Tied to actual output, not arbitrary count |
| Persistence | **One resumable session per project** | Simpler schema and UX than multi-session |
| Entry point | **"Start Briefing" button atop objectives table** | Discovered exactly when needed |
| Overwrite policy | **Treat existing content as facts; only fill gaps** | Matches user's mental model |
| Model selection | **`getModelFor('chat')` from existing registry** | Inherits admin/models config; no new surface |
| Short/long form objectives | **Retained** | They are a maturity distinction (`text` vs `textPolished`), not redundant with Briefing |
| Briefing document upload location | **Bottom of `ObjectivesWorkspace`, reusing `AttachmentSection`** | Visually consistent with notes / meetings / reports / RFT / TRR; zero new UI patterns |
| Agent access to attached documents | **Read-only `searchBriefingDocuments` tool via existing `search-rag`** | Token cost bounded; reuses existing RAG infrastructure; agent cites sources by title + page |
| Attachment schema | **Thin `brief_attachments` join table; reuse `documents` / `file_assets` / `versions`** | No duplication of the document repository |
