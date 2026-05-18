# Sitewise VPS Deploy Run Sheet

Last known successful deploy: 2026-05-17.

Use this as the quick path for deploying the public SaaS app to the live VPS. Keep the fuller notes in `docs/deployment/public-saas/README.md` as background.

## Live Shape

- Domain: `sitewise.au`
- VPS host: `45-151-153-218.cloud-xip.com`
- SSH user used for the live deploy: `root`
- Canonical app URL: `https://sitewise.au`
- Docker service: `assembleai-assembleai-bxojdu`
- Live image tag used by the service: `assembleai-new:latest`
- Docker network: `dokploy-network`
- Routing: Dokploy + Docker Swarm + Traefik on ports `80` and `443`
- Do not deploy the app as a separate `docker run -p 3001:3000` container for normal production traffic.

## Safety Rules

- Do not paste `docker service inspect` output into chat or docs. It includes live secrets.
- Preserve the existing service environment unless intentionally changing it.
- Use the existing Swarm service and Traefik route instead of creating a second web container.
- If a secret was pasted into a ticket, chat, or terminal transcript, rotate it.
- Choose "No, add the constraint without truncating the table" if Drizzle asks whether to truncate existing product data.

## 1. Connect

From PowerShell:

```powershell
ssh root@45-151-153-218.cloud-xip.com
```

On the VPS:

```bash
cd /opt/sitewise/app/assemble.ai
git fetch origin
git checkout sitewise/brief-building-port
git pull --ff-only origin sitewise/brief-building-port
```

## 2. Preflight

Check the service and routing are still the live Dokploy/Traefik path:

```bash
docker service ls
docker service inspect assembleai-assembleai-bxojdu --pretty
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
```

Check memory and swap before building:

```bash
free -h
```

If swap is missing or tiny, add it once:

```bash
fallocate -l 6G /swapfile-sitewise
chmod 600 /swapfile-sitewise
mkswap /swapfile-sitewise
swapon /swapfile-sitewise
grep -q '/swapfile-sitewise' /etc/fstab || echo '/swapfile-sitewise none swap sw 0 0' >> /etc/fstab
free -h
```

## 3. Build Notes

The VPS build that worked used Debian-based Node images. If `Dockerfile` still uses `node:20-alpine` and `npm ci` exits with `139` or a segmentation fault, switch the Dockerfile stages to `node:20-bookworm-slim`.

The Docker build also needs non-secret placeholders for server-only env used during static collection. The real values must still come from runtime service env:

```Dockerfile
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/assembleai
ENV REDIS_URL=redis://localhost:6379
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret
ENV SESSION_SECRET=build-time-placeholder-session
ENV POLAR_ENABLED=false
ENV EMAIL_VERIFICATION_REQUIRED=false
ENV USE_SUPABASE_STORAGE=false
```

Build the image:

```bash
docker builder prune -f
docker build --no-cache --progress=plain -t sitewise-app:latest \
  --build-arg NEXT_PUBLIC_APP_URL="https://sitewise.au" \
  --build-arg NEXT_PUBLIC_SENTRY_DSN="" \
  .
```

Then tag it with the image name expected by the existing service:

```bash
docker tag sitewise-app:latest assembleai-new:latest
```

## 4. Run Database Migrations

Create a temporary env file from the live service without printing it:

```bash
docker service inspect --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' assembleai-assembleai-bxojdu > /root/assembleai-service.env
chmod 600 /root/assembleai-service.env
```

Run auth, app, and RAG migrations:

```bash
docker run --rm --network dokploy-network \
  --env-file /root/assembleai-service.env \
  -v "$PWD":/app \
  -v sitewise-node-modules:/app/node_modules \
  -w /app \
  node:20-bookworm-slim bash -lc "apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && npm ci && npx drizzle-kit push --config=drizzle.auth.config.ts --force && npx drizzle-kit push --config=drizzle.pg.config.ts --force && npx drizzle-kit push --config=drizzle.rag.config.ts --force"
```

If login fails with `column "trial_started_at" does not exist`, verify the auth columns:

```bash
docker run --rm --network dokploy-network \
  --env-file /root/assembleai-service.env \
  postgres:16 \
  sh -lc 'psql "$DATABASE_URL" -tAc "select column_name from information_schema.columns where table_schema = '"'"'public'"'"' and table_name = '"'"'user'"'"' and column_name in ('"'"'trial_started_at'"'"','"'"'trial_ends_at'"'"','"'"'trial_plan_id'"'"','"'"'trial_status'"'"','"'"'trial_reminder_sent_at'"'"','"'"'terms_accepted_at'"'"','"'"'privacy_accepted_at'"'"') order by column_name;"'
```

As a last resort, add only the missing columns:

```bash
docker run --rm --network dokploy-network \
  --env-file /root/assembleai-service.env \
  postgres:16 \
  sh -lc 'psql "$DATABASE_URL" <<'"'"'SQL'"'"'
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_started_at" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_plan_id" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_status" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_reminder_sent_at" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "privacy_accepted_at" timestamp;
SQL'
```

## 5. Update The Live Service

Make sure Better Auth accepts both root and `www`, while keeping `sitewise.au` canonical:

```bash
docker service update \
  --env-add BETTER_AUTH_TRUSTED_ORIGINS=https://sitewise.au,https://www.sitewise.au \
  --env-add NEXT_PUBLIC_APP_URL=https://sitewise.au \
  --env-add BETTER_AUTH_URL=https://sitewise.au \
  --env-add NEXTAUTH_URL=https://sitewise.au \
  assembleai-assembleai-bxojdu
```

Deploy the new image:

```bash
docker service update --force --image assembleai-new:latest assembleai-assembleai-bxojdu
docker service ps assembleai-assembleai-bxojdu --no-trunc
```

If the update pauses, inspect the failed task and logs before retrying:

```bash
docker service ps assembleai-assembleai-bxojdu --no-trunc
docker service logs assembleai-assembleai-bxojdu --tail 160
```

## 6. Verify

From the VPS:

```bash
curl -I https://sitewise.au
curl -I https://www.sitewise.au
curl -i https://sitewise.au/api/health
curl -i https://sitewise.au/api/health/saas
docker service logs assembleai-assembleai-bxojdu --tail 80 2>&1 | grep -Ei "error|column|relation|database|auth|better|fatal"
```

From local PowerShell:

```powershell
nslookup sitewise.au
```

Expected DNS result: `45.151.153.218`.

Browser smoke test:

- Open `https://sitewise.au`.
- Sign in or create a test account.
- Avoid treating `https://www.sitewise.au` as canonical; it should be accepted or redirected, not used as the main app URL.
- Upload a small document and run one low-cost AI action if testing a release that touched storage, workers, or AI routes.

## Common Failures

- `npm ci` segfaults during Docker build: use `node:20-bookworm-slim`, confirm swap exists, then rebuild.
- Build fails collecting page data for an API route: ensure non-secret build placeholders are present in the Dockerfile builder stage.
- `https://sitewise.au` returns Traefik `404`: the Swarm service may be paused or missing Traefik labels; inspect the service, do not create a second exposed container.
- Login returns `403` from `www.sitewise.au`: add `BETTER_AUTH_TRUSTED_ORIGINS=https://sitewise.au,https://www.sitewise.au`.
- Login returns `500` with missing `trial_*` columns: run the auth Drizzle migration, then verify the columns.
