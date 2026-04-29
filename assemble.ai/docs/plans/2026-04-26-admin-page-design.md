# Admin Page Design — Operator Console

**Date:** 2026-04-26
**Status:** Design approved, ready for implementation
**Scope:** Operator-only admin (`/admin/*`) for user management and AI model selection

## Context

Two driving needs surfaced together:

1. **AI cost control.** The codebase had 24 hardcoded AI model references across 17 files. When `claude-3-5-haiku-20241022` was retired in April 2026, invoice extraction (and 16 other features) silently broke until the model IDs were swept across all files. We want one place to swap models — and the cost lever to demote non-critical features from Sonnet to Haiku, or to a cheaper provider via OpenRouter.

2. **User administration.** No way today to see who has signed up, suspend a bad actor, or trigger a password reset for a stuck user. The `/admin` route exists as a stub (Polar product editor only) but doesn't gate on role.

Audience: **operator only** (Ben + future co-founders/staff). No per-org admin layer. No customer-facing admin.

## Goals

- Cost: ability to swap any non-critical AI feature to a cheaper model in seconds, no redeploy.
- Operations: list/search users, suspend/unsuspend, trigger password reset.
- Resilience side-effect: provider abstraction means single-provider outages no longer kill the app.
- Audit trail: every admin action logged.

## Non-goals

- No per-org admin (each customer's admin UI). Defer until multi-org rolls out.
- No "create user" / "delete user" / "impersonate". Suspend covers the operational need; create/delete/impersonate are too risky to ship unguarded.
- No real-time billing dashboard. Polar already has one.
- No model A/B testing framework. Single picked model per feature group.

---

## 1. Access control

### Super-admin flag

Add `isSuperAdmin: boolean` (default `false`) to the existing `user` table in [src/lib/db/auth-schema.ts](src/lib/db/auth-schema.ts) (Better Auth's user table).

- **No UI to grant.** Set via SQL migration / one-off seed script. Granting super-admin = giving someone the keys; explicit manual flip is the safety.
- Operator's own user gets seeded as super-admin during the migration.

### Route gate

Replace the TODO at [src/app/admin/layout.tsx:36](src/app/admin/layout.tsx#L36):

```ts
if (!session?.user?.isSuperAdmin) {
    redirect('/dashboard?error=admin-only');
}
```

API routes get the same gate via a shared helper:

```ts
// src/lib/admin/guard.ts
export async function requireSuperAdmin(req: NextRequest): Promise<{ user: User }> {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.isSuperAdmin) {
        throw new Response('Forbidden', { status: 403 });
    }
    return { user: session.user };
}
```

Used by every `/api/admin/*` route. Server-side check; not optional.

### Audit log

New `admin_audit_log` table:

| column | type | purpose |
|---|---|---|
| `id` | uuid | PK |
| `createdAt` | timestamp | When |
| `actorUserId` | uuid (FK user) | Who did it |
| `action` | text | e.g. `user.suspend`, `model.update` |
| `targetType` | text | e.g. `user`, `model_settings` |
| `targetId` | text | uuid or feature_group key |
| `beforeJson` | jsonb (nullable) | previous state |
| `afterJson` | jsonb (nullable) | new state |

Surfaced on each admin page as a small "recent activity" panel. Read-only — no edit/delete from UI.

---

## 2. User admin (`/admin/users`)

### UI

Single table page (no nested routes).

**Columns:** Email · Name · Org · Plan (from Polar) · Signed up · Last login · Status (Active / Suspended)

**Header:** Search box (filters by email or name) · two filter chips ("Show suspended only", "Show active only") · sortable column headers.

**Row actions** (right-aligned dropdown):

| Action | Behaviour |
|---|---|
| **Suspend** / **Unsuspend** | Toggles `suspendedAt: timestamp \| null` on the user row. Revokes all active sessions on suspend. Audit logged. |
| **Trigger password reset** | Calls `auth.api.forgetPassword({ email })` server-side. Confirmation toast on click — fires immediately, no confirm dialog. Audit logged. |

### Schema additions

Add to `user` table in [src/lib/db/auth-schema.ts](src/lib/db/auth-schema.ts):

- `isSuperAdmin: boolean` (default `false`)
- `suspendedAt: timestamp` (nullable)

### API routes

All guarded by `requireSuperAdmin`:

- `GET  /api/admin/users` — paginated list with search/filter (joins user + org membership + Polar subscription)
- `POST /api/admin/users/[id]/suspend` — sets `suspendedAt = now()` + `auth.api.revokeUserSessions(userId)` + audit
- `POST /api/admin/users/[id]/unsuspend` — sets `suspendedAt = null` + audit
- `POST /api/admin/users/[id]/reset-password` — `auth.api.forgetPassword({ email })` + audit

### Suspension enforcement

Add a Better Auth `before` hook on `signIn`:

```ts
// in src/lib/better-auth.ts
hooks: {
    before: [
        {
            matcher: (ctx) => ctx.path.startsWith('/sign-in'),
            handler: async (ctx) => {
                const user = await db.query.user.findFirst({
                    where: eq(user.email, ctx.body.email),
                });
                if (user?.suspendedAt) {
                    throw new APIError('UNAUTHORIZED', { message: 'Account suspended. Contact support.' });
                }
            },
        },
    ],
},
```

---

## 3. Model registry (`/admin/models`)

### Feature groups

The 17 AI call sites cluster into 5 logical groups:

| Group key | What it does | Default model | Files |
|---|---|---|---|
| `document_extraction` | Reads PDFs (invoices, variations) directly | `claude-sonnet-4-6` (native PDF support) | [invoice/extract.ts](src/lib/invoice/extract.ts), [variation/extract.ts](src/lib/variation/extract.ts) |
| `text_extraction` | Pulls structured fields from text | `claude-haiku-4-5-20251001` | planning/extract, planning/extract-objectives, contractors/extract, consultants/extract, invoice/extract (text fallback), variation/extract (text fallback) |
| `cost_line_matching` | Matches invoice/variation to a cost line | `claude-haiku-4-5-20251001` | invoice/cost-line-matcher, variation/cost-line-matcher |
| `content_generation` | Long-form writing | `claude-sonnet-4-6` | note-content-generation, inline-instruction, ai-content-generation (generate), generate-section, trr/generate, retrieval/generate-field, objectives/generate |
| `content_polishing` | Edits/refines existing prose | `claude-sonnet-4-6` | ai-content-generation (polish), objectives/polish |

### Schema

New `model_settings` table:

| column | type | notes |
|---|---|---|
| `featureGroup` | text PK | one of the 5 group keys above |
| `provider` | text | `'anthropic' \| 'openrouter'` |
| `modelId` | text | provider-specific id, e.g. `claude-sonnet-4-6` or `google/gemini-2.5-flash` |
| `updatedAt` | timestamp | |
| `updatedBy` | uuid (FK user) | for audit |

Seeded with current Anthropic models per the table above.

### Provider abstraction

New `src/lib/ai/` module:

```
src/lib/ai/
  ├── registry.ts    — reads model_settings, in-memory cache (60s TTL)
  ├── client.ts      — exports aiComplete({ featureGroup, messages, system, maxTokens })
  ├── pricing.ts     — hardcoded $/1M token reference table for cost panel
  └── types.ts       — FeatureGroup type, AICompleteRequest, AICompleteResponse
```

`aiComplete` looks up the configured provider+model for the feature group, dispatches to:

- **Anthropic** — existing `@anthropic-ai/sdk` SDK
- **OpenRouter** — `openai` SDK pointed at `baseURL: 'https://openrouter.ai/api/v1'` with the `OPENROUTER_API_KEY` env var

All 17 call sites refactored: drop direct `Anthropic` import, switch to `aiComplete({ featureGroup: 'content_generation', ... })`.

### PDF handling — both providers supported

`document_extraction` is the only group with provider-specific PDF input shape. Two paths:

1. **Anthropic provider** — pass PDF as `{ type: 'document', source: { type: 'base64', media_type: 'application/pdf' } }` (current behaviour).
2. **OpenRouter provider** — extract text first via `pdfjs-dist` (text-layer PDFs) → if no text, fall back to **Tesseract OCR** for image-only PDFs → pass extracted text as a normal `text` message.

Both branches produce the same downstream result. The picker shows all providers for `document_extraction` (no greying-out).

### Tesseract integration

- npm: `tesseract.js` (pure JS, no native binary) OR system `tesseract-ocr` invoked via child process for performance.
- Recommendation: **system tesseract** — much faster on multi-page PDFs and the Kamatera VPS can host it via apt-get. Add to Dockerfile: `RUN apt-get install -y tesseract-ocr poppler-utils` (poppler for `pdftoppm` to convert PDF pages to images).
- Implementation lives in `src/lib/ai/pdf-ocr.ts`. Single function: `pdfToText(buffer): Promise<string>`. Tries text layer first (fast), falls back to OCR (slow but reliable).

### Admin UI

`/admin/models` page:

```
┌─ Feature group ─────────┬─ Provider ──┬─ Model ────────────────┬─ ~$ / 1M tok ─┐
│ Document extraction     │ Anthropic   │ claude-sonnet-4-6      │  $3 / $15     │
│ Text extraction         │ OpenRouter  │ google/gemini-2.5-flash│  $0.075/$0.30 │
│ Cost-line matching      │ Anthropic   │ claude-haiku-4-5       │  $0.80 / $4   │
│ Content generation      │ Anthropic   │ claude-sonnet-4-6      │  $3 / $15     │
│ Content polishing       │ Anthropic   │ claude-haiku-4-5       │  $0.80 / $4   │
└─────────────────────────┴─────────────┴────────────────────────┴───────────────┘
[Save changes]   Recent activity ▼
```

Provider dropdown → model dropdown (model list filtered by chosen provider). Save writes to `model_settings` + audit log. 60s cache means changes propagate within a minute.

---

## 4. Implementation phases

| # | Phase | What ships | Size |
|---|---|---|---|
| 1 | **Foundation** | Migrations: `isSuperAdmin`, `suspendedAt`, `model_settings`, `admin_audit_log`. Hardened `/admin` gate. Seed operator as super-admin. | ½ day |
| 2 | **User admin** | `/admin/users` page, 3 API routes, suspension `signIn` hook, audit writes. | 1 day |
| 3 | **Model registry (read-only)** | `lib/ai/registry.ts` + cache + DB seed. Refactor 17 call sites to read from registry instead of hardcoding. **No behaviour change.** | 1 day |
| 4 | **Admin UI for models (Anthropic only)** | `/admin/models` page, 5 group rows, model dropdown (Anthropic models only at this stage), cost reference, save to DB + audit. | 1 day |
| 5 | **OpenRouter provider** | `lib/ai/client.ts` abstraction. OpenAI SDK pointed at OpenRouter. Picker offers OpenRouter models for non-PDF groups. | 1 day |
| 6 | **PDF OCR fallback (Tesseract)** | `lib/ai/pdf-ocr.ts`. Dockerfile updates. PDF group fully provider-agnostic in picker. | 1 day |

**Total:** ~5½ days. Each phase ships independently as its own PR.

### Sequencing rationale

- 1 → 2 first: user admin is independent of model work and ships immediate operational value.
- 3 → 4 next: registry abstraction with no behaviour change is the safe refactor; UI on top is then a small build.
- 5 → 6 last: OpenRouter is the most complex integration; OCR-Tesseract is the longest-tail dependency. Cost wins from Anthropic-only Haiku 4.5 demotion are already significant by phase 4.

---

## Files affected (summary)

### New
- `src/lib/db/admin-schema.ts` (model_settings, admin_audit_log)
- `src/lib/admin/guard.ts`
- `src/lib/ai/registry.ts`
- `src/lib/ai/client.ts`
- `src/lib/ai/pricing.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/pdf-ocr.ts`
- `src/app/admin/users/page.tsx`
- `src/app/admin/users/UsersTable.tsx`
- `src/app/admin/models/page.tsx`
- `src/app/admin/models/ModelSettingsForm.tsx`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/suspend/route.ts`
- `src/app/api/admin/users/[id]/unsuspend/route.ts`
- `src/app/api/admin/users/[id]/reset-password/route.ts`
- `src/app/api/admin/models/route.ts`

### Modified
- `src/lib/db/auth-schema.ts` — add `isSuperAdmin`, `suspendedAt`
- `src/lib/better-auth.ts` — `signIn` hook for suspended users
- `src/app/admin/layout.tsx` — replace TODO with super-admin check, add nav links for Users/Models
- All 17 AI call sites (see grep table in section 3) — refactor from direct `Anthropic` SDK to `aiComplete({ featureGroup, ... })`
- `Dockerfile` — `tesseract-ocr` + `poppler-utils` apt install

### Env vars
- New: `OPENROUTER_API_KEY` (set in Phase 5)

---

## Verification

**Phase 1**: super-admin flag flipped via SQL, log in as you → `/admin` loads; log in as another user → redirected to `/dashboard?error=admin-only`.

**Phase 2**: suspend yourself in another browser → next page load logs you out; trigger reset → email arrives in inbox; audit log shows the actions.

**Phase 3**: change a row in `model_settings` directly via SQL, wait 60s, drop a PDF → server log shows the new model ID being used. Sweep grep across `src/` for `claude-`/`gpt-`/etc. literals → only the seed file should match.

**Phase 4**: change Document extraction model in UI from Sonnet to Haiku → save → drop PDF → confirm Haiku model ID in server log.

**Phase 5**: set `OPENROUTER_API_KEY`, switch Text extraction to `google/gemini-2.5-flash` → trigger a planning extract → confirm OpenRouter response in network logs and downstream extraction quality.

**Phase 6**: drop a scanned/image-only PDF (no text layer) → confirm Tesseract OCR runs (server log) → confirm successful extraction via OpenRouter model.

## Out of scope (deferred)

- Per-org admin (multi-tenant admin tier).
- User impersonation (high-risk; needs full audit, exit flow, in-app banner).
- Model A/B testing framework.
- Real-time AI cost telemetry (token-counted per request, billed back to org). Cost panel uses static reference prices only.
- OAuth provider redirect-URL admin.
