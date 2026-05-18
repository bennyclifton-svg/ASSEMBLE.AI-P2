# Sitewise Codebase Snapshot

_Snapshot date: 2026-05-18. Branch: `sitewise/brief-building-port`._

This is the current implementation map for Sitewise after the public SaaS reintegration and successful VPS deployment on 2026-05-17. It supersedes the earlier local/private appliance snapshot. The local/private setup remains useful for development and reference, but the current product direction is public SaaS.

## Product Direction

Sitewise is a public SaaS construction project record system for client-side PMs. The first SaaS release is intentionally focused: one-user workspaces, public email/password signup through Better Auth, a no-card 14-day trial, Starter and Professional paid plans, and read-only access after trial expiry until the user subscribes.

Canonical project truth is structured PostgreSQL records and stored files. Chat is interaction history. Reviewable AI memory is advisory preference/context only and must lose to schema records, documents, issued artefacts, and the current user instruction.

The current SaaS strategy note is [docs/strategy/public-saas-reintegration.md](docs/strategy/public-saas-reintegration.md). Public deployment guidance lives under [docs/deployment/public-saas](docs/deployment/public-saas).

## Live Deployment

| Item | Current shape |
| --- | --- |
| Domain | `https://sitewise.au` |
| VPS host | `45-151-153-218.cloud-xip.com` |
| Runtime | Dokploy, Docker Swarm, Traefik |
| Swarm service | `assembleai-assembleai-bxojdu` |
| Service image tag | `assembleai-new:latest` |
| Docker network | `dokploy-network` |
| Run sheet | [docs/deployment/public-saas/sitewise-vps-runbook.md](docs/deployment/public-saas/sitewise-vps-runbook.md) |

The deployed service should be updated through the existing Swarm/Dokploy path. Do not create a second production web container on a random host port.

## Stack

| Layer | Current shape |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript |
| Database | PostgreSQL through Drizzle; pgvector for RAG |
| Auth | Better Auth with trial/signup fields on the auth user record |
| Billing | Polar checkout, customer portal, product mapping, and webhook sync |
| Entitlements | Trial/subscription evaluator with read/write/upload/AI/export gates |
| Queue/workers | BullMQ on Redis; document processor and drawing extractor workers run beside the app |
| Storage | `src/lib/storage` supports local and Supabase-compatible storage; public SaaS should use Supabase Storage |
| AI/RAG | Anthropic/OpenAI-compatible providers, Voyage embeddings, BAAI/Cohere reranking |
| Email | Resend-backed transactional email wrappers and trial reminder job |
| Deployment | Docker image with web and worker commands, Dokploy/VPS runtime env, Traefik routing |

## Public SaaS Runtime Path

The public SaaS path is:

1. Visitor lands on the public site and pricing pages.
2. Starter or Professional plan intent is carried into signup.
3. Better Auth creates the user.
4. Signup lifecycle creates a one-user organization/workspace, knowledge libraries, signup consent state, and a 14-day trial.
5. Entitlement evaluation grants full trial access within caps.
6. Project APIs prove workspace/project ownership before returning data.
7. Writes, uploads, and AI actions pass entitlement and usage gates before mutating data or spending model cost.
8. Expired trials remain logged in and can read/export/download owned data, but cannot create, edit, upload, or run AI actions.
9. Billing routes and UI connect the user to Polar checkout or the customer portal.

## Repository Shape

```text
src/
  app/
    (public)/                 landing, pricing, legal, contact, support pages
    (auth)/                   login/register flows
    (dashboard)/settings      account, billing, memory, seed knowledge, admin settings
    api/account               profile and account state
    api/health/saas           production SaaS readiness API
    api/projects/[id]         project routes moving through ownership and entitlement gates
  components/
    auth/                     login/register UI with signup consent and plan intent
    billing/                  pricing cards, subscription state, billing portal, upgrade modal
    entitlements/             read-only/trial/subscription banners
    legal/                    shared legal page shell
    rfi/                      typed RFI register panel
    ai-memory/                reviewable AI memory surface
  lib/
    auth/                     current user, project access, signup lifecycle
    billing/                  Polar checkout and webhook sync
    subscription/             plan catalog, trial state, entitlements, usage and document gates
    email/                    transactional, billing, and trial reminder email
    health/                   local appliance and public SaaS health checks
    storage/                  local/Supabase-compatible storage abstraction
    actions/                  Application Action Registry and action definitions
    agents/                   chat runner, specialists, tools, approvals
    rfi/                      typed RFI domain service and issued artefacts
workers/                      document and drawing background workers
drizzle-auth/                 Better Auth/admin/storage/trial/consent migrations
drizzle-pg/                   main app migrations, including RFIs, AI memory, usage events
docs/deployment/public-saas/  production SaaS deployment docs and VPS run sheet
docs/setup/                   local development/bootstrap docs
archive/                      historical docs, specs, and older deployment material
```

## Implemented SaaS Work

| Area | Runtime shape |
| --- | --- |
| Public offer | Starter and Professional public plans; Free is internal fallback only |
| Trial model | 14-day no-card trial with one project, document cap, and AI action cap |
| Signup lifecycle | Better Auth signup creates organization, trial fields, consent fields, and knowledge libraries |
| Entitlements | `evaluateEntitlements()` computes active trial, expired trial, active subscription, canceled, past due, or missing subscription |
| Read-only expiry | Expired users can read/export/download owned data but writes/uploads/AI actions are blocked |
| Usage metering | `ai_usage_events` records AI usage for project/user/organization periods |
| Project access | Shared helpers enforce workspace ownership and entitlement gates across selected project APIs |
| Billing | Polar checkout, webhook sync, billing panel, subscription card, upgrade modal |
| Email | Transactional email wrappers and trial reminder job |
| Legal/support | Terms, Privacy, Contact, and Support public pages |
| Health | `/api/health/saas` checks production readiness for runtime config and dependencies |
| Deployment | Dokploy/VPS run sheet documents the working `sitewise.au` deployment |
| Existing PM product | Typed RFIs, AI memory, weekly reports, cost/program/procurement surfaces, RAG, and workers remain part of the SaaS app |

## Core Data Model Updates

Better Auth user records now carry public SaaS lifecycle fields:

- `trial_started_at`
- `trial_ends_at`
- `trial_plan_id`
- `trial_status`
- `trial_reminder_sent_at`
- `terms_accepted_at`
- `privacy_accepted_at`

The main app schema includes public product/billing support and AI usage events:

- `products` and transaction-related billing tables remain the app-side billing/product surface.
- `ai_usage_events` records metered AI actions.
- RFI tables (`rfi_records`, `rfi_evidence_links`, `rfi_audit_events`, `rfi_issued_artefacts`) remain the typed contract-administration register.
- `ai_memory_entries` remains advisory memory and is not project truth.
- Auth storage settings support local or Supabase-compatible storage configuration.

## Security And Access Rules

Public SaaS APIs must derive identity from Better Auth and then prove ownership or admin authority before returning data.

Use these helpers for project routes:

- `requireProjectReadAccess(projectId)` for owned reads.
- `requireWritableProjectAccess(projectId)` for creates/updates/deletes.
- `requireUploadProjectAccess({ projectId, incomingDocumentCount })` for uploads.
- `requireExportProjectAccess(projectId)` for export/download routes that remain available in read-only mode.
- `requireAiProjectAccess({ projectId, action, metadata })` before model calls or AI worker cost.

New mutating agent/workflow behavior still belongs behind registered actions. The action policy lives in [docs/strategy/action-only-writes-policy.md](docs/strategy/action-only-writes-policy.md).

## Deployment Notes

Use [docs/deployment/public-saas/sitewise-vps-runbook.md](docs/deployment/public-saas/sitewise-vps-runbook.md) for the working VPS path.

Important deployment lessons from the successful 2026-05-17 deploy:

- Keep live secrets in service environment variables, not in Docker build args or docs.
- Do not paste `docker service inspect` output; it includes secrets.
- The VPS build needed Debian-based Node images (`node:20-bookworm-slim`) when Alpine builds segfaulted during `npm ci`.
- The Docker build may need non-secret placeholders for server-only env during Next static collection; runtime values still come from the service env.
- Run auth, app, and RAG migrations before or during deploy.
- If login fails with missing `trial_*` columns, run the auth migration and verify production columns.
- Keep `https://sitewise.au` canonical and trust both `https://sitewise.au` and `https://www.sitewise.au` for Better Auth origins.

## Local Development

The repeatable local path is still:

```bash
npm install
npm run local:bootstrap
npm run dev
```

Then, with the dev server running:

```bash
npm run local:smoke
npm run local:backup-smoke
npm run secret:hygiene
```

SaaS runtime validation:

```bash
npm run saas:validate:web
npm run saas:validate:worker
```

Database pushes:

```bash
npm run db:auth:push
npm run db:push
npm run db:rag:push
```

## Documentation Boundary

- [README.md](README.md): product and setup entry point.
- [CLAUDE.md](CLAUDE.md): short-lived agent context and rules.
- [docs/strategy/public-saas-reintegration.md](docs/strategy/public-saas-reintegration.md): SaaS product and architecture boundary.
- [docs/deployment/public-saas/README.md](docs/deployment/public-saas/README.md): general public SaaS Dokploy guidance.
- [docs/deployment/public-saas/sitewise-vps-runbook.md](docs/deployment/public-saas/sitewise-vps-runbook.md): concise working VPS run sheet.
- [docs/setup/local-private-bootstrap.md](docs/setup/local-private-bootstrap.md): local development bootstrap.
- [docs/agents/README.md](docs/agents/README.md): runtime-agent documentation boundary.
- [docs/skills/README.md](docs/skills/README.md): source-material archive index.
- `archive/`: historical docs, specs, and older deployment material.

## Remaining Architecture Work

- Continue moving project APIs onto shared Better Auth ownership and entitlement helpers.
- Split web/document-worker/drawing-worker into separately managed Dokploy services when operationally needed.
- Harden Polar webhook idempotency and billing edge cases around canceled, past due, and reactivated states.
- Keep storage production-safe with Supabase Storage and make local storage clearly development-only for SaaS.
- Expand account/data controls beyond the first settings surface as launch support needs become clearer.
- Keep deployment docs and secret hygiene checks aligned with the live VPS path.
