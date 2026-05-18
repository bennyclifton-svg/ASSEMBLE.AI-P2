# Sitewise Codebase Review

## 1. Product Summary

Sitewise is a client-side construction project workspace for owner-side project managers, PM agencies, consultants, and clients. It is not shaped as a head-contractor site management product. The workspace combines structured project records - brief, objectives, stakeholders, documents, cost plan, program, procurement, tender evaluation, correspondence, notes, meetings, reports, risks, variations, invoices - with an AI layer that can read project state, search documents and knowledge libraries, and propose writes through approval gates. Current deployment documentation points to `https://sitewise.au` on a Kamatera VPS behind Traefik/Dokploy, with Supabase-hosted PostgreSQL in `ap-southeast-2`, Redis, and background workers. The current commercial state is best understood from product context rather than code telemetry: no paying customers yet, but a network of beta-ready prospects.

## 2. Stack Overview

| Area | Current state |
|---|---|
| App framework | Next.js `16.0.3`, React `19.2.0`, TypeScript `^5`, App Router. Build script uses `next build --webpack`; a recent commit fixed Next middleware discovery by renaming `proxy.ts` to `middleware.ts`. |
| UI | Tailwind CSS `^4`, Radix primitives, Lucide icons, `react-resizable-panels`, Fortune Sheet for spreadsheet-like grids, TipTap `^3.14.0`, Sonner toasts. |
| Runtime | Node 20 Docker image. `npm run start` runs Next plus two bundled worker processes through `concurrently`. |
| Database | PostgreSQL only in current code. Drizzle ORM `^0.44.7`, Drizzle Kit `^0.31.7`. Main schema is `src/lib/db/pg-schema.ts`; auth schema is `src/lib/db/auth-schema.ts`; RAG schema is `src/lib/db/rag-schema.ts`; objectives row model is in `src/lib/db/objectives-schema.ts`. |
| Auth/billing | Better Auth `^1.4.17`, Polar integration (`@polar-sh/*`). Legacy `users/sessions/subscriptions` tables still exist beside Better Auth tables. |
| Hosting | Production docs: Kamatera Ubuntu 24.04 VPS, Dokploy-managed Docker Swarm, Traefik TLS, app domain `sitewise.au`, Supabase PostgreSQL 16, Redis 7. Local dev uses Docker Compose with `pgvector/pgvector:pg16` and Redis. |
| Storage | `src/lib/storage` chooses Supabase Storage when configured, otherwise local filesystem. AI artefacts also store payloads through this abstraction. |
| Queues/workers | BullMQ `^5.65.0`, ioredis `^5.8.2`; document processor and drawing extractor workers live in `workers/`. Inngest exists but is not the main worker path for document processing. |
| AI providers | Anthropic SDK `^0.71.0`, OpenAI SDK `^6.9.1`, OpenRouter via OpenAI-compatible client, Voyage embeddings, Cohere reranking, LlamaIndex/LlamaParse. |
| Vector store | PostgreSQL + pgvector. Embeddings are Voyage `voyage-large-2-instruct`, 1024 dimensions. |
| Compatibility constraints | Several extraction paths still hard-code Claude models and bypass the provider abstraction. RAG config writes migrations to `./drizzle/rag`, but no generated RAG migration directory is present. `docker/init.sql` is stale: it creates notes/meetings/report tables with FKs before the referenced project tables exist, so a fresh local database may not initialize cleanly from Compose alone. |

## 3. Repository Structure

```text
.
├─ .claude/                  # Claude Code local settings; not product runtime.
├─ .github/
│  └─ agents/                # Copilot/Speckit agent prompt files, mostly planning workflow helpers.
├─ .specify/
│  ├─ memory/                # Speckit constitution/context.
│  ├─ scripts/               # Speckit PowerShell helpers.
│  └─ templates/             # Speckit spec/plan/task templates.
├─ demo-uploads/             # Sample uploaded correspondence/invoice material.
├─ docker/                   # Local Postgres init SQL; currently stale relative to schema.
├─ docs/
│  ├─ adr/                   # Current architectural decisions.
│  ├─ agents/                # Long-form intended agent definitions.
│  ├─ ddc/                   # Demand-driven context cycle logs.
│  ├─ plans/                 # Implementation plans and design notes.
│  ├─ prds/                  # Product requirements drafts.
│  └─ skills/                # Markdown SKILL.md source material, not live runtime skills.
├─ drizzle-auth/             # Better Auth/model-settings migrations.
├─ drizzle-pg/               # Main Postgres migrations plus stale generated schema snapshot.
├─ migrations/               # Older SQL, including intelligence layer schema.
├─ public/                   # Static images and landing assets.
├─ scripts/                  # Seeding/debug/extraction utilities; includes transient debug artefacts.
├─ specs/                    # Speckit feature specs, many now historical.
├─ src/
│  ├─ app/                   # Next routes: auth, dashboard, public pages, admin, API.
│  ├─ components/            # Feature UI: chat, brief, cost-plan, documents, evaluation, program, etc.
│  ├─ hooks/                 # Shared React hooks.
│  ├─ lib/                   # Server/domain code, AI, agents, DB, RAG, actions, workflows.
│  └─ types/                 # Shared TypeScript types.
├─ supabase/                 # Supabase config/functions area, lightly used.
├─ tests/                    # Component/integration tests outside colocated `__tests__`.
├─ uploads/                  # Local stored files/knowledge libraries.
└─ workers/
   ├─ document-processor/    # RAG parse/chunk/embed worker.
   └─ drawing-extractor/     # AI drawing metadata extraction worker.
```

Key source locations:

- AI provider/model layer: `src/lib/ai`.
- Chat agents, tools, approvals, event buses: `src/lib/agents`.
- Registered application actions: `src/lib/actions/definitions`.
- Workflow engine and issue-variation workflows: `src/lib/workflows`.
- Context assembly: `src/lib/context`.
- RAG parsing/chunking/retrieval: `src/lib/rag`.
- Database schemas: `src/lib/db`.
- Runtime specialist prompts: `src/lib/agents/specialists`.
- Long-form agent plans: `docs/agents`.
- Markdown skill source material: `docs/skills/*/SKILL.md`.

## 4. Data Model Summary

| Entity | Description and relationships |
|---|---|
| Organization/User/Auth | Better Auth tables (`user`, `session`, `account`, `verification`) coexist with legacy `organizations`, `users`, `sessions`, `login_attempts`. Organization is the tenancy boundary for most project records. |
| Project | Main workspace root. Related to details, profile, objectives, stakeholders, documents, cost, program, correspondence, notes, meetings, reports, chat, workflows, and evaluations. |
| Project Details/Profile | `project_details` stores address, jurisdiction, physical facts; `project_profiles` stores building class/type, subclass, scale, complexity, work scope. Used by brief, objectives, context, and knowledge-domain resolution. |
| Project Objectives | Current row model in `project_objectives`: objective type (`planning`, `functional`, `quality`, `compliance`), text, polished text, source, status, sort order. Legacy `profiler_objectives` two-blob model remains deprecated. |
| Briefing | `briefing_sessions`, `briefing_messages`, `brief_attachments` support the new briefing interview flow. One active session per project is enforced by a partial unique index. |
| Documents | `documents`, `versions`, `file_assets`, categories/subcategories, transmittal links, drawing metadata, OCR/sync flags. File payloads live in Supabase or local storage. |
| RAG Document Sets/Chunks | Separate RAG schema: `document_sets`, `document_set_members`, `document_chunks`, report templates/sections/memory. Chunks are pgvector-backed and linked by document id, not strict FKs to main schema. |
| Knowledge Libraries | Main schema `knowledge_libraries` / `library_documents` plus RAG `document_sets` and `knowledge_domain_sources`. This is a hybrid and still has sync-boundary drift. |
| Stakeholders/Firms | Legacy `stakeholders`, `consultant_disciplines`, `contractor_trades`, `consultants`, `contractors`, `companies`, and newer `project_stakeholders` with tender/submission status tables. The newer stakeholder model is active in procurement UX. |
| Cost Plan | `cost_lines`, `cost_line_allocations`, comments, snapshots, import templates. Finance agent can list/create/update lines through tools/actions. |
| Variations | Typed `variations` table with status/amount fields, linked to cost plan and workflows. Also appears as a note record type, but the note type is not the authoritative variation register. |
| Invoices | `invoices` table, used for invoice/progress-claim ledger entries and Finance tools. Invoice extraction still uses hard-coded Claude paths. |
| Program | `program_activities`, `program_dependencies`, `program_milestones`, expected outputs, evidence links. Program agent can list/replace/create/update activities and milestones. |
| Risks | `risks` table, used by finance/program/design/delivery context and tools. |
| Correspondence | `project_inboxes`, `correspondence_threads`, `correspondence`, `correspondence_attachments`. Current DDC work handles inbound contractor variation claims and drafts outbound correspondence, but real mailbox polling/sending is deferred. |
| Notes | `notes` plus `note_transmittals`; generic communication record with type/status/color/date/content. Also used as a container for several "record" types. |
| Meetings | `meeting_groups`, `meetings`, `meeting_sections`, attendees, transmittals. Richer lifecycle than notes, but implemented as separate routes/components rather than one communication-artifact module. |
| Reports | `report_groups`, `reports`, `report_sections`, attendees, transmittals. Separate from RAG report generation templates in the RAG schema. |
| Addenda/RFT/TRR | `addenda`, `rft_new`, `trr` plus transmittal link tables. Used by design/procurement workflows and exports. |
| Tender Evaluation | `evaluations`, `evaluation_price`, rows, cells, non-price criteria/cells, tender submission packages/submissions, clarifications, `ai_artefacts`. Recent work adds VM rows, recommendation state, refresh pipeline foundations, and cost-plan push. |
| AI/Chat/Audit | `chat_threads`, `chat_messages`, `agent_runs`, `tool_calls`, `approvals`, `action_invocations`, `workflow_runs`, `workflow_steps`. These are the main audit substrate for agent and workflow actions. |
| Billing/Leads | `products`, `transactions`, Better Auth Polar tables, `demo_requests`, `assessment_waitlist`. |

Record types in notes:

| Requested record type | Current schema shape |
|---|---|
| RFI | Text-only discriminator in `notes.type`; no typed RFI table/fields. |
| Notice | Text-only discriminator in `notes.type`; no typed notice table/fields. |
| EOT | Text-only discriminator in `notes.type`; no EOT claim table. Delivery docs explicitly list EOT tools/tables as future work. |
| Defect | Text-only discriminator in `notes.type`; no defects register. Delivery docs list defects as future work. |
| Variation | `notes.type='variation'` is text-only, but a separate typed `variations` table exists and is the real register. |
| Risk | `notes.type='risk'` is text-only, but a separate typed `risks` table exists and is the real register. |
| Transmittal | `notes.type='transmittal'` is text-only, but separate `transmittals` / item tables exist for actual transmittals. |
| Review Note | Stored as `notes.type='review'`; text-only. No review-note-specific schema. |

Known schema gaps: no typed RFI, EOT, notice, defect, site instruction, progress claim, or delivery determination registers; communication artifacts are split across multiple parallel schemas; legacy and current stakeholder/objective/auth models coexist; generated `drizzle-pg/schema.ts` is stale relative to `src/lib/db/pg-schema.ts`.

## 5. AI Infrastructure

The current provider abstraction is real but incomplete. `src/lib/ai/types.ts` defines only three model feature groups: `extraction`, `generation`, and `chat`. `src/lib/ai/registry.ts` reads `model_settings` with a 60-second in-memory cache and falls back to Anthropic `claude-sonnet-4-6`. `src/lib/ai/client.ts` dispatches Anthropic, OpenRouter, or OpenAI for text completion/streaming. Admin model settings support those three groups. Older README/model docs still describe per-agent and per-task feature groups that have been collapsed.

Feature-group use is uneven. Agent turns and briefing use `chat`. Report generation, notes, objectives generation/polish, TRR/RFT generation, and content generation use `generation`. Some extraction and matching calls use `extraction`. However, invoice extraction, variation extraction, contractor/consultant/planning extract routes, drawing extraction, and some evaluation parsing still hard-code Anthropic model ids. Native PDF extraction is explicitly out of the provider abstraction.

RAG is implemented as a live PostgreSQL/pgvector pipeline. The document processor worker reads files from storage, parses with LlamaParse -> Unstructured -> pdf-parse/text fallback, chunks with construction-aware logic, embeds through Voyage, and stores `document_chunks`. Retrieval embeds the query, searches pgvector, reranks with BAAI/Cohere where available, falls back to vector scoring, and enriches parent context. Agents access RAG through `search_rag` and curated knowledge through `search_knowledge_library`. Some APIs still include placeholder retrieval routes.

Prompts live in several places rather than one prompt module: runtime specialist prompts in `src/lib/agents/specialists`, general generation prompts in `src/lib/prompts`, briefing prompts in `src/lib/briefing/prompt-builder.ts`, and long-form intended agent docs in `docs/agents`. The long-form docs are useful domain material, but not always truthful about runtime wiring.

Tools are registered in `src/lib/agents/tools`. Read tools execute immediately. Mutating tools are a mix of older agent tools/applicators and newer application actions. Application actions in `src/lib/actions/definitions` define schema, preview/prepare/apply logic, policy, agent access, UI target, events, and audit. `action-adapter.ts` exposes actions as tools and turns non-run policies into approval records. This action surface is the intended direction, but the migration is partial.

The chat dock posts user messages to `/api/chat/threads/[threadId]/messages`, then runs the Orchestrator or a requested specialist in the background. SSE streams from `/stream` carry run/tool/approval/message events. The Orchestrator is deterministic routing code, not an LLM agent: it fans out to Finance, Program, Design, or Delivery based on intent and combines attributed replies. Specialist agents call LLMs and tools with up to eight model turns.

Approvals are stored in `approvals`; approval responses can merge user edits through `overrideInput`; applied writes emit project events. Workflow steps can block downstream approvals until dependencies apply. Audit trails exist in `agent_runs`, `tool_calls`, `approvals`, `action_invocations`, `workflow_runs`, and `workflow_steps`. Large tender evaluation AI artefacts are now stored as file payloads plus `ai_artefacts` pointer rows. Most non-tender agent outputs are still DB rows or chat messages, not a uniform artefact model.

## 6. Skills Inventory

There are 38 `docs/skills/*/SKILL.md` files. Current code does not contain a runtime skill loader, skill router, or invocation history for these files. The Delivery-lite plan explicitly says existing `docs/skills/*` are source material, not runtime backlog. Some product capabilities overlap with these skills, but the markdown skill files themselves are not called.

| Skill | Intended purpose | Current state | Inputs -> produces |
|---|---|---|---|
| `cashflow-funding` | Cashflow/funding analysis. | Never invoked; finance capability not implemented as this skill. | Cost plan/program/funding assumptions -> cashflow/funding advice. |
| `consultant-brief-mgmt` | Consultant brief and management workflow. | Never invoked; partially overlaps with brief/stakeholder/procurement UI. | Project brief/stage/discipline -> brief/service guidance. |
| `contact-management` | Contact table structure and contact handling. | Never invoked; superseded by stakeholder/company tables. | Contact data -> structured register guidance. |
| `contract-admin` | Contract clause/admin reference. | Never invoked; partly used as domain source material for Delivery/Finance prompts. | Contract facts/events -> admin assessment guidance. |
| `contract-formation` | Contract formation/reference workflow. | Never invoked. | Tender/procurement facts -> contract formation guidance. |
| `correspondence-register` | Correspondence numbering/register process. | Never invoked; partial correspondence tables exist. | Correspondence metadata -> register entry. |
| `cost-planning` | Cost plan generation/maintenance. | Never invoked; cost plan UI and Finance tools are live separately. | Scope/areas/stage -> cost plan line guidance. |
| `critical-path-delay` | Delay/critical path analysis. | Never invoked; no critical path engine found. | Program/delay facts -> delay analysis. |
| `da-approvals` | DA/planning approvals advice. | Never invoked; knowledge/reference only. | Site/jurisdiction/scope -> approvals checklist. |
| `design-review-tracking` | Design review workflow. | Never invoked; overlaps with notes/addenda/transmittals. | Design docs/issues -> review tracker output. |
| `dev-pro-forma` | Development feasibility pro forma. | Never invoked; no live pro forma module. | Land/cost/revenue/finance assumptions -> pro forma. |
| `document-register` | Document register model. | Never invoked; document repository is implemented separately. | Documents/versions/categories -> register entries. |
| `drawing-compare` | Drawing comparison process. | Never invoked; drawing extraction exists, comparison does not appear wired. | Drawing revisions -> change comparison notes. |
| `dxf-parser` | DXF parsing. | Scaffold/stale; no current runtime DXF parser flow found. | DXF files -> parsed drawing metadata. |
| `email-drafting` | Draft emails. | Never invoked; outbound draft action exists for workflow use. | Audience/context/tone -> draft email. |
| `environmental-dd` | Environmental due diligence. | Never invoked. | Site/project facts -> due diligence checklist. |
| `file-watcher` | Folder watcher ingestion. | Obsolete/scaffold; current ingestion is document upload plus BullMQ workers. | Watched folders -> ingestion jobs. |
| `final-account` | Final account process. | Never invoked; no final account module. | Cost/variation/invoice history -> final account summary. |
| `financial-reporting` | Financial reports. | Never invoked; Finance can answer/report from registers, but not via skill file. | Cost/invoice/variation data -> finance report. |
| `formal-letters` | Formal letter drafting. | Never invoked; correspondence draft action is narrower. | Recipient/context/template -> formal letter. |
| `master-programme` | Master program creation. | Never invoked; program module/agent tools exist separately. | Scope/stages/dates -> program activities. |
| `milestone-tracking` | Milestone tracking. | Never invoked; program milestones are live separately. | Milestones/status -> tracking output. |
| `ncc-compliance` | NCC compliance review. | Never invoked; knowledge material only. | Building class/scope -> compliance notes. |
| `outlook-integration` | Outlook polling/sending. | Scaffold only; real mailbox polling/sending deferred. | Mailbox config/messages -> correspondence records. |
| `planning-risk` | Planning risk review. | Never invoked; some planning risk logic exists in profiler/brief. | Site/planning facts -> risk list. |
| `procurement-process` | Procurement process scaffold. | Never invoked; procurement/evaluation modules exist separately. | Tender package facts -> procurement workflow. |
| `programme-reporting` | Program reporting. | Never invoked; reports/program exist separately. | Program data -> report narrative. |
| `quality-completion` | Quality/completion/PC workflow. | Never invoked; defect/completion registers missing. | Site quality facts -> completion advice. |
| `report-extractor` | Pre-extract report content. | Never invoked; RAG parsing pipeline supersedes parts of it. | Reports/PDFs -> extracted text/index. |
| `report-indexer` | Index reports into search. | Stale relative to pgvector pipeline; references older dependency assumptions. | Parsed report text -> search index. |
| `rfi-management` | RFI workflow. | Never invoked; RFI is text-only note type. | RFI facts -> RFI record/response. |
| `risk-schedule` | Risk schedule. | Never invoked; typed `risks` table exists separately. | Risk facts -> risk register rows. |
| `site-assessment` | Feasibility/site assessment. | Never invoked; Feasibility agent is docs-only. | Site facts -> site assessment. |
| `site-instructions` | Site instruction process. | Never invoked; no typed SI table. | Instruction facts -> SI draft/register. |
| `spec-indexer` | Specification indexing. | Stale/partial; RAG pipeline handles specs generally. | Spec docs -> indexed clauses. |
| `stakeholder-mapping` | Stakeholder mapping. | Never invoked; stakeholder UI/model exists separately. | Project parties -> stakeholder map. |
| `tender-evaluation` | Tender evaluation methodology. | Never invoked; evaluation AI foundation is being built separately. | Tender docs/prices -> evaluation outputs. |
| `transmittals` | Transmittal form/process. | Never invoked as a skill; transmittal tables/actions are live separately. | Document selections/recipients -> transmittal records. |

## 7. Specialist Agents

| Agent | Current implementation | Tools/workflows | Limitations |
|---|---|---|---|
| Orchestrator | Runtime agent name exists, but routing is deterministic code in `src/lib/agents/orchestrator.ts`, not an LLM planner. | No direct tools. Routes/fans out to specialists and persists a combined reply. | Intent logic has regex/heuristic routing. It can combine specialists, but it does not plan arbitrary workflows. |
| Finance | Runtime specialist. | Search knowledge/RAG, list/create/update cost lines, list/record invoices, list/create/update variations, list/create/update risks, notes, issue-variation workflow. | Write coverage is useful but partial; many writes still pass through legacy applicators or partial action migration. |
| Design | Runtime specialist. | Search, list/select documents, create transmittals, add tender firms, objectives, stakeholders, addenda, notes, meetings, reports. | Also carries procurement-like tasks because Procurement agent is not runtime. |
| Program | Runtime specialist. | Search, list/replace/create/update program activities and milestones, risks, notes, meetings. | No true critical path engine. Program replacement is a recent action. |
| Delivery | Runtime specialist, but narrow Delivery-lite scope. | Read variations/cost/program/risks/notes/stakeholders; starts issue-variation workflows and assessment-revision workflow. | Only contractor variation claims are supported. EOTs, defects, progress claims, site instructions, PC, real contract clause retrieval are deferred. |
| Briefing | Runtime flow, but not part of main chat dock specialist registry. | Own tools: update profile field, upsert objective, mark category covered, search attached briefing docs. | Behind `BRIEFING_ENABLED` in production. Old objectives generate/polish endpoints still exist. |
| Procurement | Documented in `docs/agents`, not registered in runtime. | No runtime specialist. Procurement work is handled by Design, evaluation routes, and manual UI. | Agent roster/README can overstate current capability. |
| Correspondence | Documented in `docs/agents`, not registered in runtime. | Outbound draft action exists for workflows, but no standalone Correspondence runtime agent. | No real provider send/polling. |
| Feasibility | Documented in `docs/agents`, not registered in runtime. | No runtime specialist. | Site assessment/pro forma skills are documentation only. |

## 8. Notable Patterns and Conventions

- The codebase is moving toward "application actions" as the shared write surface for UI, agents, and workflows. This is documented in ADRs and partially implemented.
- Server/domain code tends to live under `src/lib/<domain>`, while UI lives under `src/components/<domain>` and API routes under `src/app/api`.
- Many features keep direct API routes even when agent actions exist. The result is parallel mutation paths.
- The system uses project-scoped SSE for chat and entity updates. Both event buses are in-process `Map`s pinned to `globalThis`.
- Agent tools enforce project/org assertions through `_context.ts`; a comment says a lint rule should eventually block tools that skip this check, but that rule is not present.
- Context assembly is centralized in `assembleContext()`, but legacy context builders remain, especially for report generation.
- AI audit is split by layer: `agent_runs/tool_calls`, `approvals`, `action_invocations`, workflow tables, and tender `ai_artefacts`.
- Date fields are inconsistent: some newer tables use timestamps, while notes/meetings/reports still have text dates.
- The repo keeps substantial design/planning material. Some is current and useful; some is historical and conflicts with runtime.

## 9. Known Issues and Technical Debt

- Public README is materially stale: it says eight runtime specialist agents and many per-agent feature groups; current runtime has five chat specialists plus a separate briefing flow and only three model groups.
- `docs/skills/*/SKILL.md` files are not executable skills. Most are source/reference scaffolds and several refer to older assumptions such as file watchers, project.db, or Chroma-like flows.
- Agent docs and runtime have drifted. Procurement, Correspondence, and Feasibility are described as agents but are not registered.
- Provider abstraction is incomplete. Several extraction paths still hard-code Claude model IDs and require Anthropic even if `/admin/models` points elsewhere.
- Action registry migration is partial. New actions, old tools, and legacy applicators coexist; `applyApproval` must support both worlds.
- Local database bootstrap is fragile. `docker/init.sql` creates notes/meetings/report tables with FKs before base project tables; main Drizzle migrations are elsewhere.
- Schema sources are confusing. `src/lib/db/pg-schema.ts` is the live source, `src/lib/db/schema.ts` is a deprecated shim, and `drizzle-pg/schema.ts` is stale.
- RAG schema generation config points to `./drizzle/rag`, but that output is absent. RAG may depend on push/manual schema setup rather than committed migrations.
- Deployment docs include a production database URL/password and operational server details. That is a real security/process issue, even if the repo is private.
- Chat/project SSE are in-process only. A multi-replica Swarm deployment would drop cross-instance events unless routed sticky or replaced with Redis/pubsub.
- Approval event status has small type drift: approval response code can treat gone/conflict states differently than the SSE union expresses.
- Typed record registers are missing for RFIs, Notices, EOTs, Defects, Site Instructions, and delivery determinations. The note type discriminator is doing too much.
- Communication artifact behavior is duplicated across notes, meetings, reports, transmittals, and exports. ADR 0001 calls for a shared lifecycle module, but it is not complete.
- Tender Evaluation AI is mid-flight. Foundations exist, but the one-button refresh is currently adapter/route driven from parsed `rawExtractedItems`; full package interpretation, clarifications, issue snapshots, and dry-run validation are still active work.
- Report generation APIs still contain placeholder user ids and TODOs around auth/lock/regeneration. These routes should not be treated as production-hardened.
- Briefing is a newer replacement direction for objectives generation, but old inference/objectives generation paths remain. This is an intentional transition, not a completed cutover.
- Several TODOs in brief/profile code acknowledge derived NCC/cost/risk logic is incomplete or provisional.
- Workspace hygiene is poor: the working tree contains many uncommitted changes, generated debug files, extracted document folders, and root-level junk files. That raises review/deploy risk.

## 10. Recent Significant Changes

Last 30 days of meaningful commits:

- 2026-05-12: Briefing documents and read-only RAG search were added to the briefing design/docs. A PRD and design doc were created for a grill-me style brief refinement flow.
- 2026-05-11: Landing and assessment were repositioned around client-side project health and agent-team messaging. Assessment schema gained design/procure/deliver score columns. Tender evaluation AI planning/foundation work was active.
- 2026-05-09: Build fixes and correspondence column/header consistency snapshot.
- 2026-05-08 to 2026-05-07: Major Sitewise UI shell and brief panel refactors: left-nav primitives, BriefPreviewPane, BuildingTabView, planning tab wiring, theme/font corrections, Next middleware fix, secure auth cookie fix.
- 2026-05-06: Rebrand to SiteWise.au and package lock regeneration; gitignore changes to prevent debug dumps/large blobs.
- 2026-05-03 to 2026-05-01: Chat approvals were improved with edit-and-approve, selected addenda approval refresh, and project-event live refresh for variations/program.
- 2026-04-30 to 2026-04-29: Objectives workspace, notes updates, agents/admin/migrations/docs, per-project SSE events, approval refresh events.
- 2026-04-28 to 2026-04-27: Objectives migrated to the four-section row model; document download route/button added; note date/export improvements.
- 2026-04-25: Sentry added.

## 11. Active Workstreams

- Briefing interview: implemented in `src/lib/briefing` and `/api/projects/[projectId]/briefing`, with UI components and migration present but currently uncommitted in the working tree. Production enablement depends on `BRIEFING_ENABLED` and applying migration `0053_briefing_sessions.sql`.
- Tender Evaluation AI V1: active and partially implemented. There are new modules for refresh pipeline, artefact store, recommendation state, TRR linkage, clarifications, and cost-plan push, plus migrations. Full AI proposal generation/package interpretation and real dry-run validation are still incomplete.
- Delivery-lite issue-variation DDC: cycle 1/2 work exists and is partly runtime. Real email polling/sending, full Delivery scope, and contract-document clause extraction are deferred.
- Chat as control surface: approval gates, actions, workflows, live refresh, and tool migration continue. The action registry is not yet the single write surface.
- Sitewise rebrand/app shell/brief UI: large UI refactor is ongoing with many modified files and untracked components.
- Objectives transition: row model is live; legacy profiler objectives and old inference/generate flows remain until the briefing path fully replaces them.
- Knowledge/RAG consolidation: RAG works, but knowledge libraries, document sets, library document sync, and context assembly still have multiple overlapping paths.

## 12. Open Architectural Questions

- Should each project record type with legal/contractual meaning become a typed table, or should some remain note subtypes with metadata?
- Should communication artifacts become one polymorphic lifecycle module, or remain separate notes/meetings/reports/addenda/RFT/TRR implementations?
- Should the action registry become mandatory for all writes, including direct UI routes, or only for agent/workflow writes?
- How should legacy applicators/tools be retired without breaking existing approval records?
- Should the Orchestrator remain deterministic routing code, or become a real planning agent with constrained tool access?
- Should Procurement, Correspondence, and Feasibility be implemented as runtime specialists, or should their work remain inside Design/Delivery/Finance flows until demand proves otherwise?
- Should model routing stay at three coarse feature groups, or reintroduce more granular routing once call sites are consistently provider-agnostic?
- Should RAG, knowledge libraries, and context assembly converge behind `assembleContext()` for all AI consumers?
- Should large AI artefacts use the tender `ai_artefacts` pattern everywhere, or only for evaluation?
- Should chat/project SSE move to Redis pub/sub before beta, given Docker Swarm deployment?
- Should the briefing agent replace objectives generate/polish entirely, and what migration path preserves existing inferred rows?
- Should tender evaluation refresh be schema-aware planning with a small set of domain adapters, or a set of discrete deterministic tools around package interpretation, row proposals, clarifications, and TRR linkage?
- Should local development rely on Drizzle migrations/push exclusively, replacing the stale `docker/init.sql`?
- What is the policy for secrets in docs and build args before real customer data enters the system?
