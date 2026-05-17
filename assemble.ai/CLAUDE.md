# Sitewise - Agent Context

Read this before making changes in the repo.

## Product Direction

- Current strategy: `docs/strategy/local-private-appliance.md`
- Public SaaS reintegration track: `docs/strategy/public-saas-reintegration.md`
- North star: Sitewise is a private project record system where an AI project officer helps one accountable PM keep one live project coherent, evidenced, and ready to issue.
- Design centre: local/private single-user project appliance for the current runnable path; public SaaS reintegration is now a separate staged track, not a wholesale revert.
- Canonical truth: structured PostgreSQL records and stored files.
- Chat: interaction history and operational surface, not the project record.
- AI memory: reviewable preferences/context only. Records, documents, issued artefacts, and current user instructions override memory.
- Writes: new agent/workflow mutations must use registered application actions and approval gates.

## Current Proof Points

- Typed RFI register: `src/lib/rfi`, `src/components/rfi`, `src/app/api/projects/[projectId]/rfis`, migrations `0054` to `0057`.
- AI-drafted RFI proposal: action `correspondence.rfi.create`, tool `create_rfi`.
- Reviewable AI memory: `src/lib/ai-memory`, `src/components/ai-memory`, `/api/projects/[projectId]/ai-memory`, migration `0058`.
- Weekly report draft: action `correspondence.weekly_report.create_draft`, tool `create_weekly_report_draft`, `src/lib/weekly-report-draft`.
- Local appliance health: `/api/health`, `/setup/status`, `src/lib/health`.
- Backup/restore smoke path: `src/lib/backup`, `scripts/project-backup.ts`, `scripts/project-restore.ts`.

## Local Setup

```bash
npm install
npm run local:bootstrap
npm run dev
```

Then, once the app is running:

```bash
npm run local:smoke
npm run local:backup-smoke
npm run secret:hygiene
```

Detailed setup lives at `docs/setup/local-private-bootstrap.md`. Backup and restore usage lives at `docs/setup/local-backup-restore.md`.

## Environment Contract

Local development loads environment files in this order:

1. `.env.local`
2. `.env.development`
3. `.env`

Use `.env.development` for safe local defaults. Use `.env.local` for real local secrets and machine-specific overrides. Do not commit live secrets.

Key local defaults:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/assembleai
REDIS_URL=redis://localhost:6379
USE_SUPABASE_STORAGE=false
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Model keys are optional for boot but required for the features that call providers:

```bash
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
VOYAGE_API_KEY=
COHERE_API_KEY=
LLAMA_CLOUD_API_KEY=
UNSTRUCTURED_API_KEY=
```

## Architecture Rules

- PostgreSQL/pgvector is the data platform. Do not add SQLite or `project.db` paths.
- Use `src/lib/db` / `src/lib/db/pg-schema.ts` for app schema imports.
- Use `projectStakeholders` for new stakeholder work; older consultant/contractor tables remain compatibility surfaces.
- New agent/workflow writes must be registered actions. See `docs/strategy/action-only-writes-policy.md`.
- Do not add new regex authority to the runner for mutations when a typed action/schema policy can enforce the behavior.
- Workers must load env files in the same order as the Next app.
- `docs/skills/*/SKILL.md` files are source/reference material only. They are not runtime skills.

## Useful Commands

```bash
npm run db:push
npm run db:auth:push
npm run db:rag:push
npm run test
npm run lint
```

Before release or customer handoff, run:

```bash
npm run secret:hygiene
```
