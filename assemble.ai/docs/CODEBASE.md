# Assemble.ai — Codebase Context

> **For AI agents**: Read this file first when starting any task on this codebase.
> It provides a complete architectural overview so you can navigate the code confidently.
> For visual diagrams, see `docs/VISUAL_MAP.md`.

---

## What This App Does

**Assemble.ai** is a SaaS construction project management platform for project managers, cost managers, and contract administrators. It covers the full lifecycle of a construction project:

- **Project profiling** — classify building type, complexity, region
- **Cost management** — budget, forecast, variations, invoices
- **Procurement** — consultant briefs, contractor scopes, RFT, tender evaluation, TRR
- **Program/schedule** — Gantt chart with activities, milestones, dependencies
- **Communication** — AI-generated meeting minutes, project reports, notes
- **Document management** — repository, versioning, category system, drawing extraction
- **RAG-powered AI** — attach project documents, ask questions, generate content grounded in real data

**Stack**: Next.js 14 (App Router), TypeScript, PostgreSQL (Drizzle ORM), pgvector, BullMQ, Better Auth, Polar billing.

---

## Directory Structure

```
src/
  app/                    # Next.js App Router
    (public)/             # Landing + pricing pages (no auth)
    (auth)/               # Login + register
    (dashboard)/          # Authenticated shell (session guard)
    projects/             # Project workspace pages
    admin/                # Super-admin console
    api/                  # All API routes (~130 endpoints)

  components/             # React components
    ui/                   # Radix UI primitives
    layout/               # ResizableLayout, BillingLayout
    dashboard/            # PlanningCard, ProcurementCard, DocumentCard
    landing/              # Marketing sections
    cost-plan/            # Spreadsheet + dialogs
    reports/              # Report editor + SmartContextPanel
    notes-meetings-reports/ # Notes, meetings, reports panels
    profiler/             # Project classification UI
    stakeholders/         # Stakeholder management
    program/              # Gantt chart
    documents/            # Document repository
    knowledge/            # Knowledge library UI
    chat/                 # Agent chat dock (ChatDock, MessageList, ApprovalGate, …)
    [feature]/            # One directory per feature domain

  lib/
    ai/                   # AI client, model registry, feature groups
    rag/                  # Parsing, chunking, embeddings, retrieval, reranking
    context/              # Context orchestrator + 12 modules
    langgraph/            # LangGraph report generation (state, graph, nodes)
    agents/               # Agent runtime: runner, registry, tools, approvals, specialists
    services/             # Business logic services
    db/                   # Drizzle schemas + clients
    queue/                # BullMQ client + queue helpers
    storage/              # Local + Supabase storage abstraction
    hooks/                # React custom hooks
    prompts/              # System prompt builders
    constants/            # Knowledge domains, inference rules, templates
    invoice/              # Invoice extraction + cost-line matching
    better-auth.ts        # Auth configuration

  types/                  # TypeScript type definitions

workers/
  document-processor/     # BullMQ worker: parse → chunk → embed → store
  drawing-extractor/      # BullMQ worker: Claude Vision → drawing metadata

drizzle-pg/               # SQL migrations (main DB)
drizzle/rag/              # SQL migrations (RAG DB)
```

---

## Pages & Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `/` | public | Landing page (15 sections) |
| `/pricing` | public | Pricing tiers |
| `/login` | public | Email/password login |
| `/register` | public | Account creation |
| `/dashboard` | session | Redirects to first project |
| `/projects` | session | Projects list / empty state |
| `/projects/[id]` | session | **Main workspace** (3-panel layout) |
| `/projects/[id]/cost-plan` | session | Full-screen cost spreadsheet |
| `/billing` | session | Subscription management |
| `/admin` | superAdmin | Operator console |
| `/admin/users` | superAdmin | User management + suspension |
| `/admin/models` | superAdmin | AI model config per feature group |
| `/admin/products` | superAdmin | Polar product management |

---

## Main Workspace Layout

The core of the app is `/projects/[id]` — a three-panel resizable layout:

- **Left** (`PlanningCard`) — project details, building profile, objectives, stakeholders, knowledge library
- **Center** (`ProcurementCard`) — tabbed: Profiler | Cost Planning | Consultants | Contractors | Program | Notes | Meetings & Reports | Project Details
- **Right** (`DocumentCard`) — document repository, upload, categories, RAG repo management

Files: `src/app/projects/[projectId]/page.tsx`, `src/components/dashboard/`

---

## AI & RAG System

### AI Client
- **File**: `src/lib/ai/client.ts`
- **Primary**: Anthropic Claude via `@anthropic-ai/sdk`
- **Fallback**: OpenRouter (OpenAI-compatible)
- **Two surfaces**: `aiComplete()` (blocking) and `aiCompleteStream()` (async generator)
- **Feature groups** (`src/lib/ai/registry.ts`): `document_extraction`, `text_extraction`, `cost_line_matching`, `content_generation`, `content_polishing` — each can be independently configured by admin

### RAG Pipeline (4 stages)
1. **Parse** — `src/lib/rag/parsing.ts`: LlamaParse → Unstructured → pdf-parse → mammoth (for .docx)
2. **Chunk** — `src/lib/rag/chunking.ts`: hierarchy-aware, 800–1500 tokens, recognises NCC/AS clause patterns
3. **Embed** — `src/lib/rag/embeddings.ts`: Voyage AI `voyage-large-2-instruct`, 1024D
4. **Retrieve** — `src/lib/rag/retrieval.ts`: pgvector cosine search → BAAI/Cohere rerank → parent context enrichment

### Context Orchestrator
- **File**: `src/lib/context/orchestrator.ts`
- **Function**: `assembleContext(request)` — single entry point for all AI generation
- **12 context modules** in `src/lib/context/modules/`: profile, projectInfo, costPlan, program, risks, procurement, stakeholders, starredNotes, ragDocuments, procurementDocs, attachedDocuments, planningCard
- All modules fetched in parallel with 5s timeout and LRU cache

### Knowledge Domains
- **File**: `src/lib/constants/knowledge-domains.ts`
- **15 pre-built domains** + org-uploaded custom domains
- **49 tags** across 5 categories: Building Type, Discipline, Function, Regulatory, Contract
- **Used by**: report generation, generate-field, objectives generate/polish, context orchestrator
- **NOT used by**: note content generation (uses direct RAG only)

### LangGraph Report Generation
- **Files**: `src/lib/langgraph/graph.ts`, `src/lib/langgraph/nodes/`, `src/lib/langgraph/state.ts`
- **Flow**: fetch_context → generate_toc → (user approves) → retrieve_context → generate_section → (user feedback loop) → finalize
- **Streaming**: SSE via `GET /api/reports/[id]/stream`
- **State persistence**: `report_templates.graphState` in RAG DB

---

## AI Agents (Chat)

> In-progress feature. Full design + rollout phases live in [docs/plans/2026-04-29-agent-integration.md](plans/2026-04-29-agent-integration.md). The implementation log at the bottom of that doc tracks shipped vs. outstanding work — keep it in sync when changing this area.

A persistent chat dock at the bottom of `/projects/[projectId]` lets the user converse with specialist agents (Finance, with Design/Program/Procurement/Delivery/Correspondence/Feasibility/Orchestrator planned). Agents read project data and uploaded docs directly; any database write goes through an approval gate.

### Status (as of 2026-04-29)
- **Phase 1 — read-only Q&A**: shipped. Finance agent + tool-use loop + SSE streaming.
- **Phase 3 — approval gate + mutating tools**: shipped. `update_cost_line`, `create_cost_line` propose diffs that the user must Approve/Reject.
- **Phase 3.5 — cross-tab live updates**: shipped. Agent-approved cost-line writes emit project-scoped `entity_updated` SSE events; cost-plan hooks refetch immediately while keeping the 10-second poll fallback.
- **Phase 2 — Orchestrator + Design/Program read-only**: shipped. The default chat entry point routes through the Orchestrator, which can fan out to Finance, Program, and Design and combine their answers into one attributed reply.
- **Phase 4 (watchdogs)**, **Phase 5 (remaining specialists)**, **Phase 6 (BullMQ runs + admin)**: not started.

### Runtime
- **Entry**: `POST /api/chat/threads/[id]/messages` opens a tool-use loop in `src/lib/agents/runner.ts`.
- **Specialists**: each is a persona (system prompt + allowed-tool whitelist + model assignment) under `src/lib/agents/specialists/`. Today: `orchestrator.ts`, `finance.ts`, `design.ts`, `program.ts`.
- **Tools** live in `src/lib/agents/tools/`. Read tools execute freely; mutating tools must produce an approval record instead of writing.
  - Read: `search_rag`, `list_cost_lines`, `list_invoices`, `list_program`
  - Mutating (gated): `update_cost_line`, `create_cost_line`, `record_invoice`
- **Approvals**: `src/lib/agents/approvals.ts` + `src/lib/agents/applicators.ts`. `POST /api/chat/approvals/[id]/respond` applies under optimistic locking against the target row's `row_version`, returns 409 on conflict.
- **Streaming**: SSE from the runner via `src/lib/agents/events.ts`. Hook: `src/lib/hooks/use-chat-stream.ts`. The `connections` Map is pinned to `globalThis` so dev-mode hot reloads don't orphan controllers.
- **Multi-tenant guard**: every tool asserts the project belongs to the caller's org. Locked in by tests at the tool, runner, and API layers.
- **Model selection**: bypasses `src/lib/ai/registry.ts` today via a raw SQL lookup against `model_settings` with a `claude-sonnet-4-6` fallback (`src/lib/agents/model.ts`). Restore the registry call once the admin model schema lands.

### UI
- **Mount**: `src/app/projects/[projectId]/layout.tsx` renders `ChatDockMount`.
- **Components**: `ChatDock` (anchored to the center panel via `ResizeObserver` on `data-chat-dock-anchor="center"` in `ResizableLayout`), `MessageList`, `MessageBubble`, `ToolCallCard`, `AgentBadge`, `ApprovalGate` (Approve/Reject card; uses inline styles + design tokens because Tailwind flex-collapse zeroed its height).

### Tables (main DB)
- `chat_threads`, `chat_messages`, `agent_runs`, `tool_calls` — migration `drizzle-pg/0039_agents_chat_tables.sql`
- `approvals` + `row_version` columns on `cost_lines`, `variations`, `program_activities`, `transmittals` — migration `drizzle-pg/0040_agent_approvals.sql`
- New agent feature groups in `auth-schema` — migration `drizzle-auth/0003_agent_feature_groups.sql`

All inlined into `src/lib/db/pg-schema.ts` (no separate `agents-schema.ts` — Turbopack's ESM cycle handling forced the inline).

---

## Database Architecture

### Two separate databases:

**Main DB** (`src/lib/db/pg-schema.ts`, `src/lib/db/index.ts`)
- All domain data: projects, documents, cost lines, stakeholders, meetings, notes, reports, invoices, variations, program, procurement, auth, billing
- ~50 tables
- Migration config: `drizzle.pg.config.ts` → `drizzle-pg/`

**RAG DB** (`src/lib/db/rag-schema.ts`, `src/lib/db/rag-client.ts`)
- `document_chunks` — vector embeddings (pgvector, 1024D)
- `document_sets` — project/org/domain scoped groupings
- `document_set_members` — sync status per document
- `report_templates` — LangGraph state for AI report generation
- `report_sections` — generated sections with source attribution
- `knowledge_domain_sources` — domain provenance
- Migration config: `drizzle.rag.config.ts` → `drizzle/rag/`

**Auth schema** (`src/lib/db/auth-schema.ts`)
- Better Auth tables: user, session, account, verification
- Polar billing tables: polarCustomer, polarSubscription
- Admin tables: modelSettings, adminAuditLog

### Key schema notes:
- `projectStakeholders` is the **unified stakeholder table** (Feature 020) — replaces legacy `consultants` and `contractors` tables which still exist for backwards compatibility
- `costLines` link to 5 master stages: initiation / schematic_design / design_development / procurement / delivery
- `fileAssets` stores both OCR text and drawing extraction results (drawing number, name, revision, confidence)
- `projects.projectType` has 14 enum values (house, apartments, commercial, industrial, etc.)
- Agent chat lives in `chat_threads` / `chat_messages` / `agent_runs` / `tool_calls`. Pending writes proposed by an agent go through `approvals`; mutable target rows (`cost_lines`, `variations`, `program_activities`, `transmittals`) carry a `row_version` for optimistic locking

---

## Background Workers

Two BullMQ workers, both in `workers/`:

**Document Processor** (`workers/document-processor/index.ts`)
- Queue: `document-processing` (concurrency 2) + `chunk-embedding` (concurrency 5)
- Steps: read file → parse → chunk → embed (Voyage AI) → insert to RAG DB → update sync status
- On failure: sets `documentSetMembers.syncStatus = 'failed'` with error message

**Drawing Extractor** (`workers/drawing-extractor/index.ts`)
- Queue: `drawing-extraction` (concurrency 5)
- Steps: check project flag → read file → Claude Vision API → write drawing metadata to `fileAssets`
- Respects `projects.drawingExtractionEnabled` flag

Queue client: `src/lib/queue/client.ts` (Upstash Redis via BullMQ)

---

## Authentication

- **Library**: Better Auth (`src/lib/better-auth.ts`)
- **Provider**: Email + password (OAuth ready)
- **Session**: 24h expiry, 1h rolling refresh, PostgreSQL-backed
- **On signup**: auto-create organization, init knowledge libraries, create Polar customer
- **Roles**: `user.isSuperAdmin` gates `/admin/*` routes; `user.suspendedAt` blocks session creation
- **Billing plugin**: `@polar-sh/better-auth` — checkout, portal, webhooks via Inngest

---

## Storage

- **Abstraction**: `src/lib/storage/index.ts` — auto-selects backend
- **Local** (`src/lib/storage/local.ts`): `uploads/` dir, SHA256 dedup
- **Supabase** (`src/lib/storage/supabase.ts`): private bucket, signed URLs, 50MB limit
- **Path convention**: Supabase paths stored as `supabase://{bucket}/{year}/{month}/{hash}{ext}`

---

## Key Services

| File | Purpose |
|------|---------|
| `src/lib/services/note-content-generation.ts` | AI note generation — RAG + orchestrator context |
| `src/lib/services/ai-content-generation.ts` | Meeting/report section generation |
| `src/lib/services/objectives-generation.ts` | AI objectives + stakeholder generation |
| `src/lib/services/inference-engine.ts` | Rule-based project analysis |
| `src/lib/services/tender-parser.ts` | Extract structure from RFT documents |
| `src/lib/services/drawing-extraction.ts` | Drawing metadata extraction |
| `src/lib/invoice/extract.ts` | AI invoice data extraction |
| `src/lib/invoice/cost-line-matcher.ts` | Match invoices to cost lines |
| `src/lib/services/lep/nsw-provider.ts` | NSW LEP / GIS planning data |

---

## Environment Variables (Key)

```bash
# Databases
DATABASE_URL=                   # Main PostgreSQL
SUPABASE_POSTGRES_URL=          # RAG PostgreSQL (pgvector)
SUPABASE_URL=                   # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=      # Server-side storage

# AI
ANTHROPIC_API_KEY=              # Claude (primary LLM)
VOYAGE_API_KEY=                 # Embeddings
COHERE_API_KEY=                 # Reranking fallback
BAAI_API_URL=                   # Reranking primary (optional)
LLAMA_CLOUD_API_KEY=            # Document parsing primary
OPENROUTER_API_KEY=             # LLM fallback

# Infrastructure
REDIS_URL=                      # Upstash Redis (BullMQ queues)
BETTER_AUTH_SECRET=             # Auth signing secret

# Billing
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_STARTER_PRODUCT_ID=
POLAR_PROFESSIONAL_PRODUCT_ID=
INNGEST_EVENT_KEY=              # Webhook processing
```

---

## Important Patterns & Conventions

1. **Parallel module fetching** — the context orchestrator always fetches modules in parallel with `Promise.allSettled`. Never fetch sequentially.

2. **minRelevanceScore for attached documents** — when retrieving from user-attached documents (explicit intent), use `minRelevanceScore: 0`. The default 0.1 threshold is for general RAG; attached documents should always return results.

3. **Two-database pattern** — main app data goes to main DB (Drizzle `db`), all RAG/vector data goes to RAG DB (Drizzle `ragDb`). Never mix clients.

4. **Worker env loading** — workers must load `.env.local` → `.env.development` → `.env` in the same order as Next.js. See `CLAUDE.md` for setup.

5. **AI feature groups** — always use `aiComplete({ featureGroup: 'xxx' })` not direct model strings. Feature groups are configurable via `/admin/models`.

6. **Document sync status lifecycle** — `pending → processing → synced | failed`. The UI polls `GET /api/document-sets/sync-status` to show RAG index status.

7. **Unified stakeholder table** — use `projectStakeholders` for new code. Legacy `consultants`/`contractors` tables remain for data migration purposes only.

8. **LangGraph state** — report generation state lives in `reportTemplates.graphState` (JSONB in RAG DB). Reports can be resumed after interruption.

9. **Agent approval gate** — agent tools never write directly to user data. Mutating tools insert an `approvals` row containing the proposed diff; the apply path (`POST /api/chat/approvals/[id]/respond`) is the only place that writes, and it does so under `row_version` optimistic locking. When adding a new mutating tool, follow `update_cost_line` / `create_cost_line` in `src/lib/agents/tools/` and wire an applicator in `src/lib/agents/applicators.ts`.

---

## Where Features Live (Quick Reference)

| Feature | Key Files |
|---------|-----------|
| Project profiler | `src/components/profiler/`, `src/app/api/projects/[id]/objectives/` |
| Cost plan spreadsheet | `src/components/cost-plan/`, `src/app/api/projects/[id]/cost-lines/` |
| Consultant/contractor procurement | `src/components/stakeholders/`, `src/app/api/consultants/`, `src/app/api/contractors/` |
| RFT documents | `src/components/rft-new/`, `src/app/api/rft-new/` |
| Tender evaluation | `src/app/api/evaluation/`, `src/components/trr/` |
| Program / Gantt | `src/components/program/`, `src/app/api/projects/[id]/program/` |
| Notes (AI) | `src/components/notes-meetings-reports/`, `src/lib/services/note-content-generation.ts` |
| Meetings (AI) | `src/app/api/meetings/`, `src/lib/services/ai-content-generation.ts` |
| Reports (LangGraph) | `src/lib/langgraph/`, `src/app/api/reports/` |
| Document repository | `src/components/documents/`, `src/app/api/documents/` |
| RAG ingestion | `workers/document-processor/`, `src/lib/rag/` |
| Drawing extraction | `workers/drawing-extractor/`, `src/lib/services/drawing-extraction.ts` |
| Knowledge domains | `src/lib/constants/knowledge-domains.ts`, `src/lib/rag/retrieval.ts` |
| Auth | `src/lib/better-auth.ts`, `src/app/api/auth/` |
| Billing | `src/lib/services/billing.ts`, `src/app/api/auth/polar/` |
| Admin console | `src/app/admin/`, `src/lib/admin/` |
| Agent chat (in progress) | `src/lib/agents/`, `src/components/chat/`, `src/app/api/chat/`, `src/app/projects/[projectId]/layout.tsx` — see [docs/plans/2026-04-29-agent-integration.md](plans/2026-04-29-agent-integration.md) |
