# Knowledge Domain System — Remaining Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Knowledge Domain System (Pillar 1) by building domain-aware retrieval, regulatory chunking, orchestrator integration, API routes, and management UI.

**Architecture:** Three new functions in the retrieval pipeline resolve domain document sets, retrieve using the existing 4-stage RAG pipeline, and enrich results with domain metadata. The orchestrator's empty `knowledgeContext` field gets populated. A CRUD API and settings UI enable domain management.

**Tech Stack:** TypeScript, Drizzle ORM, pgvector, Voyage AI embeddings, Next.js API routes, React/shadcn/ui

---

## Current State (What's Already Built)

| Component | Status | File |
|-----------|--------|------|
| Knowledge domain constants (10 domains, 60+ tags) | Done | `src/lib/constants/knowledge-domains.ts` |
| RAG schema with `domainType`, `domainTags` columns | Done | `src/lib/db/rag-schema.ts` |
| `knowledgeDomainSources` table schema | Done | `src/lib/db/knowledge-domain-sources-schema.ts` |
| SQL migration file | Done | `migrations/intelligence-layer-schema.sql` |
| Context Orchestrator with `knowledgeContext` placeholder | Done | `src/lib/context/orchestrator.ts` |
| Existing 4-stage retrieval pipeline | Done | `src/lib/rag/retrieval.ts` |
| Existing chunking module | Done | `src/lib/rag/chunking.ts` |
| Coaching Engine (23 checklists) | Done | `src/lib/constants/coaching-checklists.ts` |

## What Remains (6 Stages)

Each stage is a **self-contained commit** and a **context window clearance point**.

---

## Stage A: Domain-Aware Retrieval Pipeline

**Files:**
- Modify: `src/lib/rag/retrieval.ts`

**Step 1: Add types for domain retrieval**

At the top of `src/lib/rag/retrieval.ts`, after the existing `RetrievalOptions` interface, add:

```typescript
export interface DomainRetrievalOptions {
    projectType?: string;          // e.g., 'new', 'refurb'
    domainTags?: string[];         // e.g., ['cost-management', 'variations']
    domainTypes?: string[];        // e.g., ['best_practices', 'reference']
    organizationId?: string;       // For org-scoped domains
    state?: string;                // e.g., 'NSW', 'VIC'
    includePrebuilt?: boolean;     // Include seed domains (default: true)
    includeOrganization?: boolean; // Include org-uploaded domains (default: true)
    topK?: number;
    rerankTopK?: number;
    minRelevanceScore?: number;
}

export interface DomainRetrievalResult extends RetrievalResult {
    domainName?: string;
    domainType?: string;
    domainTags?: string[];
    sourceVersion?: string;
}
```

**Step 2: Add `resolveDomainDocumentSets()` helper**

Private async function that queries `document_sets` joined with `knowledge_domain_sources`, filtering by:
- `domainType IS NOT NULL`
- `repoType IN ('knowledge_regulatory', 'knowledge_practices', 'knowledge_templates')`
- `domainTags && $tags::text[]` (PostgreSQL array overlap)
- `applicableProjectTypes` / `applicableStates` via `knowledge_domain_sources` join
- `isGlobal = true` for prebuilt, `organizationId` match for org-scoped
- `isActive = true`

Returns `string[]` of matching document set IDs.

**Step 3: Add `enrichWithDomainMetadata()` helper**

Private async function that:
1. Fetches domain metadata (name, type, tags, version) for the matching document set IDs
2. Looks up document-to-set mappings via `document_set_members`
3. Enriches each `RetrievalResult` with its source domain's metadata
4. Returns `DomainRetrievalResult[]`

**Step 4: Add `retrieveFromDomains()` public function**

Main function that:
1. Calls `resolveDomainDocumentSets()` with the filter options
2. If no matching sets found, returns `[]`
3. Passes matching set IDs to existing `retrieve()` pipeline
4. Calls `enrichWithDomainMetadata()` on results
5. Returns enriched `DomainRetrievalResult[]`

**Step 5: Commit**

```bash
git add src/lib/rag/retrieval.ts
git commit -m "feat: add domain-aware retrieval pipeline (retrieveFromDomains)"
```

---

## Stage B: Regulatory Chunking Enhancement

**Files:**
- Modify: `src/lib/rag/chunking.ts`

**Step 1: Add new chunk size types**

Add to `CHUNK_SIZES`:
```typescript
regulatory: { min: 400, max: 800 },      // Small for precision
knowledgeGuide: { min: 600, max: 1000 },  // Medium for best-practice
```

**Step 2: Add NCC and AS clause patterns**

```typescript
const NCC_CLAUSE_PATTERN = /^([A-Z]\d+(?:\.\d+)*)\s+(.+)$/gm;
const NCC_PERFORMANCE_PATTERN = /^(P\d+(?:\.\d+)*)\s+(.+)$/gm;
const NCC_SPEC_PATTERN = /^(Specification\s+[A-Z]\d+(?:\.\d+)*)/gim;
const AS_SECTION_PATTERN = /^(Section\s+\d+|Appendix\s+[A-Z])/gim;
const AS_CLAUSE_PATTERN = /^(\d+(?:\.\d+)+)\s+(.+)$/gm;
```

**Step 3: Extend `detectDocumentType()`**

Add regulatory and knowledgeGuide detection before existing patterns:
- Check `NCC_CLAUSE_PATTERN` / `NCC_PERFORMANCE_PATTERN` → `'regulatory'`
- Check `AS_SECTION_PATTERN` / `AS_CLAUSE_PATTERN` → `'regulatory'`
- Check for seed content format (`'common pitfalls:'` + `'reference:'`) → `'knowledgeGuide'`

**Step 4: Add `chunkSeedContent()` function**

Exported function for chunking seed markdown files:
- Strips frontmatter
- Splits on `## ` headings
- Each heading becomes a chunk with `sectionTitle` set
- Large sections (over `knowledgeGuide.max`) split further on `### ` sub-headings with parent-child hierarchy
- Returns `Chunk[]`

**Step 5: Add `preserveTableBoundaries()` utility**

Detects pipe-delimited and tab-aligned tables, prevents splitting within them during semantic chunking.

**Step 6: Commit**

```bash
git add src/lib/rag/chunking.ts
git commit -m "feat: add regulatory chunking patterns and seed content chunker"
```

---

## Stage C: Wire Domain Retrieval Into Context Orchestrator

**Files:**
- Modify: `src/lib/context/orchestrator.ts`
- Modify: `src/lib/context/modules/profile.ts` (read project profile for state/type)

**Step 1: Import domain retrieval and constants**

```typescript
import { retrieveFromDomains } from '../../rag/retrieval';
import { SECTION_TO_DOMAIN_TAGS } from '../../constants/knowledge-domains';
```

**Step 2: Add `assembleDomainContext()` private function**

This function:
1. Determines domain tags from `SECTION_TO_DOMAIN_TAGS[request.sectionKey]` or `request.domainTags`
2. Gets project profile from fetched modules (project type, region/state)
3. Calls `retrieveFromDomains()` with appropriate filters
4. Formats results as a `## Knowledge Domain Context` prompt section with source attribution
5. Returns the formatted string

**Step 3: Wire into `assembleContext()` main function**

After the module fetch/format loop (step 8 in the current code), add:
- Check if `request.includeKnowledgeDomains` is true (or default true for report-section and coaching-qa)
- Call `assembleDomainContext(request, fetchedModules)`
- Set `assembledContext.knowledgeContext` to the result

**Step 4: Commit**

```bash
git add src/lib/context/orchestrator.ts src/lib/context/modules/profile.ts
git commit -m "feat: wire domain retrieval into context orchestrator (knowledgeContext)"
```

---

## Stage D: Knowledge Domain API Routes

**Files:**
- Create: `src/app/api/knowledge-domains/route.ts`
- Create: `src/app/api/knowledge-domains/[domainId]/route.ts`
- Create: `src/lib/hooks/use-knowledge-domains.ts`

**Step 1: GET/POST `/api/knowledge-domains`**

- **GET**: List all knowledge domains (prebuilt + organization-scoped)
  - Query `document_sets` WHERE `domainType IS NOT NULL`
  - Join `knowledge_domain_sources` for provenance metadata
  - Include chunk count per domain (via `document_set_members` count)
  - Return: `{ domains: KnowledgeDomainDTO[] }`

- **POST**: Create a custom domain (organization-scoped)
  - Body: `{ name, description, domainType, domainTags, organizationId }`
  - Creates a `document_set` with `repoType = 'knowledge_practices'` and domain metadata
  - Creates a `knowledge_domain_sources` record with `sourceType = 'organization_library'`
  - Return: `{ domain: KnowledgeDomainDTO }`

**Step 2: GET/PATCH/DELETE `/api/knowledge-domains/[domainId]`**

- **GET**: Domain details with sources, chunk count, last verified date
- **PATCH**: Update domain metadata (name, description, tags, isActive toggle)
- **DELETE**: Soft-delete (set `isActive = false` on knowledge_domain_sources)

**Step 3: Create `useKnowledgeDomains()` React hook**

SWR-based hook for:
- `domains` — list of all domains
- `createDomain(data)` — POST to create
- `updateDomain(id, data)` — PATCH to update
- `deleteDomain(id)` — DELETE to soft-delete
- `toggleDomain(id, isActive)` — PATCH isActive

**Step 4: Commit**

```bash
git add src/app/api/knowledge-domains/ src/lib/hooks/use-knowledge-domains.ts
git commit -m "feat: add knowledge domain CRUD API routes and React hook"
```

---

## Stage E: Knowledge Domain Management UI

**Files:**
- Create: `src/components/knowledge/KnowledgeDomainManager.tsx`
- Create: `src/components/knowledge/DomainCard.tsx`
- Modify: Settings page to include the new panel

**Step 1: `DomainCard` component**

Displays a single domain with:
- Domain name, type badge, description
- Tag pills (known tags in primary color, custom in muted)
- Status indicator: active (green), empty (amber), inactive (gray)
- Chunk count and source version
- `lastVerifiedAt` staleness indicator (>12 months = warning)
- Toggle switch for active/inactive
- Only custom domains show delete button (prebuilt domains cannot be deleted)

**Step 2: `KnowledgeDomainManager` component**

Settings panel that:
- Shows grid of `DomainCard` components for all 10 prebuilt domains
- Shows section for organization-scoped custom domains
- "Create Custom Domain" button with dialog (name, description, type, tags)
- Tag input with autocomplete from `ALL_DOMAIN_TAGS`
- Filtering by domain type and tag category
- Uses `useKnowledgeDomains()` hook

**Step 3: Wire into settings page**

Add a "Knowledge Domains" section/tab to the organization settings page.

**Step 4: Commit**

```bash
git add src/components/knowledge/ src/app/...settings...
git commit -m "feat: add knowledge domain management UI in organization settings"
```

---

## Stage F: Seed Content Ingestion Script

**Files:**
- Create: `scripts/ingest-seed-knowledge.ts`
- Create: `src/lib/constants/knowledge-seed/` (placeholder files)

**Step 1: Create ingestion script**

Node.js script that:
1. Reads markdown files from `src/lib/constants/knowledge-seed/`
2. Parses frontmatter for domain metadata (domain slug, name, type, tags, version, applicable states/types)
3. Chunks content using `chunkSeedContent()` from chunking module
4. Generates embeddings via Voyage AI (batch, 128 items per request)
5. Creates/updates `document_set` with domain metadata
6. Creates/updates `knowledge_domain_sources` record
7. Upserts chunks into `document_chunks` table
8. Idempotent: checks existing version, only re-ingests if version changed

**Step 2: Create placeholder seed content files**

Create empty markdown files with frontmatter for Phase A domains:
- `cost-management-principles.md`
- `procurement-tendering-guide.md`
- `contract-administration-guide.md`
- `program-scheduling-guide.md`

These serve as the structure for future content authoring.

**Step 3: Commit**

```bash
git add scripts/ingest-seed-knowledge.ts src/lib/constants/knowledge-seed/
git commit -m "feat: add seed knowledge ingestion script and placeholder domain files"
```

---

## Implementation Order & Context Window Strategy

| Stage | Scope | Approx. Effort | Dependencies | Context Clear? |
|-------|-------|----------------|--------------|----------------|
| **A** | Domain retrieval pipeline | ~200 lines | None | Yes - commit & clear |
| **B** | Regulatory chunking | ~150 lines | None (parallel with A) | Yes - commit & clear |
| **C** | Orchestrator integration | ~60 lines | Stage A | Yes - commit & clear |
| **D** | API routes + hook | ~250 lines | Schema (done) | Yes - commit & clear |
| **E** | Management UI | ~350 lines | Stage D | Yes - commit & clear |
| **F** | Ingestion script + placeholders | ~200 lines | Stages A+B | Yes - commit & clear |

**Stages A and B are independent** — can be built in any order or in parallel.
**Stage C depends on A** — needs `retrieveFromDomains()`.
**Stage D is independent** of A/B/C — purely CRUD on existing schema.
**Stage E depends on D** — needs the API routes and hook.
**Stage F depends on A+B** — needs retrieval and chunking functions.

**Recommended flow:** A → B → C → (commit, clear context) → D → E → (commit, clear context) → F
