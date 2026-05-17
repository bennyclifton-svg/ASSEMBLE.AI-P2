# SaaS API Route Security Audit

> Generated during issue 011 on 2026-05-17. This inventory records the public SaaS security posture and the representative routes migrated to shared access helpers.

## Project Routes

Shared helper coverage:

- `GET /api/projects/[projectId]` uses `requireProjectReadAccess`.
- `PATCH /api/projects/[projectId]` uses `requireWritableProjectAccess`.
- `GET /api/projects/[projectId]/cost-lines` uses `requireProjectReadAccess`.
- `POST /api/projects/[projectId]/cost-lines` uses `requireWritableProjectAccess`.
- `GET /api/projects/[projectId]/stakeholders` uses `requireProjectReadAccess`.
- `POST /api/projects/[projectId]/stakeholders` uses `requireWritableProjectAccess`.

Project routes not yet migrated route-by-route must either use these helpers or an equivalent service-level organization check before public SaaS release.

## Upload Routes

- `POST /api/projects/[projectId]/invoices/upload` uses `requireUploadProjectAccess`.
- `POST /api/projects/[projectId]/variations/upload` uses document upload gates directly.
- Document upload caps and expired-user upload blocking are enforced by `document-gates`.

## Export And Download Routes

- `POST /api/projects/[projectId]/documents/download` uses `requireExportProjectAccess`.
- `GET /api/projects/[projectId]/program/export` uses `requireExportProjectAccess`.
- Export/download gates intentionally allow expired read-only users when they own the project data.

## AI And Workflow Routes

- `/api/ai/generate-content`, `/api/ai/generate-note-content`, `/api/ai/polish-content`, and `/api/ai/execute-instruction` reserve AI usage before model calls.
- `/api/actions/[id]/run` and `/api/actions/[id]/propose` reserve AI usage before workflow/action execution.
- AI usage gates verify project ownership when a project id is supplied and block expired users before cost is incurred.

## Billing Routes

- `GET /api/billing/subscription` loads Polar customer/subscription rows through the authenticated Better Auth user id.
- `GET /api/billing/transactions` filters transactions by authenticated user id.
- Better Auth Polar checkout, portal, and webhook endpoints remain delegated to Better Auth/Polar plugin validation.

## Admin Routes

- `/api/admin/storage` and `/api/admin/models` require `requireSuperAdminApi`.
- `/api/admin/products` now requires `requireSuperAdminApi`.
- Admin user management routes should continue using super-admin guards before public SaaS release.

## Explicit Public Or Non-Project Routes

- `/api/auth/[...all]` is owned by Better Auth.
- `/api/assessment-waitlist` and `/api/demo-requests` are public lead-capture endpoints.
- `/api/health` is public operational health status.
