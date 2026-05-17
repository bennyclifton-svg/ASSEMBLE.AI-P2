# Feature Specification: SaaS Launch Infrastructure

**Feature Branch**: `014-saas-launch`
**Created**: 2025-12-14
**Status**: Draft
**Input**: User description: "Deploy application on Dokploy with Polar billing integration, PostgreSQL migration, public landing page, and subscription-gated access control"

## Overview

Transform assemble.ai from a development application into a production-ready, monetized SaaS platform. This includes containerized deployment on Dokploy, subscription billing via Polar (Merchant of Record handling Australian GST), migration from SQLite to PostgreSQL for production reliability, a public marketing landing page with pricing, and subscription-based feature gating.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production Deployment Works Reliably (Priority: P1)

The development team deploys assemble.ai to a Dokploy-managed server with proper environment configuration, health monitoring, and database connectivity to PostgreSQL. This is the foundational infrastructure that all other stories depend on.

**Why this priority**: Without deployment infrastructure, nothing else can go live. This is the foundation for all other stories and blocks everything.

**Independent Test**: Can be tested by triggering a deployment via Git push to main and verifying the application is accessible at the production domain with database connectivity. Delivers: production hosting capability.

**Acceptance Scenarios**:

1. **Given** a Git push to the main branch, **When** Dokploy detects the change, **Then** it builds the Docker container and deploys the application within 5 minutes
2. **Given** a deployed application, **When** the /api/health endpoint is called, **Then** it returns 200 OK with database connectivity status
3. **Given** production environment variables configured in Dokploy, **When** the application starts, **Then** it connects to the production PostgreSQL database
4. **Given** a deployment failure, **When** health checks fail, **Then** Dokploy performs automatic rollback to the previous working version

---

### User Story 2 - Public Visitor Discovers Product (Priority: P1)

A potential customer visits the assemble.ai website for the first time. They land on a compelling marketing page that explains the value proposition, see clear pricing tiers, and can start a free trial or purchase a subscription without friction.

**Why this priority**: Tied with deployment - without a public-facing landing page and clear pricing, there is no way to acquire customers. This is the entry point for all revenue.

**Independent Test**: Can be fully tested by visiting the root URL while unauthenticated and completing a checkout flow. Delivers: customer acquisition capability.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they visit the root URL (/), **Then** they see a public marketing landing page with hero section, features, and pricing
2. **Given** a visitor on the landing page, **When** they click a pricing plan's CTA button, **Then** they are redirected to Polar's checkout flow
3. **Given** a visitor completing checkout, **When** payment succeeds, **Then** they are redirected to the registration page with their subscription pre-linked
4. **Given** an authenticated user, **When** they visit the root URL (/), **Then** they are redirected to /dashboard

---

### User Story 3 - Existing User Manages Subscription (Priority: P2)

An existing subscriber needs to view their current plan, upgrade/downgrade, update payment methods, or cancel their subscription. They access a billing portal within the application.

**Why this priority**: Post-acquisition, users must be able to manage their subscriptions to reduce churn and support requests. Essential for SaaS operations.

**Independent Test**: Can be tested by logging in as a subscribed user, navigating to /billing, and performing subscription management actions. Delivers: subscription lifecycle management.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an active subscription, **When** they navigate to /billing, **Then** they see their current plan, billing cycle, and next payment date
2. **Given** a user on the billing page, **When** they click "Manage Subscription", **Then** they are redirected to Polar's customer portal
3. **Given** a user who cancels via Polar portal, **When** the webhook is received, **Then** their subscription status is updated to "canceled" with access until period end
4. **Given** a subscription with a failed payment, **When** Polar sends payment_failed webhook, **Then** the user is notified and status reflects payment issue

---

### User Story 4 - Free Tier User Experiences Feature Gates (Priority: P3)

A user on the free tier attempts to access premium features. They see clear messaging about what the feature does and how to upgrade, without breaking their workflow or causing frustration.

**Why this priority**: Feature gating drives upgrade conversions. Clear upgrade paths with contextual prompts increase revenue while maintaining good UX.

**Independent Test**: Can be tested by creating a free-tier account and attempting to use gated features. Delivers: upsell mechanism and clear tier differentiation.

**Acceptance Scenarios**:

1. **Given** a free-tier user, **When** they attempt to access a premium feature (e.g., AI document processing beyond limit), **Then** they see a modal explaining the feature and upgrade options
2. **Given** a free-tier user viewing a gated feature, **When** they click "Upgrade", **Then** they are taken to the pricing page or direct checkout
3. **Given** a user who upgrades mid-session, **When** their subscription activates, **Then** the feature becomes immediately accessible without page refresh
4. **Given** a canceled subscription past its period end, **When** the user tries to access premium features, **Then** they are treated as free-tier with appropriate messaging

---

### Edge Cases

- What happens when a user's subscription expires while they're mid-task in a premium feature?
  - Allow completion of current task, block new premium actions
- What happens when Polar webhooks are delayed or fail?
  - Implement webhook retry handling; cache subscription status with periodic verification
- What happens if the SQLite to PostgreSQL migration fails partway?
  - Implement transactional migration with rollback capability; maintain SQLite as backup during transition
- What happens when a user registers directly without going through Polar checkout?
  - Create user with free-tier defaults; Polar customer created on first checkout attempt
- What happens if Dokploy server becomes unreachable?
  - Health monitoring alerts; documented recovery procedures

## Requirements *(mandatory)*

### Functional Requirements

#### Deployment & Infrastructure
- **FR-001**: System MUST be deployable via Docker container with standalone Next.js output
- **FR-002**: System MUST include a Dockerfile optimized for production deployment
- **FR-003**: System MUST expose a /api/health endpoint returning application and database connectivity status
- **FR-004**: System MUST support configuration via environment variables (no hardcoded secrets)
- **FR-005**: System MUST include a .dockerignore file excluding development artifacts
- **FR-006**: System MUST include HEALTHCHECK instruction in Dockerfile for container orchestration

#### Database Migration
- **FR-007**: System MUST migrate all application data from SQLite to PostgreSQL (Supabase)
- **FR-008**: System MUST use a single PostgreSQL instance for both application data and RAG/vector storage
- **FR-009**: System MUST maintain data integrity during migration with zero data loss
- **FR-010**: System MUST support the existing Drizzle ORM schema converted to PostgreSQL dialect
- **FR-011**: System MUST include migration scripts that are idempotent and reversible

#### Landing Page & Routing
- **FR-012**: System MUST serve a public marketing landing page at the root URL (/) for unauthenticated users
- **FR-013**: System MUST redirect authenticated users from public pages (/, /pricing) to /dashboard
- **FR-014**: System MUST include a /pricing page with plan details and checkout CTAs
- **FR-015**: System MUST move the current authenticated dashboard to /dashboard route
- **FR-016**: Landing page MUST include: hero section, feature highlights, pricing tiers, and call-to-action buttons
- **FR-017**: Landing page MUST be optimized for search engines with proper meta tags

#### Billing Integration (Polar)
- **FR-018**: System MUST integrate with Polar SDK (@polar-sh/nextjs) for billing
- **FR-019**: System MUST handle Polar webhooks for subscription lifecycle events (created, updated, canceled, payment_failed)
- **FR-020**: System MUST create a Polar customer record when a user first initiates checkout
- **FR-021**: System MUST provide a /billing page for users to view and manage their subscription
- **FR-022**: System MUST store subscription status and plan ID in the user record
- **FR-023**: System MUST verify webhook signatures for security
- **FR-024**: System MUST handle payment_failed events with user notification

#### Authentication & Access Control
- **FR-025**: System MUST add polarCustomerId and subscription fields to the user model
- **FR-026**: System MUST assign new registrations to a free tier by default
- **FR-027**: System MUST implement feature gating based on subscription plan
- **FR-028**: System MUST check subscription status in both server components and API routes
- **FR-029**: System MUST handle subscription expiration gracefully (allow current task completion)
- **FR-030**: System MUST display clear upgrade prompts for gated features (no broken UI)

### Key Entities

- **Subscription**: Represents a user's billing relationship with the platform
  - Links to User via userId
  - Stores Polar identifiers (polarSubscriptionId, polarCustomerId)
  - Tracks status (active, canceled, past_due, trialing, free)
  - Records plan tier and billing period end date

- **User (Extended)**: Existing user entity with new billing fields
  - polarCustomerId: Link to Polar customer record
  - subscriptionStatus: Current subscription state
  - subscriptionPlanId: Current plan tier
  - subscriptionEndsAt: When current period expires

- **Plan Configuration**: Defines available subscription tiers
  - Tier identifier (free, starter, professional)
  - Features included at each tier
  - Usage limits per tier (documents, AI queries, projects)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Application deploys successfully to Dokploy within 5 minutes of Git push to main
- **SC-002**: Application maintains 99.5% uptime after deployment (measured over first 30 days)
- **SC-003**: Health check endpoint responds within 500ms under normal load
- **SC-004**: New visitor can complete signup and checkout flow in under 3 minutes
- **SC-005**: 100% of existing data migrates to PostgreSQL with zero data loss (verified by record counts)
- **SC-006**: Webhook events from Polar are processed within 5 seconds of receipt
- **SC-007**: Users can view and manage their subscription without contacting support (self-service rate > 95%)
- **SC-008**: Feature gates display clear upgrade messaging (no broken UI or cryptic errors for free-tier users)
- **SC-009**: Landing page loads in under 2 seconds on standard broadband connection
- **SC-010**: Subscription status changes reflect in the application within 10 seconds of Polar event

## Assumptions

1. **Supabase PostgreSQL**: The existing Supabase instance will be used for all application data (merged with RAG data)
2. **Polar Pricing**: Polar's 4% + 40c transaction fee is acceptable for the business model
3. **Australian GST**: Polar handles GST compliance as Merchant of Record - no additional tax logic needed in application
4. **Domain**: A production domain is available and can be pointed to Dokploy server
5. **SSL**: Dokploy/Traefik will handle SSL certificate provisioning automatically via Let's Encrypt
6. **Redis**: The existing Upstash Redis instance will be used in production for BullMQ queues
7. **Feature Tiers**: Initial launch will have 2-3 tiers (Free, Starter, Professional) - exact feature limits TBD
8. **Migration Timing**: SQLite to PostgreSQL migration completes before first production deployment
9. **Existing Users**: No existing production users - this is a fresh launch (no user migration needed)

## Dependencies

- **Dokploy Server**: A VPS or server with Dokploy installed and accessible
- **Polar Account**: Organization account created with products/plans configured in Polar dashboard
- **Supabase Project**: Existing project with sufficient capacity for all application data
- **Domain & DNS**: Production domain with ability to configure DNS records (A record or CNAME)
- **Environment Secrets**: All API keys and credentials documented and available for production configuration

## Out of Scope

- Mobile application deployment
- Multi-region deployment or CDN configuration
- Advanced analytics or usage tracking beyond subscription status
- A/B testing of landing page variants
- Email marketing automation (beyond transactional emails from Polar)
- Admin dashboard for manually managing subscriptions
- Refund processing (handled entirely by Polar)
- Multiple payment method configuration (using Polar defaults)
- Custom invoicing or billing documents
- Usage-based billing (subscription tiers only)

## Constitution Alignment

This specification aligns with the following assemble.ai constitution principles:

- **V. Small Firm Optimization**: SaaS pricing will be accessible to small firms; onboarding via public landing page is simple and self-service with no multi-week training
- **VII. Integration Over Isolation**: Integrates with Polar (billing), Supabase (database), Dokploy (hosting) rather than building custom infrastructure
- **I. Intelligent Document Repository**: Core functionality preserved; billing gates access to advanced AI document features
- **III. AI-Powered Automation**: Premium AI features become revenue drivers through subscription gating, enabling sustainable development
- **VIII. Test-Driven Quality**: Health checks and webhook verification ensure deployment reliability
