# RAG Integration Specification: assemble.ai Document Intelligence

**Branch**: `006-rag-document-intelligence` | **Status**: Draft | **Updated**: 2025-11-29 v4

## Overview

Integrate RAG into assemble.ai to generate tender requests, tender evaluations, and project reports. Uses a **hybrid context architecture** combining exact Planning Card data with user-selected document sets.

## Clarifications

### Session 2025-12-06

- Q: What observability/logging strategy is required for the RAG pipeline? → A: Structured logging with key events only (sync start/end, chunk counts, errors, latency)
- Q: What should happen when the Voyage embedding API fails during document sync? → A: Retry with exponential backoff (3 attempts), then mark document as failed with "Retry" action
- Q: How should report generation handle mid-stream failures? → A: Checkpoint state and allow resume from last completed section (LangGraph persistence)
- Q: What happens when generating AI-assisted report with empty document set? → A: Prompt user to switch to Data Only mode or sync at least 1 document to use AI Assisted mode
- Q: How should the system handle external API rate limits? → A: Per-service rate limiting with queue throttling (e.g., max 10 Voyage calls/sec, 5 Claude calls/sec)

### Session 2025-12-04

- Q: What is the relationship between disciplines and document groupings? → A: 1:1 for both transmittal and document set per discipline
- Q: Should transmittal documents be used for RAG retrieval? → A: No - transmittals contain ALL docs (including drawings, potentially 100+); only the curated document set (5-20 key docs) is used for RAG
- Q: What report generation modes are supported? → A: Two modes - "Data Only" (template-based, card data verbatim with light Brief polish) and "AI Assisted" (full AI generation with RAG context)
- Q: For Data Only mode, should any AI polish be applied? → A: Light grammar/formatting polish on Brief section only; all other sections are pure template rendering

### Session 2025-11-29

- Q: What access control model applies to RAG features? → A: All project members have full RAG access (read all synced docs, generate any report type)
- Q: What data volume/scale should the system support? → A: Medium scale (500-2,000 documents per project, 10-50 concurrent users)
- Q: How should document processing failures be handled? → A: Visible error state with error badge and manual "Retry" action
- Q: What report types are in scope for v1? → A: Tender request generation only; tender evaluations and project reports deferred. AI-assisted document categorization is out of scope.
- Q: How should concurrent report editing be handled? → A: Report-level lock; only one user can generate/edit at a time; others see "in progress"

## Scope

### In Scope (V1)
- Document sync to RAG (embedding pipeline)
- Tender request generation with TOC approval and section-by-section streaming
- Smart Context panel for source visibility
- Report memory system for TOC reuse

### Out of Scope (V1)
- Tender evaluation generation (deferred)
- Project report generation (deferred)
- AI-assisted document categorization (not planned)

## Core Architecture

### Hybrid Context Model

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│     EXACT CONTEXT (Always)      │  │   RETRIEVED CONTEXT (Selected)  │
├─────────────────────────────────┤  ├─────────────────────────────────┤
│ • Project Details               │  │ • Auto-synced from Categories   │
│ • Objectives                    │  │ • Hierarchical chunk retrieval  │
│ • Stages, Risks, Stakeholders   │  │ • Re-ranked for relevance       │
│ • Active Disciplines/Trades     │  │ • User-removable via Smart Panel│
└─────────────────────────────────┘  └─────────────────────────────────┘
                 │                                    │
                 └──────────────┬─────────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │   LangGraph Agent     │
                    │   (Claude + Memory)   │
                    └───────────────────────┘
```

### Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Vector DB | PostgreSQL + pgvector (HNSW + ivfflat) | Existing infra, HNSW for speed, ivfflat fallback for cold start |
| Embeddings | **Voyage `voyage-large-2-instruct`** | Superior on technical docs, same price as OpenAI |
| Reranker | **BAAI/bge-reranker-v2-m3** (Cohere fallback) | Best open-source, Cohere for reliability fallback |
| Parsing | **LlamaParse + Unstructured.io fallback** | LlamaParse primary, Unstructured handles edge cases |
| Chunking | LlamaIndex SemanticSplitter | Construction-aware, preserves clauses |
| Orchestration | **LangGraph** | Agentic control, human-in-loop, streaming |
| Queue | **BullMQ + Redis** | Proper background processing, retries, monitoring |
| LLM | Claude (Anthropic) | Already integrated, long context |

### Report Generation Modes

Users select a generation mode at report start. Mode affects all sections.

| Mode | Description | AI Usage | RAG | Use Case |
|------|-------------|----------|-----|----------|
| **Data Only** | Template-based, card data verbatim | Grammar polish on Brief section only | ❌ | Quick drafts, pre-written brief content |
| **AI Assisted** | Full AI generation | Full section generation with streaming | ✅ Discipline's document set | Comprehensive tender requests |

#### Data Only Mode - Field Mapping

| Report Section | Source Fields | AI Role |
|----------------|---------------|---------|
| Project Details | `details.*` (projectName, address, buildingClass, numberOfStories, jurisdiction, zoning, lotArea) | None - template only |
| Project Objectives | `objectives.*` (functional, quality, budget, program) | None - template only |
| Project Stages | `stages[]` (stageName, startDate, endDate, duration, status) | None - template only |
| Brief | `discipline.briefServices`, `discipline.briefProgram` | **Light polish** (grammar/formatting only) |
| Fee Structure | `discipline.briefFee` + `disciplineFeeItems[]` | None - template only |
| Appendix A - Transmittal | `transmittal.documents[]` (name, version, category) | None - table render |

#### AI Assisted Mode

Uses same Planning Card data as context, but generates professional prose for each section. RAG retrieval pulls from the discipline's curated Document Set (NOT the transmittal).

**Validation**: If the discipline's document set is empty (no synced documents), show modal:
> "AI Assisted mode requires synced documents. You can:
> - **Switch to Data Only** - Generate using Planning Card data only
> - **Sync Documents** - Select documents and click 'Sync to AI' first"

### Fixed 7-Section TOC Structure (T099a)

**CRITICAL**: Both modes (Short RFT and Long RFT) use the **same fixed 7-section TOC structure**.

#### Hardcoded 7-Section TOC

| # | Section Title | Description |
|---|--------------|-------------|
| 1 | **Project Details** | Project identification, location, building class, zoning |
| 2 | **Project Objectives** | Functional, quality, budget, program objectives |
| 3 | **Project Staging** | Timeline, stages, program requirements |
| 4 | **Project Risks** | Risk assessment and mitigation strategies |
| 5 | **Consultant Brief** OR **Contractor Scope** | Services required (consultant) or scope of works (contractor) |
| 6 | **Consultant Fee** OR **Contractor Price** | Fee schedule (consultant) or price schedule (contractor) |
| 7 | **Transmittal** (if exists) | Document schedule table (only if transmittal has documents) |

#### Short RFT (Data Only Mode) - `generationMode: 'data_only'`

| Section | Source | RAG Used? | AI Used? |
|---------|--------|-----------|----------|
| Project Details | `planningContext.details` | ❌ NO | ❌ NO |
| Project Objectives | `planningContext.objectives` | ❌ NO | ❌ NO |
| Project Staging | `planningContext.stages` | ❌ NO | ❌ NO |
| Project Risks | `planningContext.risks` | ❌ NO | ❌ NO |
| Consultant Brief | `discipline.briefServices` | ❌ NO | ⚠️ Light polish only |
| Consultant Fee | `discipline.feeItems` | ❌ NO | ❌ NO |
| Transmittal | `transmittal.documents[]` | ❌ NO | ❌ NO |

**Short RFT key behaviors:**
- NO RAG retrieval (`retrieveContextNode` is skipped)
- NO AI generation for most sections (template-based rendering)
- Brief section gets light grammar polish only (no content expansion)
- All headings use same H1 styling (no H2/H3 hierarchy)

#### Long RFT (AI Assisted Mode) - `generationMode: 'ai_assisted'`

| Section | Source | RAG Used? | AI Used? |
|---------|--------|-----------|----------|
| Project Details | Planning + RAG context | ✅ YES | ✅ YES |
| Project Objectives | Planning + RAG context | ✅ YES | ✅ YES |
| Project Staging | Planning + RAG context | ✅ YES | ✅ YES |
| Project Risks | Planning + RAG context | ✅ YES | ✅ YES |
| Consultant Brief | Planning + RAG context | ✅ YES | ✅ YES |
| Consultant Fee | Planning + RAG context | ✅ YES | ✅ YES |
| Transmittal | `transmittal.documents[]` | ❌ NO | ❌ NO |

**Long RFT key behaviors:**
- RAG retrieval from discipline's Document Set
- AI generates professional prose for each section
- Planning Card data used as primary context
- RAG chunks provide additional technical context
- **Transmittal section ALWAYS uses data-only table** (no RAG/AI)

**Key Implementation Points:**
- The memory system (T074-T075) is for **content pattern learning**, NOT for TOC structure
- TOC structure is ALWAYS the fixed 7-section structure from `getFixedTocSections()`
- `generationMode` must be passed through `startReportGeneration()` correctly
- Section 7 (Transmittal) only appears if `transmittal.documents.length > 0`

---

## Data Model

### New Tables

```sql
-- Document Chunks (with hierarchy support)
CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  parent_chunk_id TEXT REFERENCES document_chunks(id),
  hierarchy_level INTEGER NOT NULL,
  hierarchy_path TEXT,
  section_title TEXT,
  clause_number TEXT,
  content TEXT NOT NULL,
  embedding VECTOR(1024),  -- voyage-large-2-instruct dimensions
  token_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Primary: HNSW for fast queries (build after initial data load)
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
-- Fallback: ivfflat for cold start (faster to build, slower to query)
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Report Templates (TOC + generated content)
CREATE TABLE report_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  document_set_ids TEXT[],
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  table_of_contents JSONB NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Report Memory (cross-project learning)
CREATE TABLE report_memory (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  discipline TEXT,
  approved_toc JSONB NOT NULL,
  section_templates JSONB,
  times_used INTEGER DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, report_type, discipline)
);
```

### Background Processing (BullMQ + Redis)

```typescript
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Worker processes documents in background
const worker = new Worker('document-processing', async (job) => {
  const { documentId, documentSetId } = job.data;

  // 1. Parse document (LlamaParse → Unstructured fallback)
  const content = await parseDocument(documentId);

  // 2. Chunk with semantic splitter
  const chunks = await chunkDocument(content);

  // 3. Embed with Voyage (retry handled by BullMQ)
  const embeddings = await embedChunks(chunks);

  // 4. Store in pgvector
  await storeChunks(documentId, chunks, embeddings);

  return { chunksCreated: chunks.length };
}, {
  connection: redis,
  concurrency: 3,
  // Retry with exponential backoff: 3 attempts (1s, 2s, 4s delays)
  settings: {
    backoffStrategy: (attemptsMade) => Math.pow(2, attemptsMade - 1) * 1000,
  },
});

// Queue configuration with retry policy
export const documentQueue = new Queue('document-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,  // Keep failed jobs for "Retry" action
  },
});
```

### Rate Limiting

Per-service rate limiting to prevent API throttling:

| Service | Rate Limit | Rationale |
|---------|------------|-----------|
| Voyage (embeddings) | 10 calls/sec | Batch embedding calls, stay under tier limits |
| Claude (generation) | 5 calls/sec | Conservative for concurrent report generation |
| LlamaParse | 3 calls/sec | Document parsing is heavy, avoid queue buildup |
| Cohere (rerank fallback) | 10 calls/sec | Only used on BAAI failure |

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiters = {
  voyage: new RateLimiterRedis({ storeClient: redis, points: 10, duration: 1, keyPrefix: 'rl:voyage' }),
  claude: new RateLimiterRedis({ storeClient: redis, points: 5, duration: 1, keyPrefix: 'rl:claude' }),
  llamaparse: new RateLimiterRedis({ storeClient: redis, points: 3, duration: 1, keyPrefix: 'rl:llamaparse' }),
};

async function withRateLimit<T>(service: keyof typeof rateLimiters, fn: () => Promise<T>): Promise<T> {
  await rateLimiters[service].consume(1);
  return fn();
}
```

---

## Document Groupings Model

Documents belong to three **orthogonal** groupings. A document can belong to any combination:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DOCUMENT GROUPINGS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │  CATEGORY   │    │ TRANSMITTAL │    │ SYNCED/RAG  │                 │
│  │ (Filing)    │    │ (Delivery)  │    │ (AI Knowledge)│               │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤                 │
│  │ One per doc │    │ Many per doc│    │ Many per doc│                 │
│  │ Organization│    │ Tender pkg  │    │ Document set│                 │
│  │ Color tiles │    │ Email/zip   │    │ Embeddings  │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│         │                  │                  │                         │
│         └──────────────────┼──────────────────┘                         │
│                            ▼                                            │
│                    ┌─────────────┐                                      │
│                    │  DOCUMENT   │                                      │
│                    └─────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

| Grouping | Purpose | Relationship | Typical Scale | UI Action |
|----------|---------|--------------|---------------|-----------|
| **Category** | Filing/organization | One category per document | N/A | Drag to tile, or select + click tile |
| **Transmittal** | Tender package delivery | **1:1 per discipline** | 50-200 docs (ALL documents including drawings) | "Save Selection As Transmittal" / "Load Transmittal" |
| **Document Set (RAG)** | AI knowledge base | **1:1 per discipline** | 5-20 docs (CURATED key documents only) | Select + "Sync to AI" |

> **⚠️ CRITICAL DISTINCTION**: Transmittals contain ALL documents being sent (specs, drawings, schedules - potentially 100+). These are NOT used for RAG retrieval as they would overwhelm context and burn tokens. Only the curated Document Set (typically 5-20 key documents) is indexed for RAG retrieval.

### Typical User Workflow

```
1. UPLOAD & CATEGORIZE
   User drags files → Category tile (e.g., "Fire Services")
   Result: Files organized, colored by category

2. CREATE/UPDATE TRANSMITTAL
   User selects relevant files → "Save Selection As Transmittal"
   Result: Files saved as "{Discipline} Transmittal" (e.g., "Fire Services Transmittal")
   Note: One transmittal per discipline - saves replace existing

2a. LOAD EXISTING TRANSMITTAL (optional)
   User clicks "Load Transmittal" → Previous selection loaded (checkboxes checked)
   User adds/removes files → "Save Selection As Transmittal" to update

3. SYNC TO RAG (refined selection)
   User reviews selection → removes less relevant files → "Sync to AI"
   Result: Curated subset queued for embedding
```

### Data Model

```sql
-- Categories (existing - one per document)
-- documents.category_id already exists

-- Transmittals (tender packages for delivery - one per discipline)
CREATE TABLE transmittals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  discipline_id TEXT NOT NULL,  -- Links to discipline (subcategory)
  name TEXT NOT NULL,           -- Auto-generated: "{Discipline} Transmittal"
  description TEXT,
  tender_package_id TEXT REFERENCES tender_packages(id),
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'acknowledged'
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, discipline_id)  -- One transmittal per discipline per project
);

CREATE TABLE transmittal_documents (
  id TEXT PRIMARY KEY,
  transmittal_id TEXT REFERENCES transmittals(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(transmittal_id, document_id)
);

-- Synced Documents (RAG knowledge base)
CREATE TABLE document_sets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  discipline TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE document_set_members (
  id TEXT PRIMARY KEY,
  document_set_id TEXT REFERENCES document_sets(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'synced', 'failed'
  synced_at TIMESTAMP,
  UNIQUE(document_set_id, document_id)
);
```

### UI Integration

```typescript
// Document selection actions (toolbar appears when docs selected)
interface DocumentSelectionActions {
  // Existing
  categorize: (categoryId: string) => void;      // Click category tile
  addToTransmittal: (transmittalId: string) => void;
  
  // New for RAG
  syncToAI: (documentSetId?: string) => void;    // "Sync to AI" button
}

// "Sync to AI" flow
async function syncToAI(documentIds: string[], documentSetId?: string) {
  // If no set specified, show picker or create new
  if (!documentSetId) {
    documentSetId = await showDocumentSetPicker({
      options: await getProjectDocumentSets(),
      allowCreate: true,
    });
  }
  
  // Add documents to set
  await db.insert(documentSetMembers).values(
    documentIds.map(docId => ({
      id: generateId(),
      documentSetId,
      documentId: docId,
      syncStatus: 'pending',
    }))
  );
  
  // Queue for background processing
  await documentQueue.addBulk(
    documentIds.map(docId => ({
      name: 'process-document',
      data: { documentId: docId, documentSetId },
    }))
  );
}
```

### Document Status Indicators

```
┌──────────────────────────────────────────────────────────────┐
│ 📄 Fire Detection Spec Rev 2.pdf                             │
│ ┌──────────┐ ┌──────────────────┐ ┌────────────────┐        │
│ │🔴 Fire   │ │📦 Tender Pkg #3  │ │🤖 Synced ✓     │        │
│ │Services  │ │📦 Tender Pkg #7  │ │   Processing...│        │
│ └──────────┘ └──────────────────┘ └────────────────┘        │
└──────────────────────────────────────────────────────────────┘

Legend:
- Category: Colored dot/tag (one)
- Transmittals: Package icons (zero or more)
- Synced: Robot icon with status (zero or more sets)
- Failed: Error badge with "Retry" action (user can click to reprocess)
```

### Report Generation Context

When generating tender request reports, the system uses:

1. **Transmittal** → Document schedule (list of documents to be issued)
2. **Synced/RAG** → Content generation (AI reads synced documents)

```typescript
async function generateTenderRequest(transmittalId: string, documentSetId: string) {
  // Get transmittal documents for schedule
  const transmittalDocs = await db.query.transmittalDocuments.findMany({
    where: eq(transmittalDocuments.transmittalId, transmittalId),
    with: { document: true },
  });
  
  // Get RAG context from synced document set
  const ragContext = await retrieveContext(query, [documentSetId]);
  
  // Generate report with both
  return generateReport({
    projectContext,
    documentSchedule: transmittalDocs,  // From transmittal
    ragContext,                          // From synced set
  });
}
```

---

## Report Memory System

Learn from approved reports to pre-fill future TOCs and section patterns.

### Memory Capture (on report approval)

```typescript
async function captureReportMemory(report: ReportTemplate) {
  const existing = await db.query.reportMemory.findFirst({
    where: and(
      eq(reportMemory.organizationId, report.organizationId),
      eq(reportMemory.reportType, report.reportType),
      eq(reportMemory.discipline, report.discipline)
    )
  });

  if (existing) {
    // Merge TOC structures, keep most common patterns
    const mergedToc = mergeTocPatterns(existing.approvedToc, report.tableOfContents);
    await db.update(reportMemory)
      .set({ 
        approvedToc: mergedToc,
        timesUsed: existing.timesUsed + 1,
        lastUsedAt: new Date()
      })
      .where(eq(reportMemory.id, existing.id));
  } else {
    await db.insert(reportMemory).values({
      id: generateId(),
      organizationId: report.organizationId,
      reportType: report.reportType,
      discipline: report.discipline,
      approvedToc: report.tableOfContents,
      timesUsed: 1,
    });
  }
}
```

### Memory Recall (on new report)

```typescript
async function generateTocWithMemory(
  projectContext: ProjectContext,
  reportType: string,
  discipline?: string
): Promise<TableOfContents> {
  // Check for existing memory
  const memory = await db.query.reportMemory.findFirst({
    where: and(
      eq(reportMemory.organizationId, projectContext.organizationId),
      eq(reportMemory.reportType, reportType),
      eq(reportMemory.discipline, discipline)
    )
  });

  if (memory) {
    // Pre-fill with last approved structure
    return {
      sections: memory.approvedToc.sections,
      source: 'memory',
      timesUsed: memory.timesUsed,
    };
  }

  // Fall back to AI generation
  return await generateTocFromScratch(projectContext, reportType);
}
```

---

## LangGraph Orchestration

Replace LlamaIndex workflows with LangGraph for true agentic control.

### Graph Definition

```typescript
import { StateGraph, Annotation, interrupt } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

// State schema
const ReportState = Annotation.Root({
  projectContext: Annotation<ProjectContext>,
  planningContext: Annotation<PlanningContext>,  // Exact Planning Card data
  transmittal: Annotation<TransmittalContext | null>,  // Optional transmittal for discipline
  reportType: Annotation<string>,
  documentSetIds: Annotation<string[]>,
  toc: Annotation<TableOfContents>,
  currentSectionIndex: Annotation<number>,
  sections: Annotation<GeneratedSection[]>,
  activeSourceIds: Annotation<string[]>,    // For Smart Context panel
  userFeedback: Annotation<string | null>,
});

// Transmittal context (loaded at start if exists for discipline)
interface TransmittalContext {
  id: string;
  name: string;
  documents: Array<{
    id: string;
    name: string;      // Doc Name column
    version: string;   // Version column
    category: string;  // Category column
  }>;
}

// Graph nodes
const graph = new StateGraph(ReportState)
  .addNode("fetch_planning_context", fetchPlanningContextNode)  // Loads exact Planning Card + transmittal data
  .addNode("generate_toc", generateTocNode)
  .addNode("await_toc_approval", awaitTocApprovalNode)
  .addNode("retrieve_context", retrieveContextNode)
  .addNode("generate_section", generateSectionNode)
  .addNode("await_section_feedback", awaitSectionFeedbackNode)
  .addNode("finalize", finalizeNode)
  .addNode("generate_transmittal_section", generateTransmittalSectionNode)  // NEW: Renders transmittal table

  .addEdge("__start__", "fetch_planning_context")
  .addEdge("fetch_planning_context", "generate_toc")
  .addEdge("generate_toc", "await_toc_approval")
  .addConditionalEdges("await_toc_approval", routeAfterTocApproval)
  .addEdge("retrieve_context", "generate_section")
  .addEdge("generate_section", "await_section_feedback")
  .addConditionalEdges("await_section_feedback", routeAfterSectionFeedback)
  .addConditionalEdges("finalize", routeAfterFinalize)  // NEW: Routes to transmittal if exists
  .addEdge("generate_transmittal_section", "__end__");

// Checkpointer for state persistence and resume capability
const checkpointer = new PostgresSaver({ connectionString: process.env.DATABASE_URL });

// Compile graph with checkpointing enabled
const compiledGraph = graph.compile({ checkpointer });

// Resume from checkpoint after failure
async function resumeReport(threadId: string) {
  const state = await compiledGraph.getState({ configurable: { thread_id: threadId } });
  if (state.next.length > 0) {
    // Resume from last checkpoint
    return compiledGraph.stream(null, { configurable: { thread_id: threadId } });
  }
  throw new Error('Report already completed or not found');
}

// NEW: Conditional routing after finalize
function routeAfterFinalize(state: ReportState) {
  if (state.transmittal) {
    return "generate_transmittal_section";  // Transmittal exists → render appendix
  }
  return "__end__";  // No transmittal → end report
}
```

### Human-in-the-Loop Nodes

```typescript
async function awaitTocApprovalNode(state: ReportState) {
  // Interrupt and wait for user to edit/approve TOC
  const userEdit = interrupt({
    type: "toc_approval",
    toc: state.toc,
    message: "Review and edit the table of contents",
  });

  return { toc: userEdit.approvedToc };
}

async function awaitSectionFeedbackNode(state: ReportState) {
  const currentSection = state.sections[state.currentSectionIndex];
  
  // Interrupt with Smart Context panel data
  const feedback = interrupt({
    type: "section_feedback",
    section: currentSection,
    sources: state.activeSourceIds.map(id => ({
      id,
      relevance: currentSection.sourceRelevance[id],
      title: getSourceTitle(id),
    })),
    message: "Review section. Remove sources or request changes.",
  });

  if (feedback.action === "regenerate") {
    // User removed sources or requested changes
    return {
      activeSourceIds: feedback.remainingSources,
      userFeedback: feedback.instructions,
      // Loop back to retrieve_context
    };
  }

  return {
    currentSectionIndex: state.currentSectionIndex + 1,
    userFeedback: null,
  };
}
```

### Streaming Generation

```typescript
async function generateSectionNode(state: ReportState) {
  const section = state.toc.sections[state.currentSectionIndex];
  
  // Stream tokens to UI
  const stream = await claude.messages.stream({
    model: "claude-sonnet-4-20250514",
    messages: buildSectionPrompt(state, section),
    max_tokens: 2000,
  });

  let content = "";
  for await (const chunk of stream) {
    content += chunk.delta?.text || "";
    // Emit to frontend via WebSocket
    emitProgress(state.reportId, { sectionIndex: state.currentSectionIndex, content });
  }

  return {
    sections: [
      ...state.sections,
      { title: section.title, content, sourceRelevance: state.activeSourceRelevance }
    ],
  };
}
```

### Transmittal Appendix Generation (Conditional)

If a transmittal exists for the discipline, render it as "Appendix A - Transmittal" at the end of the report. This is a data-driven node (no AI generation).

```typescript
async function generateTransmittalSectionNode(state: ReportState) {
  // Only called if state.transmittal exists (conditional edge)
  const { transmittal } = state;

  // Build markdown table
  const tableRows = transmittal.documents.map(doc =>
    `| ${doc.name} | ${doc.version} | ${doc.category} |`
  );

  const content = `
## Appendix A - Transmittal

The following documents are included in this tender package:

| Doc Name | Version | Category |
|----------|---------|----------|
${tableRows.join('\n')}

*Total: ${transmittal.documents.length} documents*
`.trim();

  return {
    sections: [
      ...state.sections,
      {
        title: "Appendix A - Transmittal",
        content,
        sourceRelevance: {},  // No AI sources - purely data-driven
        isAppendix: true,
      }
    ],
  };
}
```

### Transmittal Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TRANSMITTAL MANAGEMENT & RFT REPORT                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   TRANSMITTAL BUTTONS (ConsultantCard header, next to SyncToAI):         │
│   [Sync to AI (3)]  [Save Selection As Transmittal]  [Load Transmittal]  │
│                                                                          │
│   CREATING/UPDATING TRANSMITTAL:                                         │
│   1. User selects documents in Right Panel (DocumentRepository)          │
│   2. User clicks "Save Selection As Transmittal"                         │
│   3. Auto-saved as "{Discipline} Transmittal" (e.g., "Fire Services")    │
│   4. Toast: "Saved Fire Services Transmittal (5 documents)"              │
│                                                                          │
│   LOADING EXISTING TRANSMITTAL:                                          │
│   1. User clicks "Load Transmittal" (shows doc count if exists)          │
│   2. Previous selection loaded → checkboxes checked in DocumentRepository│
│   3. User can add/remove documents, then re-save                         │
│                                                                          │
│   ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│   RFT REPORT GENERATION:                                                 │
│   1. User starts RFT report generation                                   │
│   2. fetch_planning_context loads transmittal data                       │
│   3. generate_toc checks transmittal → adds "Appendix A - Transmittal"   │
│   4. Regular sections generated via AI...                                │
│   5. finalize → conditional: transmittal exists?                         │
│         ├── YES: generate_transmittal_section → renders table            │
│         └── NO: __end__                                                  │
│   6. Report complete with transmittal appendix:                          │
│      ┌──────────────────────────────────────────────────────────┐       │
│      │ ## Appendix A - Transmittal                               │       │
│      │                                                            │       │
│      │ | Doc Name              | Version | Category             | │       │
│      │ |-----------------------|---------|----------------------| │       │
│      │ | A2.01-Floor-Plan.pdf  | Rev03   | Architectural Plans  | │       │
│      │ | S1.01-Foundation.pdf  | Rev02   | Structural           | │       │
│      │ | E1.01-Electrical.pdf  | Rev01   | Electrical           | │       │
│      │                                                            │       │
│      │ *Total: 12 documents*                                      │       │
│      └──────────────────────────────────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Smart Context Panel

Show users which sources are being used during generation, with ability to remove.

### Data Structure

```typescript
interface SmartContextSource {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sectionTitle?: string;
  relevanceScore: number;      // 0-100
  excerpt: string;             // First 100 chars
  isActive: boolean;           // User can toggle off
}

interface SmartContextPanel {
  sectionTitle: string;
  sources: SmartContextSource[];
  status: 'retrieving' | 'generating' | 'complete';
}
```

### UI Component

```
┌─────────────────────────────────────────────────┐
│ 📄 Sources: "Fire Detection Systems"            │
│ ─────────────────────────────────────────────── │
│ ✓ [95%] Fire Spec Rev 2.pdf                     │
│         Section 3.2 - Detection Equipment       │
│                                                 │
│ ✓ [87%] AS1851-2012.pdf                         │
│         Clause 7.4 - Maintenance Requirements   │
│                                                 │
│ ✓ [72%] Project Brief v1.3                      │
│         Fire Strategy Overview                  │
│                                                 │
│ ☐ [41%] Meeting Notes Oct 12        [Remove]    │
│         Discussion of sprinkler options         │
└─────────────────────────────────────────────────┘
```

### Behavior

1. Panel appears when section generation starts
2. Shows sources in real-time as they're retrieved and ranked
3. User unchecks source → excluded from prompt → regenerate section
4. Builds trust by showing exactly what AI is reading

---

## Retrieval Pipeline

### Four-Stage Pipeline

```
Query → [1. Broad Retrieval] → [2. Rerank] → [3. Hierarchy Enrichment] → [4. Context Assembly]
              pgvector             Cohere          Parent chunks              Prompt builder
              top-20               top-5           + siblings
```

### Implementation

```typescript
async function retrieveContext(
  query: string,
  documentSetIds: string[],
  excludedChunkIds: string[] = []
): Promise<RetrievalResult> {
  // Embed with Voyage
  const queryEmbedding = await voyage.embed({
    model: 'voyage-large-2-instruct',
    input: query,
  });

  // Stage 1: Broad retrieval (pgvector, top-20)
  const candidates = await db.execute(sql`
    SELECT dc.*, 1 - (dc.embedding <=> ${queryEmbedding}::vector) as similarity
    FROM document_chunks dc
    JOIN document_set_members dsm ON dc.document_id = dsm.document_id
    WHERE dsm.document_set_id = ANY(${documentSetIds})
      AND dc.id != ALL(${excludedChunkIds})
    ORDER BY dc.embedding <=> ${queryEmbedding}::vector
    LIMIT 20
  `);

  // Stage 2: Rerank with BAAI (Cohere fallback)
  let reranked;
  try {
    reranked = await rerank({
      model: 'BAAI/bge-reranker-v2-m3',
      query,
      documents: candidates.map(c => c.content),
      topN: 5,
    });
  } catch (error) {
    // Fallback to Cohere for reliability
    reranked = await cohere.rerank({
      model: 'rerank-english-v3.0',
      query,
      documents: candidates.map(c => c.content),
      topN: 5,
    });
  }

  // Stage 3: Fetch parent context for hierarchy
  const enriched = await enrichWithParentChunks(reranked);

  // Stage 4: Assemble with relevance scores for Smart Context panel
  return {
    chunks: enriched,
    sources: enriched.map(c => ({
      chunkId: c.id,
      documentId: c.documentId,
      relevanceScore: Math.round(c.rerankedScore * 100),
      excerpt: c.content.slice(0, 100),
    })),
  };
}
```

---

## Document Parsing & Chunking

### Parsing Pipeline (LlamaParse + Unstructured fallback)

```typescript
import { LlamaParseReader } from "llamaindex";
import { UnstructuredClient } from "unstructured-client";

async function parseDocument(documentId: string): Promise<string> {
  const file = await getDocumentFile(documentId);
  
  try {
    // Primary: LlamaParse (best for complex PDFs)
    const reader = new LlamaParseReader({ resultType: "markdown" });
    const documents = await reader.loadData(file.path);
    return documents.map(d => d.text).join('\n\n');
  } catch (error) {
    // Fallback: Unstructured.io (handles edge cases)
    const client = new UnstructuredClient({ apiKey: process.env.UNSTRUCTURED_API_KEY });
    const result = await client.partition({ file });
    return result.elements.map(e => e.text).join('\n\n');
  }
}
```

### Construction-Aware Chunking

| Document Type | Chunk Size | Strategy |
|---------------|------------|----------|
| Specifications | 1000-1500 tokens | Clause-aware, preserve hierarchy |
| Drawings schedules | 500-800 tokens | Row-based |
| Correspondence | Full document | No chunking |
| Reports | 800-1200 tokens | Section-aware |

```typescript
import { SemanticSplitterNodeParser } from "llamaindex";

function chunkConstructionDocument(text: string, docType: string): Chunk[] {
  // Split by structural markers first
  const sections = splitByStructure(text, [
    /^\d+\.\d+(\.\d+)?\s+/gm,
    /^(SECTION|PART|ARTICLE)\s+/gim,
  ]);

  // Apply semantic chunking within large sections
  const splitter = new SemanticSplitterNodeParser({
    breakpointThreshold: 0.75,
    bufferSize: 1,
  });

  return sections.flatMap(section =>
    section.tokenCount <= 1500
      ? [section]
      : splitter.getNodesFromDocuments([section])
  );
}
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/document-sets` | GET/POST | List/create document sets |
| `/api/document-sets/[id]/members` | POST/DELETE | Add/remove documents |
| `/api/document-sets/sync-settings` | PATCH | Toggle auto-sync |
| `/api/reports/generate` | POST | Start LangGraph workflow |
| `/api/reports/[id]/approve-toc` | POST | Resume after TOC edit |
| `/api/reports/[id]/section-feedback` | POST | Resume after section review |
| `/api/reports/[id]/export` | POST | Export to DOCX/PDF |

---

## Implementation Phases

### Phase 1 (Week 1-2): Foundation
- [ ] Add pgvector extension, create tables (HNSW + ivfflat indexes)
- [ ] **Set up Redis + BullMQ for background processing**
- [ ] Implement parsing pipeline (LlamaParse + Unstructured fallback)
- [ ] Implement construction-aware chunking
- [ ] **Integrate Voyage embeddings**
- [ ] **"Sync to AI" action in document selection toolbar**
- [ ] Document set management UI

### Phase 2 (Week 3-4): Generation
- [ ] Build retrieval pipeline with **BAAI reranking** (Cohere fallback)
- [ ] **LangGraph orchestration with human-in-loop**
- [ ] TOC generation with **memory pre-fill**
- [ ] Section-by-section streaming generation
- [ ] **Smart Context panel** (source visibility + removal)
- [ ] Citation validation
- [ ] **Transmittal integration in RFT reports**:
  - "Save Selection As Transmittal" button next to SyncToAI (auto-names as "{Discipline} Transmittal")
  - "Load Transmittal" button to retrieve/edit existing transmittal selection
  - One transmittal per discipline (upsert behavior)
  - generate_toc includes "Appendix A - Transmittal" if transmittal exists
  - generate_transmittal_section renders document table (Doc Name | Version | Category)
  - Conditional rendering: only if discipline has saved transmittal

### Phase 3 (Week 5): Polish
- [ ] DOCX/PDF export
- [ ] **Memory capture on report approval**
- [ ] Progress indicators and error handling
- [ ] Sync status indicators on document rows

---

## Observability

Structured logging with key events only (minimal overhead, sufficient for debugging):

| Event | Logged Data |
|-------|-------------|
| Sync start | documentId, documentSetId, timestamp |
| Sync complete | documentId, chunkCount, duration, status |
| Sync error | documentId, errorType, errorMessage, retryCount |
| Retrieval | query (truncated), documentSetIds, candidateCount, rerankDuration |
| Generation start | reportId, sectionIndex, sectionTitle |
| Generation complete | reportId, sectionIndex, tokenCount, duration |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Retrieval relevance | >85% (with reranking) |
| Document processing | <30s per document |
| Section generation | <15s per section |
| Citation accuracy | >95% valid references |
| TOC reuse rate | >60% sections from memory |
| User trust | Positive feedback on Smart Context panel |
| Scale target | 500-2,000 documents/project, 10-50 concurrent users |

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **Document Groupings** | Category / Transmittal / Synced (orthogonal) | Each serves different purpose, user curates each |
| Vector Index | **HNSW + ivfflat fallback** | HNSW for speed, ivfflat for cold start |
| Embeddings | **Voyage large-2-instruct** | Superior on technical/construction docs |
| Reranker | **BAAI/bge-reranker-v2-m3** | Best open-source, Cohere fallback for reliability |
| Parsing | **LlamaParse + Unstructured** | Primary + fallback for edge cases |
| Orchestration | **LangGraph** | True agentic control, human-in-loop nodes |
| Queue | **BullMQ + Redis** | Proper background processing, retries |
| Learning | **Report memory system** | Firms reuse 80% of structure |
| Trust | **Smart Context panel** | Users see and control sources |
| Access Control | **Project-level (all members)** | All project members have full RAG access; no per-document-set permissions |
| Concurrency | **Report-level locking** | One user generates/edits at a time; others see "in progress" status |
| **Transmittal in Reports** | **Appendix A (conditional)** | Transmittal rendered as data table at end of RFT; only if discipline has saved transmittal; columns: Doc Name, Version, Category |