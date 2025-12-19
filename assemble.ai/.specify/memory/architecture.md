# Assemble.AI Architecture

## Database Architecture

### Dual-Schema Design

The project uses **two separate database schemas** with different purposes:

| Schema | Config File | Schema File | Purpose |
|--------|-------------|-------------|---------|
| Main App | `drizzle.pg.config.ts` | `src/lib/db/pg-schema.ts` | Core app tables (projects, documents, invoices, consultants, contractors, cost lines, etc.) |
| RAG | `drizzle.rag.config.ts` | `src/lib/db/rag-schema.ts` | Vector embeddings & RAG context (pgvector) |

For local development, SQLite is also supported via `drizzle.config.ts` → `src/lib/db/schema.ts`.

### Database Selection Logic

From `src/lib/db/index.ts`:
- **PostgreSQL**: Used when `DATABASE_URL` or `SUPABASE_POSTGRES_URL` environment variable is set
- **SQLite**: Default for local development (no Docker required)

```typescript
export const usePostgres = !!(process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL);
export const db = usePostgres ? drizzle(pool, { schema: pgSchema }) : drizzle(sqlite, { schema: sqliteSchema });
```

### External FK Pattern

RAG schema tables reference main app tables via **text IDs without formal foreign keys**:
- `documentChunks.documentId` → references `documents.id` (no FK constraint)
- `documentSetMembers.documentId` → references `documents.id` (no FK constraint)

**Why?** This allows RAG tables to live in a separate database while still linking to main app entities. Joins happen in application code, not at the database level.

### NPM Scripts

**Main Schema (core app tables):**
- `npm run db:push` - Push main schema to PostgreSQL
- `npm run db:generate` - Generate migrations for main schema
- `npm run db:studio` - Open Drizzle Studio for main schema

**RAG Schema (vector embeddings):**
- `npm run db:rag:push` - Push RAG schema to PostgreSQL
- `npm run db:rag:generate` - Generate migrations for RAG schema
- `npm run db:rag:studio` - Open Drizzle Studio for RAG schema

**Important:** Both schemas must be pushed when setting up a new database:
```bash
npm run db:push && npm run db:rag:push
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/db/index.ts` | Unified DB client export (auto-selects SQLite/PostgreSQL) |
| `src/lib/db/pg-client.ts` | Dedicated PostgreSQL pool with connection settings |
| `src/lib/db/rag-client.ts` | Separate RAG/pgvector client (uses `SUPABASE_POSTGRES_URL`) |
| `src/lib/db/pg-schema.ts` | Main app PostgreSQL schema (978 lines, 50+ tables) |
| `src/lib/db/rag-schema.ts` | RAG schema with pgvector (367 lines) |
| `src/lib/db/schema.ts` | Main app SQLite schema (development fallback) |

---

## Storage Architecture

File storage uses a similar pattern with environment-based selection:

| File | Purpose |
|------|---------|
| `src/lib/storage/index.ts` | Unified storage interface (auto-selects local/Supabase) |
| `src/lib/storage/local.ts` | Local file storage (development) |
| `src/lib/storage/supabase.ts` | Supabase storage (production) |

---

## AI Integration Architecture

### Document Extraction
- `src/lib/invoice/extract.ts` - AI-powered invoice data extraction using Claude
- `src/lib/variation/extract.ts` - AI-powered variation/change order extraction
- `src/lib/rag/parsing.ts` - Document parsing with fallback chain (LlamaParse → Unstructured → pdf-parse)

### RAG Pipeline
1. Documents uploaded → stored in `file_assets` table
2. Parsed via `src/lib/rag/parsing.ts`
3. Chunked and embedded via Voyage AI
4. Stored in `document_chunks` with 1024-dim vectors
5. Retrieved via pgvector similarity search

---

## Environment Variables

**Database:**
- `DATABASE_URL` - PostgreSQL connection string (triggers PostgreSQL mode)
- `SUPABASE_POSTGRES_URL` - Alternative PostgreSQL URL for RAG

**AI Services:**
- `ANTHROPIC_API_KEY` - Claude API for document extraction
- `VOYAGE_API_KEY` - Voyage AI for embeddings
- `LLAMA_CLOUD_API_KEY` - LlamaParse for document parsing (primary)
- `UNSTRUCTURED_API_KEY` - Unstructured.io parsing (fallback)

See `.env.example` for full list.
