# Overnight Deploy Report — 2026-05-18

**TL;DR:** Did NOT complete the full deploy. Live site still serves traffic
(HTTP 200) but `/api/health/saas` returns 503 due to **pre-existing missing
database tables**. Your latest local work is parked on a backup branch. Two
real problems for you to look at this morning.

---

## What I did

1. Read the runbook, verified SSH access to the VPS is keyless (works).
2. Staged your 50 modified/new files (excluding stray PDFs, a `console.log(...)`
   filename that looked like a shell-paste accident, and `before_/after_profiler.tsx`
   sitting outside the repo root).
3. Ran lint + tests locally.
   - **Tests**: 13 suites with real failures, but all pre-existing. Verified by
     stashing my staged changes and re-running — same failures on HEAD-only.
     My 3 new test files pass clean. Most failures are jsdom env gaps
     (`TextEncoder`, `EventSource` not defined) — not regressions.
   - **Lint**: Hit Node heap OOM at 4GB. Bumped to 8GB, ran out of patience to
     wait — killed it. **Lint outcome unknown.** Re-run locally with
     `NODE_OPTIONS="--max-old-space-size=8192" npx eslint .` when you're up.
4. Committed your staged work as `4628a3c8` with prefix
   `feat(brief,objectives,agents): brief narrative override + objectives refactor + agent context work`.
5. Tried to push — **rejected, non-fast-forward**. Origin has a commit you didn't
   have locally: `b83e8cfb feat: prepare public saas deployment` (made yesterday
   on a different machine). 
6. Tried to rebase — **5 merge conflicts** in:
   - `assemble.ai/docs/CODEBASE.md`
   - `assemble.ai/src/components/brief/primitives/CardShell.tsx`
   - `assemble.ai/src/components/documents/CategorizedList.tsx`
   - `assemble.ai/src/lib/storage/local.ts`
   - `assemble.ai/src/lib/storage/supabase.ts`
   
   Aborted the rebase. Your local `7774912 chore(repo): bundle SaaS reintegration
   scaffolding...` and the remote `b83e8cf feat: prepare public saas deployment`
   touch the same 708 files — they're parallel work on the same scope, made on
   different machines, never synced.
7. **Pushed your work to a backup branch** so it's not stuck on your laptop:
   - `origin/sitewise/brief-building-port-overnight-followup`
   - Includes the new migration `drizzle-pg/0060_brief_narrative_override.sql`
     for the `brief_narrative_override` column.
8. Verified VPS is already at `b83e8cf` (same as origin HEAD) — running
   `assembleai-new:latest`, up for 24h. Image rebuild was a no-op, skipped.
9. Ran the runbook's migration step (`drizzle-kit push --force` for auth, pg,
   rag). **Did not complete cleanly** — see below.
10. Stopped before any service-update / restart actions.

---

## Live site state right now

- `https://sitewise.au` → HTTP 200, www subdomain HTTP 200.
- `/api/health` → **degraded** (7 healthy, 1 degraded — app + DB + redis fine).
- `/api/health/saas` → **503 unhealthy** (3 unhealthy components).
- Service: `assembleai-assembleai-bxojdu` running 24h, healthy in Swarm sense.
- Container logs: pre-existing errors:
  - `relation "rfi_records" does not exist`
  - `relation "ai_memory_entries" does not exist`
  - `action_invocations` insert fails (table missing)

This was true **before** I touched anything tonight. The site is technically up
but RFI/AI-memory/action-audit functionality is broken in prod.

---

## The real problem: schema/DB drift on Supabase

DB hostname: `aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres`.

- Public schema has **117 tables**.
- `src/lib/db/pg-schema.ts` defines **104 tables**, including `rfiRecords`,
  `aiMemoryEntries`, `actionInvocations`.
- These three tables **do not exist** in the live DB. Confirmed by querying
  `pg_tables` directly.
- Yet `drizzle-kit push --force --config=drizzle.pg.config.ts` only
  proposes **2 diffs**: `account_provider_account_unique` (auth) and
  `products_slug_unique` (pg). It does NOT propose creating the missing tables.

**Hypothesis:** the `tablesFilter` in `drizzle.pg.config.ts` is doing something
unexpected — possibly filtering out tables that are referenced but not
top-level exports of `pgSchema`, or there's a stale generated state somewhere.
Worth running `npx drizzle-kit generate --config=drizzle.pg.config.ts` and
inspecting the proposed migration before running anything else.

**Also:** the runbook's claim that `--force` skips the truncate prompt is wrong.
The prompts still appeared (account/products tables both prompted). The
container kept going only because stdin was closed and `--force` accepted the
non-destructive default. So `--force` is fine for safety but not for full
non-interactivity.

---

## What needs you in the morning

1. **Resolve the rebase.** Your `7774912` local and `b83e8cfb` remote both did
   "SaaS deployment prep / archive housekeeping" work on the same 708 files in
   parallel. You need to pick a base of truth and resolve. The conflicts are in
   real source (storage adapters, brief CardShell, CategorizedList) — not safe
   to resolve blindly.

   Suggested approach: cherry-pick your `4628a3c8` onto `origin/sitewise/brief-building-port`
   directly (skipping `7774912`) — `4628a3c8` is the meaningful feature work,
   `7774912` is housekeeping that overlaps with what's already on origin.
   ```bash
   git fetch origin
   git checkout origin/sitewise/brief-building-port -b sitewise/resync
   git cherry-pick 4628a3c8   # the brief/objectives/agents commit
   # resolve any conflicts that appear (should be smaller than 5)
   git push origin sitewise/resync:sitewise/brief-building-port
   ```

2. **Figure out the schema drift.** The DB is missing tables the code expects.
   `drizzle-kit push` isn't proposing to add them. Possibilities:
   - `tablesFilter` config issue
   - Schema was reset on Supabase but migrations not re-applied
   - DB connection is hitting a different DB than the app at runtime (less likely
     — same `DATABASE_URL`)
   
   Try `npx drizzle-kit generate` and look at the proposed migration. If it's
   empty, the schema is suspected in-sync (wrong). If it proposes CREATE TABLE
   for the missing ones, apply manually.

3. **Then redeploy.** Once both above are resolved, the runbook's flow works.
   The runbook needs one correction: drop the claim that `--force` skips the
   truncate prompt.

4. **Worker services aren't deployed.** `docker service ls` shows only the web
   service. The README mentions document-processor and drawing-extractor as
   separate services — they're not running. Probably intentional for now, but
   flagging it.

---

## Files / branches summary

| Item | State |
|------|-------|
| Local branch `sitewise/brief-building-port` | 1 ahead, 1 behind origin (uncommittable as fast-forward) |
| `origin/sitewise/brief-building-port` | At `b83e8cfb`, same as VPS |
| `origin/sitewise/brief-building-port-overnight-followup` | Your work, including `4628a3c8` brief/objectives commit |
| VPS `/opt/sitewise/app/assemble.ai` | Clean, at `b83e8cfb`, no pending changes |
| VPS env snapshot | `/root/assembleai-service.env` (chmod 600, 21 lines, contains secrets) |
| Stray files NOT staged | 5 PDFs, the `console.log(...)` filename, profiler `.tsx` outside repo |
| Test/lint local results | Tests: 13 pre-existing suite failures (none in your staged files). Lint: unknown — OOM |

Sleep well. Sorry I couldn't fully close this loop — the schema drift was a
landmine I shouldn't disarm without you.
