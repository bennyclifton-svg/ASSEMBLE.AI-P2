# Sitewise

Sitewise is a private project record system for client-side construction project management. The current product direction is a local/private single-user project appliance where an AI project officer helps one accountable PM keep one live project coherent, evidenced, and ready to issue.

For the current strategy, read `docs/strategy/local-private-appliance.md`. A staged public SaaS reintegration track is recorded in `docs/strategy/public-saas-reintegration.md`; it keeps the current app as the base and treats old SaaS-era material as reference only.

## Product Shape

The first design center is one PM running one live project. Sitewise is not being treated as pure desktop-only software, a public SaaS-first product, or an immediate firm-wide collaboration rollout.

The product loop is:

1. The PM adds project facts, documents, correspondence, and judgement.
2. Sitewise stores project truth in structured records and stored files.
3. The AI reads project records, documents, RAG excerpts, and approved memory.
4. The AI proposes record changes or issued artefacts through registered actions.
5. The PM reviews, edits, approves, rejects, or issues.
6. Sitewise stores the final decision, evidence, audit trail, and exportable artefact.

## Current Capabilities

- **Project workspace**: project profile, objectives, stakeholders, documents, cost plan, program, risks, variations, invoices, notes, meetings, reports, procurement records, tender evaluation, and communication artefacts.
- **AI and approvals**: chat, specialists/flows implemented in the runtime, tool calls, approval records, edit-and-approve, optimistic row-versioning, and audit trails.
- **Application actions**: the intended shared write surface for agents, workflows, and eventually direct UI operations. The migration is partial, so new agent/workflow writes should use registered actions and approval gates.
- **RAG pipeline**: project documents are parsed, chunked, embedded, stored in PostgreSQL/pgvector, retrieved, and reranked for AI context.
- **Background processing**: Redis/BullMQ workers handle document processing and drawing extraction.
- **Storage**: stored files use the existing storage abstraction, with local storage fallback where configured.
- **Typed RFI register**: RFIs now have typed records, deterministic project numbering, due/overdue display, responsible parties, evidence links, response/close/reopen lifecycle audit, and versioned PDF/DOCX issued artefacts.
- **Reviewable AI memory**: project memory entries are visible, editable, and advisory-only. They can help style and recurring context, but records and documents override them.
- **Weekly report drafts**: a grounded weekly report draft action reads structured records, typed RFIs, document/RAG excerpts, risks, cost/program context, and approved memory, then creates editable report sections.
- **Local appliance operations**: `/api/health`, `/setup/status`, `local:smoke`, `project:backup`, `project:restore`, `local:backup-smoke`, and `secret:hygiene` support local/private setup and handoff checks.

## Current Horizon

The immediate proof points are:

- **RFI typed-record pilot**: shipped as the first schema-backed contract-administration register. The next test is whether real PM use proves the pattern before notices, EOTs, defects, site instructions, progress claims, or determinations are typed.
- **Briefing/reporting workflow**: the first weekly report draft tracer is in place. The next test is whether the draft is useful enough that PMs rely on it as a weekly operating ritual.
- **Local/private appliance trust**: setup honesty, health checks, backup/restore, explicit migrations, local file storage, model-key setup, and secret hygiene are now documented and smokeable. Harder rollout work remains around real-project recovery, updates, and handoff.

## Data And AI Boundaries

Structured PostgreSQL records and stored files are canonical project truth. Chat is interaction history. AI memory is editable preferences and recurring context only; it must not override schema facts, document evidence, or issued artefacts.

New agent and workflow mutations should go through registered application actions and approval gates. Existing direct UI writes can remain during migration, but should converge onto actions over time.

The `docs/skills/*/SKILL.md` files are archived source/reference material only. They are not live runtime skills and are not loaded by the app. See `docs/skills/README.md` for how to mine that material into knowledge libraries, prompts, action specs, workflow specs, or product docs.

## Deferred Scope

The local/private horizon does not include SQLite, Electron/Tauri desktop packaging, real-time multi-user collaboration, immediate firm-wide rollout, Xero/accounting integration, council portal automation, external email sending as part of RFI export, speculative specialist agents, or EOT-first typed-record work. Public SaaS launch work is now tracked separately as a reintegration path, not as part of the local/private bootstrap.

## Public SaaS Reintegration

The public SaaS track is documented in `docs/strategy/public-saas-reintegration.md`, with the PRD at `docs/prds/2026-05-17-public-saas-reintegration-prd.md` and implementation issues under `docs/issues/2026-05-17-public-saas-reintegration/`.

That track targets public SaaS with one-user workspaces, Starter and Professional paid plans, no public Free plan, a no-card 14-day trial, a clean SaaS database, Dokploy/VPS deployment, separate web and worker services, Supabase Storage, Resend email, Polar billing, and a mandatory API security pass before launch.

Public SaaS deployment docs should live under `docs/deployment/public-saas/`. Local/private setup remains under `docs/setup/`.

## Stack

Next.js 16, React 19, TypeScript, PostgreSQL, pgvector, Drizzle ORM, BullMQ/Redis, Better Auth, Anthropic/OpenAI-compatible model providers, Voyage embeddings, BAAI/Cohere reranking, Supabase-compatible storage, and local storage fallback.

## Local Private Bootstrap

The repeatable local/private path is documented in `docs/setup/local-private-bootstrap.md`.

```bash
npm install
npm run local:bootstrap
npm run dev
```

Then, once the dev server is running:

```bash
npm run local:smoke
npm run local:backup-smoke
npm run secret:hygiene
```

This path starts Docker PostgreSQL with pgvector and Redis, applies the main/auth/RAG schemas, uses local file storage by default, and checks the app, database, Redis, workers, storage, RAG readiness, the first local project backup/restore path, and committed docs/config for obvious secret leaks.

The human-readable setup surface is `/setup/status`; the machine-readable health surface is `/api/health`.
