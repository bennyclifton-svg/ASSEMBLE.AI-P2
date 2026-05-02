# Assemble.ai

Enterprise project management platform for architectural and construction firms, combining structured project data with an agentic AI layer that reasons, proposes, and writes across every project entity — while keeping the user in full control at all times.

---

- **Project workspace** — A single hub covering cost plan, program, risks, variations, invoices, notes, meetings, stakeholders, document repository, consultant/contractor register, procurement status, tender evaluation, and report generation (TRR, RFT, Addendum) with DOCX/PDF export. Every entity is fully editable by hand — the AI layer is additive, not a replacement for direct user operation.

- **Project profiler** — Each project carries a structured profile defining building class (residential, commercial, industrial, mixed-use, infrastructure), subclass (e.g. apartments, townhouses, office, retail, fitout, remediation), project type, scale data, region/state, procurement route, and complexity attributes. The profiler drives automatic domain tag resolution, knowledge library filtering, objectives inference, and context assembly — so AI outputs are always scoped to the actual project type rather than generic construction advice.

- **AI agent system** — A chat dock at the bottom of every project workspace hosts eight specialist agents coordinated by an **Orchestrator** that routes each message and fans out to multiple specialists in parallel when needed:
  - **Finance Agent** — Quantity Surveyor role: cost planning, budgets, variations, progress claims, invoice recording, contingency monitoring
  - **Program Agent** — Programmer role: schedule activities, milestones, critical path, delay analysis, float tracking
  - **Design Agent** — Design manager role: consultant briefs, DA readiness, stakeholder coordination, design decision records
  - **Delivery Agent** — Contract administrator role: site instructions, defects, EOT claims, progress assessment
  - **Procurement Agent** — Head contractor procurement: RFT packages, tender evaluation, addenda, contractor appointments
  - **Correspondence Agent** — Outbound communications: formal letters, RFIs, transmittals, correspondence register
  - **Feasibility Agent** — Site assessment, planning risk, due diligence, pro forma analysis
  
  Agent replies stream live. Multi-domain questions (e.g. "give me a project status briefing") concurrently invoke Finance, Program, and Design and combine their attributed responses into one reply.

- **Agent skill library** — Approximately 22 callable tool-skills back the agents, organised into read tools (search documents, list cost lines, list program, list risks, list variations, list notes, list meetings, list stakeholders, search knowledge libraries) and write tools (create/update cost lines, record invoices, create/update variations, create/update risks, create/update notes, update program activities, create/update milestones, update stakeholder briefs, and more). Each specialist is granted a curated whitelist — Finance cannot call Program tools, and so on. New tool-skills are added per phase without touching existing agent logic.

- **Chat dock — read, write, and approval gate** — The chat dock can read and propose writes across all major project entities: cost lines, variations, invoices, program activities, milestones, risks, notes, meetings, stakeholders, and documents (10+ entity types). All proposed writes surface as inline diff cards — showing before/after values — and require explicit user Approve or Reject before anything touches the database. Optimistic row-versioning detects concurrent edits and re-proposes rather than overwriting. Users can ignore the agents entirely and operate every entity directly through the standard UI at any time.

- **Knowledge libraries** — 15 curated domain libraries covering Australian construction practice are pre-ingested as vector embeddings and queried by agents before answering regulatory, benchmark, or best-practice questions. A sample of the libraries:
  - *NCC Reference Guide* — National Construction Code clause index, building classifications, performance requirements
  - *Contract Administration Guide* — AS 2124, AS 4000, AS 4902 contract management, variations, extensions of time, defect liability
  - *Cost Management Principles* — Cost planning benchmarks, contingency rates by stage, progress claim methodology, forecast management
  - *Program & Scheduling Guide* — Construction programming, milestone tracking, critical path, delay analysis
  - *MEP Services Guide* — HVAC, electrical, hydraulic, fire systems: design coordination, commissioning, authority connections
  - *(plus 10 further guides covering procurement, residential, commercial, structural engineering, civil earthworks, architectural trades, trade interfaces, and remediation)*
  
  Library results take precedence over LLM training knowledge — agents are instructed to cite library content and flag when an answer relies on general knowledge instead.

- **RAG pipeline** — Project documents (reports, specifications, drawings, correspondence) are parsed via LlamaParse, chunked with construction-aware semantic splitting, and embedded via Voyage AI (1024-dim) into pgvector on PostgreSQL. A 4-stage retrieval pipeline (embed → cosine similarity search → BAAI/Cohere reranking → hierarchy enrichment) feeds retrieved context into report generation, objectives inference, note enhancement, and agent tool calls. Sync status (pending → processing → synced → failed) is tracked per document.

- **Model configuration** — Every AI call site belongs to a named feature group (`agent_finance`, `agent_program`, `agent_design`, `agent_orchestrator`, `content_generation`, `objectives_generation`, `document_extraction`, `cost_line_matching`, and more) configurable at runtime via `/admin/models`. Swap providers (Anthropic, OpenRouter) or model tiers per task without redeploying — e.g. route the Orchestrator and Design agent to Haiku for cost efficiency while keeping Finance and Program on Sonnet for complex multi-turn reasoning.

---

**Stack:** Next.js 16 · PostgreSQL + pgvector · Drizzle ORM · Anthropic Claude · Voyage AI · BAAI/Cohere reranking · BullMQ/Redis · Supabase
