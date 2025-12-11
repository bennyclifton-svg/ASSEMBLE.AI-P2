# Tasks: RAG Document Intelligence

**Input**: Design documents from `/specs/007-RAG Integration Specification/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests included per Constitution Principle VIII (Test-Driven Quality)

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

---

## Architecture Decision: Dual Database (Option A)

**Decision**: Keep existing SQLite for core app data + Add Supabase PostgreSQL for RAG/vector storage

### Why This Architecture

| Component | Database | Reason |
|-----------|----------|--------|
| Projects, Documents, Planning | **SQLite** (local.db) | Existing functionality, no migration risk |
| Vector embeddings, chunks | **Supabase PostgreSQL** | pgvector required for similarity search |
| Document sets, sync status | **Supabase PostgreSQL** | RAG-specific data |
| Report templates, memory | **Supabase PostgreSQL** | RAG-specific data |
| BullMQ job queue | **Upstash Redis** | Serverless, no server management |

### Connection Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   SQLite (local.db)              Supabase PostgreSQL        │
│   ├─ projects                    ├─ document_chunks         │
│   ├─ documents                   ├─ document_sets           │
│   ├─ planning_*                  ├─ document_set_members    │
│   └─ categories                  ├─ report_templates        │
│                                  ├─ report_sections         │
│                                  └─ report_memory           │
│                                                              │
│                    Upstash Redis                             │
│                    └─ BullMQ job queue                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Benefits

- **Zero migration risk**: Existing app continues working
- **Fast implementation**: No data migration required
- **Clean separation**: RAG data is conceptually separate
- **Future-proof**: Can consolidate to full Supabase later if needed

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## User Stories Summary

| Story | Title | Priority | Description |
|-------|-------|----------|-------------|
| US1 | Document Sync to RAG | P1 | Sync documents to vector DB with embedding pipeline |
| US2 | Tender Request Generation | P1 | Generate reports with TOC approval and streaming |
| US3 | Smart Context Panel | P2 | Source visibility and user control during generation |
| US4 | Report Memory System | P2 | Cross-project TOC learning and reuse |
| US5 | Report Export | P3 | Export reports to DOCX/PDF formats |

---

## Phase 1: Setup (Infrastructure)

**Purpose**: Project initialization and infrastructure setup

**Note**: Using Supabase PostgreSQL (cloud) + Upstash Redis (serverless) per Architecture Decision above.

- [X] T001 Install RAG dependencies (drizzle-orm pg, bullmq, ioredis, @langchain/langgraph, llamaindex, voyageai, cohere-ai, pgvector) in package.json
- [X] T002 [P] Configure Supabase PostgreSQL project:
  - Enable pgvector extension via Supabase dashboard (Extensions → vector)
  - Note connection string format: postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  - Configure connection pooler for serverless (Transaction mode)
- [X] T002b [P] Configure Upstash Redis:
  - Create Redis database at upstash.com
  - Note REST URL and token for serverless Redis access
  - BullMQ compatible via ioredis with TLS
- [X] T003 [P] Add environment variables template in .env.example:
  - SUPABASE_POSTGRES_URL (from Supabase connection pooler)
  - UPSTASH_REDIS_URL (from Upstash dashboard)
  - UPSTASH_REDIS_TOKEN (from Upstash dashboard)
  - VOYAGE_API_KEY, LLAMA_CLOUD_API_KEY, UNSTRUCTURED_API_KEY, COHERE_API_KEY
- [X] T004 Create drizzle.rag.config.ts for Supabase PostgreSQL connection configuration
- [X] T005 [P] Create src/lib/db/rag-client.ts for Supabase PostgreSQL connection with Drizzle

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema (Supabase PostgreSQL)

**Note**: All schema in this section targets Supabase PostgreSQL (rag-schema.ts), NOT SQLite (schema.ts).

- [X] T006 Create src/lib/db/rag-schema.ts with document_chunks table (vector column) per data-model.md
- [X] T007 [P] Add document_sets table to src/lib/db/rag-schema.ts per data-model.md
- [X] T008 [P] Add document_set_members table to src/lib/db/rag-schema.ts per data-model.md
- [X] T009 [P] Add report_templates table to src/lib/db/rag-schema.ts per data-model.md
- [X] T010 [P] Add report_sections table to src/lib/db/rag-schema.ts per data-model.md
- [X] T011 [P] Add report_memory table to src/lib/db/rag-schema.ts per data-model.md
- [X] T012 Generate and push Supabase PostgreSQL migration with pgvector extension enabled

### RAG Core Modules

- [X] T013 Create src/lib/rag/embeddings.ts with Voyage voyage-large-2-instruct integration
- [X] T014 [P] Create src/lib/rag/parsing.ts with LlamaParse + Unstructured fallback per research.md
- [X] T015 [P] Create src/lib/rag/chunking.ts with construction-aware SemanticSplitter per spec.md
- [X] T016 [P] Create src/lib/rag/reranking.ts with BAAI + Cohere fallback per research.md
- [X] T017 Create src/lib/rag/retrieval.ts with 4-stage pipeline (embed → pgvector → rerank → enrich)

### Queue Infrastructure (Upstash Redis)

**Note**: Using Upstash Redis (serverless) for BullMQ job queue.

- [X] T018 Create src/lib/queue/client.ts with BullMQ queue setup and Upstash Redis connection (TLS enabled)
- [X] T019 Create workers/document-processor/index.ts with parse → chunk → embed → store pipeline
- [X] T020 [P] Add npm scripts for worker:dev and worker:start in package.json

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Document Sync to RAG (Priority: P1) 🎯 MVP

**Goal**: User can select documents and sync them to the AI knowledge base for RAG retrieval

**Independent Test**: Select 3 documents → click "Sync to AI" → verify sync status shows "synced" → verify chunks exist in PostgreSQL

### Tests for User Story 1

- [X] T021 [P] [US1] Create tests/unit/rag/chunking.test.ts with construction document chunking tests
- [X] T022 [P] [US1] Create tests/unit/rag/retrieval.test.ts with vector similarity search tests
- [X] T023 [P] [US1] Create tests/integration/document-sync.test.ts with end-to-end sync flow
- [X] T024 [P] [US1] Create tests/contract/api/document-sets.test.ts per contracts/document-sets.yaml

### API Endpoints for User Story 1

- [X] T025 [P] [US1] Create src/app/api/document-sets/route.ts with GET (list) and POST (create) per contracts/document-sets.yaml
- [X] T026 [P] [US1] Create src/app/api/document-sets/[id]/route.ts with GET, PATCH, DELETE per contracts/document-sets.yaml
- [X] T027 [US1] Create src/app/api/document-sets/[id]/members/route.ts with POST (add docs) and DELETE (remove) per contracts/document-sets.yaml
- [X] T028 [US1] Create src/app/api/document-sets/[id]/members/[documentId]/retry/route.ts for failed sync retry
- [X] T029 [US1] Create src/app/api/document-sets/sync-status/route.ts with GET for document sync status map

### UI Components for User Story 1

- [X] T030 [US1] Create src/components/documents/SyncToAIButton.tsx that:
  - Receives selectedDocumentIds from lifted state (not internal picker)
  - Receives discipline/trade context from ConsultantCard
  - Shows disabled "Select documents to sync" when no selection
  - Shows enabled "Sync X documents to AI" with count when selected
  - Integrates with document-sets API endpoints
- [X] T030a [US1] Add Ctrl+click bulk-select to src/components/documents/CategoryTile.tsx:
  - Ctrl+click (or Cmd+click on Mac) selects all docs in that category
  - Multiple Ctrl+clicks on different tiles accumulate selections
  - Regular click keeps existing behavior (expand/categorize)
- [X] T030b [US1] Lift selectedDocumentIds state from DocumentRepository to page.tsx:
  - Enable cross-panel access to selection state
  - Pass to both DocumentCard and ConsultantCard via ResizableLayout
  - Thread through layout components
- [X] T030c [US1] Integrate SyncToAIButton into src/components/dashboard/ConsultantCard.tsx:
  - Add button in header next to "Consultants & Contractors" title
  - Tracks active discipline/trade tab with controlled Tabs components
  - Shows selection count and context name when documents selected
  - Pass selectedDocumentIds, projectId, and discipline/trade context
- [X] T031 [US1] Add sync status indicator (pending/processing/synced/failed) to document rows in src/components/documents/CategorizedList.tsx
  - Added "Sync" column with SyncStatusBadge component
  - Shows status icon and label for each document's sync state
- [X] T032 [US1] Add "Retry" action for failed syncs in document row actions
  - Created DocumentSyncCell wrapper component with retry logic
  - Uses useDocumentSyncStatus and useDocumentSetMutations hooks
  - Shows clickable "Retry" link for failed syncs

### Transmittal Management Buttons (NEW)

- [X] T030d [US1] Create transmittal management buttons in src/components/dashboard/ConsultantCard.tsx:

  **Button 1: "Save Selection As Transmittal"**
  - Add next to existing SyncToAI button in header
  - Uses selectedDocumentIds from lifted state (same as SyncToAI)
  - Auto-names transmittal as "{Discipline Name} Transmittal" (e.g., "Fire Services Transmittal")
  - Upserts (creates or replaces) transmittal for the discipline
  - Shows success toast: "Saved Fire Services Transmittal (5 documents)"
  - Button states:
    - Disabled: "Select documents" when no documents selected
    - Enabled: "Save Selection As Transmittal ({count})" when documents selected

  **Button 2: "Load Transmittal"**
  - Loads previously saved transmittal for the active discipline
  - Replaces current selection with transmittal's documents (sets selectedDocumentIds)
  - Shows toast: "Loaded Fire Services Transmittal (8 documents)"
  - Button states:
    - Disabled/Hidden: No transmittal exists for discipline
    - Enabled: "Load Transmittal ({count} docs)" when transmittal exists
  - After loading, user can add/remove files and re-save

- [X] T030e [US1] Create src/lib/hooks/use-transmittal.ts:
  - useTransmittal(projectId, disciplineId) hook
  - Returns: { transmittal, isLoading, saveTransmittal, loadTransmittal }
  - saveTransmittal(documentIds) - upserts transmittal with auto-generated name
  - loadTransmittal() - returns documentIds to set as selection (replaces current)
  - Queries /api/transmittals with discipline filter

### Hooks for User Story 1

- [X] T034 [US1] Create src/lib/hooks/use-document-sets.ts for document set CRUD operations
- [X] T035 [US1] Create src/lib/hooks/use-sync-status.ts for polling sync status with SWR

**Checkpoint**: User can sync documents to AI - verify chunks in database, status indicators work

---

## Phase 4: User Story 2 - Tender Request Generation (Priority: P1)

**Goal**: User can generate tender request reports with TOC approval and section-by-section streaming

**Independent Test**: Create document set → start generation → approve TOC → verify sections generate with streaming → verify report complete

### Tests for User Story 2

- [X] T036 [P] [US2] Create tests/unit/langgraph/graph.test.ts with state machine transition tests
- [X] T037 [P] [US2] Create tests/integration/report-generation.test.ts with full generation flow
- [X] T038 [P] [US2] Create tests/contract/api/reports.test.ts per contracts/reports.yaml

### Hybrid Context Architecture for User Story 2 (CRITICAL)

**Purpose**: Tender request generation MUST combine EXACT Planning Card data with RETRIEVED document context.

- [X] T039a [US2] Create src/lib/services/planning-context.ts:
  - Define PlanningContext interface with ALL Planning Card sections:
    - **details**: projectName, buildingClass, address, legalAddress, zoning, jurisdiction, lotArea, numberOfStories
    - **objectives**: id, objective, priority
    - **stages**: id, name, description, status
    - **risks**: id, description, likelihood, impact, mitigation
    - **stakeholders**: id, name, role, company, contact
    - **disciplines**: id, name, isEnabled (from ConsultantListSection)
    - **trades**: id, name, isEnabled (from ContractorListSection)
  - Implement fetchPlanningContext(projectId) that queries SQLite for all Planning Card data
  - Return structured exact data for LangGraph state (not RAG-retrieved)

- [X] T039b [US2] Create src/lib/langgraph/nodes/fetch-planning-context.ts:
  - First node in LangGraph workflow
  - Calls fetchPlanningContext(projectId) to load exact Planning Card data
  - Populates planningContext in ReportState before any generation

### LangGraph Orchestration for User Story 2

- [X] T039 [US2] Create src/lib/langgraph/state.ts with ReportState annotation per spec.md:
  - **MUST include planningContext: Annotation<PlanningContext>** for exact Planning Card data
  - **MUST include transmittal: Annotation<TransmittalContext | null>** for optional transmittal data
  - Include projectId, reportType, documentSetIds, toc, sections, activeSourceIds, userFeedback
  - Planning context and transmittal are fetched ONCE at start and passed through all nodes

- [X] T040 [US2] Create src/lib/langgraph/nodes/generate-toc.ts:
  - **Uses planningContext.objectives to inform section structure** (not just RAG)
  - **Uses planningContext.risks to ensure risk-related sections exist**
  - **Uses planningContext.disciplines to scope content appropriately**
  - **If transmittal exists for discipline, append "Appendix A - Transmittal" as final TOC entry**
  - Prompt explicitly includes: project name, objectives, stakeholders, risks
  - Falls back to memory system if available (T074)

- [X] T041 [US2] Create src/lib/langgraph/nodes/await-toc-approval.ts with interrupt() for user editing

- [X] T042 [US2] Create src/lib/langgraph/nodes/retrieve-context.ts:
  - **COMBINES hybrid context sources:**
    - FIRST: Use planningContext from state (exact Planning Card data, already fetched)
    - SECOND: Retrieve ragChunks via src/lib/rag/retrieval.ts (document embeddings)
  - Returns { planningContext, ragChunks } for section generation
  - Passes both context types to downstream nodes

- [X] T043 [US2] Create src/lib/langgraph/nodes/generate-section.ts with Claude streaming:
  - **Prompt template MUST include BOTH context sources:**
    ```
    ## Project Context (Exact - from Planning Card)
    Project: {planningContext.project.name}
    Objectives: {planningContext.objectives}
    Stakeholders: {planningContext.stakeholders}
    Risks: {planningContext.risks}

    ## Document Context (Retrieved)
    {ragChunks with citations}

    ## Task
    Generate section addressing objectives and stakeholder needs
    ```
  - Stream tokens to UI via SSE
  - Include source citations for retrieved chunks

- [X] T044 [US2] Create src/lib/langgraph/nodes/await-section-feedback.ts with interrupt() for user feedback
- [X] T045 [US2] Create src/lib/langgraph/nodes/finalize.ts for report completion

### Transmittal Integration for Report Generation (NEW)

- [X] T045a [US2] Create src/lib/langgraph/nodes/generate-transmittal-section.ts:
  - New LangGraph node that runs AFTER all regular sections complete
  - Only executes if transmittal exists for the discipline (conditional)
  - Queries transmittal documents from database (transmittal_documents table)
  - Renders markdown table with columns: **Doc Name | Version | Category**
  - No AI generation needed - purely data-driven rendering
  - Returns section content: "## Appendix A - Transmittal\n\n| Doc Name | Version | Category |\n|---|---|---|\n..."

- [X] T045b [US2] Update src/lib/services/planning-context.ts to include transmittal:
  - Add TransmittalContext interface with documents array
  - fetchTransmittalForDiscipline(projectId, disciplineId) function
  - Returns null if no transmittal exists for the discipline
  - Returns { id, name, documents: [{ name, version, category }] } if exists

- [X] T046 [US2] Create src/lib/langgraph/graph.ts assembling all nodes with edges per spec.md:
  - **Add fetch-planning-context as FIRST node after __start__**
  - Edge: __start__ → fetch-planning-context → generate-toc → ...
  - **Add generate-transmittal-section node AFTER finalize**
  - **Conditional edge: finalize → generate-transmittal-section (if transmittal exists) → __end__**
  - **Conditional edge: finalize → __end__ (if no transmittal)**

### API Endpoints for User Story 2

- [X] T047 [US2] Create src/app/api/reports/generate/route.ts with POST to start LangGraph workflow per contracts/reports.yaml
- [X] T048 [P] [US2] Create src/app/api/reports/route.ts with GET to list reports per contracts/reports.yaml
- [X] T049 [US2] Create src/app/api/reports/[id]/route.ts with GET (full report), DELETE per contracts/reports.yaml
- [X] T050 [US2] Create src/app/api/reports/[id]/approve-toc/route.ts with POST to resume after TOC approval
- [X] T051 [US2] Create src/app/api/reports/[id]/section-feedback/route.ts with POST for approve/regenerate/skip
- [X] T052 [US2] Create src/app/api/reports/[id]/stream/route.ts with SSE for real-time generation events
- [X] T053 [US2] Create src/app/api/reports/[id]/lock/route.ts with POST (acquire) and DELETE (release)

### UI Components for User Story 2

- [X] T054 [US2] Create src/components/reports/ReportGenerator.tsx main container with generation flow
- [X] T055 [US2] Create src/components/reports/TocEditor.tsx with drag-and-drop section reordering
- [X] T056 [US2] Create src/components/reports/SectionViewer.tsx with streaming content display
- [X] T057 [US2] Create src/app/reports/page.tsx with report list and generation trigger
- [X] T058 [US2] Create src/app/reports/[id]/page.tsx with full report view and actions

### Hooks for User Story 2

- [X] T059 [US2] Create src/lib/hooks/use-report-generation.ts for managing generation state and SSE
- [X] T060 [US2] Create src/lib/hooks/use-report-stream.ts for consuming SSE events
- [X] T061 [US2] Create src/lib/hooks/use-report-lock.ts for lock acquisition and heartbeat

**Checkpoint**: User can generate tender requests - verify TOC approval flow, section streaming works

---

## Phase 5: User Story 3 - Smart Context Panel (Priority: P2)

**Goal**: User can see and control which sources are being used during report generation

**Independent Test**: Start generation → verify sources appear with relevance scores → toggle off source → verify section regenerates without that source

### Tests for User Story 3

- [X] T062 [P] [US3] Create tests/unit/components/SmartContextPanel.test.tsx with source display and toggle tests

### UI Components for User Story 3

- [X] T063 [US3] Create src/components/reports/SmartContextPanel.tsx with source list, relevance scores, and toggles per spec.md
- [X] T064 [US3] Add source relevance display (0-100%) in SmartContextPanel with progress bars
- [X] T065 [US3] Implement source toggle off → regenerate flow in SmartContextPanel
- [X] T066 [US3] Integrate SmartContextPanel into SectionViewer.tsx as collapsible side panel

### API Extensions for User Story 3

- [X] T067 [US3] Create src/app/api/retrieval/search/route.ts POST with source metadata for Smart Context per contracts/retrieval.yaml
- [X] T068 [US3] Add src/app/api/retrieval/chunks/[chunkId]/route.ts GET for chunk detail view per contracts/retrieval.yaml
- [X] T069 [US3] Add src/app/api/retrieval/health/route.ts GET for component health status per contracts/retrieval.yaml

**Checkpoint**: User can see and control sources - verify toggle removes source from regeneration

---

## Phase 6: User Story 4 - Report Memory System (Priority: P2)

**Goal**: System learns from approved TOCs to pre-fill future reports

**Independent Test**: Complete report → approve → start new report for same discipline → verify TOC is pre-filled from memory

### Tests for User Story 4

- [ ] T070 [P] [US4] Create tests/unit/rag/memory.test.ts with TOC merge and recall tests
- [ ] T071 [P] [US4] Create tests/integration/memory-capture.test.ts with approval → reuse flow

### Memory Implementation for User Story 4

- [ ] T072 [US4] Create src/lib/rag/memory.ts with captureReportMemory() per spec.md
- [ ] T073 [US4] Add mergeTocPatterns() function to src/lib/rag/memory.ts for TOC pattern merging
- [ ] T074 [US4] Create generateTocWithMemory() in src/lib/langgraph/nodes/generate-toc.ts for memory pre-fill
- [ ] T075 [US4] Add memory lookup before AI generation in generate-toc.ts

### UI Extensions for User Story 4

- [ ] T076 [US4] Add "From memory" indicator in TocEditor.tsx when TOC is pre-filled
- [ ] T077 [US4] Show times_used count for memory-based TOCs in TocEditor.tsx

**Checkpoint**: Memory system works - verify TOC reuse across reports

---

## Phase 7: User Story 5 - Report Export (Priority: P3)

**Goal**: User can export completed reports to DOCX and PDF formats

**Independent Test**: Complete report → export to DOCX → verify file downloads → export to PDF → verify file downloads

### Tests for User Story 5

- [ ] T078 [P] [US5] Create tests/integration/export.test.ts with DOCX and PDF export validation

### Export Implementation for User Story 5

- [ ] T079 [US5] Install docx and pdf-lib dependencies in package.json
- [ ] T080 [US5] Create src/lib/export/docx.ts with DOCX generation using docx library
- [ ] T081 [P] [US5] Create src/lib/export/pdf.ts with PDF generation using pdf-lib
- [ ] T082 [US5] Create src/app/api/reports/[id]/export/route.ts with POST per contracts/reports.yaml

### UI Extensions for User Story 5

- [ ] T083 [US5] Add export buttons (DOCX, PDF) to report view in src/app/(dashboard)/reports/[id]/page.tsx
- [ ] T084 [US5] Add export progress indicator for large reports

**Checkpoint**: Export works - verify DOCX and PDF downloads correctly

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Error Handling & Logging

- [ ] T085 [P] Add comprehensive error handling to all RAG API endpoints with proper HTTP status codes
- [ ] T086 [P] Add logging for document sync operations in workers/document-processor/index.ts
- [ ] T087 [P] Add logging for report generation in src/lib/langgraph/graph.ts

### Performance & Optimization

- [ ] T088 Build HNSW index after initial document load with CONCURRENTLY option
- [ ] T089 Add batch embedding support to src/lib/rag/embeddings.ts (128 items per batch)
- [ ] T090 Add connection pooling configuration for PostgreSQL in src/lib/db/rag-client.ts

### Documentation

- [ ] T091 [P] Update quickstart.md with verified setup steps after implementation
- [ ] T092 [P] Add inline code comments for complex LangGraph state transitions

### Final Validation

- [ ] T093 Run all tests and verify passing
- [ ] T094 Run quickstart.md validation with fresh environment
- [ ] T095 Verify retrieval relevance >85% with test document set
- [ ] T096 Verify document processing <30s per document
- [ ] T097 Verify section generation <15s per section

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
     ↓
Phase 2 (Foundational) ──────────── BLOCKS ALL USER STORIES
     ↓
     ├─── Phase 3 (US1: Document Sync) ←── MVP
     │         ↓
     ├─── Phase 4 (US2: Tender Generation) ←── depends on US1 for synced docs
     │         ↓
     ├─── Phase 5 (US3: Smart Context) ←── extends US2
     │
     ├─── Phase 6 (US4: Report Memory) ←── extends US2
     │
     ├─── Phase 7 (US5: Export) ←── depends on US2 for complete reports
     │
     ├─── Phase 9 (RAG Filtering & Modes) ←── extends US2
     │
     ├─── Phase 10 (Global & Project Repos) ←── depends on Phase 3 (US1)
     │
     ├─── Phase 11 (Unified Report Editor) ←── depends on Phase 4 (US2) for report generation
     │
     └─── Phase 12 (RFT Tabbed Interface) ←── depends on Phase 11 for editor components
               ↓
         Phase 8 (Polish)
```

### User Story Dependencies

- **US1 (Document Sync)**: Can start after Foundational - No dependencies on other stories
- **US2 (Tender Generation)**: Requires US1 (needs synced documents for RAG context)
- **US3 (Smart Context)**: Extends US2 (displays during generation)
- **US4 (Report Memory)**: Extends US2 (captures from approved reports)
- **US5 (Export)**: Requires US2 (exports completed reports)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Schema/Models before services
- Services before API endpoints
- API endpoints before UI components
- Core implementation before integration

### Parallel Opportunities

**Phase 2 (Foundational)**:
```bash
# All schema tasks can run in parallel:
T006, T007, T008, T009, T010, T011

# All RAG module tasks can run in parallel:
T013, T014, T015, T016
```

**Phase 3 (US1)**:
```bash
# All tests can run in parallel:
T021, T022, T023, T024

# Independent API endpoints in parallel:
T025, T026
```

**Phase 4 (US2)**:
```bash
# All tests can run in parallel:
T036, T037, T038
```

---

## Implementation Strategy

### MVP First (US1 + US2 Core)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T020)
3. Complete Phase 3: User Story 1 - Document Sync (T021-T035)
4. **STOP and VALIDATE**: Test document sync independently
5. Complete Phase 4: User Story 2 - Tender Generation (T036-T061)
6. **STOP and VALIDATE**: Test report generation end-to-end
7. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 (Document Sync) → Test independently → Demo syncing
3. Add US2 (Tender Generation) → Test independently → Demo report generation
4. Add US3 (Smart Context) → Test independently → Demo source visibility
5. Add US4 (Report Memory) → Test independently → Demo TOC reuse
6. Add US5 (Export) → Test independently → Demo exports

### Estimated Task Counts

| Phase | Tasks | Completed | Remaining |
|-------|-------|-----------|-----------|
| Phase 1: Setup | 6 | 6 ✅ | 0 |
| Phase 2: Foundational | 15 | 15 ✅ | 0 |
| Phase 3: US1 | 15 | 15 ✅ | 0 |
| Phase 4: US2 | 28 | 28 ✅ | 0 |
| Phase 5: US3 | 8 | 8 ✅ | 0 |
| Phase 6: US4 | 8 | 0 | 8 |
| Phase 7: US5 | 7 | 0 | 7 |
| Phase 8: Polish | 13 | 0 | 13 |
| Phase 9: RAG Filtering & Modes | 10 | 10 ✅ | 0 |
| Phase 10: Global & Project Repos | 27 | 19 | 8 |
| Phase 11: Unified Report Editor | 45 | 25 | 20 |
| Phase 12: RFT Tabbed Interface | 13 | 13 ✅ | 0 |
| **Total** | **195** | **139** | **56** |

**Overall Progress: 71% Complete** (139/195 tasks)

---

## Phase 9: Document Set RAG Filtering & Report Generation Modes

**Purpose**: Fix RAG retrieval to use curated document sets (not transmittals) and implement dual report generation modes.

### Critical Architecture Clarification

| Concept | Per Discipline | Purpose | Scale | RAG Usage |
|---------|---------------|---------|-------|-----------|
| **Transmittal** | 1:1 | Delivery package | ALL docs (50-200 including drawings) | ❌ Appendix listing ONLY |
| **Document Set** | 1:1 | AI knowledge base | CURATED key docs (5-20 typically) | ✅ RAG retrieval |

> **⚠️ CRITICAL**: Transmittals are NOT indexed for RAG. Only the curated Document Set is embedded and used for retrieval.

### T098: Document Set RAG Filtering

**Goal**: Fix retrieve-context to use discipline's curated document set, not transmittal.

- [X] T098a [US2] Fix src/lib/langgraph/nodes/retrieve-context.ts line ~120:
  - Currently passes `undefined` for documentIds (uses all synced docs)
  - Must filter to only discipline's document set IDs
  - Add lookup: getDocumentSetByDiscipline(projectId, disciplineId)
  - **IMPLEMENTED**: Updated fetch-planning-context.ts to fetch document set IDs for discipline
- [X] T098b [US2] Add document set lookup by discipline ID in src/lib/services/planning-context.ts:
  - fetchDocumentSetForDiscipline(projectId, disciplineId) → returns documentSetIds[]
  - Returns empty array if no document set exists (allows generation without RAG)
  - **IMPLEMENTED**: Function created and integrated into fetch-planning-context node
- [X] T098c [US2] Filter RAG retrieval to only embedded documents in the discipline's set
  - **IMPLEMENTED**: retrieve-context.ts already uses state.documentSetIds which now contains discipline-specific sets

### T099: Report Generation Modes

**Goal**: Implement dual report generation modes - "Data Only" and "AI Assisted"

| Mode | AI Usage | Content Source | Best For |
|------|----------|----------------|----------|
| **Data Only** | Light polish on Brief only | Verbatim from Planning/Consultant cards | Quick drafts, pre-written content |
| **AI Assisted** | Full generation | Cards as context + RAG document set | Comprehensive tender requests |

#### Field → Section Mapping (Data Only Mode)

| Report Section | Source Fields | AI Role |
|----------------|---------------|---------|
| Project Details | `details.*` (name, address, buildingClass, etc.) | None - template only |
| Project Objectives | `objectives.*` (functional, quality, budget, program) | None - template only |
| Project Stages | `stages[]` array | None - template only |
| Brief | `discipline.briefServices`, `discipline.briefProgram` | Light polish (grammar only) |
| Fee Structure | `discipline.briefFee` + `disciplineFeeItems[]` | None - template only |
| Appendix A - Transmittal | `transmittal.documents[]` | None - table render |

#### Implementation Tasks

- [X] T099a [US2] Add generationMode field to reportTemplates table in src/lib/db/rag-schema.ts:
  - Type: 'data_only' | 'ai_assisted'
  - Default: 'ai_assisted' for backward compatibility
  - **IMPLEMENTED**: Field added with enum constraint and default value
- [X] T099b [US2] Add mode selector to src/components/reports/ReportGenerator.tsx config step:
  - Radio buttons: "Data Only" / "AI Assisted"
  - Tooltip explaining each mode
  - Store selection in generation request
  - **IMPLEMENTED**: Integrated with existing DisciplineRepoTiles purple/orange buttons
  - Mode flows through: DisciplineRepoTiles → ConsultantCard → ConsultantGallery → ReportsSection → ReportGenerator
  - ReportGenerator accepts generationMode as prop (no internal selector needed)
- [X] T099c [US2] Update src/app/api/reports/generate/route.ts:
  - Accept generationMode parameter
  - Store in report template record
  - **IMPLEMENTED**: API accepts and stores generationMode in database
- [X] T099d [US2] Create generateDataOnlySection() in src/lib/langgraph/nodes/generate-section.ts:
  - Template-based rendering using Planning Card data directly
  - No Claude API call for most sections
  - Returns formatted markdown from structured data
  - **IMPLEMENTED**: Full template-based generator with section routing
- [X] T099e [US2] Create generatePolishedSection() in src/lib/langgraph/nodes/generate-section.ts:
  - Minimal Claude polish for Brief section only (grammar and formatting)
  - System prompt: "Polish grammar and formatting only. Do not add content."
  - Much shorter, faster call than full generation
  - **IMPLEMENTED**: Light polish function for Brief section with fallback
- [X] T099f [US2] Update src/app/api/reports/[id]/approve-toc/route.ts:
  - Route to structured vs AI generation based on mode
  - generateAllSections() checks mode and calls appropriate generator
  - **IMPLEMENTED**: Mode-based routing in generateAllSections function
  - **CLARIFICATION NEEDED**: For `ai_assisted` mode, the sequence should be:
    1. FIRST call `generateDataOnlySection(state)` to get template baseline
    2. THEN call `retrieveContextNode(state)` for RAG chunks
    3. FINALLY call `generateSectionNode(state)` with BOTH template output AND RAG chunks
  - **CURRENT BUG**: Code skips step 1, going directly to RAG → AI generation
- [X] T099g [US2] Add migration script for generationMode column (scripts/run-migration-0010.js)
  - **IMPLEMENTED**: Migration SQL created at drizzle/rag/0002_generation_mode.sql
  - **APPLIED**: Migration runner created at scripts/run-rag-migration-0002.js
  - **APPLIED**: Successfully executed on Supabase PostgreSQL database
  - Column added to report_templates: generation_mode TEXT DEFAULT 'ai_assisted'
- [X] T099h [US2] Fix generate-toc.ts to ALWAYS use fixed 7-section structure:
  - Remove memory lookup that was overriding TOC structure with cached AI-generated patterns
  - Both data_only AND ai_assisted modes use same fixed TOC structure
  - Memory system (T074-T075) reserved for content pattern learning ONLY, not TOC override
  - Fixed 7-section TOC: Project Details, Project Objectives, Project Staging, Project Risks, Consultant Brief/Contractor Scope, Consultant Fee/Contractor Price, Transmittal
  - Transmittal section ALWAYS uses data-only rendering (no RAG) in both modes
  - **IMPLEMENTED**: generate-toc.ts updated to skip memory lookup and always use getFixedTocSections()
  - **DOCUMENTED**: spec.md updated with Fixed TOC Structure (T099a) section
- [X] T099i [BUGFIX] Fix generationMode not passed through startReportGeneration():
  - **BUG**: graph.ts startReportGeneration() function signature was missing `generationMode` parameter
  - **IMPACT**: Short RFT was using AI-assisted mode (RAG) instead of data-only mode
  - **ROOT CAUSE**: generationMode was passed from generate/route.ts and refresh/route.ts but silently ignored
  - **FIX**: Added `generationMode?: 'data_only' | 'ai_assisted'` to startReportGeneration input type
  - **FIX**: Added `trade?: string` to startReportGeneration input type for contractor support
  - **IMPLEMENTED**: graph.ts updated to pass generationMode through to createInitialReportState()
- [X] T099j [BUGFIX] Fix wrong 5-section TOC in /api/reports/route.ts:
  - **BUG**: POST /api/reports was creating reports with wrong 5-section TOC (Executive Summary, Scope of Works, Technical Requirements, Commercial Terms, Attachments)
  - **IMPACT**: Users saw AI-generated section titles instead of the fixed 7-section structure
  - **ROOT CAUSE**: Hardcoded wrong sections at lines 139-149 in route.ts
  - **FIX**: Replaced with correct 7-section TOC: Project Details, Project Objectives, Project Staging, Project Risks, Consultant Brief/Contractor Scope, Consultant Fee/Contractor Price
  - **FIX**: Added discipline vs trade detection to use correct section titles (Consultant Brief vs Contractor Scope, etc.)
  - **FIX**: Added transmittal check - fetches transmittal for disciplineId and adds 7th "Transmittal" section if documents exist
  - **IMPLEMENTED**: src/app/api/reports/route.ts updated with fixed 7-section structure and transmittal check
- [ ] T099k [BUGFIX] Fix Long RFT to use Short RFT as baseline:
  - **BUG**: Long RFT (ai_assisted mode) skips template rendering step
  - **IMPACT**: AI generation doesn't have template baseline content as context
  - **EXPECTED SEQUENCE**:
    1. Call `generateDataOnlySection(state)` to render template output (same as Short RFT)
    2. Call `retrieveContextNode(state)` to get RAG chunks
    3. Call `generateSectionNode(state)` with both template baseline AND RAG chunks
  - **FILES TO UPDATE**:
    - `src/app/api/reports/[id]/approve-toc/route.ts`: Add template step before RAG
    - `src/lib/langgraph/nodes/generate-section.ts`: Accept templateBaseline parameter in prompt
  - **ACCEPTANCE CRITERIA**:
    - Long RFT section content includes all data from Short RFT templates
    - AI enhances/expands the template content rather than generating from scratch
    - RAG chunks provide additional technical context for AI enhancement
- [ ] T099l [US2] Add Long RFT length control option:
  - **FEATURE**: User selects content length when generating Long RFT
  - **OPTIONS**:
    - `concise`: Brief, focused expansion (~500-800 words/section)
    - `lengthy`: Comprehensive, detailed expansion (~1500-2500 words/section)
  - **UI CHANGES**:
    - Add radio button selector in Long RFT generation modal/config
    - Show before generation starts (next to RAG source selection)
  - **SCHEMA CHANGES**:
    - Add `contentLength: enum('concise', 'lengthy')` to report_templates table
    - Default: 'concise' for faster generation
  - **FILES TO UPDATE**:
    - `src/lib/db/rag-schema.ts`: Add contentLength field
    - `src/components/reports/ReportGenerator.tsx`: Add length selector UI
    - `src/app/api/reports/generate/route.ts`: Accept contentLength parameter
    - `src/lib/langgraph/nodes/generate-section.ts`: Adjust prompt based on length
  - **PROMPT ADJUSTMENTS**:
    - Concise: "Expand the template content with focused, essential details. Target 500-800 words."
    - Lengthy: "Provide comprehensive analysis with thorough technical details. Target 1500-2500 words."

#### Hardcoded 7-Section TOC Structure

**IMPORTANT**: Both Short RFT and Long RFT use the **same fixed 7-section TOC**:

| # | Section Title | Short RFT (Data Only) | Long RFT (AI Assisted) |
|---|--------------|----------------------|------------------------|
| 1 | **Project Details** | Template (no AI) | Template → RAG → AI Enhancement |
| 2 | **Project Objectives** | Template (no AI) | Template → RAG → AI Enhancement |
| 3 | **Project Staging** | Template (no AI) | Template → RAG → AI Enhancement |
| 4 | **Project Risks** | Template (no AI) | Template → RAG → AI Enhancement |
| 5 | **Consultant Brief** / **Contractor Scope** | Light polish only | Template → RAG → AI Enhancement |
| 6 | **Consultant Fee** / **Contractor Price** | Template (no AI) | Template → RAG → AI Enhancement |
| 7 | **Transmittal** (if exists) | Table (no AI) | Table (no AI) - ALWAYS data-only |

**Note**: "Template → RAG → AI Enhancement" means:
1. First render template output (identical to Short RFT)
2. Then retrieve RAG chunks from Document Set
3. Finally generate AI-enhanced content using template as baseline + RAG as context

**Checkpoint**: Both modes work - verify Data Only produces template output, AI Assisted uses RAG with template baseline

### Additional UI Integration Tasks (Post-Implementation)

The following integration tasks were completed to connect the existing purple/orange tiles with the report generation system:

- [X] **UI-01** Update src/components/dashboard/ConsultantCard.tsx:
  - Added state management for generation modes per discipline/trade
  - Created disciplineModes and tradeModes state objects
  - Threaded mode through to DisciplineRepoTiles and galleries

- [X] **UI-02** Update src/components/consultants/ConsultantGallery.tsx:
  - Added generationMode prop to interface
  - Passed mode to ReportsSection component

- [X] **UI-03** Update src/components/contractors/ContractorGallery.tsx:
  - Added generationMode prop to interface
  - Passed mode to ReportsSection component

- [X] **UI-04** Update src/components/reports/ReportsSection.tsx:
  - Added generationMode prop to interface
  - Passed mode to all ReportGenerator instances (new and viewing)

- [X] **UI-05** Fix src/components/reports/ReportGenerator.tsx:
  - Removed duplicate generation mode selector (lines 226-260)
  - Added generationMode prop to accept mode from parent
  - Added useEffect to sync external mode changes to formData
  - Removed internal mode selection UI

**Result**: Purple "Data Only" and Orange "AI Assist" tiles in DisciplineRepoTiles now control the report generation mode seamlessly.

---

## Phase 10: RAG Context Architecture Refactoring (Global & Project Repos)

**Purpose**: Refactor the RAG document context architecture to support global knowledge libraries and unified project repos with tile-based UI.

**Prerequisites**: Phase 2 complete, Phase 3 (US1) complete

### Architecture Summary

| Repo Type | Scope | Location | Purpose |
|-----------|-------|----------|---------|
| **Global Repos (6)** | Per-organization | Planning Card | Curated knowledge libraries shared across all projects |
| **Project Repo** | Per-project | ConsultantCard | Project-specific document context for all disciplines |
| **Transmittal** | Per-discipline | ConsultantCard | Delivery package (NOT for RAG retrieval) |

**Global Repo Types**: Due Diligence, House, Apartments, Fitout, Industrial, Remediation

### Subphase 10.1: Database Schema Updates

- [ ] T100 [P] Create drizzle/0011_rag_repos.sql migration:
  - Add `repo_type TEXT DEFAULT 'project'` to document_sets (values: 'project' | 'due_diligence' | 'house' | 'apartments' | 'fitout' | 'industrial' | 'remediation')
  - Add `organization_id TEXT` to document_sets (required for global repos, NULL for project-scoped)
  - Add `is_global BOOLEAN DEFAULT false` to document_sets
- [ ] T101 Update src/lib/db/rag-schema.ts with new columns:
  - repoType: text('repo_type').default('project')
  - organizationId: text('organization_id')
  - isGlobal: boolean('is_global').default(false)
- [ ] T102 Run migration scripts/run-migration-0011.js
- [ ] T103 [P] Create global repo initialization script for new organizations:
  - Auto-create 6 global repos when organization is created
  - GLOBAL_REPO_TYPES = ['due_diligence', 'house', 'apartments', 'fitout', 'industrial', 'remediation']

### Subphase 10.2: API Endpoints

- [ ] T104 Create src/app/api/rag-repos/route.ts:
  - GET: List all repos for current context (6 global + project repo)
  - Query params: projectId, organizationId
  - Returns: { globalRepos: DocumentSet[], projectRepo: DocumentSet }
- [ ] T105 Create src/app/api/rag-repos/[id]/sync/route.ts:
  - POST: Save selected documents to a specific repo
  - Body: { documentIds: string[] }
  - Replaces existing members (full sync, not incremental)
- [ ] T106 Create src/app/api/rag-repos/[id]/load/route.ts:
  - GET: Load document IDs from a repo
  - Returns: { documentIds: string[] }
  - Used by "Load" button to restore selection
- [ ] T107 [P] Update src/app/api/document-sets/route.ts:
  - Add filter params: is_global, repo_type, organization_id
  - Maintain backward compatibility

### Subphase 10.3: Hooks

- [x] T108 Create src/lib/hooks/use-rag-repos.ts:
  - useRAGRepos(projectId: string, organizationId: string) hook
  - Returns: { globalRepos, projectRepo, isLoading, saveToRepo, loadFromRepo, initializeRepos, needsInitialization }
  - saveToRepo(repoId: string, documentIds: string[]) → Promise<void>
  - loadFromRepo(repoId: string) → Promise<string[]>
  - Added useRepoSelection() hook for multi-repo selection state
- [ ] T109 [P] Update src/lib/hooks/use-document-sets.ts:
  - Add filter params: is_global, repo_type, organization_id
  - Keep backward compatible

### Subphase 10.4: UI Components - Planning Card (Knowledge Libraries)

- [x] T110 Create src/components/planning/KnowledgeLibrariesSection.tsx:
  - 2x3 grid of global repo tiles
  - Each tile: Name, doc count in parentheses, Save/Load buttons
  - Tile styling: `border-gray-600`, `bg-[#252526]` (neutral gray)
  - Shows "Initializing..." when repos not yet created
- [x] T111 Integrate KnowledgeLibrariesSection into src/components/dashboard/PlanningCard.tsx:
  - Add after Stakeholders section, before Stages
  - Section header: "§ KNOWLEDGE LIBRARIES"
  - Pass selectedDocumentIds, setSelectedDocumentIds props
- [x] T112 Implement Save behavior in KnowledgeLibrariesSection:
  - When docs selected in right panel → click "Save" on tile → syncs to that global repo
  - Shows toast: "Saved {count} documents to {repo name}"
  - Updates tile doc count
- [x] T113 Implement Load behavior in KnowledgeLibrariesSection:
  - Click "Load" → sets selectedDocumentIds to repo's documents
  - Shows toast: "Loaded {count} documents from {repo name}"
  - Enables edit workflow: Load → modify selection → Save

### Subphase 10.5: UI Components - ConsultantCard (DisciplineRepoTiles)

- [x] T114 Create src/components/documents/DisciplineRepoTiles.tsx:
  - Sources tiles (blue): `border-[#0e639c]`, `bg-[#1e3a5f]`
    - Save Sources / Load Sources buttons with icons
    - Shows doc count in parentheses
  - Generation Mode tiles (purple/orange):
    - Data Only: `border-[#9c6ce0]`, `bg-[#4a3f5f]` when selected
    - AI Assist: `border-[#e09c4a]`, `bg-[#5f4a2a]` when selected
    - Toggle selection with ring highlight on active
  - Transmittal tiles (green): `border-green-600`, `bg-[#1e3e1e]`
    - Save Transmittal / Load Transmittal buttons
    - Shows doc count
  - Export GenerationMode type: 'data_only' | 'ai_assist'
- [x] T115 Update src/components/dashboard/ConsultantCard.tsx:
  - Remove ButtonsSection component (lines ~104-162)
  - Add DisciplineRepoTiles at top of discipline tab content
  - Pass selectedDocumentIds, setSelectedDocumentIds, projectId, disciplineId
- [x] T116 [P] Update src/components/contractors/ContractorGallery.tsx:
  - Same pattern as ConsultantGallery for trades
  - DisciplineRepoTiles with tradeId instead of disciplineId

### Subphase 10.6: Layout Reordering

- [x] T117 Reorder ConsultantGallery.tsx layout within each discipline tab:
  1. DisciplineRepoTiles (Sources + Generation Mode + Transmittal)
  2. ReportsSection (Tender Generation) - MOVED UP
  3. Brief Section
  4. Fee Structure Section
  5. Firms Gallery
- [x] T118 [P] Reorder ContractorGallery.tsx layout (same pattern for trades)

### Subphase 10.7: Report Generation with Multi-Repo Selection

- [x] T119 Update src/components/reports/ReportGenerator.tsx config step:
  - Add "Knowledge Sources" section with checkboxes
  - Show all available repos: 6 global + 1 project
  - Default: Project repo selected
  - RepoCheckbox component with visual styling (project vs global)
  - Shows synced document count per repo
- [x] T120 Update src/app/api/reports/generate/route.ts:
  - Accept documentSetIds: string[] parameter (via existing field)
  - Pass to LangGraph state for retrieval
- [x] T121 Modify src/lib/rag/retrieval.ts retrieve() function:
  - Accept documentSetIds: string[] parameter
  - Added resolveDocumentSetIds() to fetch doc IDs from multiple repos
  - Vector search across union of documents from all selected repos
  - Added retrieveFromDocumentSets() convenience function
- [x] T122 Update src/lib/langgraph/nodes/retrieve-context.ts:
  - Changed from documentIds to documentSetIds parameter
  - Pass documentSetIds array to retrieval pipeline

### Subphase 10.8: Testing & Validation

- [ ] T123 [P] Test Save/Load workflow for global repos:
  - Select documents → Save to global repo → verify stored
  - Load from global repo → verify selection restored
- [ ] T124 [P] Test multi-repo retrieval:
  - Sync docs to 2+ repos → generate report with both selected
  - Verify chunks from all repos included in context
- [ ] T125 [P] Test global repo accessibility:
  - Create global repo in Project A
  - Open Project B → verify global repo available
- [ ] T126 Test tender generation in new location:
  - Verify ReportsSection above firms gallery
  - Verify generation flow unchanged

**Checkpoint**: Global repos work - verify 6 tiles in PlanningCard, Project/Transmittal tiles in ConsultantCard, multi-repo selection for reports

---

---

## Phase 11: Unified Report Editor - Request For Tender (RFT)

**Purpose**: Transform report generation from sectioned static boxes to a unified, editable text experience with color-coded headings, embedded transmittal tables, and dual workflow support (Short RFT → Long RFT).

**Prerequisites**: Phase 4 (US2: Tender Generation) complete

**User Requirements**:
1. **Unified Editor**: Single large editable text box with styled plain text
2. **Color-Coded Headings**: Fixed scheme for H1/H2/H3, works on dark theme AND white print
3. **Transmittal Table**: Editable table embedded in main text, uses document category colors
4. **Save & Export**: Save to database + export (PDF/DOCX), preserve colors
5. **Naming**: "Request For Tender" section, "RFT Architectural" default report
6. **Workflows**:
   - **Short RFT** (Data Only): Generated from planning/consultant/transmittal data, editable, refreshable
   - **Long RFT** (AI Assisted): Uses Short RFT as basis/prompting, expands with RAG content

### Subphase 11.1: Database Schema & Migration

- [X] T127 Add new columns to report_templates table in src/lib/db/rag-schema.ts:
  - editedContent: text('edited_content') // Complete unified HTML
  - lastEditedAt: timestamp('last_edited_at')
  - isEdited: boolean('is_edited').default(false)
  - parentReportId: text('parent_report_id') // Link Long → Short
  - reportChain: enum('short', 'long').default('short')
  - detailLevel: enum('standard', 'comprehensive') // For Long RFT
  - viewMode: enum('sections', 'unified').default('unified') // Display mode
  - **IMPLEMENTED**: All fields added to rag-schema.ts lines 181-194
- [X] T128 Create migration drizzle/rag/0003_unified_report_editor.sql with schema updates
  - **IMPLEMENTED**: Migration file created with all columns and indexes
- [X] T129 Create migration script scripts/run-rag-migration-0003.js for unified editor fields
  - **IMPLEMENTED**: Migration script created and applied

### Subphase 11.2: Core Editor Components (Week 1)

- [X] T130 [P] Create src/components/reports/UnifiedReportEditor.tsx:
  - Main container combining all sections into single editable HTML
  - Manages save/refresh/export operations
  - Mode-aware (short vs long RFT)
  - "Generate Long RFT" button with modal
  - **IMPLEMENTED**: Full component with auto-save, refresh, export integration
- [X] T131 [P] Create src/components/reports/EditableContentArea.tsx:
  - Native contentEditable div implementation
  - Keyboard shortcuts (Ctrl+1/2/3 for headings, Ctrl+S to save)
  - Paste handling with style preservation
  - Auto-save debounced (2 seconds)
  - MutationObserver to prevent cursor jumps
  - **IMPLEMENTED**: Complete with prose styling, print CSS
- [X] T132 [P] Create src/components/reports/HeadingToolbar.tsx:
  - Toolbar for H1/H2/H3 formatting controls
  - Apply heading colors: H1 #5B9BD5 (Blue), H2 #70AD47 (Green), H3 #ED7D31 (Amber)
  - Shows current heading level indicator
  - **IMPLEMENTED**: Buttons with color preview and keyboard shortcut hints
- [X] T133 Create section combining logic in UnifiedReportEditor.tsx:
  - Convert report.sections array to unified HTML string
  - Apply inline styles for heading colors
  - Embed transmittal table at end
  - Load from editedContent if isEdited=true
  - **IMPLEMENTED**: sectionsToHTML() in src/lib/utils/report-formatting.ts
- [X] T134 Update src/components/reports/ReportGenerator.tsx:
  - Integrate UnifiedReportEditor in complete step
  - Replace SectionViewer for new reports
  - Add viewMode: 'sections' | 'unified' to report_templates for backward compatibility
  - **IMPLEMENTED**: UnifiedReportEditor imported and used (line 306)

### Subphase 11.3: Transmittal Table (Week 1)

- [X] T135 Create src/components/reports/TransmittalTableEditor.tsx:
  - Editable table component with add/remove rows
  - Edit doc name, version, category
  - Category dropdown with color-coded options
  - Embedded inline with contentEditable="false"
  - **IMPLEMENTED**: Full component with inline editing and category colors
- [X] T136 Update formatTransmittalAsMarkdown to formatTransmittalAsHTML:
  - Convert markdown table output to HTML table
  - Apply category colors to table cells
  - Inline styles for color preservation
  - **IMPLEMENTED**: formatTransmittalAsHTML() in src/lib/utils/report-formatting.ts
- [X] T137 Integrate TransmittalTableEditor into EditableContentArea:
  - Render table at end of document
  - Handle table interactions separately from main content
  - React state for table updates
  - **IMPLEMENTED**: Via sectionsToHTML() transmittalHTML parameter

### Subphase 11.4: Save & API Endpoints (Week 1)

- [X] T138 [P] Create src/app/api/reports/[id]/route.ts PATCH handler:
  - Accept { editedContent: string, isEdited: true }
  - Update database with edited HTML
  - Set lastEditedAt timestamp
  - **IMPLEMENTED**: PATCH handler at lines 88-149 with all Phase 11 fields
- [X] T139 [P] Implement save functionality in UnifiedReportEditor:
  - Debounced auto-save (2 seconds)
  - Manual save on Ctrl+S
  - Shows "Saving..." and "Saved" indicators
  - Toast notifications on success/error
  - **IMPLEMENTED**: Full auto-save with visual feedback

### Subphase 11.5: Export (Week 2)

- [X] T140 Install docx.js dependency in package.json (~250KB library)
- [X] T141 [P] Create src/lib/export/pdf-enhanced.ts:
  - PDF export using jsPDF HTML renderer
  - Preserve heading colors (#5B9BD5, #70AD47, #ED7D31)
  - Preserve transmittal table colors
  - Print CSS adjustments (darken by 15% for contrast)
- [X] T142 [P] Create src/lib/export/docx-enhanced.ts:
  - DOCX export using docx.js library
  - Preserve heading colors
  - Preserve table formatting with category colors
  - Convert HTML to docx document structure
- [X] T143 Create src/app/api/reports/[id]/export/route.ts POST handler:
  - Accept { format: 'pdf' | 'docx' } parameter
  - Fetches report content from database (editedContent or sections)
  - Generates file using appropriate export library (exportToPDF/exportToDOCX)
  - Returns binary file download with proper headers and sanitized filename
- [X] T144 Create src/components/reports/ExportButton.tsx:
  - Dropdown with "Export as PDF" and "Export as DOCX" options
  - Loading state during generation with spinner
  - Download trigger with blob URL and Content-Disposition header parsing
  - Toast notifications for success/error feedback
  - Click-outside-to-close functionality
- [X] T145 [P] Add print CSS to EditableContentArea:
  - @media print styles
  - Darken heading colors by 15% (filter: brightness(0.85))
  - Full-width prose for print, table page-break controls
  - Prevent orphaned headings, white background enforcement
  - Hide buttons and .no-print elements

### Subphase 11.6: Refresh Mechanism (Week 2)

- [X] T146 Add isEdited and lastEditedAt fields to database schema:
  - Fields already exist from T127 (0003_unified_report_editor.sql migration)
  - Migration applied: last_edited_at TIMESTAMP, is_edited BOOLEAN DEFAULT false
  - Verified via run-rag-migration-0003.js (already applied)
- [X] T147 Create src/app/api/reports/[id]/refresh/route.ts POST handler:
  - Accept { preserveEdits?: boolean } parameter (handles empty body gracefully)
  - Validates report is Short RFT (reportChain === 'short' or null/undefined for legacy)
  - Checks if report.isEdited === true, returns 409 if edited without preserveEdits flag
  - Deletes existing report sections from database
  - Resets report status to 'toc_pending' (UI triggers regeneration via handleShortRFT)
  - Clears graphState so fresh generation can occur
  - Optionally clears editedContent if preserveEdits=false
  - Returns { success: true, report, message } with updated report object
  - **UI Flow**: RFTTab.handleRefresh calls refresh API then auto-triggers handleShortRFT
- [X] T148 Create src/components/reports/RefreshConfirmationModal.tsx:
  - Modal component with backdrop and click-outside-to-close
  - Shows warning when report.isEdited === true
  - AlertTriangle icon with yellow theme for visual warning
  - Three action buttons: Cancel, Keep Edits (disabled/coming soon), Overwrite Edits (destructive)
  - Yellow warning box explaining edit loss
  - onConfirm callback with preserveEdits parameter (true/false)
  - Accepts reportTitle prop for context display
- [X] T149 Add "Refresh RFT" button to UnifiedReportEditor:
  - Only visible for Short RFT (reportChain === 'short')
  - Triggers refresh flow with RefreshConfirmationModal
  - Shows loading state during re-generation
  - Reloads editor with updated content
  - **IMPLEMENTED**: Button at lines 211-222 in UnifiedReportEditor.tsx

### Subphase 11.7: Short → Long RFT Workflow (Week 3)

- [ ] T149 Create src/components/reports/GenerateLongRFTModal.tsx:
  - **Detail Level Selector**: "How detailed should this report be?"
    - Standard: ~1000-1500 words/section (balanced detail)
    - Comprehensive: ~2000+ words/section (thorough analysis)
  - **RAG Source Selection**:
    - Pre-populated checkboxes for project-specific sources
    - Pre-populated checkboxes for knowledge libraries from Planning Card
    - User can toggle sources on/off before generation
  - Submit button → triggers Long RFT generation
- [ ] T150 Create src/app/api/reports/[id]/generate-long/route.ts POST handler:
  - Accept params:
    - shortRFTId: string
    - projectDocumentSetIds: string[] // Project-specific synced sources
    - knowledgeLibraryIds: string[] // Global knowledge libraries
    - detailLevel: 'standard' | 'comprehensive'
  - Extract from Short RFT:
    - H1/H2/H3 headings → TOC structure
    - Section content → baseline for prompting
  - Fetch original data from database:
    - Transmittal data from discipline/trade transmittal table
    - Planning context, consultant data (latest versions)
  - Create new report with generationMode='ai_assisted'
  - Set parentReportId to link back to Short RFT
  - Set reportChain='long'
  - Return { reportId: string, status: 'generating' }
- [ ] T151 Create heading extraction logic in generate-long route:
  - Parse editedContent HTML for H1/H2/H3 tags
  - Extract titles and levels to build TOC structure
  - Preserve section IDs for continuity
- [ ] T152 Update src/lib/langgraph/nodes/generate-section.ts with detail level prompting:
  - **Standard Mode** (~1000-1500 words):
    - Prompt: "Expand the baseline section with detailed technical requirements. Target 1000-1500 words."
    - Include: shortRFTSectionContent, ragChunks
  - **Comprehensive Mode** (~2000+ words):
    - Prompt: "Provide thorough analysis and comprehensive technical specifications. Target 2000+ words."
    - Include: shortRFTSectionContent, ragChunks, extended context
  - Maintain themes and structure from Short RFT baseline
- [ ] T153 Update src/lib/rag/retrieval.ts for dual RAG sources:
  - Accept both projectDocumentSetIds and knowledgeLibraryIds
  - Query chunks from BOTH sources:
    - SELECT * FROM chunks WHERE document_set_id IN ({projectDocumentSetIds})
    - SELECT * FROM chunks WHERE document_set_id IN ({knowledgeLibraryIds})
  - Combine results, rank by relevance
  - Return top K chunks per section
- [ ] T154 Update src/lib/langgraph/nodes/generate-transmittal-section.ts:
  - For Long RFT: fetch transmittal from database (NOT from Short RFT)
  - Query transmittal_documents table for latest data
  - Generate markdown/HTML table independently
- [ ] T155 Add "Generate Long RFT" button to UnifiedReportEditor:
  - Only visible for Short RFT (reportChain === 'short')
  - Opens GenerateLongRFTModal on click
  - Shows loading state during generation
  - Redirects to new Long RFT when complete
- [ ] T156 [P] Add linked report display in UnifiedReportEditor:
  - Show "Parent Report" link if reportChain === 'long'
  - Show "Generated Long RFT" link if Short RFT has linked Long RFT
  - Navigate between related reports

### Subphase 11.8: Naming & Polish (Week 3)

- [ ] T157 Update report naming throughout application:
  - Change section labels to "Request For Tender"
  - Default report name: "RFT {Discipline Name}" (e.g., "RFT Architectural")
  - Update UI labels in ReportGenerator, ReportsSection
- [ ] T158 [P] Add loading states to UnifiedReportEditor:
  - Skeleton loader while loading report
  - Save indicator (Saving... / Saved / Failed)
  - Export progress indicator
  - Generation progress for Long RFT
- [ ] T159 [P] Add keyboard shortcuts to EditableContentArea:
  - Ctrl+S: Save
  - Ctrl+1: Apply H1
  - Ctrl+2: Apply H2
  - Ctrl+3: Apply H3
  - Escape: Exit editing mode
- [ ] T160 [P] Add error handling:
  - Failed saves with retry option
  - Export failures with clear messages
  - Long RFT generation failures with rollback
  - Network errors with offline indicator
- [ ] T161 Implement paste handling in EditableContentArea:
  - Intercept paste events
  - Sanitize HTML content
  - Re-apply heading color styles
  - Preserve formatting where appropriate

### Subphase 11.9: Migration & Backward Compatibility

- [X] T162 Add viewMode field to report_templates:
  - Type: 'sections' | 'unified'
  - Default: 'unified' for new reports
  - Existing reports use 'sections' until edited
  - **IMPLEMENTED**: Field added in rag-schema.ts lines 192-194
- [ ] T163 Create migration logic in ReportGenerator:
  - On first edit of old report → convert to unified mode
  - Combine sections into editedContent
  - Apply heading colors
  - Set viewMode = 'unified'
- [X] T164 Keep SectionViewer.tsx for backward compatibility:
  - Used when viewMode === 'sections'
  - No changes to existing component
  - Gradual migration path
  - **IMPLEMENTED**: SectionViewer.tsx preserved, UnifiedReportEditor added alongside

### Subphase 11.10: Testing & Validation

- [ ] T165 [P] Create tests/unit/components/UnifiedReportEditor.test.tsx:
  - Test section combining logic
  - Test heading color application
  - Test save functionality
  - Test keyboard shortcuts
- [ ] T166 [P] Create tests/unit/export/pdf-enhanced.test.ts:
  - Test PDF generation with colored headings
  - Test transmittal table rendering
  - Test print CSS application
- [ ] T167 [P] Create tests/unit/export/docx-enhanced.test.ts:
  - Test DOCX generation with colored headings
  - Test table formatting preservation
  - Test HTML to DOCX conversion
- [ ] T168 [P] Create tests/integration/short-to-long-rft.test.ts:
  - Test Short RFT creation
  - Test heading extraction
  - Test Long RFT generation with detail levels
  - Test dual RAG source retrieval
  - Test transmittal from database (not Short RFT)
- [ ] T169 [P] Create tests/integration/refresh-report.test.ts:
  - Test refresh with edited content
  - Test refresh with preserveEdits flag
  - Test conflict detection
- [ ] T170 Test print output:
  - Print Short RFT to PDF via browser
  - Verify heading colors visible and readable
  - Verify table formatting preserved
  - Verify WCAG AA contrast compliance

**Checkpoint**: Unified Report Editor works - verify editable text, color-coded headings, transmittal table, save/export, Short → Long RFT workflow

### Estimated Task Counts for Phase 11

| Subphase | Tasks | Completed | Remaining |
|----------|-------|-----------|-----------|
| 11.1: Database Schema | 3 | 3 ✅ | 0 |
| 11.2: Core Editor | 5 | 5 ✅ | 0 |
| 11.3: Transmittal Table | 3 | 3 ✅ | 0 |
| 11.4: Save & API | 2 | 2 ✅ | 0 |
| 11.5: Export | 6 | 6 ✅ | 0 |
| 11.6: Refresh | 4 | 4 ✅ | 0 |
| 11.7: Short → Long RFT | 8 | 0 | 8 |
| 11.8: Naming & Polish | 5 | 0 | 5 |
| 11.9: Migration | 3 | 2 | 1 |
| 11.10: Testing | 6 | 0 | 6 |
| **Total Phase 11** | **45** | **25** | **20** |

**Phase 11 Progress: 56% Complete** (25/45 tasks)

### Technical Stack for Phase 11

- **Editor**: Native contentEditable (no heavy libraries)
- **Export PDF**: jsPDF (already installed) + jspdf-autotable
- **Export DOCX**: docx.js (~250KB new dependency)
- **Color Scheme**: H1 #5B9BD5 (Blue), H2 #70AD47 (Green), H3 #ED7D31 (Amber)
- **Storage**: HTML strings with inline styles in PostgreSQL text column

---

## Phase 12: RFT Tabbed Interface Refactoring

**Purpose**: Refactor "Create Report" section within Procurement tab (Consultant/Contractor) to a new tabbed interface titled "RFT [Discipline/Trade Name]" with 3 tabs: Brief/Scope, TOC, RFT.

**Prerequisites**: Phase 11 (Unified Report Editor) for editor components

### Requirements Summary

1. **Title**: "RFT [Name]" (e.g., "RFT Fire Services")
2. **3 Tabs**:
   - Tab 1: "Brief" (consultants) / "Scope" (contractors) - dynamic
   - Tab 2: "TOC" - editable table of contents with linked indicators
   - Tab 3: "RFT" - generation and editing
3. **TOC Tab**:
   - Default 7 fixed sections with **linked icon** (🔗) showing data connection
   - Users can add/remove/reorder sections
   - Custom sections have NO linked icon
   - Auto-save on changes
4. **RFT Tab**:
   - "Short RFT" button = `data_only` mode
   - "Long RFT" button = `ai_assisted` mode with content length selector
   - Report editor + export within same tab
   - Only 1 RFT per discipline/trade
5. **Collapsible Interface**:
   - Collapsed by default (header + tabs only visible)
   - Click tab to expand, click active tab to collapse
   - Full-width tab underline border
   - Transmittal tiles in header row (far right)

### Subphase 12.1: Supporting Infrastructure

- [X] T200 Create src/lib/constants/default-toc-sections.ts:
  - Define DEFAULT_TOC_SECTION_IDS with 9 section constants
  - LinkedTocSection interface extending TocSection
  - getDefaultTocSections(contextType, hasTransmittal) function
  - isLinkedSection(sectionId) helper function
  - getLinkedSectionSource(sectionId) for tooltip display
- [X] T201 Create src/lib/hooks/use-auto-save.ts:
  - Debounced auto-save hook for TOC changes (1500ms default)
  - Returns: isSaving, hasUnsavedChanges, error, saveNow, cancel, lastSavedAt
  - Handles beforeunload warning for unsaved changes
- [X] T202 Add tableOfContents support to PATCH /api/reports/[id]:
  - Extended existing PATCH handler to accept tableOfContents field
  - Updates report's TOC in database

### Subphase 12.2: RFT Tab Components

- [X] T203 Create src/components/reports/rft/BriefScopeTab.tsx:
  - Displays Brief fields (Services, Fee, Program) for consultants
  - Displays Scope fields (Works, Price, Program) for contractors
  - Uses InlineEditField components with multiline support
  - Dynamic labels based on contextType prop
- [X] T204 Create src/components/reports/rft/TocEditorStandalone.tsx:
  - Based on existing TocEditor.tsx with @dnd-kit drag-drop
  - **Linked icon** (Link2) next to default 7 sections
  - Tooltip showing data source (e.g., "Planning Card › Details")
  - Add/remove/reorder sections with level toggle
  - Legend explaining linked icons
- [X] T205 Create src/components/reports/rft/TocTab.tsx:
  - Wrapper for TocEditorStandalone with auto-save integration
  - Initializes default 7 sections based on context type
  - Uses useAutoSave hook for debounced saving
- [X] T206 Create src/components/reports/rft/RFTTab.tsx:
  - "Short RFT" button → data_only mode generation
  - "Long RFT" button → ai_assisted mode with content length selector
  - Content length dropdown (Concise/Lengthy) for Long RFT
  - Progress indicator during generation
  - UnifiedReportEditor for viewing/editing generated report
  - Export buttons (PDF/DOCX)
- [X] T207 Create src/components/reports/rft/RFTTabInterface.tsx:
  - **Collapsible by default** - only header and tabs visible
  - Click tab to expand content, click same tab to collapse
  - Custom button-based tabs (not Radix UI Tabs) for toggle behavior
  - Full-width tab underline border
  - Save/Load Transmittal tiles in header row (far right)
  - Uses useTransmittal hook for transmittal operations
  - Dynamic first tab label: "Brief" for disciplines, "Scope" for trades
  - Title: "RFT {name}" styled header
- [X] T208 Create src/components/reports/rft/RFTSection.tsx:
  - Main container component replacing ReportsSection + Brief section
  - Manages tab state and report state
  - Fetches existing report for initial TOC
  - Props: projectId, disciplineId/tradeId, name, brief/scope data + handlers
- [X] T209 Create src/components/reports/rft/index.ts:
  - Barrel export for all RFT components

### Subphase 12.3: Integration

- [X] T210 Update src/components/consultants/ConsultantGallery.tsx:
  - Replace ReportsSection + inline Brief section with RFTSection
  - Remove handleBriefUpdate function (handled in RFTSection)
  - Import RFTSection from @/components/reports/rft
  - Pass briefData object and onBriefChange handler
- [X] T211 Update src/components/contractors/ContractorGallery.tsx:
  - Replace ReportsSection + inline Scope section with RFTSection
  - Remove handleScopeUpdate function (handled in RFTSection)
  - Import RFTSection from @/components/reports/rft
  - Pass scopeData object and onScopeChange handler
- [X] T212 Remove duplicate transmittal tiles from ProcurementCard:
  - Removed DisciplineRepoTiles import and usage
  - Removed generationModes state (no longer needed)
  - Pass selectedDocumentIds to galleries for RFTSection transmittal

### Default 7 TOC Sections (with linked indicators)

| # | Section | Linked To | Icon |
|---|---------|-----------|------|
| 1 | Project Details | `planning.details` | 🔗 |
| 2 | Project Objectives | `planning.objectives` | 🔗 |
| 3 | Project Staging | `planning.stages` | 🔗 |
| 4 | Project Risks | `planning.risks` | 🔗 |
| 5 | Consultant Brief / Contractor Scope | `discipline.brief` / `trade.scope` | 🔗 |
| 6 | Consultant Fee / Contractor Price | `discipline.feeStructure` / `trade.priceStructure` | 🔗 |
| 7 | Transmittal (conditional) | `transmittal` | 🔗 |

Custom user-added sections: **No icon** (helps differentiate)

### Estimated Task Counts for Phase 12

| Subphase | Tasks | Completed | Remaining |
|----------|-------|-----------|-----------|
| 12.1: Infrastructure | 3 | 3 ✅ | 0 |
| 12.2: Components | 7 | 7 ✅ | 0 |
| 12.3: Integration | 3 | 3 ✅ | 0 |
| **Total Phase 12** | **13** | **13** | **0** |

**Phase 12 Progress: 100% Complete** (13/13 tasks)

**Checkpoint**: RFT tabbed interface works - verify Brief/Scope tab edits, TOC tab with linked indicators and auto-save, RFT tab with Short/Long generation modes

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

### Database Architecture Notes

- **SQLite (local.db)**: Existing app data - projects, documents, planning, categories
- **Supabase PostgreSQL**: RAG data - chunks, embeddings, document sets, reports
- **Upstash Redis**: BullMQ job queue for document processing
- Planning context (T039a) queries SQLite via existing Drizzle client
- RAG operations (T006-T017) use Supabase PostgreSQL via rag-client.ts
- No migration of existing SQLite data required
