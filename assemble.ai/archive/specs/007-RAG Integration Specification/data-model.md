# Data Model: RAG Document Intelligence

**Date**: 2025-11-29 | **Status**: Complete

## Overview

This document defines the entity relationships, database schema, and migrations required for the RAG integration feature. The RAG system introduces a **new PostgreSQL database** with pgvector for vector storage, while the main application continues using SQLite.

---

## Architecture Decision: Dual Database

### Rationale
- **SQLite (existing)**: Continues for application data (projects, documents, planning cards)
- **PostgreSQL + pgvector (new)**: Required for vector similarity search with HNSW indexes
- **Redis (new)**: Required for BullMQ job queue

### Connection Strategy
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Next.js App    │────▶│  SQLite (main)  │     │  Redis (queue)  │
│                 │     │  - documents    │     │  - BullMQ jobs  │
│                 │     │  - projects     │     │  - pub/sub      │
│                 │     │  - planning     │     └─────────────────┘
│                 │     └─────────────────┘              ▲
│                 │                                      │
│                 │     ┌─────────────────┐              │
│                 │────▶│  PostgreSQL     │──────────────┘
│                 │     │  - chunks       │   (job results)
│                 │     │  - vectors      │
│                 │     │  - reports      │
│                 │     │  - memory       │
└─────────────────┘     └─────────────────┘
```

---

## Entity Relationship Diagram

```
                                    ┌─────────────────────┐
                                    │     documents       │
                                    │     (SQLite)        │
                                    │─────────────────────│
                                    │ id                  │
                                    │ project_id          │
                                    │ category_id         │
                                    └──────────┬──────────┘
                                               │
                   ┌───────────────────────────┼───────────────────────────┐
                   │                           │                           │
                   ▼                           ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
    │  document_set_members │    │   transmittal_docs    │    │   document_chunks    │
    │      (Postgres)       │    │      (Postgres)       │    │      (Postgres)      │
    │──────────────────────│    │──────────────────────│    │──────────────────────│
    │ document_set_id ──┐   │    │ transmittal_id ──┐   │    │ document_id (ext FK) │
    │ document_id       │   │    │ document_id      │   │    │ parent_chunk_id ──┐  │
    │ sync_status       │   │    │ added_at         │   │    │ embedding (vector) │  │
    └───────────────────┼──┘    └──────────────────┼──┘    │ hierarchy_level    │  │
                        │                          │        └────────────────────┼──┘
                        ▼                          ▼                             │
         ┌──────────────────────┐    ┌──────────────────────┐                   │
         │    document_sets     │    │    transmittals_pg   │                   │
         │      (Postgres)      │    │      (Postgres)      │                   │
         │──────────────────────│    │──────────────────────│                   │
         │ id                   │    │ id                   │                   │
         │ project_id (ext FK)  │    │ project_id (ext FK)  │                   │
         │ name                 │    │ name                 │                   │
         │ discipline           │    │ tender_package_id    │                   │
         └──────────────────────┘    └──────────────────────┘                   │
                        │                                                        │
                        │                                                        │
                        ▼                                                        │
         ┌──────────────────────┐         ┌──────────────────────┐              │
         │   report_templates   │◀────────│   report_sections    │              │
         │      (Postgres)      │         │      (Postgres)      │              │
         │──────────────────────│         │──────────────────────│              │
         │ id                   │         │ report_id            │              │
         │ project_id (ext FK)  │         │ title                │              │
         │ document_set_ids[]   │         │ content              │              │
         │ table_of_contents    │         │ source_chunk_ids[]───┼──────────────┘
         │ status               │         │ order                │
         │ locked_by            │         └──────────────────────┘
         └──────────────────────┘
                        │
                        ▼
         ┌──────────────────────┐
         │    report_memory     │
         │      (Postgres)      │
         │──────────────────────│
         │ organization_id      │
         │ report_type          │
         │ discipline           │
         │ approved_toc (JSONB) │
         │ times_used           │
         └──────────────────────┘
```

---

## New Tables (PostgreSQL)

### 1. document_chunks

Stores parsed document content with vector embeddings.

```sql
CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,  -- External FK to SQLite documents
  parent_chunk_id TEXT REFERENCES document_chunks(id),
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  hierarchy_path TEXT,  -- e.g., "1.2.3" for section/clause
  section_title TEXT,
  clause_number TEXT,
  content TEXT NOT NULL,
  embedding VECTOR(1024),  -- voyage-large-2-instruct dimensions
  token_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_parent ON document_chunks(parent_chunk_id);
CREATE INDEX idx_chunks_hierarchy ON document_chunks(hierarchy_level, hierarchy_path);

-- Vector indexes (create after initial load)
-- HNSW: Fast queries, slower to build
CREATE INDEX idx_chunks_embedding_hnsw ON document_chunks
  USING hnsw (embedding vector_cosine_ops);
-- ivfflat: Fast to build, slower queries (cold start fallback)
CREATE INDEX idx_chunks_embedding_ivf ON document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | UUID primary key |
| document_id | TEXT | References documents.id in SQLite |
| parent_chunk_id | TEXT | Self-referential FK for hierarchy |
| hierarchy_level | INTEGER | 0=document, 1=section, 2=subsection, 3=clause |
| hierarchy_path | TEXT | Dot-notation path (e.g., "3.2.1") |
| section_title | TEXT | Section heading if applicable |
| clause_number | TEXT | Specification clause number |
| content | TEXT | Chunk text content |
| embedding | VECTOR(1024) | Voyage embedding vector |
| token_count | INTEGER | Token count for context budgeting |
| created_at | TIMESTAMP | Creation timestamp |

---

### 2. document_sets

Groups documents for RAG context (distinct from transmittals).

```sql
CREATE TABLE document_sets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,  -- External FK to SQLite projects
  name TEXT NOT NULL,
  description TEXT,
  discipline TEXT,  -- Optional: links to consultant discipline
  is_default BOOLEAN DEFAULT false,
  auto_sync_category_ids TEXT[],  -- Categories to auto-sync
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_document_sets_default ON document_sets(project_id)
  WHERE is_default = true;
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | UUID primary key |
| project_id | TEXT | References projects.id in SQLite |
| name | TEXT | User-friendly name |
| description | TEXT | Optional description |
| discipline | TEXT | Links to consultant discipline |
| is_default | BOOLEAN | Default set for project (max 1) |
| auto_sync_category_ids | TEXT[] | Categories to auto-sync |

---

### 3. document_set_members

Links documents to document sets (many-to-many).

```sql
CREATE TABLE document_set_members (
  id TEXT PRIMARY KEY,
  document_set_id TEXT REFERENCES document_sets(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,  -- External FK to SQLite documents
  sync_status TEXT DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'processing', 'synced', 'failed')),
  error_message TEXT,
  synced_at TIMESTAMP,
  chunks_created INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_set_id, document_id)
);

CREATE INDEX idx_set_members_status ON document_set_members(sync_status);
CREATE INDEX idx_set_members_document ON document_set_members(document_id);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | UUID primary key |
| document_set_id | TEXT | FK to document_sets |
| document_id | TEXT | References documents.id in SQLite |
| sync_status | TEXT | pending/processing/synced/failed |
| error_message | TEXT | Error details if failed |
| synced_at | TIMESTAMP | When sync completed |
| chunks_created | INTEGER | Number of chunks created |

---

### 4. transmittals_pg

Tender packages for document delivery (PostgreSQL version).

```sql
CREATE TABLE transmittals_pg (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,  -- External FK to SQLite projects
  name TEXT NOT NULL,
  description TEXT,
  tender_package_id TEXT,  -- Links to tender package if applicable
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'acknowledged')),
  sent_at TIMESTAMP,
  sent_to TEXT[],  -- Email addresses
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transmittals_project ON transmittals_pg(project_id);
CREATE INDEX idx_transmittals_status ON transmittals_pg(status);
```

---

### 5. transmittal_documents

Links documents to transmittals (many-to-many).

```sql
CREATE TABLE transmittal_documents (
  id TEXT PRIMARY KEY,
  transmittal_id TEXT REFERENCES transmittals_pg(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,  -- External FK to SQLite documents
  version_id TEXT,  -- External FK to SQLite versions (optional)
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(transmittal_id, document_id)
);

CREATE INDEX idx_transmittal_docs_document ON transmittal_documents(document_id);
```

---

### 6. report_templates

Stores report generation state and TOC.

```sql
CREATE TABLE report_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,  -- External FK to SQLite projects
  document_set_ids TEXT[] NOT NULL,  -- Which sets to use for context
  transmittal_id TEXT REFERENCES transmittals_pg(id),  -- For document schedule
  report_type TEXT NOT NULL CHECK (report_type IN ('tender_request')),  -- V1 only
  title TEXT NOT NULL,
  discipline TEXT,  -- e.g., "Fire Services"
  table_of_contents JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'toc_pending', 'generating', 'complete', 'failed')),

  -- Locking
  locked_by TEXT,  -- User ID
  locked_by_name TEXT,  -- User display name
  locked_at TIMESTAMP,

  -- LangGraph state
  graph_state JSONB,
  current_section_index INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_project ON report_templates(project_id);
CREATE INDEX idx_reports_status ON report_templates(status);
CREATE INDEX idx_reports_locked ON report_templates(locked_by) WHERE locked_by IS NOT NULL;
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | UUID primary key |
| project_id | TEXT | References projects.id in SQLite |
| document_set_ids | TEXT[] | Array of document set IDs for context |
| transmittal_id | TEXT | FK for document schedule |
| report_type | TEXT | "tender_request" for V1 |
| title | TEXT | Report title |
| discipline | TEXT | Target discipline |
| table_of_contents | JSONB | Section structure |
| status | TEXT | Generation status |
| locked_by | TEXT | Current editor user ID |
| locked_by_name | TEXT | Current editor name |
| locked_at | TIMESTAMP | Lock acquisition time |
| graph_state | JSONB | LangGraph serialized state |
| current_section_index | INTEGER | Current generation position |

---

### 7. report_sections

Stores generated section content with source attribution.

```sql
CREATE TABLE report_sections (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES report_templates(id) ON DELETE CASCADE,
  section_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  source_chunk_ids TEXT[],  -- Which chunks were used
  source_relevance JSONB,  -- { chunk_id: relevance_score }
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'complete', 'regenerating')),
  generated_at TIMESTAMP,
  regeneration_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(report_id, section_index)
);

CREATE INDEX idx_sections_report ON report_sections(report_id);
CREATE INDEX idx_sections_status ON report_sections(status);
```

---

### 8. report_memory

Cross-project learning for TOC patterns.

```sql
CREATE TABLE report_memory (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  discipline TEXT,
  approved_toc JSONB NOT NULL,  -- Merged TOC patterns
  section_templates JSONB,  -- Common section starters
  times_used INTEGER DEFAULT 1,
  success_rate REAL,  -- Track which patterns work
  last_used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, report_type, discipline)
);

CREATE INDEX idx_memory_org ON report_memory(organization_id);
CREATE INDEX idx_memory_lookup ON report_memory(organization_id, report_type, discipline);
```

---

## JSONB Structures

### table_of_contents (report_templates)

```typescript
interface TableOfContents {
  version: number;
  source: 'memory' | 'generated';
  sections: Array<{
    id: string;
    title: string;
    level: number;  // 1=section, 2=subsection
    description?: string;
    estimatedTokens?: number;
  }>;
}
```

### approved_toc (report_memory)

```typescript
interface ApprovedToc {
  version: number;
  sections: Array<{
    title: string;
    level: number;
    frequency: number;  // How often this section appears
    variants: string[];  // Alternative titles used
  }>;
}
```

### graph_state (report_templates)

```typescript
interface GraphState {
  threadId: string;
  checkpointId: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  interruptData?: {
    type: 'toc_approval' | 'section_feedback';
    payload: unknown;
  };
}
```

---

## Migration Strategy

### Phase 1: Setup PostgreSQL

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Run all CREATE TABLE statements above
-- Create indexes (except HNSW initially)
```

### Phase 2: Initial Load

```typescript
// During first sync, use ivfflat only
// HNSW index building happens in background
async function buildHnswIndex() {
  await db.execute(`
    CREATE INDEX CONCURRENTLY idx_chunks_embedding_hnsw
    ON document_chunks USING hnsw (embedding vector_cosine_ops)
  `);
}
```

### Phase 3: Cross-Database Links

```typescript
// Validate external FKs on application layer
async function validateDocumentExists(documentId: string): Promise<boolean> {
  const doc = await sqliteDb.query.documents.findFirst({
    where: eq(documents.id, documentId)
  });
  return !!doc;
}
```

---

## Drizzle Schema Extension

```typescript
// src/lib/db/rag-schema.ts
import { pgTable, text, integer, timestamp, jsonb, boolean, real } from 'drizzle-orm/pg-core';
import { vector } from 'pgvector/drizzle-orm';

export const documentChunks = pgTable('document_chunks', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull(),
  parentChunkId: text('parent_chunk_id'),
  hierarchyLevel: integer('hierarchy_level').notNull().default(0),
  hierarchyPath: text('hierarchy_path'),
  sectionTitle: text('section_title'),
  clauseNumber: text('clause_number'),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1024 }),
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const documentSets = pgTable('document_sets', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  discipline: text('discipline'),
  isDefault: boolean('is_default').default(false),
  autoSyncCategoryIds: text('auto_sync_category_ids').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const documentSetMembers = pgTable('document_set_members', {
  id: text('id').primaryKey(),
  documentSetId: text('document_set_id').references(() => documentSets.id, { onDelete: 'cascade' }),
  documentId: text('document_id').notNull(),
  syncStatus: text('sync_status', { enum: ['pending', 'processing', 'synced', 'failed'] }).default('pending'),
  errorMessage: text('error_message'),
  syncedAt: timestamp('synced_at'),
  chunksCreated: integer('chunks_created').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reportTemplates = pgTable('report_templates', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  documentSetIds: text('document_set_ids').array().notNull(),
  transmittalId: text('transmittal_id'),
  reportType: text('report_type', { enum: ['tender_request'] }).notNull(),
  title: text('title').notNull(),
  discipline: text('discipline'),
  tableOfContents: jsonb('table_of_contents').notNull().default([]),
  status: text('status', { enum: ['draft', 'toc_pending', 'generating', 'complete', 'failed'] }).default('draft'),
  lockedBy: text('locked_by'),
  lockedByName: text('locked_by_name'),
  lockedAt: timestamp('locked_at'),
  graphState: jsonb('graph_state'),
  currentSectionIndex: integer('current_section_index').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const reportSections = pgTable('report_sections', {
  id: text('id').primaryKey(),
  reportId: text('report_id').references(() => reportTemplates.id, { onDelete: 'cascade' }),
  sectionIndex: integer('section_index').notNull(),
  title: text('title').notNull(),
  content: text('content'),
  sourceChunkIds: text('source_chunk_ids').array(),
  sourceRelevance: jsonb('source_relevance'),
  status: text('status', { enum: ['pending', 'generating', 'complete', 'regenerating'] }).default('pending'),
  generatedAt: timestamp('generated_at'),
  regenerationCount: integer('regeneration_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reportMemory = pgTable('report_memory', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  reportType: text('report_type').notNull(),
  discipline: text('discipline'),
  approvedToc: jsonb('approved_toc').notNull(),
  sectionTemplates: jsonb('section_templates'),
  timesUsed: integer('times_used').default(1),
  successRate: real('success_rate'),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## State Transitions

### Document Sync Status

```
pending ──▶ processing ──▶ synced
                │
                ▼
              failed ──▶ pending (on retry)
```

### Report Status

```
draft ──▶ toc_pending ──▶ generating ──▶ complete
   │          │               │
   │          ▼               ▼
   │      (user edit)     (user feedback)
   │          │               │
   │          ▼               ▼
   └──────▶ draft         generating (loop)
                              │
                              ▼
                           failed
```

### Report Lock Lifecycle

```
unlocked ──▶ locked (user starts editing)
    ▲              │
    │              ├──▶ unlocked (user saves)
    │              │
    │              └──▶ unlocked (15min timeout)
    │                        │
    └────────────────────────┘
```

---

## Next Steps

1. Create PostgreSQL database and run migrations
2. Implement Drizzle connection for PostgreSQL
3. Build document sync pipeline with BullMQ
4. See `contracts/` for API specifications
