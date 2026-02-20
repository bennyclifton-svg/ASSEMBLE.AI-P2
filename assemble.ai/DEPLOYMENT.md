# Deployment Guide

## Production Infrastructure

- **VPS Provider**: Kamatera
- **Server IP**: `45.151.153.218`
- **OS**: Ubuntu 24.04 LTS
- **Hostname**: `assemblep2`
- **App URL**: `http://foundry-45-151-153-218.traefik.me`
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
  --build-arg NEXT_PUBLIC_APP_URL='http://foundry-45-151-153-218.traefik.me' \
  .
```

The build takes ~3 minutes. Build args are needed because:
- **DATABASE_URL** - Next.js connects to the database during static page generation
- **NEXT_PUBLIC_APP_URL** - `NEXT_PUBLIC_*` vars are inlined into the client JS bundle at build time; without this, auth session calls default to `localhost:3000` and fail in production

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
