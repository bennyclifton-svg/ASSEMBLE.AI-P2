# PRD: Public SaaS reintegration with auth, billing, storage, workers, and launch hardening

**Date:** 2026-05-17
**Status:** Draft - ready for triage
**Triage label:** `needs-triage`
**Reference inputs:** grill-me SaaS reintegration session, current codebase review, old SaaS branch as reference material, prior deployment guide

---

## Problem Statement

Sitewise has valuable current product work that must be preserved, but the user now wants to return to a full public SaaS launch path. The desired direction is not to revert the repository wholesale to the old SaaS branch. It is to keep all current changes and carefully add back the SaaS deployment, authentication, billing, cloud storage, worker, email, legal, and security pieces that make the product usable by public customers.

The current codebase already has many useful SaaS ingredients, including Better Auth, Polar billing code, Supabase-compatible storage, Docker support, background workers, pricing UI, and a public landing/pricing surface. But the product direction and implementation have pivoted toward a local/private appliance. Some SaaS pieces are incomplete or split across old and current assumptions. The subscription source of truth is divided, trial behavior is not modeled end to end, plan intent is not preserved through signup, transactional email is not wired for launch, legal/account pages are missing or incomplete, and many API routes still need a hard tenancy and authorization pass before the app can safely accept public users.

The old SaaS branch and prior deployment guide are useful as reference material, but a direct merge would risk reintroducing stale assumptions and overwriting the current work. The user wants a staged SaaS reintegration project that uses the current app as the base, borrows old SaaS pieces only when they still fit, and produces a launchable public SaaS version.

## Solution

Build a fresh public SaaS integration branch from the current app. Treat the old SaaS branch as a reference library, not a merge target. The launch target is a public, one-user-workspace SaaS: each signup gets their own workspace, without teams or org invites in the first release.

The SaaS launch model is:

- public signup with Better Auth
- no-card 14-day trial
- full feature access during trial, limited by tighter usage caps
- Starter and Professional as the public paid plans
- no public Free plan after trial
- plan choice remembered from pricing through signup, trial, and billing
- Better Auth user plus Polar tables as the auth and billing source of truth
- trial metadata stored on the Better Auth user record
- expired trials remain logged in but read-only
- expired users can view and export/download existing data
- create, edit, upload, and AI actions are blocked after expiry until subscription
- self-serve account and billing management
- transactional email before launch, using Resend
- legal/support pages before launch
- clean SaaS database at launch, with no migration of current local/private data
- Dokploy/VPS deployment using separate web and worker services
- Supabase Storage for customer files
- a mandatory security pass over all project APIs before public launch

The end state should feel like a normal public SaaS product to a customer: choose a paid plan, start a no-card trial, use the app immediately within trial limits, receive verification/reset/trial/billing emails, manage billing and cancellation, retain read/export access if the trial expires, and upgrade from inside the app when blocked.

## User Stories

1. As a visitor, I want pricing to show Starter and Professional plans only, so that the public offer is clear.
2. As a visitor, I want to start a no-card trial from either paid plan, so that I can evaluate the product without payment friction.
3. As a visitor, I want the plan I selected on pricing to be remembered through signup, so that I land in the trial for the plan I meant to evaluate.
4. As a visitor, I want clear trial terms before signup, so that I understand length, usage caps, and what happens when the trial ends.
5. As a visitor, I want Terms, Privacy, Contact, and Support pages available from public pages, so that I can assess trust before signing up.
6. As a visitor, I want signup consent to reference the Terms and Privacy policy, so that account creation has a clear legal basis.
7. As a new user, I want to sign up with email and password, so that I can start a workspace without sales assistance.
8. As a new user, I want email verification, so that my account and notifications are reliable.
9. As a new user, I want password reset email, so that I can recover access without support.
10. As a new user, I want my own workspace created automatically, so that I can begin using Sitewise immediately.
11. As a new user, I want my 14-day trial to start at signup, so that there is no manual activation step.
12. As a trial user, I want full feature access during the trial, so that I can evaluate the real product rather than a crippled demo.
13. As a trial user, I want trial usage limits to be visible, so that I understand why an action may be blocked.
14. As a trial user, I want to create one project, so that the trial stays focused and controlled.
15. As a trial user, I want to upload and manage documents up to the trial cap, so that I can test document workflows safely.
16. As a trial user, I want to run a capped number of AI actions, so that I can evaluate the AI value without unbounded cost.
17. As a trial user, I want blocked trial actions to explain the limit and link to billing, so that the next step is obvious.
18. As a trial user, I want trial-ending email reminders, so that I am not surprised by expiry.
19. As a trial user, I want an in-app banner showing trial status, so that I know how much time remains.
20. As a trial user, I want to upgrade before trial expiry, so that I can keep working without interruption.
21. As an expired trial user, I want to stay logged in, so that I can see my project and understand what happened.
22. As an expired trial user, I want read-only access to my existing data, so that the product does not feel like it has taken my work hostage.
23. As an expired trial user, I want to download or export existing data, so that I retain control of what I created.
24. As an expired trial user, I want create, edit, upload, and AI actions blocked, so that unpaid usage stops cleanly.
25. As an expired trial user, I want blocked actions to point me to billing, so that I can restore access quickly.
26. As a paid Starter customer, I want my subscription to unlock Starter limits immediately, so that billing changes affect the app without support.
27. As a paid Professional customer, I want higher or unlimited limits where promised, so that the paid tier feels meaningfully different.
28. As a paid customer, I want billing status shown inside the app, so that I can tell whether my account is active, past due, canceled, or trialing.
29. As a paid customer, I want a self-serve billing portal, so that I can update payment details and manage invoices.
30. As a paid customer, I want to cancel self-serve, so that I am not forced into manual support.
31. As a paid customer, I want clear cancellation and data retention wording, so that I understand what remains accessible after cancellation.
32. As a paid customer, I want account settings, so that I can manage profile and account basics.
33. As a paid customer, I want export and data deletion request options, so that I have control over my data.
34. As a customer, I want payment and subscription emails, so that billing events are not only visible in the app.
35. As a customer, I want file uploads stored in cloud storage, so that my documents survive deployments and scale beyond local disk.
36. As a customer, I want document processing to keep running in the background, so that large uploads do not block the app.
37. As a customer, I want the app to protect my project data from other users, so that public SaaS tenancy is trustworthy.
38. As a customer, I want every project API to enforce ownership, so that knowing another ID never grants access.
39. As a customer, I want read-only expiry rules to apply consistently across UI, uploads, workers, and AI actions, so that the product behaves predictably.
40. As a customer, I want downloads and exports to remain allowed in read-only mode, so that I can leave gracefully.
41. As an admin, I want Better Auth user records and Polar billing tables to be the source of truth, so that subscription state is not split across legacy tables.
42. As an admin, I want trial metadata stored on the auth user record, so that access decisions can be made consistently.
43. As an admin, I want a single plan catalog, so that pricing, billing, trials, caps, and access checks do not drift.
44. As an admin, I want Polar products and webhooks wired to the plan catalog, so that billing events map to the right entitlements.
45. As an admin, I want transactional email configured through Resend, so that account and billing lifecycle messages work before launch.
46. As an admin, I want a secure Dokploy/VPS deployment path, so that launch does not depend on local development setup.
47. As an admin, I want separate web and worker services, so that background jobs can be scaled and restarted independently.
48. As an admin, I want runtime secrets managed as service environment variables, so that secrets are not baked into images or docs.
49. As an admin, I want production health checks for web, database, storage, Redis, workers, and billing/email configuration, so that launch readiness can be verified.
50. As an admin, I want a clean SaaS database for launch, so that old local/private data is not accidentally exposed or forced through a rushed migration.
51. As a support operator, I want to see user, trial, subscription, and workspace state, so that I can diagnose account problems.
52. As a support operator, I want billing and account states to be understandable without touching the database directly, so that support stays safe.
53. As a developer, I want the old SaaS branch treated as reference material, so that useful code can be adapted without merging stale assumptions.
54. As a developer, I want a fresh integration branch, so that current work remains intact and the SaaS rebuild can be reviewed in stages.
55. As a developer, I want entitlement checks to be centralized, so that APIs do not each invent their own trial and billing logic.
56. As a developer, I want project access checks to be centralized, so that tenancy rules are reusable and testable.
57. As a developer, I want upload and AI usage metering to be centralized, so that usage caps can be changed without route-by-route edits.
58. As a developer, I want billing webhooks to be idempotent, so that retries do not corrupt subscription state.
59. As a developer, I want expired-trial read-only behavior covered by tests, so that launch hardening does not regress.
60. As a developer, I want deployment documentation to match the actual public SaaS architecture, so that future deployments are repeatable.
61. As a developer, I want old local/private appliance docs to be clearly separated from public SaaS launch docs, so that operators do not follow the wrong path.
62. As a developer, I want a staged issue breakdown after this PRD, so that implementation can move in safe milestones.

## Implementation Decisions

- The project is a SaaS reintegration, not a revert. The current app remains the base.
- The old SaaS branch is reference material only. Code may be copied and adapted after review, but the branch should not be merged wholesale.
- Work should happen on a fresh integration branch with small milestones.
- Launch target is public SaaS, not private hosted SaaS.
- First release supports one-user workspaces only. Teams, org invites, and collaboration are deferred.
- Public signup is trial-first. There is no public Free plan.
- Trial model is 14 days, no card required, full feature access with tighter usage caps.
- Initial trial caps are one project, a capped document allowance, and a capped AI action allowance. Exact numeric limits can be tuned in the plan catalog.
- Expired trials become read-only. Viewing, downloading, and exporting existing data remain allowed.
- Starter and Professional are the public paid plans. Plan intent should be remembered from pricing through signup and upgrade.
- Better Auth user records plus Polar customer/subscription tables are the source of truth for auth and billing.
- Trial fields should live on the auth user record, including trial start, trial end, intended trial plan, and trial status or equivalent derived state.
- Legacy subscription fields should stop driving access once the SaaS source of truth is installed.
- Resend is the transactional email provider for launch.
- Required transactional emails include verification, password reset, trial reminders, payment/subscription notices, and relevant account notices.
- Required public/legal surfaces include Terms, Privacy, Contact/Support, signup consent, cancellation wording, and data retention wording.
- Account and billing should be self-serve at launch, including subscription management, cancellation, account basics, export, and data deletion request entry points.
- Launch uses a clean SaaS database. Migration of current local/private data is out of scope.
- Hosting target is Dokploy/VPS.
- Web and worker services should be deployed separately.
- Customer file storage should use Supabase Storage.
- A mandatory security pass over project APIs must happen before public launch.
- Public SaaS health checks should cover web, database, storage, Redis, workers, billing, email, and required runtime configuration.
- Deployment guidance must keep secrets as runtime environment variables and avoid sensitive build-time arguments.

The main modules to build or modify are:

- **Plan catalog module**: one source for public plan definitions, trial limits, paid limits, Polar product mapping, and display metadata.
- **Entitlement module**: computes access state from auth, trial, subscription, and plan data. Its public interface should answer whether the current user can read, write, upload, run AI, export, and manage billing.
- **Trial lifecycle module**: starts trials, records intended plan, derives active/expired state, and supports trial reminder jobs.
- **Usage metering module**: records and checks trial and paid usage for projects, documents, uploads, and AI actions.
- **Billing orchestration module**: owns Polar checkout, customer portal, subscription lookup, webhook handling, and idempotent subscription updates.
- **Auth onboarding module**: owns signup, email verification, password reset, workspace creation, plan-intent capture, and post-signup redirect.
- **Access control module**: centralizes current-user loading, workspace ownership, project access, read-only/write gates, and export exceptions.
- **Storage configuration module**: makes Supabase Storage the production default while preserving the existing abstraction.
- **Worker runtime module**: separates web and worker process commands, environment validation, queue connection, and production worker health.
- **Transactional email module**: wraps Resend templates and dispatch for account, trial, and billing events.
- **Account and billing UI module**: gives users subscription state, billing portal entry, cancellation path, account basics, export, and deletion request entry points.
- **Legal/public pages module**: provides the required pre-launch legal and support surfaces.
- **SaaS deployment module**: documents and validates Dokploy/VPS deployment for separate web and worker services.

Important API contracts:

- Authenticated APIs must derive the user from the Better Auth session.
- Project APIs must prove workspace/project ownership before returning data.
- Mutating APIs must require writable entitlement, not only authentication.
- Upload APIs must require both project access and upload allowance.
- AI-action APIs must require project access and AI usage allowance.
- Export/download APIs must remain available for read-only expired users when the data belongs to them.
- Billing APIs must map the current authenticated user to the Polar customer/subscription state.
- Webhooks must validate provider signatures and be idempotent.
- Admin APIs must require super-admin authority, not ordinary authentication.

## Testing Decisions

Good tests for this work should assert external behavior and security boundaries, not implementation details. The critical question is whether the app allows the right user to do the right thing in the right account state, and blocks everything else consistently.

Modules that should be tested:

- Plan catalog behavior: public plan list, trial caps, paid caps, Polar product mapping, and removal of public Free plan.
- Entitlement behavior: active trial, expired trial, active paid subscription, canceled subscription, past-due subscription, and missing subscription.
- Read-only expiry behavior: reads/exports allowed, writes/uploads/AI actions blocked.
- Plan-intent behavior: selected plan survives pricing, signup, trial, and billing CTA.
- Trial lifecycle behavior: trial start, trial end, reminder eligibility, and derived status.
- Usage metering behavior: project cap, document cap, AI cap, and paid-plan allowance differences.
- Billing webhook behavior: valid signature, invalid signature, duplicate event, subscription created, updated, canceled, and payment failure.
- Access control behavior: user can access own workspace/project only; cross-user project access is blocked.
- Upload behavior: ownership and entitlement gates are checked before storage writes or background jobs.
- AI action behavior: ownership, entitlement, and usage caps are checked before model or worker cost is incurred.
- Account/billing UI behavior: users see correct status and blocked-action upgrade paths.
- Transactional email behavior: verification, reset, trial reminder, and billing notice dispatch are called at the right lifecycle points using a mocked provider.
- Deployment smoke behavior: web health, worker health, database, Redis, storage, email, and billing configuration checks.

Prior art to follow:

- Existing local health and smoke checks prove the value of launch-readiness probes.
- Existing secret hygiene checks should be extended or reused for public SaaS deployment docs.
- Existing action-registry and workflow tests are a good pattern for centralizing write authority.
- Existing billing components and subscription endpoints are useful starting points, but tests must verify the new Better Auth plus Polar source of truth.

## Out of Scope

- Wholesale merge or rollback to the old SaaS branch.
- Migration of existing local/private data into the public SaaS database.
- Teams, org invites, firm-wide workspaces, or multi-user collaboration.
- A public Free plan after trial.
- Card-required trial.
- Supporting local/private appliance mode and public SaaS mode in the same deployment as a first-launch requirement.
- Mobile apps, desktop packaging, Electron, or Tauri.
- SOC 2, formal compliance program work, or enterprise procurement readiness beyond basic legal/support pages and data-control wording.
- Advanced tax/accounting automation beyond Polar billing.
- Real-time collaboration.
- Full support back office beyond essential admin/support visibility.
- Reworking core product features unrelated to SaaS access, billing, deployment, storage, email, legal, and security hardening.

## Further Notes

This PRD intentionally changes the product target from the current local/private appliance direction back toward a public SaaS launch. Until this PRD is implemented and the strategy docs are updated, the existing local/private documentation remains the current codebase truth.

The prior deployment guide helps mainly as a checklist of SaaS concerns, not as launch-ready instructions. It should be treated carefully because it was scrubbed and superseded during the local/private pivot.

The likely implementation effort is roughly 3 to 7 focused days for a careful first public SaaS reintegration, with more time needed for polish, deeper compliance, or exhaustive route-by-route hardening. The highest-risk work is the project API security pass and the entitlement source-of-truth cleanup.
