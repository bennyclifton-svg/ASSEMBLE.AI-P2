# Deployment Guide

## Production Infrastructure

- **VPS Provider**: Kamatera
- **Server IP**: `45.151.153.218`
- **OS**: Ubuntu 24.04 LTS
- **Hostname**: `assemblep2`
- **App URL**: `https://sitewise.au` (also `https://www.sitewise.au`)
- **Domain registrar**: CrazyDomains (DNS managed there — A records for `sitewise.au` and `www.sitewise.au` both point at `45.151.153.218`)
- **Orchestration**: Docker Swarm (managed by Dokploy)

## Architecture on VPS

| Service       | Role                          | Port (internal) | Network         |
|---------------|-------------------------------|-----------------|-----------------|
| Dokploy       | Deployment dashboard          | 3000            | dokploy-network |
| Traefik       | Reverse proxy (SSL, routing)  | 80 / 443        | dokploy-network |
| App container | Next.js + workers             | 3000            | dokploy-network |
| PostgreSQL 16 | Database (Supabase-hosted)    | 5432            | dokploy-network |
| Redis 7       | Cache / queues                | 6379            | dokploy-network |

## How to Deploy

### 1. Push code to GitHub

```bash
git add .
git commit -m "your message"
git push origin master
```

### 2. SSH into the server

```bash
ssh root@45.151.153.218
```

- Password is set in Kamatera dashboard (can be reset there if forgotten)
- Password characters are **invisible** when typing (normal SSH behavior)

### 3. Pull latest code and rebuild Docker image

```bash
cd /tmp/ASSEMBLE.AI-P2 && git pull origin master
cd assemble.ai && docker build -t assembleai-new \
  --build-arg DATABASE_URL='postgresql://postgres.bhiuvwofowmfrzjfkqlt:Minpin2026!@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres' \
  --build-arg NEXT_PUBLIC_APP_URL='https://sitewise.au' \
  --build-arg NEXT_PUBLIC_SENTRY_DSN='https://YOUR_KEY@oXXXX.ingest.sentry.io/YYYY' \
  .
```

The build takes ~3 minutes. Build args are needed because:
- **DATABASE_URL** - Next.js connects to the database during static page generation
- **NEXT_PUBLIC_APP_URL** - `NEXT_PUBLIC_*` vars are inlined into the client JS bundle at build time; without this, auth session calls default to `localhost:3000` and fail in production
- **NEXT_PUBLIC_SENTRY_DSN** - inlined into the client JS bundle so the browser SDK reports errors. Same value is also baked into the runner stage so the background workers can read it at runtime. Get the DSN from https://sentry.io → your project → Settings → Client Keys (DSN). Leave the build-arg out entirely to disable Sentry.

### 4. Update the running service

```bash
docker service update --image assembleai-new assembleai-assembleai-bxojdu
```

This swaps the image on the Docker Swarm service while keeping all environment
variables, network config, and Traefik routing intact.

### 5. Verify

```bash
docker ps -a
docker logs -f $(docker ps -q -f name=assembleai-assembleai)
```

Then visit the app URL to confirm it's working.

## Domain Setup (sitewise.au)

The app is reached at `https://sitewise.au`. Traefik (running on the VPS) terminates TLS via Let's Encrypt and routes the hostname to the app container.

### One-time DNS

At CrazyDomains → DNS Settings, two A records point at the server:

| Sub Domain    | Type | Value             |
|---------------|------|-------------------|
| `sitewise.au` | A    | `45.151.153.218`  |
| `www.sitewise.au` | A | `45.151.153.218`  |

Verify from any machine: `nslookup sitewise.au` should return `45.151.153.218`.

### Traefik routing on the swarm service

Traefik is configured by labels on the swarm service. To switch the routing hostname from the old `foundry-45-151-153-218.traefik.me` to `sitewise.au`, update the labels in Dokploy (Service → Domains) **or** via CLI:

```bash
docker service update \
  --label-add 'traefik.http.routers.assembleai.rule=Host(`sitewise.au`) || Host(`www.sitewise.au`)' \
  --label-add 'traefik.http.routers.assembleai.entrypoints=websecure' \
  --label-add 'traefik.http.routers.assembleai.tls.certresolver=letsencrypt' \
  --label-add 'traefik.http.routers.assembleai.tls=true' \
  --label-add 'traefik.http.services.assembleai.loadbalancer.server.port=3000' \
  assembleai-assembleai-bxojdu
```

Replace `assembleai` (router/service name) with whatever name is already in use on this swarm if different — check existing labels with:

```bash
docker service inspect assembleai-assembleai-bxojdu --format '{{json .Spec.Labels}}'
```

The cert is issued automatically the first time Traefik sees a request for `sitewise.au`. If the cert fails to issue, check Traefik logs:

```bash
docker logs -f $(docker ps -q -f name=traefik)
```

### Polar webhook URL

After DNS + Traefik are live, update the Polar webhook endpoint at https://polar.sh → Webhooks from the old Traefik URL to:

```
https://sitewise.au/api/auth/polar/webhooks
```

(Sandbox environment: same path on the sandbox dashboard.)

## Dokploy Dashboard

```
https://45.151.153.218:3000
```

Login: bennyclifton@gmail.com

Note: As of Feb 2026, Dokploy requires a paid plan to create new projects.
The existing swarm service can still be updated manually using the steps above.

## Useful Server Commands

```bash
# View running containers
docker ps -a

# View app logs
docker logs -f $(docker ps -q -f name=assembleai-assembleai)

# Restart the app service
docker service update --force assembleai-assembleai-bxojdu

# View Dokploy logs
docker logs -f $(docker ps -q -f name=dokploy)

# Check swarm services
docker service ls
```

## GitHub Repository

```
https://github.com/bennyclifton-svg/ASSEMBLE.AI-P2.git
```

Branch: `master`
