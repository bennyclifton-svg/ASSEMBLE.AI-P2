# Deployment Notes (Scrubbed)

This archived note replaces an older VPS/public-SaaS deployment guide. It is
kept as safe source material only: it must not contain live hosts, passwords,
database URLs, dashboard logins, root SSH commands, or provider account details.

For the current product direction, use the local/private appliance guidance in
`docs/strategy/local-private-appliance.md` and the setup path in
`docs/setup/local-private-bootstrap.md`.

## Current Direction

Sitewise is being shaped as a local/private single-user project appliance. A
deployment may run on a PM's workstation, a small office server, or a private
managed instance. It is not currently documented as a public SaaS-first rollout.

The appliance needs these runtime services:

- Next.js application and bundled workers
- PostgreSQL with pgvector
- Redis for queues/background work
- local or private object/file storage
- model-provider keys configured by the operator
- health, backup, restore, and export/import checks before customer handoff

## Secret Handling

Never commit real secret values to this repo. Keep real values in one of these
operator-controlled locations:

- local `.env.local` for local/private development
- deployed service environment variables
- the operator's private secret store
- a private infrastructure repository outside this app repo

Committed docs and examples should use blank values or placeholders only:

```bash
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
REDIS_URL=redis://<user>:<password>@<host>:6379
BETTER_AUTH_SECRET=<generated-secret>
SESSION_SECRET=<generated-secret>
ANTHROPIC_API_KEY=<provider-key>
OPENAI_API_KEY=<provider-key>
OPENROUTER_API_KEY=<provider-key>
VOYAGE_API_KEY=<provider-key>
POLAR_ACCESS_TOKEN=<billing-token>
POLAR_WEBHOOK_SECRET=<webhook-secret>
```

Local-only defaults such as
`postgresql://postgres:postgres@localhost:5432/assembleai` are acceptable when
they are clearly marked as local development values.

## Container Build Guidance

Do not pass server-only secrets such as `DATABASE_URL`, provider API keys, auth
secrets, or webhook secrets as Docker build arguments. Build args can appear in
image metadata and build logs; server-only values belong in the runtime
environment.

Only public build-time values should be passed during image build, for example:

```bash
docker build -t sitewise-app \
  --build-arg NEXT_PUBLIC_APP_URL='https://<app-host>' \
  --build-arg NEXT_PUBLIC_SENTRY_DSN='<public-sentry-dsn-or-empty>' \
  .
```

Runtime secrets should be injected by the deployment target:

```bash
docker run --env-file /path/to/private-sitewise.env sitewise-app
```

For Docker Swarm, a private managed platform, or a hosted container service,
store the same values in that platform's secret/environment-variable system.
Inspect environment variable names without printing values when debugging.

## Private Appliance Checklist

Before handing an appliance to a customer or beta user, verify:

- the app starts with runtime secrets supplied outside the repo
- PostgreSQL and pgvector are reachable
- Redis is reachable
- document and drawing workers start with the same environment contract
- local/private file storage works
- `npm run local:smoke` or an equivalent deployment smoke check passes
- `npm run local:backup-smoke` or an equivalent restore test passes
- no docs or committed config contain live secrets

Run the repository hygiene check before release:

```bash
npm run secret:hygiene
```

If the check flags a value that is intentionally fake, replace it with an
obvious placeholder such as `<provider-key>`, `your-provider-key`, or a blank
assignment.
