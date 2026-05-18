# Research: RAG Document Intelligence

**Date**: 2025-11-29 | **Status**: Complete

## Executive Summary

This document captures the technology decisions and research findings for the RAG integration feature. All "NEEDS CLARIFICATION" items from the spec have been resolved.

---

## 1. Vector Database

### Decision: PostgreSQL + pgvector with dual indexes (HNSW + ivfflat)

### Rationale
- **Existing infrastructure**: assemble.ai already uses SQL databases; adding pgvector to PostgreSQL maintains operational simplicity
- **HNSW for production**: Hierarchical Navigable Small World provides fast approximate nearest neighbor search (sub-100ms for 1M+ vectors)
- **ivfflat for cold start**: Faster to build initially, allows quick deployment while HNSW index builds in background

### Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Pinecone** | Managed, fast, scalable | Vendor lock-in, cost at scale, data leaves infrastructure | Rejected |
| **Weaviate** | Self-hosted option, hybrid search | Additional infrastructure, operational overhead | Rejected |
| **Qdrant** | Open source, good performance | Separate service to manage, another DB to learn | Rejected |
| **pgvector** | Uses existing PostgreSQL, SQL-native, no new infra | Slightly slower than dedicated solutions | **Selected** |

### Implementation Notes
- Use `vector(1024)` for Voyage large-2-instruct dimensions
- Build ivfflat index immediately on table creation (lists=100)
- Build HNSW index in background after initial data load
- Query using `<=>` operator for cosine distance

---

## 2. Embedding Model

### Decision: Voyage `voyage-large-2-instruct`

### Rationale
- **Technical document performance**: Voyage models specifically tuned for technical/instructional content
- **Construction domain fit**: Better handling of specification language, clause references, and technical terminology
- **1024 dimensions**: Good balance of precision and storage efficiency
- **Same cost as OpenAI**: No price premium for better quality

### Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **OpenAI text-embedding-3-large** | Widely used, good docs | Generic training, worse on technical docs | Rejected |
| **Cohere embed-v3** | Multi-language, compression options | Weaker on construction terminology | Rejected |
| **voyage-large-2-instruct** | Superior on technical docs, instruction-tuned | Smaller ecosystem | **Selected** |
| **Local models (BGE, E5)** | No API costs, privacy | Requires GPU infra, maintenance | Rejected for V1 |

### Implementation Notes
- Batch embeddings in groups of 128 for efficiency
- Store raw embedding in pgvector column
- Cache embeddings indefinitely (documents rarely change after upload)

---

## 3. Reranking

### Decision: BAAI/bge-reranker-v2-m3 (primary) + Cohere rerank-english-v3.0 (fallback)

### Rationale
- **BAAI primary**: Best open-source reranker, excellent on technical documents, can be self-hosted if needed
- **Cohere fallback**: Managed service with high reliability for production stability
- **Dual approach**: Ensures generation never fails due to reranker outage

### Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Cohere only** | Simple, reliable, managed | Cost at scale, single point of failure | Rejected (but kept as fallback) |
| **BAAI only** | Best quality, can self-host | API availability concerns | Rejected (but kept as primary) |
| **No reranking** | Simpler pipeline | Poor precision, irrelevant context | Rejected |
| **Dual BAAI + Cohere** | Best of both | Slight complexity | **Selected** |

### Implementation Notes
- Try BAAI first with 3-second timeout
- On BAAI failure, fallback to Cohere immediately
- Log fallback events for monitoring
- Rerank top-20 candidates to top-5

---

## 4. Document Parsing

### Decision: LlamaParse (primary) + Unstructured.io (fallback)

### Rationale
- **LlamaParse**: Best-in-class PDF parsing, handles complex layouts common in construction specs
- **Unstructured fallback**: Broader format support, handles edge cases LlamaParse may miss
- **Markdown output**: Both produce clean markdown for downstream processing

### Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **PyMuPDF/pdfplumber** | Free, local | Poor on complex layouts, tables | Rejected |
| **Adobe PDF Services** | Excellent quality | Cost, vendor lock-in | Rejected |
| **LlamaParse only** | Best quality | May fail on unusual formats | Rejected |
| **LlamaParse + Unstructured** | Quality + reliability | Two integrations | **Selected** |

### Implementation Notes
- Use LlamaParse with `resultType: "markdown"`
- On LlamaParse error, retry with Unstructured
- Store parsed text alongside original file
- Parse asynchronously via BullMQ worker

---

## 5. Chunking Strategy

### Decision: LlamaIndex SemanticSplitter with construction-aware preprocessing

### Rationale
- **Semantic boundaries**: Splits on meaning changes, not arbitrary token counts
- **Construction preprocessing**: Custom split on clause markers (e.g., `3.2.1`) before semantic splitting
- **Hierarchy preservation**: Maintains parent-child relationships for context retrieval

### Chunk Size Guidelines

| Document Type | Chunk Size | Strategy |
|---------------|------------|----------|
| Specifications | 1000-1500 tokens | Clause-aware, preserve hierarchy |
| Drawing schedules | 500-800 tokens | Row-based |
| Correspondence | Full document | No chunking |
| Reports | 800-1200 tokens | Section-aware |

### Implementation Notes
- Preprocess with regex: `/^\d+\.\d+(\.\d+)?\s+/gm` for clause detection
- Apply SemanticSplitter with `breakpointThreshold: 0.75`
- Store `hierarchy_level`, `hierarchy_path`, `parent_chunk_id` for retrieval enrichment
- Include `section_title` and `clause_number` metadata

---

## 6. Orchestration

### Decision: LangGraph

### Rationale
- **Human-in-the-loop**: Native `interrupt()` for TOC approval and section feedback
- **State management**: Built-in state persistence across async operations
- **Streaming**: First-class support for token streaming to UI
- **Agentic control**: Can add tool use, branching logic, retries

### Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **LlamaIndex workflows** | Simple, Python-native | Limited HITL, weak streaming | Rejected |
| **Raw Claude API** | Simple, direct | Manual state, no HITL | Rejected |
| **Custom state machine** | Full control | Reinventing the wheel | Rejected |
| **LangGraph** | HITL, streaming, state | Learning curve | **Selected** |

### Implementation Notes
- Define `ReportState` annotation with all generation state
- Use `interrupt()` for `await_toc_approval` and `await_section_feedback` nodes
- Stream via `claude.messages.stream()` with WebSocket emission
- Store graph state in PostgreSQL for durability

---

## 7. Background Processing

### Decision: BullMQ + Redis

### Rationale
- **Reliability**: Persistent jobs survive server restarts
- **Retries**: Built-in exponential backoff for failed parsing
- **Monitoring**: Bull Board dashboard for job visibility
- **Concurrency**: Fine-grained control over worker parallelism

### Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Vercel Background Functions** | Easy if on Vercel | 60s timeout, limited control | Rejected |
| **AWS SQS** | Scalable, reliable | AWS lock-in, complex setup | Rejected |
| **In-process queue** | Simple | Blocks server, no persistence | Rejected |
| **BullMQ + Redis** | Feature-rich, proven | Redis infrastructure | **Selected** |

### Implementation Notes
- Use Railway/Render Redis addon or self-hosted
- Set concurrency to 3 workers per process
- Configure exponential backoff: `{ attempts: 3, backoff: { type: 'exponential', delay: 1000 } }`
- Emit progress events via Redis pub/sub for UI updates

---

## 8. Access Control

### Decision: Project-level access (all members have full RAG access)

### Rationale
- **Simplicity**: Matches constitution principle V (Small Firm Optimization)
- **Trust model**: Project teams are trusted; document-level permissions add unnecessary complexity
- **V1 scope**: Can add granular permissions later if needed

### Implementation Notes
- Check project membership before any RAG operation
- No per-document-set permissions in V1
- All project members can sync, generate, and view reports

---

## 9. Concurrency Model

### Decision: Report-level locking

### Rationale
- **Avoid conflicts**: Only one user can generate/edit a report at a time
- **Clear UX**: Others see "in progress" status with editor name
- **Simplicity**: No complex CRDT or OT for collaborative editing

### Implementation Notes
- Store `locked_by` and `locked_at` on report_templates table
- Auto-release lock after 15 minutes of inactivity
- Show lock holder name in UI
- Allow lock holder to manually release

---

## 10. LLM Choice

### Decision: Claude (Anthropic)

### Rationale
- **Already integrated**: assemble.ai uses Claude for other features
- **Long context**: 200k context window handles large document sets
- **Quality**: Excellent at following structured prompts for report generation

### Implementation Notes
- Use `claude-sonnet-4-20250514` for generation (cost/quality balance)
- Pass construction-specific system prompt
- Stream tokens via `messages.stream()`
- Include Smart Context sources in prompt for transparency

---

## Resolved Clarifications

| Question | Answer | Source |
|----------|--------|--------|
| What access control model applies to RAG features? | All project members have full RAG access | Session 2025-11-29 |
| What data volume/scale should the system support? | 500-2,000 documents/project, 10-50 concurrent users | Session 2025-11-29 |
| How should document processing failures be handled? | Visible error state with error badge and manual "Retry" action | Session 2025-11-29 |
| What report types are in scope for v1? | Tender request generation only | Session 2025-11-29 |
| How should concurrent report editing be handled? | Report-level lock; one user at a time | Session 2025-11-29 |

---

## Next Steps

1. **Phase 1**: Create data-model.md with entity relationships and migrations
2. **Phase 1**: Create API contracts in `/contracts/`
3. **Phase 1**: Create quickstart.md for developer setup
4. **Phase 2**: Break down into implementation tasks via `/speckit.tasks`
