# Source Material Review Note

Date: 2026-05-14

Issue: `docs/issues/2026-05-14-local-private-rfi-appliance/013-archive-docs-skills-as-source-material.md`

## Result

The `docs/skills` collection is now documented as a source-material archive. It is not runtime-loaded, and the index explains how to mine useful content into knowledge libraries, prompt/source context, action specs, workflow specs, product docs, or follow-up issues.

Live-facing docs have been checked for misleading runtime-skill wording and stale desktop-harness assumptions. The active guidance now points readers to the archive/index and says to translate old `project.db`, ChromaDB, file-watcher, Python-pipeline, and direct-SQL language into current Sitewise runtime concepts before implementation.

## Current Runtime Boundary

- No runtime code was changed for this issue.
- No generic skill loader or plugin system was added.
- No ChromaDB, SQLite/project.db, desktop file watcher, or autonomous write path was added.
- Runtime writes remain bounded by the application action and approval-gate direction.

## Documentation Check

Review command used:

```powershell
rg -n "docs/skills|docs\\skills|SKILL\.md|runtime skill|live skills|loaded as live|loaded at runtime|skill loader|project\.db|ChromaDB|Chroma-style|file watcher|desktop harness" README.md CLAUDE.md CODEBASE.md docs archive -g "*.md"
```

Expected remaining matches after this issue:

- Historical/archive material may still mention old assumptions when clearly framed as historical or source material.
- Files under `docs/skills/**/SKILL.md` may still contain their original source text; the directory-level README now scopes those files as source material.
- Archived plans under `archive/` may still preserve old wording for historical traceability.
- Current runtime-facing docs should not tell implementers that `docs/skills/**/SKILL.md` files are live runtime skills or should be loaded by a new skill loader.

## Follow-Up Guidance

If a future slice promotes one archived source file into product behaviour, that slice should create or update the current artefact directly: a knowledge-library seed, prompt/source context, action definition, workflow spec, product doc, or implementation issue. The archived source file should remain provenance unless the follow-up explicitly retires it.
