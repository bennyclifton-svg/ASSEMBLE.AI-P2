# Agent Documentation Boundary

The files in this directory are agent persona and capability documents. They are not, by themselves, proof that a runtime specialist is wired into the app.

For current runtime behaviour, check the TypeScript agent registry, specialist definitions, tool catalog, application actions, workflows, and approval paths. Some agent documents intentionally preserve source material for future specialists or future workflow slices.

When these docs mention older `project.db`, ChromaDB, file-watcher, desktop-harness, or direct-SQL patterns, treat that language as historical source material unless the current runtime has a matching implementation. Translate it to current Sitewise concepts before implementation:

- PostgreSQL/Drizzle records for project truth
- pgvector-backed RAG for document search
- document processing workers and explicit workflow triggers for intake
- registered application actions for writes
- approval gates, audit, and project events for mutations

The archived skill material in `docs/skills` follows the same rule. See `docs/skills/README.md`.
