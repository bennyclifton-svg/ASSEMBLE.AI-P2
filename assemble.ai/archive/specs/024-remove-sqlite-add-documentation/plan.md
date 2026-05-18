# Plan: Remove SQLite & Add Documentation

**Status:** Complete
**Created:** 2026-01-25
**Last Updated:** 2026-01-25

## Problem Statement

The codebase has both SQLite and PostgreSQL support, causing confusion:
- SQLite was a fallback when `DATABASE_URL` wasn't set
- Workers loaded only `.env.local` (no DATABASE_URL) → used SQLite
- Next.js app loaded `.env` (has DATABASE_URL) → used PostgreSQL
- Result: Workers wrote to wrong database, data didn't appear in UI

## Solution

1. Remove SQLite entirely (it's incomplete anyway - Better Auth requires PostgreSQL)
2. Add CLAUDE.md documentation to prevent future confusion
3. Ensure all workers load env files consistently

---

## Progress Tracker

- [x] Phase 1: Create CLAUDE.md documentation
- [x] Phase 2: Remove SQLite support
  - [x] Delete `drizzle.config.ts`
  - [x] Delete `drizzle/` folder (27 migration files)
  - [x] Delete `src/lib/db/schema.ts` (SQLite schema) - N/A, already removed
  - [x] Delete `sqlite.db` (47MB database file)
  - [x] Modify `src/lib/db/index.ts`
  - [x] Remove `better-sqlite3` from package.json
- [x] Phase 3: Fix workers
  - [x] Fix `workers/document-processor/index.ts` env loading
  - [x] Fix `workers/drawing-extractor/index.ts` env loading (DONE earlier)
- [x] Phase 4: Update `.gitignore`
- [x] Phase 5: Cleanup
  - [x] Delete `scripts/apply-drawing-migration.ts` - N/A, already removed

---

## Phase 1: Add CLAUDE.md Documentation

Create `assemble.ai/CLAUDE.md`:

```markdown
# Assemble.ai - Claude Code Context

## Database Architecture
- **Production**: Supabase PostgreSQL (configured via DATABASE_URL in .env)
- **Local Development**: Docker PostgreSQL (same schema, local instance)
- **No SQLite**: This project uses PostgreSQL exclusively

## Environment Files
| File | Purpose |
|------|---------|
| `.env` | Production secrets (Supabase DATABASE_URL, API keys) |
| `.env.local` | Local overrides (typically empty or Redis URL) |
| `.env.development` | Development defaults |

**Load Order** (highest to lowest priority):
1. `.env.local`
2. `.env.development`
3. `.env`

## Required Services (Local Dev)
```bash
npm run db:up    # Start Docker PostgreSQL + Redis
npm run dev      # Start Next.js + workers
```

## Workers
| Worker | Purpose |
|--------|---------|
| `doc-worker` | Document processing (OCR, parsing, RAG indexing) |
| `draw-worker` | Drawing extraction (AI-powered metadata extraction) |

**Important:** Workers MUST load env files in same order as Next.js.

## Database Migrations
- Location: `drizzle-pg/`
- Apply changes: `npm run db:push`
- View database: `npm run db:studio`
```

---

## Phase 2: Remove SQLite Support

### Files to DELETE

| File/Folder | Description | Size |
|-------------|-------------|------|
| `drizzle.config.ts` | SQLite drizzle config | ~10 lines |
| `drizzle/` | SQLite migrations | 27 files |
| `src/lib/db/schema.ts` | SQLite schema | 1,586 lines |
| `sqlite.db` | SQLite database | 47 MB |

### Files to MODIFY

#### `src/lib/db/index.ts`

**Current (with SQLite fallback):**
```typescript
import * as sqliteSchema from './schema';
import * as pgSchema from './pg-schema';

export const usePostgres = !!(process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL);

export const db = usePostgres
    ? (() => {
        const { drizzle } = require('drizzle-orm/node-postgres');
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL });
        return drizzle(pool, { schema: pgSchema });
    })()
    : (() => {
        const { drizzle } = require('drizzle-orm/better-sqlite3');
        const Database = require('better-sqlite3');
        return drizzle(new Database('sqlite.db'), { schema: sqliteSchema });
    })();

export const schema = usePostgres ? pgSchema : sqliteSchema;
```

**New (PostgreSQL only):**
```typescript
import * as pgSchema from './pg-schema';
import * as authSchema from './auth-schema';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

if (!connectionString) {
    throw new Error(
        'DATABASE_URL or SUPABASE_POSTGRES_URL environment variable is required.\n' +
        'For local development, run: npm run db:up'
    );
}

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema: pgSchema });
export type Database = typeof db;
export const schema = pgSchema;

// Re-export tables from pgSchema
export const { categories, subcategories, documents, fileAssets, versions, ... } = pgSchema;

// Re-export auth tables
export const { user, session, account, verification, polarCustomer, polarSubscription } = authSchema;
```

#### `package.json`

Remove these dependencies:
```json
// dependencies
"better-sqlite3": "^12.4.5",  // DELETE

// devDependencies
"@types/better-sqlite3": "^7.6.13",  // DELETE
```

---

## Phase 3: Update Workers

#### `workers/document-processor/index.ts`

**Current:**
```typescript
if (process.env.NODE_ENV !== 'production') {
    config({ path: '.env.local' });
}
```

**New:**
```typescript
if (process.env.NODE_ENV !== 'production') {
    config({ path: '.env.local' });
    config({ path: '.env.development' });
    config({ path: '.env' });
}

// Add logging
console.log('[worker] DATABASE_URL:', process.env.DATABASE_URL ? 'set (PostgreSQL)' : 'NOT SET');
```

#### `workers/drawing-extractor/index.ts`
Already fixed earlier in this session.

---

## Phase 4: Add to .gitignore

```gitignore
# Database (legacy SQLite files)
sqlite.db
*.sqlite
*.sqlite3
```

---

## Phase 5: Cleanup

1. Delete `scripts/apply-drawing-migration.ts` (was created to fix SQLite, no longer needed)
2. Update README.md if it mentions SQLite

---

## Verification Steps

1. Stop dev server
2. Ensure Docker is running: `npm run db:up`
3. Reinstall dependencies: `npm install`
4. Start dev: `npm run dev`
5. Check worker logs for: `DATABASE_URL: set (PostgreSQL)`
6. Upload a document
7. Verify drawing extraction completes in logs
8. Refresh page and confirm drawing number appears in UI

---

## Files Summary

| Action | File |
|--------|------|
| CREATE | `CLAUDE.md` |
| CREATE | `specs/024-remove-sqlite-add-documentation/plan.md` (this file) |
| DELETE | `drizzle.config.ts` |
| DELETE | `drizzle/` (entire folder) |
| DELETE | `src/lib/db/schema.ts` |
| DELETE | `sqlite.db` |
| DELETE | `scripts/apply-drawing-migration.ts` |
| MODIFY | `src/lib/db/index.ts` |
| MODIFY | `package.json` |
| MODIFY | `.gitignore` |
| MODIFY | `workers/document-processor/index.ts` |

---

## Notes

- Better Auth already requires PostgreSQL (`auth-schema.ts` uses `pgTable`)
- RAG/knowledge extraction uses PostgreSQL with pgvector extension
- Removing SQLite eliminates ~1,600 lines of duplicate schema code
- No performance impact - app was already using PostgreSQL
