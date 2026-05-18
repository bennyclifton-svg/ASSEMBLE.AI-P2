# Local Private Bootstrap

This is the truthful local/private setup path for Sitewise. It starts from a clean checkout and uses Docker PostgreSQL with pgvector, Redis, local file storage, Drizzle schema setup, and the same environment loading contract for the app and workers.

## Environment Contract

Local development loads environment files through the same Next-style loader everywhere this path controls:

1. `.env.local`
2. `.env.development`
3. `.env`

`.env.development` contains safe local defaults:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/assembleai
REDIS_URL=redis://localhost:6379
USE_SUPABASE_STORAGE=false
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Use `.env.local` only for local secrets and machine-specific overrides. If `.env.local` points `DATABASE_URL` or `REDIS_URL` at a remote service, `npm run local:bootstrap` and `npm run local:smoke` refuse to continue unless `SITEWISE_ALLOW_REMOTE_BOOTSTRAP=1` is set intentionally.

## Model Key Placeholders

The app can boot without live model keys, but AI features that call providers need real values in `.env.local`.

```bash
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
VOYAGE_API_KEY=
COHERE_API_KEY=
LLAMA_CLOUD_API_KEY=
UNSTRUCTURED_API_KEY=
```

Keep placeholders blank until the feature is being exercised. `VOYAGE_API_KEY` is needed for document embeddings, and extraction/chat features may require the provider selected in the model admin settings.

## Startup Sequence

Install dependencies, bootstrap the local services and schemas, then start the app and workers.

```bash
npm install
npm run local:bootstrap
npm run dev
```

In a second terminal, run the smoke check once the dev server is listening.

```bash
npm run local:smoke
```

`npm run local:bootstrap` does the following:

- starts Docker PostgreSQL with pgvector and Redis
- waits for PostgreSQL and Redis to accept connections
- ensures the `vector` extension exists
- applies the main application schema
- applies the Better Auth schema
- applies the RAG schema
- creates the local `uploads/` storage directory

`npm run local:smoke` verifies:

- PostgreSQL connectivity
- pgvector extension availability
- main, auth, and RAG schema tables
- Redis connectivity
- local file storage write/read/delete
- document worker environment loading
- drawing worker environment loading
- app health endpoint at `NEXT_PUBLIC_APP_URL`

You can also inspect readiness in the browser at `/setup/status`. The same component checks are exposed as JSON at `/api/health`.

`npm run local:backup-smoke` verifies:

- a temporary project can be backed up
- a local file payload is included in the backup
- restore can create a clean project namespace
- the restored project can read the expected file payload

Backup and restore usage is documented in `docs/setup/local-backup-restore.md`.

## Secret Hygiene

Before release, customer handoff, or sharing deployment notes, run:

```bash
npm run secret:hygiene
```

The check scans tracked documentation and committed config for high-confidence
secret leaks such as remote database URLs with inline credentials, live-looking
provider tokens, private-key blocks, root SSH targets, and dashboard login
details. It intentionally ignores private local env files and allows blank
values, obvious placeholders, and local-only defaults.

## Database Initialization

Docker initialization SQL is intentionally limited to enabling pgvector. Application tables are owned by Drizzle setup commands, not by `docker/init.sql`; this avoids stale foreign-key ordering failures during a fresh database initialization.

RAG report-generation tables use `rag_`-prefixed names so they do not collide with the main notes/meetings/reports tables in the public PostgreSQL schema. During bootstrap, an old local RAG-shaped `report_sections` table is renamed out of the way instead of being deleted.

Existing Docker volumes are not automatically wiped. If a local database already exists from an older setup path, inspect it before resetting it.
