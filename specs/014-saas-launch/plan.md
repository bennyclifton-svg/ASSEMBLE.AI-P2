# Implementation Plan: SaaS Launch Infrastructure

**Branch**: `014-saas-launch` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-saas-launch/spec.md`

---

## Summary

Transform assemble.ai from a development application into a production-ready, monetized SaaS platform. This includes:
1. **Dokploy Deployment**: Containerized deployment with Docker, health checks, and automatic rollback
2. **PostgreSQL Migration**: Migrate from SQLite to PostgreSQL (Supabase) for production reliability
3. **Polar Billing**: Subscription management via Polar as Merchant of Record (handles Australian GST)
4. **Landing Page Refactor**: Public marketing page at `/`, authenticated dashboard at `/dashboard`
5. **Subscription Gating**: Feature access control based on subscription tier

---

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.2.0, Next.js 16.0.3
**Primary Dependencies**: drizzle-orm, @polar-sh/nextjs, pg, react-resizable-panels
**Storage**: PostgreSQL (Supabase) - unified for app data + RAG vectors
**Testing**: Jest + React Testing Library
**Target Platform**: Linux container on Dokploy (self-hosted VPS)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Landing page < 2s, checkout flow < 3 minutes, health check < 500ms
**Constraints**: Docker standalone build, environment-based configuration only
**Scale/Scope**: 100+ concurrent users, 50+ projects per organization

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Intelligent Document Repository** | ✅ PASS | Core functionality preserved; billing gates advanced AI features |
| **II. Domain-First Intelligence** | ✅ PASS | Construction-specific features remain; billing is infrastructure |
| **III. AI-Powered Automation** | ✅ PASS | Premium AI features become revenue drivers via subscription tiers |
| **IV. Financial Visibility** | ⚪ N/A | Billing is platform infrastructure, not project financials |
| **V. Small Firm Optimization** | ✅ PASS | Self-service signup, accessible pricing, no complex onboarding |
| **VI. Sharp, Actionable Outputs** | ⚪ N/A | No content generation in this feature |
| **VII. Integration Over Isolation** | ✅ PASS | Integrates Polar, Supabase, Dokploy - no custom billing/hosting |
| **VIII. Test-Driven Quality** | ✅ PASS | Health checks, webhook verification, migration validation |
| **IX. Spreadsheet-Native UX** | ⚪ N/A | No financial data grids in this feature |

**Gate Result**: PASS - No violations requiring justification.

---

## Project Structure

### Documentation (this feature)

```text
specs/014-saas-launch/
├── plan.md              # This file
├── spec.md              # Feature specification (complete)
├── checklists/
│   └── requirements.md  # Quality validation checklist
└── tasks.md             # Implementation tasks (to be generated)
```

### Source Code Changes

```text
# Root level (new files)
Dockerfile                              # Multi-stage production build
.dockerignore                           # Exclude dev artifacts
docker-compose.yml                      # Local development stack (optional)

# Configuration
next.config.ts                          # Add output: 'standalone'

# Database migration
src/lib/db/
├── index.ts                            # Update to use PostgreSQL
├── schema.ts                           # Add subscription fields to users
├── pg-client.ts                        # New PostgreSQL client
└── migrate-sqlite-to-pg.ts             # Migration script

drizzle.config.ts                       # Update for PostgreSQL dialect

# API routes (new)
src/app/api/
├── health/
│   └── route.ts                        # GET /api/health
├── polar/
│   ├── webhook/
│   │   └── route.ts                    # POST /api/polar/webhook
│   └── checkout/
│       └── route.ts                    # POST /api/polar/checkout

# Pages (new/modified)
src/app/
├── (public)/
│   ├── page.tsx                        # Public landing page (NEW root)
│   ├── pricing/
│   │   └── page.tsx                    # Pricing page with Polar CTAs
│   └── layout.tsx                      # Public layout (no auth required)
├── (dashboard)/
│   ├── page.tsx                        # Dashboard (moved from current /)
│   ├── billing/
│   │   └── page.tsx                    # Subscription management
│   └── layout.tsx                      # Dashboard layout (auth required)

# Components (new)
src/components/
├── landing/
│   ├── HeroSection.tsx                 # Hero with CTA
│   ├── FeaturesSection.tsx             # Feature highlights
│   ├── PricingSection.tsx              # Pricing tiers
│   └── FooterSection.tsx               # Footer with links
├── billing/
│   ├── SubscriptionCard.tsx            # Current subscription display
│   ├── PricingCard.tsx                 # Plan card with checkout
│   └── UpgradeModal.tsx                # Feature gate upgrade prompt

# Library (new)
src/lib/
├── polar/
│   ├── client.ts                       # Polar SDK initialization
│   ├── webhooks.ts                     # Webhook handlers
│   └── plans.ts                        # Plan configuration
├── subscription/
│   ├── check-access.ts                 # Feature gating logic
│   └── tiers.ts                        # Tier definitions

# Middleware update
src/middleware.ts                       # Add public routes, dashboard redirect
```

**Structure Decision**: Extends existing Next.js App Router structure with route groups: `(public)` for unauthenticated pages, `(dashboard)` for authenticated pages. New `lib/polar/` and `lib/subscription/` directories for billing logic.

---

## Database Schema Changes

### Existing Schema Modifications

```typescript
// src/lib/db/schema.ts - Add to users table

// New fields for users table
polarCustomerId: text('polar_customer_id'),
subscriptionStatus: text('subscription_status').default('free'),
subscriptionPlanId: text('subscription_plan_id'),
subscriptionEndsAt: integer('subscription_ends_at'),
```

### New Tables

```typescript
// Subscriptions table (detailed subscription tracking)
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  polarSubscriptionId: text('polar_subscription_id').unique(),
  polarCustomerId: text('polar_customer_id'),
  status: text('status').notNull(), // active, canceled, past_due, trialing
  planId: text('plan_id').notNull(),
  currentPeriodStart: integer('current_period_start'),
  currentPeriodEnd: integer('current_period_end'),
  canceledAt: integer('canceled_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
```

### Migration Strategy

**Phase 1: Schema Preparation**
1. Create new PostgreSQL schema in Supabase (mirrors SQLite structure)
2. Add subscription-related columns and tables
3. Test schema with empty database

**Phase 2: Data Migration**
1. Export all SQLite data to JSON
2. Transform data for PostgreSQL compatibility
3. Import to PostgreSQL with transaction rollback on failure
4. Verify record counts match

**Phase 3: Cutover**
1. Update drizzle.config.ts to PostgreSQL
2. Update db/index.ts to use pg client
3. Test all API routes
4. Archive SQLite file

---

## API Contracts

### Health Check

```typescript
// GET /api/health
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  database: {
    connected: boolean;
    latencyMs: number;
  };
  timestamp: string;
}
```

### Polar Webhook

```typescript
// POST /api/polar/webhook
// Headers: Polar-Signature: <signature>
interface PolarWebhookPayload {
  event: 'subscription.created' | 'subscription.updated' | 'subscription.canceled' | 'order.paid';
  data: {
    subscription?: PolarSubscription;
    order?: PolarOrder;
  };
}
```

### Checkout Session

```typescript
// POST /api/polar/checkout
interface CheckoutRequest {
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

interface CheckoutResponse {
  checkoutUrl: string;
}
```

---

## Implementation Phases

### Phase 1: Infrastructure Foundation (Blocking)

**Goal**: Docker deployment + PostgreSQL migration

| Task | Description |
|------|-------------|
| Create Dockerfile | Multi-stage build with standalone output |
| Create .dockerignore | Exclude node_modules, .git, .env.local |
| Update next.config.ts | Add `output: 'standalone'` |
| Add /api/health endpoint | Database connectivity check |
| Migrate schema to PostgreSQL | Convert drizzle schema to pg dialect |
| Create migration script | SQLite → PostgreSQL data transfer |
| Update db/index.ts | PostgreSQL client initialization |
| Test local Docker build | Verify container runs correctly |

**Checkpoint**: Application runs in Docker with PostgreSQL database.

---

### Phase 2: Landing Page Refactor

**Goal**: Public marketing page + route restructure

| Task | Description |
|------|-------------|
| Create (public) route group | Public pages without auth |
| Create (dashboard) route group | Authenticated pages |
| Move LandingLayout to /dashboard | Current root becomes dashboard |
| Create public landing page | Hero, features, pricing, CTA |
| Create /pricing page | Plan comparison with checkout buttons |
| Update middleware.ts | Public routes + dashboard redirect |
| Add meta tags for SEO | Title, description, OpenGraph |

**Checkpoint**: Unauthenticated visitors see marketing page; authenticated users redirect to dashboard.

---

### Phase 3: Polar Billing Integration

**Goal**: Subscription checkout + webhook handling

| Task | Description |
|------|-------------|
| Install @polar-sh/nextjs | Polar SDK |
| Create lib/polar/client.ts | SDK initialization |
| Create lib/polar/plans.ts | Plan configuration |
| Create /api/polar/webhook route | Handle subscription events |
| Create /api/polar/checkout route | Generate checkout URLs |
| Add subscription fields to users | polarCustomerId, status, planId |
| Create subscriptions table | Detailed subscription tracking |
| Update registration flow | Free tier default |
| Create /billing page | Subscription management |

**Checkpoint**: Users can subscribe via Polar; webhooks update subscription status.

---

### Phase 4: Feature Gating

**Goal**: Tier-based access control

| Task | Description |
|------|-------------|
| Create lib/subscription/tiers.ts | Define tier features/limits |
| Create lib/subscription/check-access.ts | Access check utilities |
| Create UpgradeModal component | Feature gate prompt |
| Add gating to premium features | AI features, document limits |
| Update API routes | Subscription checks |
| Test all tier scenarios | Free → paid → canceled flows |

**Checkpoint**: Free-tier users see upgrade prompts; paid users access all features.

---

### Phase 5: Deployment & Testing

**Goal**: Production deployment on Dokploy

| Task | Description |
|------|-------------|
| Configure Dokploy project | Git integration, build settings |
| Set environment variables | All production secrets |
| Configure domain + SSL | Traefik routing |
| Deploy to staging | Initial deployment test |
| Verify health checks | Dokploy health monitoring |
| Test full user journey | Signup → checkout → use → manage |
| Configure webhook URL | Update Polar dashboard |
| Production deployment | Go live |

**Checkpoint**: Application live on production domain with working billing.

---

## Environment Variables

```bash
# Production (set in Dokploy)
NODE_ENV=production
DATABASE_URL=postgresql://...           # Supabase PostgreSQL
REDIS_URL=rediss://...                  # Upstash Redis

# Polar
POLAR_ACCESS_TOKEN=...                  # Polar API key
POLAR_WEBHOOK_SECRET=...                # Webhook signature verification
POLAR_ORGANIZATION_ID=...               # Your Polar org

# AI Services (existing)
ANTHROPIC_API_KEY=...
VOYAGE_API_KEY=...
LLAMA_CLOUD_API_KEY=...

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PostgreSQL migration data loss | Low | Critical | Transactional migration, pre-migration backup, record count verification |
| Polar webhook failures | Medium | High | Retry logic, idempotent handlers, manual sync fallback |
| Docker build issues | Low | Medium | Local Docker testing before Dokploy deployment |
| Subscription status desync | Medium | Medium | Periodic status verification against Polar API |
| Feature gate bypass | Low | Medium | Server-side checks in API routes (not just UI) |

---

## Complexity Tracking

> No violations requiring justification - all gates passed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | — | — |

---

## Dependencies

**New npm packages:**
```json
{
  "@polar-sh/nextjs": "^0.x",
  "@polar-sh/sdk": "^0.x"
}
```

**Existing packages (already installed):**
- `pg` - PostgreSQL driver (already in package.json)
- `drizzle-orm` - ORM (already in package.json)

**External services:**
- Polar account + configured products
- Dokploy server with Docker
- Domain with DNS access
- Supabase project (existing)

---

## Open Items for Phase 1

1. **Dokploy Server**: Is the VPS provisioned and Dokploy installed?
2. **Domain**: What domain will be used for production?
3. **Polar Products**: Have products/plans been created in Polar dashboard?
4. **Supabase Capacity**: Does current Supabase plan support additional tables?
5. **Feature Tier Limits**: What specific limits per tier (documents, AI queries)?

---

## References

- [Feature Specification](spec.md) - Full requirements
- [Constitution](.specify/memory/constitution.md) - Guiding principles
- [Polar Documentation](https://docs.polar.sh) - Billing integration
- [Dokploy Documentation](https://docs.dokploy.com) - Deployment platform
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql) - ORM setup

---

**Plan Version**: 1.0.0
**Author**: Claude
**Date**: 2025-12-14
**Status**: Ready for Review
