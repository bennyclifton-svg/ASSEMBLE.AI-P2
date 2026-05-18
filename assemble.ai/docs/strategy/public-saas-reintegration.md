# Public SaaS Reintegration Boundary

This note records the current public SaaS reintegration track. It does not replace the local/private appliance strategy; it defines how to add public SaaS launch capability back onto the current app without reverting or merging the old SaaS branch wholesale.

## Source Of Truth

The current implementation base is the current app. Preserve the work already done for project records, typed RFIs, reviewable memory, weekly report drafts, application actions, workers, health checks, storage abstraction, Better Auth, and Polar.

The old SaaS branch and archived SaaS-era documents are reference material only. Use them to recover useful ideas, env lists, deployment concerns, and implementation patterns, but re-evaluate every copied piece against the current codebase and current product decisions before bringing it forward.

The source PRD is `docs/prds/2026-05-17-public-saas-reintegration-prd.md`. The staged issue set is `docs/issues/2026-05-17-public-saas-reintegration/`.

## Product Boundary

The first public SaaS launch is:

- public SaaS, not private hosted SaaS
- one-user workspaces only
- no teams, organization invites, or firm-wide collaboration
- public signup through Better Auth
- no-card 14-day trial
- full feature access during trial with capped usage
- Starter and Professional as the public paid plans
- no public Free plan after trial
- plan intent remembered from pricing through signup, trial, and billing
- Better Auth user records plus Polar customer/subscription tables as the auth and billing source of truth
- expired trials remain logged in but read-only
- expired users can view, download, and export their existing data
- expired users cannot create, edit, upload, or run AI actions until subscribed
- self-serve account and billing management
- transactional email through Resend before launch
- legal, support, cancellation, and data-retention surfaces before launch

Launch starts from a clean SaaS database. Migrating current local/private data into the public SaaS database is out of scope for the first launch.

## Architecture Boundary

The first public SaaS deployment target is Dokploy/VPS with separate web and worker services. Customer files should use Supabase Storage. Redis-backed background workers remain part of the product shape.

Public SaaS launch work must include a mandatory security pass across project APIs before release. Authenticated APIs should derive the user from Better Auth. Project APIs should prove workspace/project ownership. Mutating routes should require writable entitlement. Upload routes should require ownership and upload allowance. AI routes should require ownership and AI allowance. Export/download routes should remain available to read-only expired users when the data belongs to them. Admin routes should require super-admin authority.

Runtime secrets belong in deployed service environment variables or an operator secret store. Public build-time values must be distinguished from server-only secrets.

## Documentation Boundary

Local/private appliance setup remains documented under `docs/setup/`.

Public SaaS deployment guidance should live separately under `docs/deployment/public-saas/`. Do not mix public SaaS launch instructions into the local/private bootstrap path unless a cross-reference is explicitly needed.

Archived SaaS-era deployment material, including the old deployment guide, remains historical reference. It should not be followed as launch instructions and should not be reintroduced without review.

## Current Relationship To The Local/Private Strategy

Until the SaaS reintegration issues are implemented, the running product and setup docs still reflect the local/private appliance path. This note records the new launch track so future agents can work from a shared boundary while keeping the existing local/private documentation accurate.

Do not delete or rewrite the local/private appliance docs as part of this boundary issue. Later implementation issues may update product strategy and README wording once the public SaaS path is actually wired and smoke-tested.
