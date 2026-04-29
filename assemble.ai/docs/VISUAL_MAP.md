# Assemble.ai — Visual Architecture Map

> Render in VSCode with the **Markdown Preview Mermaid Support** extension, or open in any Mermaid-aware viewer.

---

## 1. Application Route Map

```mermaid
graph TD
    subgraph Public["🌐 Public (no auth)"]
        LP["/ — Landing Page"]
        PR["/pricing — Pricing"]
        LG["/login — Login"]
        RG["/register — Register"]
    end

    subgraph Auth["🔐 Authenticated"]
        DB["/dashboard — Redirect hub"]
        PJ["/projects — Projects list"]
        PW["/projects/[id] — Main Workspace"]
        CP["/projects/[id]/cost-plan — Cost Plan (full screen)"]
        BL["/billing — Subscription"]
    end

    subgraph Admin["🛡️ Admin (superAdmin only)"]
        AD["/admin — Console"]
        AU["/admin/users — User Management"]
        AM["/admin/models — AI Model Config"]
        APR["/admin/products — Polar Products"]
    end

    LP --> LG & RG
    LG & RG --> DB
    DB --> PJ
    PJ --> PW
    PW --> CP
    DB --> BL
    AD --> AU & AM & APR
```

---

## 2. Main Workspace — Three-Panel Layout

```mermaid
graph LR
    subgraph Left["◀ LEFT PANEL — PlanningCard"]
        D["Project Details\n(name, code, address)"]
        P["Profile & Classification\n(building class, type, complexity)"]
        O["Objectives\n(functional, quality, budget, program)"]
        S["Stakeholders\n(client, authority, consultants, contractors)"]
        K["Knowledge Library\n(specs, references)"]
        SW["ProjectSwitcher\n(select / create project)"]
    end

    subgraph Center["▶ CENTER PANEL — ProcurementCard (tabs)"]
        T1["Profiler Tab\n(classification wizard + objective generation)"]
        T2["Cost Planning Tab\n(spreadsheet + invoices + variations)"]
        T3["Consultants Tab\n(disciplines + fee items + tender status)"]
        T4["Contractors Tab\n(trades + price items + tender status)"]
        T5["Program Tab\n(Gantt chart + milestones + dependencies)"]
        T6["Notes Tab\n(AI-assisted project notes)"]
        T7["Meetings & Reports Tab\n(minutes + AI report generation)"]
        T8["Project Details Tab\n(full project info editor)"]
    end

    subgraph Right["▶ RIGHT PANEL — DocumentCard"]
        DR["Document Repository\n(browse by category)"]
        CL["Category Tree\n(system + project categories)"]
        UZ["Upload Zone\n(drag-and-drop, version control)"]
        VH["Version History\n(per document)"]
        RAG["RAG Repos\n(ingest docs for AI retrieval)"]
    end
```

---

## 3. Feature Map by Domain

```mermaid
mindmap
    root((Assemble.ai\nFeatures))
        Project Setup
            Project wizard
            Building classification
            Profile & complexity scoring
            Objectives generation AI
            Stakeholder management
        Cost Management
            Cost plan spreadsheet
            Budget vs forecast
            Variations register
            Invoice tracking & matching
            Cost snapshots
            AI invoice extraction
        Procurement
            Consultant briefs
            Contractor scopes
            RFT documents
            Addenda management
            Tender evaluation grid
            TRR reports
            Transmittal packages
        Program & Schedule
            Gantt chart
            Activity hierarchy
            FS/SS/FF dependencies
            Milestones
            Template-based generation
        Communication
            Project notes AI
            Meeting minutes AI
            Project reports AI
            LangGraph report generation
            SSE streaming
            Email distribution
        Document Management
            Repository & versioning
            Category system
            Drawing extraction AI
            OCR processing
            RAG ingestion
        Knowledge System
            15 built-in domains
            Org knowledge libraries
            Vector search & reranking
            Domain-aware generation
        Admin & Billing
            Super-admin console
            User management
            AI model config per feature
            Polar subscriptions
            Inngest webhooks
```

---

## 4. API Layer — Domains Map

```mermaid
graph TB
    subgraph AI["🤖 AI Generation"]
        A1["POST /api/ai/generate-content"]
        A2["POST /api/ai/generate-note-content"]
        A3["POST /api/ai/polish-content"]
        A4["POST /api/retrieval/generate-field"]
    end

    subgraph Reports["📄 Reports (LangGraph)"]
        R1["POST /api/reports/generate"]
        R2["GET /api/reports/[id]/stream  (SSE)"]
        R3["POST /api/reports/[id]/approve-toc"]
        R4["POST /api/reports/[id]/section-feedback"]
        R5["GET /api/reports/[id]/export"]
    end

    subgraph RAG["🔍 RAG & Documents"]
        RA1["POST /api/retrieval/search"]
        RA2["GET/POST /api/document-sets"]
        RA3["POST /api/document-sets/[id]/members"]
        RA4["GET /api/document-sets/sync-status"]
    end

    subgraph Projects["🏗️ Projects"]
        P1["GET/PUT /api/projects/[id]"]
        P2["POST /api/projects/[id]/objectives/generate"]
        P3["POST /api/projects/[id]/objectives/polish"]
    end

    subgraph Finance["💰 Finance"]
        F1["CRUD /api/projects/[id]/cost-lines"]
        F2["CRUD /api/projects/[id]/invoices"]
        F3["CRUD /api/projects/[id]/variations"]
        F4["POST /api/projects/[id]/cost-plan/lines/batch"]
    end

    subgraph Procurement["📋 Procurement"]
        PR1["CRUD /api/consultants/disciplines"]
        PR2["CRUD /api/contractors/trades"]
        PR3["CRUD /api/transmittals"]
        PR4["CRUD /api/addenda"]
        PR5["CRUD /api/trr"]
        PR6["POST /api/evaluation/[id]/rows/merge"]
    end

    subgraph Program["📅 Program"]
        PG1["CRUD /api/projects/[id]/program/activities"]
        PG2["CRUD /api/projects/[id]/program/dependencies"]
        PG3["POST .../generate-from-template"]
    end

    subgraph Comms["💬 Communication"]
        C1["CRUD /api/meetings"]
        C2["POST /api/meetings/[id]/generate-sections"]
        C3["POST /api/meetings/[id]/email"]
        C4["CRUD /api/notes (via hooks)"]
    end
```

---

## 5. AI / RAG Pipeline — End to End

```mermaid
flowchart TD
    subgraph Ingest["📥 Document Ingestion"]
        U["User uploads file\n(.pdf / .docx / .txt)"]
        S["Storage\nLocal or Supabase bucket"]
        Q["BullMQ Queue\ndocument-processing"]
        W["Doc Processor Worker\n(concurrency: 2)"]
    end

    subgraph Parse["🔍 Parsing (with fallbacks)"]
        P1["LlamaParse API\n(primary — any format)"]
        P2["Unstructured API\n(fallback 1)"]
        P3["pdf-parse\n(fallback 2 — PDFs only)"]
        P4["mammoth\n(fallback 3 — DOCX only)"]
    end

    subgraph Chunk["✂️ Chunking"]
        C1["Construction-aware splitter\n800–1500 tokens per chunk"]
        C2["Hierarchy 0–3\n(document → section → subsection → clause)"]
        C3["NCC/AS standards\nclause pattern recognition"]
    end

    subgraph Embed["🧮 Embedding"]
        E1["Voyage AI\nvoyage-large-2-instruct\n1024 dimensions"]
        E2["Batch: 128 texts/call"]
    end

    subgraph Store["💾 Storage"]
        DB[("RAG PostgreSQL\ndocument_chunks\n+ pgvector index")]
    end

    subgraph Retrieve["🔎 Retrieval (4 stages)"]
        R1["Stage 1: Embed query\n(Voyage AI)"]
        R2["Stage 2: Vector search\n(pgvector cosine, top 20)"]
        R3["Stage 3: Rerank\nBAAI primary / Cohere fallback"]
        R4["Stage 4: Enrich\nparent chunk context prepend"]
    end

    subgraph Generate["✨ Generation"]
        G1["Context Orchestrator\nassembleContext()"]
        G2["Domain Knowledge\nretrieveFromDomains()"]
        G3["Claude AI\nAnthropic SDK + streaming"]
    end

    U --> S --> Q --> W
    W --> P1
    P1 -->|fail| P2 -->|fail| P3 -->|fail| P4
    P1 & P2 & P3 & P4 --> C1 --> C2 --> C3
    C3 --> E1 --> E2 --> DB
    DB --> R2
    R1 --> R2 --> R3 --> R4
    R4 --> G1
    G2 --> G1
    G1 --> G3
```

---

## 6. Context Orchestrator — Modules

```mermaid
graph LR
    subgraph Request["ContextRequest"]
        REQ["projectId\ncontextType\ntask\nnoteId / sectionKey\ndomainTags"]
    end

    subgraph Modules["Context Modules (fetched in parallel)"]
        M1["profile\n(building class, complexity, region)"]
        M2["projectInfo\n(name, address, contacts)"]
        M3["costPlan\n(budget, forecast, variations, invoices)"]
        M4["program\n(activities, milestones, critical path)"]
        M5["risks\n(risk register)"]
        M6["procurement\n(consultants, contractors, tender status)"]
        M7["stakeholders\n(all parties)"]
        M8["starredNotes\n(meeting notes in period)"]
        M9["ragDocuments\n(retrieved chunks)"]
        M10["procurementDocs\n(RFT, Addenda, TRR)"]
        M11["attachedDocuments\n(note-specific)"]
        M12["planningCard\n(profiler snapshot)"]
    end

    subgraph Output["AssembledContext"]
        O1["projectSummary"]
        O2["moduleContext (markdown)"]
        O3["knowledgeContext (domains)"]
        O4["crossModuleInsights"]
    end

    Request --> Modules --> Output
```

---

## 7. Database Architecture

```mermaid
graph TB
    subgraph MainDB["🗄️ Main PostgreSQL (pg-schema.ts)"]
        subgraph CoreTables["Core"]
            projects["projects\n(14 project types)"]
            projectDetails["projectDetails\n(geocoded address)"]
            projectProfiles["projectProfiles\n(Feature 019 — profiler)"]
            organizations["organizations\n(multi-tenant)"]
        end

        subgraph DocTables["Documents"]
            documents["documents"]
            fileAssets["fileAssets\n(storage path + OCR + drawing extraction)"]
            versions["versions"]
            categories["categories / subcategories"]
        end

        subgraph FinanceTables["Finance"]
            costLines["costLines\n(5 master stages)"]
            invoices["invoices"]
            variations["variations"]
        end

        subgraph ProcureTables["Procurement"]
            projectStakeholders["projectStakeholders\n(unified: client/authority/consultant/contractor)"]
            rftNew["rftNew (multi-instance)"]
            evaluations["evaluations + evaluationCells"]
            trr["trr (multi-instance)"]
            addenda["addenda"]
        end

        subgraph ProgramTables["Program"]
            programActivities["programActivities\n(self-referential hierarchy)"]
            programDependencies["programDependencies\n(FS/SS/FF)"]
            programMilestones["programMilestones"]
        end

        subgraph CommsTables["Communication"]
            meetings["meetings + meetingSections"]
            reports["reports + reportSections"]
            notes["notes + noteTransmittals"]
        end

        subgraph AuthBilling["Auth & Billing (auth-schema.ts)"]
            user["user (Better Auth)"]
            session["session (24h rolling)"]
            subscriptions["subscriptions (Polar)"]
            products["products"]
        end
    end

    subgraph RAGDB["🔮 RAG PostgreSQL + pgvector (rag-schema.ts)"]
        documentChunks["document_chunks\n(content + embedding vector[1024])"]
        documentSets["document_sets\n(project / org / domain scoped)"]
        documentSetMembers["document_set_members\n(sync status tracking)"]
        reportTemplates["report_templates\n(LangGraph state)"]
        ragReportSections["report_sections\n(generated content + sources)"]
        knowledgeDomainSources["knowledge_domain_sources\n(provenance tracking)"]
    end
```

---

## 8. Background Workers & Queue System

```mermaid
flowchart LR
    subgraph Queues["BullMQ Queues (Upstash Redis)"]
        Q1["document-processing\n(concurrency: 2, retries: 3)"]
        Q2["chunk-embedding\n(concurrency: 5, retries: 5)"]
        Q3["drawing-extraction\n(concurrency: 5, retries: 3)"]
        Q4["report-generation\n(concurrency: N/A, retries: 2)"]
    end

    subgraph DocWorker["Doc Processor Worker\nworkers/document-processor/index.ts"]
        DW1["1. Read file from storage"]
        DW2["2. Parse (LlamaParse → Unstructured → pdf-parse → mammoth)"]
        DW3["3. Chunk with hierarchy"]
        DW4["4. Embed with Voyage AI (batch 128)"]
        DW5["5. Insert chunks to RAG DB"]
        DW6["6. Update sync status → synced"]
    end

    subgraph DrawWorker["Drawing Extractor Worker\nworkers/drawing-extractor/index.ts"]
        DRW1["1. Check drawingExtractionEnabled flag"]
        DRW2["2. Read file buffer"]
        DRW3["3. Claude Vision API extraction"]
        DRW4["4. Write drawingNumber/Name/Revision + confidence"]
    end

    Q1 --> DW1 --> DW2 --> DW3 --> DW4 --> DW5 --> DW6
    Q3 --> DRW1 --> DRW2 --> DRW3 --> DRW4

    DW6 -->|"syncStatus = synced"| RAGDB[("RAG DB")]
    DRW4 -->|"drawingExtractionStatus = COMPLETED"| MainDB[("Main DB\nfileAssets")]
```

---

## 9. Authentication & Billing Flow

```mermaid
sequenceDiagram
    participant User
    participant BetterAuth
    participant DB as PostgreSQL
    participant Polar
    participant Inngest

    User->>BetterAuth: Register (email + password)
    BetterAuth->>DB: Create user record
    BetterAuth->>DB: Create organization (auto)
    BetterAuth->>DB: Init knowledge libraries
    BetterAuth->>Polar: Create Polar customer
    BetterAuth-->>User: Session token (24h)

    User->>Polar: Subscribe to plan
    Polar->>Inngest: Webhook (order.paid / subscription.created)
    Inngest->>DB: Upsert subscription record
    Inngest->>DB: Update user plan

    User->>BetterAuth: Login
    BetterAuth->>DB: Validate credentials
    BetterAuth->>DB: Check suspendedAt
    BetterAuth-->>User: Session cookie (better-auth.session_token)
```

---

## 10. External Integrations Map

```mermaid
graph LR
    App["🏗️ Assemble.ai\n(Next.js 14)"]

    App -->|"Content generation\nclaude-sonnet-4-6"| Claude["Anthropic Claude"]
    App -->|"Fallback LLM\nOpenAI-compatible"| OpenRouter["OpenRouter"]
    App -->|"Embeddings\nvoyage-large-2-instruct 1024D"| Voyage["Voyage AI"]
    App -->|"Reranking (primary)\nbge-reranker-v2-m3"| BAAI["BAAI Reranker"]
    App -->|"Reranking (fallback)\nrerank-english-v3.0"| Cohere["Cohere"]
    App -->|"Doc parsing (primary)\nall formats"| LlamaParse["LlamaCloud\nLlamaParse"]
    App -->|"Doc parsing (fallback)\nstructured elements"| Unstructured["Unstructured API"]
    App -->|"Main DB + file storage"| Supabase["Supabase\nPostgreSQL + Storage"]
    App -->|"Job queues\nBullMQ backend"| Upstash["Upstash Redis"]
    App -->|"Subscriptions\n+ webhooks"| Polar["Polar.sh"]
    App -->|"Webhook processing\nbackground jobs"| Inngest["Inngest"]
    App -->|"Auth sessions"| BetterAuth["Better Auth\n(email/password)"]
    App -->|"Planning controls\nLEP zone data"| NSW["NSW GIS APIs\nLEP Data"]
    App -->|"Error tracking"| Sentry["Sentry"]
```

---

## 11. LangGraph Report Generation Flow

```mermaid
stateDiagram-v2
    [*] --> fetch_planning_context
    fetch_planning_context --> generate_toc: Context assembled
    generate_toc --> await_toc_approval: TOC created
    await_toc_approval --> retrieve_context: User approved
    await_toc_approval --> generate_toc: User rejected / feedback
    retrieve_context --> generate_section: Chunks retrieved
    generate_section --> await_section_feedback: Section streamed
    await_section_feedback --> retrieve_context: Regenerate with feedback
    await_section_feedback --> retrieve_context: Next section
    await_section_feedback --> finalize: All sections done
    finalize --> generate_transmittal_section: Has transmittal
    finalize --> [*]: Complete
    generate_transmittal_section --> [*]: Complete
```

---

## 12. Key Data Flow — Note with AI Generation

```mermaid
sequenceDiagram
    participant User
    participant NoteUI as Notes UI
    participant API as /api/ai/generate-note-content
    participant Orch as Context Orchestrator
    participant RAG as RAG Retrieval
    participant Domains as Knowledge Domains
    participant Claude

    User->>NoteUI: Type "Summarise the PPR" + attached doc
    NoteUI->>API: POST {noteId, projectId, content, attachedDocs}
    API->>Orch: assembleContext(projectId, noteId)
    Orch->>DB: Fetch profile, stakeholders, project info (parallel)
    Orch->>Domains: retrieveFromDomains(task)
    API->>RAG: retrieve(query, {documentIds: attachedDocs, minRelevanceScore: 0})
    RAG->>pgvector: Cosine similarity search
    RAG->>Cohere: Rerank top candidates
    RAG-->>API: Enriched chunks
    API->>Claude: System prompt + context + RAG chunks
    Claude-->>API: Generated content
    API-->>NoteUI: Formatted note content
    NoteUI-->>User: AI-written note displayed
```
