# Implementation Plan: RAG Document Intelligence

**Branch**: `007-rag-document-intelligence` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-RAG Integration Specification/spec.md`

## Summary

Integrate a hybrid RAG system into assemble.ai that combines exact Planning Card data with user-selected document sets to generate tender requests. Uses LangGraph for agentic orchestration with human-in-the-loop TOC approval and section-by-section streaming generation. Includes Smart Context panel for source visibility and report memory system for cross-project TOC reuse.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**:
- Next.js 16 (App Router + Turbopack)
- LangGraph (orchestration)
- LlamaIndex (chunking)
- BullMQ (queue) + Upstash Redis
- Drizzle ORM
- pdf-parse v2.4.5 (TypeScript, ESM-compatible PDF parsing)
- Voyage AI voyage-large-2-instruct (embeddings, 1024 dimensions)

**Storage**:
- SQLite with libsql (existing local.db) for document metadata
- Supabase PostgreSQL + pgvector (document_chunks with 1024-dim embeddings)
- Upstash Redis (BullMQ queue for async document processing)

**Testing**: Jest + React Testing Library
**Target Platform**: Web (Next.js), deployed to Vercel/Railway
**Project Type**: Web application (monorepo)
**Performance Goals**:
- Document processing: <30s per document
- Section generation: <15s per section
- Retrieval relevance: >85%

**Constraints**:
- 500-2,000 documents per project
- 10-50 concurrent users
- Report-level locking (one user at a time)

**Scale/Scope**: Medium scale construction document intelligence

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Intelligent Document Repository | ✅ PASS | RAG extends document repository with AI-powered sync and embeddings. "Sync to AI" action integrates with existing document selection workflow. |
| II. Domain-First Intelligence | ✅ PASS | Construction-aware chunking (clause preservation, specification parsing), domain-specific reranking, construction terminology in prompts. |
| III. AI-Powered Automation | ✅ PASS | Core feature is AI-driven tender request generation. Smart Context panel provides transparency ("users can see what the AI did and why"). |
| IV. Financial Visibility Throughout Lifecycle | ⚪ N/A | RAG feature focuses on document intelligence, not financial tracking. No conflict. |
| V. Small Firm Optimization | ✅ PASS | Designed for 1-5 person firms: simple "Sync to AI" workflow, no complex configuration, TOC memory reduces repetitive work. |
| VI. Sharp, Actionable Outputs | ✅ PASS | Project-specific generation from actual documents, Smart Context panel for source visibility, citation validation for accuracy. |
| VII. Integration Over Isolation | ✅ PASS | DOCX/PDF export, works with existing document repository, no vendor lock-in (standard formats). |
| VIII. Test-Driven Quality | ⚠️ ATTENTION | Must implement: retrieval accuracy tests, generation quality validation, citation verification tests. See Phase 3 tasks. |
| IX. Spreadsheet-Native UX | ⚪ N/A | RAG feature is document/report focused, not financial data grids. No conflict. |

**Gate Status**: ✅ PASS - May proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/007-RAG Integration Specification/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output - technology decisions
├── data-model.md        # Phase 1 output - entity relationships
├── quickstart.md        # Phase 1 output - getting started guide
├── contracts/           # Phase 1 output - API schemas
│   ├── document-sets.yaml
│   ├── reports.yaml
│   └── retrieval.yaml
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js Web Application
src/
├── app/
│   ├── api/
│   │   ├── document-sets/           # Document set CRUD
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── members/route.ts
│   │   ├── reports/                 # Report generation
│   │   │   ├── generate/route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── approve-toc/route.ts
│   │   │       ├── section-feedback/route.ts
│   │   │       └── export/route.ts
│   │   └── retrieval/               # RAG retrieval
│   │       └── route.ts
│   └── (dashboard)/
│       └── reports/                 # Report UI
│           └── page.tsx
├── components/
│   ├── reports/
│   │   ├── ReportGenerator.tsx
│   │   ├── TocEditor.tsx
│   │   ├── SectionViewer.tsx
│   │   └── SmartContextPanel.tsx
│   └── documents/
│       └── SyncToAIButton.tsx
├── lib/
│   ├── rag/
│   │   ├── embeddings.ts            # Voyage integration
│   │   ├── chunking.ts              # Construction-aware chunking
│   │   ├── retrieval.ts             # 4-stage pipeline
│   │   ├── reranking.ts             # BAAI + Cohere fallback
│   │   └── parsing.ts               # LlamaParse → Unstructured → pdf-parse v2.4.5 (local)
│   ├── langgraph/
│   │   ├── graph.ts                 # Report generation graph
│   │   ├── nodes/
│   │   │   ├── generate-toc.ts
│   │   │   ├── await-toc-approval.ts
│   │   │   ├── retrieve-context.ts
│   │   │   ├── generate-section.ts
│   │   │   └── await-section-feedback.ts
│   │   └── state.ts                 # ReportState definition
│   ├── queue/
│   │   ├── client.ts                # BullMQ queue setup
│   │   └── workers/
│   │       └── document-processor.ts
│   └── db/
│       └── schema.ts                # Extended with RAG tables

# Background worker (separate process)
workers/
└── document-processor/
    ├── index.ts
    └── Dockerfile

tests/
├── unit/
│   ├── rag/
│   │   ├── chunking.test.ts
│   │   └── retrieval.test.ts
│   └── langgraph/
│       └── graph.test.ts
├── integration/
│   ├── document-sync.test.ts
│   └── report-generation.test.ts
└── contract/
    └── api/
        ├── document-sets.test.ts
        └── reports.test.ts
```

**Structure Decision**: Extends existing Next.js monorepo with new `/lib/rag` and `/lib/langgraph` modules. Background worker runs separately for document processing via BullMQ.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| PostgreSQL + pgvector (new DB) | pgvector required for vector similarity search with HNSW indexes | SQLite extensions for vectors are immature and lack HNSW support |
| Redis + BullMQ (new infra) | Reliable background processing with retries, monitoring, and concurrency control | In-process queues would block Next.js server and lack persistence across restarts |
| LangGraph (new orchestration) | Human-in-the-loop nodes with interrupt/resume, streaming, complex state management | Simple sequential code would require manual state persistence and lack proper streaming support |
| Triple parsing (LlamaParse → Unstructured → pdf-parse) | Construction PDFs have complex layouts; 3-tier fallback ensures reliability. pdf-parse v2.4.5 (TypeScript) provides local fallback requiring no API keys. | Single parser would fail on edge cases, reducing user trust. Local fallback enables offline development. |
| Dual reranking (BAAI + Cohere) | Reliability fallback for production stability | Single reranker would cause generation failures on API outages |

---

## Phase Outputs

*Completed by speckit.plan agent - see individual files for details*

- [x] `research.md` - Technology decisions and rationale
- [x] `data-model.md` - Entity relationships and migrations
- [x] `contracts/` - OpenAPI schemas for all endpoints
  - [x] `document-sets.yaml` - Document set CRUD and sync
  - [x] `reports.yaml` - Report generation and streaming
  - [x] `retrieval.yaml` - Semantic search and chunks
- [x] `quickstart.md` - Developer setup guide
