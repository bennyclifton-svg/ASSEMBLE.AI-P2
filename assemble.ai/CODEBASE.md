# Sitewise Codebase Snapshot

_Snapshot date: 2026-05-14. Branch: `sitewise/brief-building-port`._

This is the current implementation map for Sitewise after the local/private RFI appliance work. It supersedes the older SaaS-era snapshot that now lives in the archive.

## Product Direction

Sitewise is a local/private project record appliance for one accountable client-side PM running one live construction project. The application may later support managed private instances or broader rollout, but the current design centre is a trustworthy single-project workspace with explicit setup, health, backup, restore, and review gates.

Canonical project truth is structured PostgreSQL records and stored files. Chat is interaction history. Reviewable AI memory is advisory preference/context only and must lose to schema records, documents, issued artefacts, and the current user instruction.

The current strategy note is [docs/strategy/local-private-appliance.md](docs/strategy/local-private-appliance.md).

## Stack

| Layer | Current shape |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript |
| Database | PostgreSQL through Drizzle; local bootstrap uses Docker PostgreSQL with pgvector |
| Vector/RAG | pgvector tables in the PostgreSQL schema, 1024-dim Voyage embeddings, BAAI/Cohere reranking |
| Queue/workers | BullMQ on Redis; document processor and drawing extractor workers run beside the app |
| Auth/admin | Better Auth, admin model settings, Polar billing code still present but not the current product driver |
| Storage | `src/lib/storage` chooses local file storage by default for local/private setup; Supabase-compatible storage remains supported |
| AI | Anthropic/OpenAI-compatible providers via configured task groups; document embeddings need `VOYAGE_API_KEY` |

## Local Appliance Path

The repeatable local path is:

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

`/api/health` returns structured readiness for app, PostgreSQL, pgvector/RAG, Redis, workers, storage, migrations, and model keys. `/setup/status` renders the same information for non-developer setup checks. The detailed setup guide is [docs/setup/local-private-bootstrap.md](docs/setup/local-private-bootstrap.md); backup and restore are covered in [docs/setup/local-backup-restore.md](docs/setup/local-backup-restore.md).

## Repository Shape

```text
src/
  app/                     Next.js routes and API endpoints
    api/health             appliance readiness API
    setup/status           setup/status UI
    api/projects/[id]/rfis typed RFI register API
    api/projects/[id]/weekly-report-draft
  components/
    rfi/                   typed RFI register panel
    ai-memory/             reviewable AI memory surface
    notes-meetings-reports reports UI with weekly draft command
  lib/
    actions/               Application Action Registry and action definitions
    agents/                chat runner, specialists, tools, approvals
    ai-memory/             project memory service
    backup/                local project backup/restore support
    context/               context assembly, including advisory AI memory
    health/                appliance health checks
    rfi/                   typed RFI domain service and issued artefacts
    weekly-report-draft/   grounded weekly report draft generator
    storage/               local/Supabase-compatible storage abstraction
    workflows/             durable workflow runner
workers/                   document and drawing background workers
drizzle-pg/                main PostgreSQL migrations
drizzle-auth/              Better Auth/admin schema migrations
docs/                      current strategy, setup, agents, skills archive, issues
archive/                   historical SaaS/spec/planning material
```

## Implemented May 14 Appliance Work

| Area | Runtime shape |
| --- | --- |
| Strategy docs | Local/private strategy, action-only write policy, source-material archive boundary, setup docs |
| Bootstrap | `local:bootstrap` starts Docker PostgreSQL/Redis, applies main/auth/RAG schemas, creates local storage |
| Health | `/api/health`, `/setup/status`, and `local:smoke` cover app, DB, RAG, Redis, workers, storage, migrations, model keys |
| Backup/restore | `project:backup`, `project:restore`, and `local:backup-smoke` prove first local project recovery path |
| Secret hygiene | `secret:hygiene` scans committed docs/config for high-confidence credential leaks |
| Action policy | New agent/workflow mutations must be registered actions unless explicitly exempted |
| Typed RFI | `rfi_records` register with deterministic project-local numbering, filters, due/overdue state, priority, responsible stakeholder, row version |
| RFI evidence | `rfi_evidence_links` supports documents, notes, and correspondence; legacy `notes.type='rfi'` can be promoted without deleting the note |
| RFI lifecycle | response, close, reopen, and lifecycle audit events |
| RFI exports | `rfi_issued_artefacts` stores immutable PDF/DOCX versions backed by file assets and storage |
| AI-drafted RFI | registered action `correspondence.rfi.create`, tool name `create_rfi`, approval-gated for agents/workflows |
| AI memory | `ai_memory_entries`, UI panel, API, action definitions, and context assembly as advisory-only memory |
| Weekly report draft | registered action `correspondence.weekly_report.create_draft`, API route, Reports UI button, and grounded generator that cites records/RFIs/documents |
| Skills archive | `docs/skills` is source/reference material only; no runtime markdown skill loader |

## Core Data Model Updates

RFI is now the first typed contract-administration register. It is no longer only a note type.

| Record type | Current storage | Notes |
| --- | --- | --- |
| RFI | `rfi_records`, `rfi_evidence_links`, `rfi_audit_events`, `rfi_issued_artefacts` | Typed register, evidence, lifecycle, exports, action-backed AI proposals |
| Variation | `variations` | Typed, action-backed tools exist |
| Risk | `risks` | Typed, action-backed create/update tools exist |
| Transmittal | `transmittals` plus per-artifact joins | Typed top-level entity with several join tables |
| Notice, EOT, Defect, Review | `notes.type` variants | Still text-first; candidates for later typed registers after RFI proves the pattern |

AI memory is stored in `ai_memory_entries`. It has project/org scope, category/status metadata, soft deletion/deactivation, UI review, action definitions, and context formatting that explicitly says records and documents override memory.

## Action And Workflow Rules

The Application Action Registry is the write surface for new agent and workflow mutations. Current action-backed examples include `create_rfi`, `create_weekly_report_draft`, AI memory create/update/delete, cost-line and variation actions, meetings, risks, invoices, and existing report creation.

The policy lives in [docs/strategy/action-only-writes-policy.md](docs/strategy/action-only-writes-policy.md). Tests fail if a new mutating agent tool bypasses the registry without an explicit legacy exemption, or if a workflow plan references an unregistered action id.

Two workflow launcher tools remain legacy exemptions because they start workflow state and materialize registered action steps; they must not directly apply project data.

## AI And Reporting

`assembleContext()` remains the main context assembly entry point. It can include project profile/details, cost plan, program, risks, stakeholders, starred notes, attached/RAG documents, cross-module insights, and advisory AI memory.

The weekly report draft generator in `src/lib/weekly-report-draft/service.ts` builds a source register from structured records, typed RFIs, RAG excerpts, and approved AI memory. It asks the model for strict JSON and normalizes report sections into Facts, Assumptions, Recommendations, and Open Questions. Facts cited only to memory are moved to assumptions so memory does not become hidden project truth.

## Documentation Boundary

- [README.md](README.md): product and setup entry point.
- [docs/strategy/local-private-appliance.md](docs/strategy/local-private-appliance.md): current product/architecture strategy and glossary.
- [docs/setup/local-private-bootstrap.md](docs/setup/local-private-bootstrap.md): clean local setup path.
- [docs/setup/local-backup-restore.md](docs/setup/local-backup-restore.md): first local backup/restore format.
- [docs/agents/README.md](docs/agents/README.md): runtime-agent documentation boundary.
- [docs/skills/README.md](docs/skills/README.md): source-material archive index.
- `archive/`: historical docs, specs, and older deployment material.

## Remaining Architecture Work

- Keep migrating direct UI mutation routes onto registered actions where shared behavior or audit matters.
- Prove the RFI pattern with real PM use before typing notices, EOTs, defects, site instructions, progress claims, or determinations.
- Expand backup/restore beyond the first local smoke format when real handoff requires it: encrypted/scheduled/incremental/remote backups are not implemented yet.
- Make document ingestion boringly reliable on real projects.
- Decide whether report/RFI issued-output versioning should become a shared communication artefact model.
- Keep local/private setup free of live credentials and run `npm run secret:hygiene` before release or customer handoff.
