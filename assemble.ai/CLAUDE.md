# Sitewise - Agent Context

Read this before making changes in the repo.

## Product Direction

- Current launch target: public SaaS at `https://sitewise.au`.
- Public SaaS strategy: `docs/strategy/public-saas-reintegration.md`.
- Deployment run sheet: `docs/deployment/public-saas/sitewise-vps-runbook.md`.
- Local/private appliance docs remain useful for local development and historical context, but they are no longer the headline launch path.
- North star: Sitewise is a construction project record system where an AI project officer helps one accountable PM keep live work coherent, evidenced, and ready to issue.
- Current SaaS boundary: one-user workspaces, public signup, no-card 14-day trial, Starter and Professional paid plans, and no public Free plan after trial.
- Canonical truth: structured PostgreSQL records and stored files. Chat is interaction history and operational surface, not the project record.
- AI memory: reviewable preferences/context only. Records, documents, issued artefacts, and current user instructions override memory.
- Writes: new agent/workflow mutations must use registered application actions and approval gates.

## Current Proof Points

- Live public deployment: `sitewise.au` on Dokploy/VPS with Docker Swarm and Traefik.
- SaaS deployment docs: `docs/deployment/public-saas/README.md` and `docs/deployment/public-saas/sitewise-vps-runbook.md`.
- Public plan catalog and trial terms: `src/lib/subscription/plan-catalog.ts`, `src/lib/subscription/trial.ts`.
- Entitlements and read-only expired trial behavior: `src/lib/subscription/entitlement-evaluator.ts`, `src/lib/subscription/entitlement-guards.ts`, `src/components/entitlements/EntitlementBanner.tsx`.
- Project access and SaaS gates: `src/lib/auth/project-access.ts`, `src/lib/subscription/document-gates.ts`, `src/lib/subscription/ai-usage-meter.ts`.
- Signup lifecycle and consent: `src/lib/auth/signup-lifecycle.ts`, `src/components/auth/RegisterForm.tsx`, `drizzle-auth/0007_public_saas_trial_fields.sql`, `drizzle-auth/0009_signup_consent.sql`.
- Billing and Polar integration: `src/lib/billing`, `src/components/billing`, `src/lib/polar/plans.ts`.
- Account/admin surfaces: `src/app/api/account`, `src/app/(dashboard)/settings/account`, `src/app/(dashboard)/settings/billing`, `src/app/(dashboard)/settings/(admin)`.
- Legal/support pages: `src/app/(public)/terms`, `src/app/(public)/privacy`, `src/app/(public)/contact`, `src/app/(public)/support`.
- SaaS health check: `/api/health/saas`, implemented in `src/lib/health/saas-health.ts`.
- Transactional email: `src/lib/email`, `scripts/send-trial-reminders.ts`.
- Typed RFI register, AI memory, weekly report drafts, and action-backed workflows remain part of the SaaS product surface.

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

Detailed local setup lives at `docs/setup/local-private-bootstrap.md`. Public SaaS deployment lives under `docs/deployment/public-saas/`.

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

Public SaaS runtime values belong in Dokploy/service environment variables, not in Docker build args or docs. Required production groups include:

- app URLs and auth secrets: `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` or `SESSION_SECRET`
- data plane: `DATABASE_URL` or `SUPABASE_POSTGRES_URL`, `REDIS_URL`
- storage: Supabase URL/key values with `USE_SUPABASE_STORAGE=true`
- AI/RAG providers: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `VOYAGE_API_KEY`, and optional provider keys
- billing/email: Polar product/webhook/access values, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

Never paste `docker service inspect` output into chat or docs; it includes live secrets.

## Architecture Rules

- PostgreSQL/pgvector is the data platform. Do not add SQLite or `project.db` paths.
- Use `src/lib/db` / `src/lib/db/pg-schema.ts` for app schema imports and `src/lib/db/auth-schema.ts` for Better Auth/admin schema.
- Public SaaS access decisions should flow through Better Auth user state plus Polar/trial entitlement state.
- Project APIs should derive the user from Better Auth and use `src/lib/auth/project-access.ts` helpers.
- Reads require project/workspace ownership. Writes require writable entitlement. Uploads require upload allowance. AI routes require AI allowance. Exports/downloads stay allowed for read-only expired users who own the data.
- Use `src/lib/subscription/plan-catalog.ts` as the source of truth for public plans, trial limits, paid limits, and Polar product mapping.
- New agent/workflow writes must be registered actions. See `docs/strategy/action-only-writes-policy.md`.
- Do not add new regex authority to the runner for mutations when a typed action/schema policy can enforce the behavior.
- Workers must load env files in the same order as the Next app and must pass SaaS runtime validation in production.
- `docs/skills/*/SKILL.md` files are source/reference material only. They are not runtime skills.
- Keep deployment secrets out of Git, docs, screenshots, and chat transcripts.

## Useful Commands

```bash
npm run db:push
npm run db:auth:push
npm run db:rag:push
npm run test
npm run lint
npm run saas:validate:web
npm run saas:validate:worker
```

Before release, deployment, or customer handoff, run:

```bash
npm run secret:hygiene
```
