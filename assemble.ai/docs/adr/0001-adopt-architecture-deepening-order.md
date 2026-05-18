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

The codebase already says PostgreSQL is the only supported database, but a legacy SQLite schema module is still present. The action registry also exists beside legacy agent tools and applicators, which creates parallel interfaces for project workspace writes.

## Decision

Adopt the following implementation order:

1. Collapse PostgreSQL schema sources.
2. Deepen the Application Action Registry.
3. Create a shared communication artifact lifecycle module.
4. Unify RAG ingestion and knowledge library sync.
5. Finish context assembly consolidation.

This order removes foundational ambiguity first, then builds the shared command surface before moving higher-level communication, ingestion, and AI-context modules onto it.

## Consequences

- Database work should import table objects from `src/lib/db` or `src/lib/db/pg-schema`.
- `src/lib/db/schema.ts` is no longer a separate schema source; it may only exist as a compatibility shim during migration.
- New project workspace mutations should be registered as application actions.
- Legacy tools, routes, and hooks should become adapters over deeper modules instead of owning duplicate behavior.
- Future architecture reviews should use `docs/strategy/local-private-appliance.md` (current product strategy + domain glossary) and `CODEBASE.md` (current codebase reality) as the starting point. The earlier `CONTEXT.md` companion was archived in May 2026 with the SaaS-era planning material; its glossary content was promoted into the strategy doc.

