# ADR 0001: Adopt Architecture Deepening Order

## Status

Accepted

## Date

2026-05-02

## Context

The architecture review found five high-leverage deepening opportunities:

1. collapse PostgreSQL schema sources
2. deepen the Application Action Registry
3. create a shared communication artifact lifecycle module
4. unify RAG ingestion and knowledge library sync
5. finish context assembly consolidation

PostgreSQL is the only supported database. Historical SQLite-era residue should not remain in live schema or script surfaces: `src/lib/db/schema.ts` may only re-export PostgreSQL tables, domain enums belong outside the schema shim, and one-off SQLite migration runners should be retired rather than discovered as supported tools. The action registry also exists beside legacy agent tools and applicators, which creates parallel interfaces for project workspace writes.

## Decision

Adopt the following implementation order:

1. Collapse PostgreSQL schema sources. Completed on 2026-05-20; `src/lib/db/schema.ts` is a compatibility re-export only, RAG schema references point at PostgreSQL-owned tables, and the old SQLite-to-PostgreSQL runner was retired from live scripts.
2. Deepen the Application Action Registry.
3. Create a shared communication artifact lifecycle module.
4. Unify RAG ingestion and knowledge library sync.
5. Finish context assembly consolidation.

This order removes foundational ambiguity first, then builds the shared command surface before moving higher-level communication, ingestion, and AI-context modules onto it.

## Consequences

- Database work should import table objects from `src/lib/db` or `src/lib/db/pg-schema`.
- `src/lib/db/schema.ts` is no longer a separate schema source; it may only exist as a compatibility re-export during migration and must not own enum compatibility exports.
- Retired SQLite-era scripts should stay out of live script paths; recover them from git history only for historical one-off migrations.
- With database collapse closed, the next active deepening priorities are the Application Action Registry, then the shared communication artifact lifecycle module.
- New project workspace mutations should be registered as application actions.
- Legacy tools, routes, and hooks should become adapters over deeper modules instead of owning duplicate behavior.
- Future architecture reviews should use `docs/strategy/local-private-appliance.md` (current product strategy + domain glossary) and `CODEBASE.md` (current codebase reality) as the starting point. The earlier `CONTEXT.md` companion was archived in May 2026 with the SaaS-era planning material; its glossary content was promoted into the strategy doc.
