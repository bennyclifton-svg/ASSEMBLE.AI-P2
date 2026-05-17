# Public SaaS Dokploy Deployment

This is the public SaaS launch path. It is separate from the local/private appliance setup and should use a clean SaaS database. Do not migrate local/private customer data into this launch database.

## Services

Use one image with separate Dokploy services and runtime environment variables.

| Service | Command | Health check |
| --- | --- | --- |
| Web | `node scripts/validate-saas-runtime.mjs web && node server.js` | `/api/health/saas` |
| Document worker | `node scripts/validate-saas-runtime.mjs worker && node dist/workers/document-processor/index.js` | process stays running |
| Drawing worker | `node scripts/validate-saas-runtime.mjs worker && node dist/workers/drawing-extractor/index.js` | process stays running |

The Docker image defaults to the web command. In Dokploy, override the command for each worker service.

## Runtime Secrets

Set secrets as Dokploy runtime environment variables. Do not pass server-only values as Docker build arguments.

Required web runtime configuration:

- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_SECRET` or `SESSION_SECRET`
- `DATABASE_URL` or `SUPABASE_POSTGRES_URL`
- `REDIS_URL`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`
- `VOYAGE_API_KEY`
- `ANTHROPIC_API_KEY`
- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_STARTER_PRODUCT_ID`
- `POLAR_PROFESSIONAL_PRODUCT_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Required worker runtime configuration:

- `DATABASE_URL` or `SUPABASE_POSTGRES_URL`
- `REDIS_URL`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`
- `VOYAGE_API_KEY`
- `ANTHROPIC_API_KEY`

## Storage, Database, And Queues

- Use Supabase Storage for customer files: `USE_SUPABASE_STORAGE=true`.
- Use a clean PostgreSQL database with pgvector enabled.
- Use Redis for BullMQ queues.
- Run auth, app, and RAG migrations against the clean SaaS database before traffic.

## Health Checks

The production SaaS health endpoint is:

```text
/api/health/saas
```

It covers web process readiness, database, Redis, storage, workers, Polar billing configuration, Resend email configuration, and required runtime configuration.

## Smoke Checklist

Before public traffic:

- Sign up with a new account and confirm no-card trial state.
- Verify Terms/Privacy consent is required during signup.
- Upload a project document and confirm Supabase Storage is used.
- Run one AI action and confirm usage is metered.
- Start checkout from billing and return from Polar successfully.
- Deliver a validated Polar webhook and confirm local subscription state updates.
- Send or mock account, trial, and billing transactional emails.
- Expire a trial account and confirm read-only behavior blocks create/edit/upload/AI while export stays available.
- Open the billing portal from billing settings.
- Check `/api/health/saas` returns healthy or an actionable degraded/unhealthy component.
