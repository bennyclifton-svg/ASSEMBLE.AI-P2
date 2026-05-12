# PRD: Briefing (grill-me) — AI-led brief refinement

**Date:** 2026-05-12
**Status:** Draft — ready for triage
**Triage label:** `needs-triage`
**Companion design doc:** [docs/plans/2026-05-12-briefing-grill-me-design.md](../plans/2026-05-12-briefing-grill-me-design.md)

---

## Problem Statement

Today, users build their project brief by filling out a profiler (building class, subclass, project type, scale, complexity dimensions, work scope), then trigger a generation step that turns those selections into draft objectives via a rule-based inference engine plus an LLM polish.

This breaks down in three ways the user feels directly:

1. **Users don't know what they don't know.** They make selections in the profiler that they're confident about and either guess or skip the rest. Detail that should belong in the brief — services scope, programming, performance targets, compliance constraints — is omitted upfront and only surfaces later during design. By then it's hard to fold back into the consultants brief without rework.

2. **The current two-stage pipeline (rules + LLM) is hard to maintain and asks too much of the user.** The user must complete the profile *before* anything useful happens, and the inference rules can only ask about gaps that someone wrote a rule for. The user is left filling in fields they don't have an answer for, just to unblock the next step.

3. **Existing source documents are ignored.** Users often arrive with material that already contains briefing information — a client letter, a feasibility report, a draft scope-of-services, planning correspondence. The current flow has nowhere to feed these documents in, so the same content gets re-typed into the profiler (badly) or omitted entirely.

The result is briefs that look complete but aren't, and consultants briefs that get amended mid-design.

## Solution

Replace the inference-engine + objectives-generate pipeline with a single **Briefing session**: a chat-style streaming interview, kicked off by a "Start Briefing" button at the top of the objectives table, that an LLM agent runs against the user's partially-filled profile **and any briefing documents the user has attached**.

The user configures only what they know in the profiler — skipping anything uncertain — and saves. If they have source material (client letters, feasibility reports, draft scopes, planning correspondence), they upload them to the document repository and attach them to the brief via a new "Attach documents" module at the bottom of the objectives workspace — the same pattern already used at the bottom of notes, meetings, reports, RFT and TRR. The doc-worker OCRs and RAG-indexes each document on ingest.

They click **Start Briefing**, and a side panel opens. The agent reads the saved profile plus any existing objective drafts plus the metadata of attached documents, treats them as facts, and asks one targeted question at a time. When a question would benefit from material in an attached document, the agent searches the attached documents via the existing RAG layer and references what it finds in the question's rationale ("In the attached feasibility report, the architect mentioned a 6-storey envelope — should planning objectives target that height?"). Each question comes with a **recommended answer** pre-filled in an editable text box. The user can **Accept**, **Edit & send**, or **Skip** ("I don't know — make a reasonable assumption and continue").

As the user answers, the agent commits writes to the schema in real time via explicit tool calls — to profile fields the user originally skipped, and to draft rows in `projectObjectives` across the four objective types (planning, functional, quality, compliance). A small toast confirms each write so the user sees exactly where their answer landed. The session is resumable; the agent marks each objective category covered as the conversation progresses, and the session ends when all four are covered (or when the user clicks End Briefing).

The result: less upfront effort, richer briefs informed by the user's actual source material, and one pipeline instead of two.

## User Stories

1. As a project director, I want to start a brief by selecting only the project attributes I'm certain about, so that I don't have to guess or invent data just to unblock the next step.
2. As a project director, I want to see a "Start Briefing" button at the top of the objectives table, so that I can launch the interview at the moment I'm staring at an empty or sparse brief.
3. As a project director, I want the LLM to read my saved profile before it asks me anything, so that it doesn't ask me about things I've already answered.
4. As a project director, I want each interview question to come with a recommended answer already filled in, so that I can accept it in one click when it's right.
5. As a project director, I want to edit the recommended answer before sending, so that I can keep the LLM's framing but tweak the specifics.
6. As a project director, I want to skip a question with "I don't know — make a reasonable assumption", so that I can keep momentum even when I genuinely don't have an answer.
7. As a project director, I want to type my own question back to the agent, so that I can clarify what it's asking or ask why it suggested a particular value.
8. As a project director, I want to see a progress strip showing planning / functional / quality / compliance coverage, so that I know how much further the interview has to go.
9. As a project director, I want a small toast after each answer confirming where it was saved (e.g. "Saved → objectives.planning #2"), so that I can trust what the agent is doing.
10. As a project director, I want to leave the Briefing panel and come back later, so that I can pause mid-session without losing my place.
11. As a project director, I want resuming the session to feel continuous — the agent picks up where we left off, with all prior context, so that I don't have to re-explain anything.
12. As a project director, I want the "Start Briefing" button to change to "Resume Briefing" when a session is in progress, so that I can see the state at a glance from the objectives table.
13. As a project director, I want the button to change to "Review Briefing" after the session is complete, so that I can read back the agent's questions and my answers later.
14. As a project director, I want existing objective drafts I wrote manually to be respected, so that the agent fills gaps rather than overwriting my own words.
15. As a project director, I want existing profile fields I already filled in to be respected, so that the agent fills the gaps I skipped rather than re-interviewing me about everything.
16. As a project director, I want the agent to gently flag (not overwrite) any answer of mine that seems inconsistent with new information, so that I can choose whether to revisit it.
17. As a project director, I want the agent's questions to span objectives across all four types (planning, functional, quality, compliance), so that the resulting brief is balanced.
18. As a project director, I want the questions to be informed by the construction-domain knowledge that used to live in the inference rules, so that the agent asks the right things for my project class and type.
19. As a project director, I want answers to be written as draft objectives (`status='draft'`) rather than polished prose, so that the existing Polish step still does the bullet-to-prose rewrite afterwards.
20. As a project director, I want to end the interview early with an "End Briefing" link, so that I can stop whenever I judge the brief is complete enough.
21. As a project director, I want a confirm dialog if I try to end the interview before coverage is complete, so that I don't accidentally cut it short.
22. As a project director, I want a completion screen at the end of a successful session summarising which objectives were filled and which profile fields were updated, so that I can see the value the session delivered.
23. As a project director, I want a clear CTA back to the brief preview from the completion screen, so that I can immediately see the resulting brief.
24. As a project director, I want streaming responses (text appearing as the agent generates it), so that the experience feels live, not laggy.
25. As a project director, I want each write to be transactional, so that I never end up with a half-written objective if something fails mid-stream.
26. As a project director, I want to be able to retry the last turn if the model stream errors, so that a transient failure doesn't force me to start over.
27. As a project director, I want my session to survive a browser refresh or tab close, so that nothing is lost if my laptop sleeps or I navigate away.
28. As a project director, I want only one active Briefing session per project, so that I'm not juggling parallel interviews on the same brief.
29. As an admin, I want the Briefing agent's model to inherit my `chat` feature-group setting at `/admin/models`, so that I can upgrade or downgrade the model without a code change.
30. As an admin, I want the inference-engine + objectives-generate path to remain available for legacy projects during a soak period, so that existing briefs aren't disrupted by the rollout.
31. As an admin, I want the Briefing feature behind a feature flag (`BRIEFING_ENABLED`) for its first release, so that I can roll back without a deploy if needed.
32. As an analyst, I want each `projectObjectives` row to record its `source` (`manual` / `inference` / `briefing`), so that I can measure how much of each project's brief came from a Briefing session.
33. As a developer, I want every schema write the agent performs to be an explicit, named tool call, so that the agent can never silently change data via free-text and every write is auditable.
34. As a developer, I want the agent's writes restricted to a permitted-field allowlist (profile fields and `projectObjectives` columns only), so that scope creep into other tables is impossible in v1.
35. As a developer, I want a clear retirement plan for the inference engine (ship behind flag → migrate UI → delete code), so that the old pipeline doesn't linger indefinitely.
36. As a project director, I want an "Attach documents" module at the bottom of the objectives workspace — visually consistent with the one at the bottom of notes, meetings, reports and RFT — so that it feels native and I don't have to learn a new pattern.
37. As a project director, I want to upload a briefing document (client letter, feasibility report, draft scope) to the document repository, click an Ingest button, and attach it to the brief, so that the AI can use it as context.
38. As a project director, I want to see a visible indicator that an attached document has been ingested (OCR'd and indexed) before I start a Briefing session, so that I know the agent will be able to read it.
39. As a project director, I want to detach a document from the brief without deleting it from the repository, so that I can manage what the agent considers without losing my source material.
40. As a project director, I want the Briefing agent to acknowledge attached documents in its first message ("I can see you've attached the feasibility report and the client letter — I'll reference these as we go"), so that I know my uploads are being used.
41. As a project director, I want the agent's recommended answers to cite the attached document and section when an answer is drawn from one ("In the feasibility report, page 4, the architect mentioned…"), so that I can trust the recommendation and check the source.
42. As a project director, I want the agent's questions to be shaped by the attached documents — asking *fewer* questions when the documents already answer them, and *more targeted* questions where the documents are ambiguous, so that the interview gets shorter and sharper as I add source material.
43. As a developer, I want attached briefing documents to be exposed to the agent only via a read-only RAG search tool (not as a free-text load of the full document), so that token costs stay bounded regardless of how large the attachments are.
44. As a developer, I want the briefing-attachments storage to reuse the existing `documents` + `file_assets` + `versions` tables — adding only a thin join table — so that we don't duplicate the document repository.

## Implementation Decisions

**Architecture — one pipeline replaces two.** Briefing replaces the existing inference-engine + `objectives/generate` pipeline for new projects. The inference rules' *content* is retained but demoted to **prompt material**: serialised as a gap checklist consumed by the agent's system prompt rather than executed as code. The old API and engine remain callable for legacy projects during a one-release soak, then are deleted.

**Module breakdown.** The implementation is structured around deep, isolatable modules with stable interfaces:

- **`briefing-prompt-builder`** — pure functions that assemble the system prompt from profile + objectives + retired-inference-rules-as-checklist + **attached-document metadata** + message history, and return the tool definitions. Snapshot-testable.
- **`briefing-tool-handlers`** — executes each tool call against the DB; returns structured success/error. Encapsulates write invariants and the permitted-field allowlist. **Four** tools:
  - `updateProfileField(field, value, rationale)` — writes to `projectProfiles` / `projectDetails`
  - `upsertObjective(category, text, rationale)` — writes a draft row to `projectObjectives` with `status='draft'` and `source='briefing'`
  - `markCategoryCovered(category)` — flips a coverage flag on the session
  - `searchBriefingDocuments(query)` — **read-only**; wraps the existing `search-rag` agent tool, scoped to documents attached to this project's brief. Returns ranked chunks with document title + page reference for citation in the agent's next question.
- **`briefing-session-service`** — owns the "one active session per project" invariant and all message/lifecycle DB ops (`getActive`, `start`, `loadWithMessages`, `appendMessage`, `end`).
- **`briefing-coverage-judge`** — pure module: `isComplete(coverage)` and `updateCoverage(current, category)`.
- **`briefing-agent`** — orchestrator composing the four above with the model client from `getModelFor('chat')`. Interface: `runTurn(context, userMessage) → AsyncIterable<TurnEvent>` emitting text-delta, tool-call-result, and done events.
- **SSE route handlers** — thin glue at `/api/projects/[id]/briefing/{start, messages, end}` and `GET /briefing`. Parses request, calls service + agent, pipes events to a Web standard SSE Response.
- **Brief attachments — reuse, not rebuild.** A new "Attach documents" module is added to the bottom of `ObjectivesWorkspace`, reusing the existing `AttachmentSection` + `AttachmentTable` components from `src/components/notes-meetings-reports/shared/`. Upload + ingest goes through the existing document-repository endpoints and the existing doc-worker pipeline (OCR + RAG indexing). The only new schema is the join table.

**Model selection.** Briefing inherits the **chat** feature group from the existing model registry at `src/lib/ai/registry.ts`, configurable from `/admin/models` without redeploy. No new admin row required.

**Schema additions.**
- `briefing_sessions` — `id`, `project_id`, `status` (`active` / `completed` / `abandoned`), `coverage` (jsonb keyed by objective type), `started_at`, `completed_at`, `ended_by`. Partial unique index on `(project_id) WHERE status = 'active'` enforces one active session per project.
- `briefing_messages` — `id`, `session_id`, `role` (`system` / `assistant` / `user` / `tool`), `content`, `tool_calls` (jsonb, nullable, for assistant turns that emitted tool calls), `created_at`. Index on `(session_id, created_at)`.
- `project_objectives.source` — new enum column (`manual` / `inference` / `briefing`), default `'manual'`. Existing rows backfilled to `'inference'`.
- `brief_attachments` — thin join table: `id`, `project_id`, `document_id` (fk → `documents`), `attached_by` (fk → `users`), `attached_at`. Unique constraint on `(project_id, document_id)` prevents duplicate attachment. Existing `documents` / `file_assets` / `versions` tables are reused as-is.

**API contracts.** All endpoints under `/api/projects/[projectId]/briefing`, all reusing existing `requireProjectAccess(projectId, userId)`:

- `GET /briefing` → `{ session, messages }` or `{ session: null }`. Drives button state in the UI.
- `POST /briefing/start` → creates session row, returns SSE stream of agent's first turn.
- `POST /briefing/messages` body `{ content, action: 'accept' | 'edit' | 'skip' }` → SSE stream of one full agent turn (text deltas + tool-call results + done).
- `POST /briefing/end` body `{ reason: 'user' | 'agent' }` → flips status to `completed` or `abandoned`, returns final session state.

**UX interactions.** Side panel (not modal) so the brief preview stays visible. Each assistant question renders with a short rationale, a pre-filled editable recommended-answer textbox, and three actions: Accept / Edit & send / Skip. A free-text composer is always available for the user to ask back. A progress strip shows the four objective-type coverage pills. Toasts confirm each write. When the agent's rationale or recommended answer draws on an attached briefing document, the source document title and page reference are inlined in the rationale.

**Attached-document flow.** The "Attach documents" module at the bottom of `ObjectivesWorkspace` shows the current attachments (title, type, ingest status). Upload triggers the existing doc-worker pipeline (OCR + RAG indexing). The agent reads attached documents only via `searchBriefingDocuments(query)` — never by inlining full document text into the prompt — so token cost is bounded regardless of attachment size. The system prompt at session start lists attached-document **metadata only** (title, type, page count) so the agent knows what's available to search.

**Existing-content policy.** When a session starts, the agent treats all existing profile fields and `projectObjectives` rows as facts. It only probes gaps. If the agent's reasoning surfaces an apparent inconsistency with an existing value, it flags it conversationally — never overwrites silently.

**Error handling.** Model stream errors mark the last assistant message `status='error'` and surface a retry button. Tool-call failures are recorded in `tool_calls.error` so the agent can adjust on its next turn. Network drops are recovered by reloading message history from the server; the server is the source of truth.

**Retirement of legacy pipeline.** Three phases: (1) ship Briefing behind `BRIEFING_ENABLED`, legacy `objectives/generate` remains callable; (2) remove the "Generate objectives" button from the brief panel — Start Briefing replaces it; (3) after one release of soak with no regressions, delete `/api/projects/[id]/objectives/generate`, `src/lib/services/inference-engine.ts`, and the rule config.

## Testing Decisions

**Good tests for this feature exercise external behaviour, not implementation details.** They go through the modules' public interfaces — they don't reach into private state or assert on prompt strings byte-for-byte. They use real Postgres (the project's existing test DB pattern) for any module that touches schema, and a fake model client for any module that exercises the agent loop. The point is to lock in user-visible guarantees ("one active session per project", "tool writes are transactional", "coverage advances correctly", "the turn cycle dispatches tool calls and emits the right events") rather than to pin specific code paths.

**Modules to test:**

- **`briefing-tool-handlers`** — covers schema-invariant enforcement (permitted-field allowlist; `projectObjectives` writes set `source='briefing'`; transactional behaviour on partial failure) and the error-result shape.
- **`briefing-session-service`** — covers the "one active session per project" invariant (concurrent `start` calls; rejecting a new session when one is active), message append ordering, and end-state transitions.
- **`briefing-coverage-judge`** — covers `isComplete` returning true only when all four objective types are covered, and `updateCoverage` being idempotent.
- **`briefing-agent`** — integration test with a fake model client emitting a scripted sequence (text deltas → tool calls → done). Verifies the agent dispatches each tool call to handlers, persists results via the session service, and emits the right `TurnEvent` shape on its async iterable. This is the bucket the design doc's "integration tests" refers to.

**Prior art in the codebase to mirror:**

- `src/lib/services/note-content-generation.ts` and `src/lib/agents/completion.ts` for AI-client integration patterns and how to structure a fake model client.
- The existing `objectives/generate` route handler tests (if any) for SSE / streaming patterns.
- Drizzle migrations under `drizzle-pg/` for schema-test conventions.

**Out-of-scope for testing in v1:**

- `briefing-prompt-builder` — snapshot-testable but prompts will evolve frequently in the first release; snapshots become a maintenance tax.
- SSE route handlers — thin glue; transitively exercised by the agent integration test.
- `BriefingPanel` UI — the codebase has no existing UI test infrastructure; relying on manual smoke per release (one full session per major project class) as called out in the design doc.

## Out of Scope

**Use case #2 — DA submission checklist.** Soon after the brief is established, a separate AI flow will extend the consultant list and prepare a schedule of deliverables for DA lodgement. This is intentionally deferred to its own PRD because (a) it writes to `consultantDisciplines` and a new DA-deliverables table, (b) it triggers off a post-brief milestone, not a chat, and (c) folding it in would muddy this PRD's scope. Once Briefing has shipped, its tool-call + session pattern becomes the template for that work.

**Writes beyond profile + objectives.** The Briefing interview may *discuss* programming, cost, budget, consultants, and programme to inform its objective questions — but the agent only writes to (a) `projectProfiles` / `projectDetails`, (b) `projectObjectives`, and (c) `briefing_sessions` / `briefing_messages` in v1. No writes to `consultantDisciplines.briefServices/briefDeliverables/briefFee/briefProgram`, cost plan, cashflow, or programme. v2 candidates.

**Agent-side writes to documents.** The agent can *read* attached briefing documents via `searchBriefingDocuments` but cannot upload, modify, delete, or re-categorise documents. Document management remains exclusively a user action through the existing repository UI.

**Polishing.** The existing Polish step (which rewrites a draft `text` into `textPolished` prose) is unchanged. Briefing produces drafts; Polish remains the bullet-to-prose stage. Short-form and long-form objective rendering remain a *maturity* distinction (`text` vs `textPolished` gated by `status`), not redundant with Briefing.

**Multi-session per project.** Only one active Briefing session is allowed per project. Archived sessions, "fresh start" sessions, or branch-and-merge of multiple interviews are not in v1.

**UI test infrastructure.** No new front-end testing harness in this PRD. `BriefingPanel` is covered by manual smoke testing.

**Voice or audio input.** Text only.

## Further Notes

**Naming.** User-facing label is **Briefing** throughout the UI. The `grill-me` skill is the internal pattern reference — engineering docs and code may use either, but no user-facing string says "grill me".

**Feature flag.** `BRIEFING_ENABLED` gates the entire feature for its first release. New projects in flagged-on tenants see "Start Briefing"; everyone else still sees the legacy "Generate objectives" button.

**Prompt material lineage.** When the inference engine is deleted in the third retirement phase, the rules' content is migrated to a markdown gap-checklist consumed by `briefing-prompt-builder`. The rules don't disappear; they change form.

**Coverage judgement.** The agent emits `markCategoryCovered(category)` when it believes a category has been adequately covered. The exact prompt wording for this judgement is an open item to refine during plan-writing and may need tuning during the soak period.

**Open implementation items** (flagged in the design doc, to be resolved during plan-writing): exact feature-flag plumbing, SSE library choice (raw Web API vs `eventsource-parser`), and coverage-judgement prompt wording.

**Companion design document.** Full architectural detail, sequence diagrams (turn cycle), schema, API surface, retirement plan, error handling, and the decision log live in [docs/plans/2026-05-12-briefing-grill-me-design.md](../plans/2026-05-12-briefing-grill-me-design.md). This PRD is the user- and product-facing summary; the design doc is the engineering reference.
