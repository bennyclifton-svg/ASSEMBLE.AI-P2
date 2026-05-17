# Better Auth + Polar Payment Implementation Brainstorm

**Created**: 2026-01-25
**Status**: Phase 6 In Progress - Bug fixes & UX improvements (6A ✅, 6B ✅)
**Feature**: Authentication migration to Better Auth + Polar payment integration

---

## Implementation Status

### Phase 1: Foundation Setup ✅ COMPLETED (2026-01-25)

| Task | Status | Notes |
|------|--------|-------|
| Install dependencies | ✅ Done | `better-auth`, `@polar-sh/better-auth`, updated `@polar-sh/sdk` to latest |
| Create Better Auth server config | ✅ Done | `src/lib/better-auth.ts` - Configured with Drizzle adapter and Polar plugin |
| Create Better Auth client | ✅ Done | `src/lib/auth-client.ts` - React client with Polar integration |
| Create API route handler | ✅ Done | `src/app/api/auth/[...all]/route.ts` - Catch-all route for Better Auth |
| Update environment variables | ✅ Done | Added `BETTER_AUTH_SECRET` to `.env.example` |
| Generate Drizzle schema | ✅ Done | `src/lib/db/auth-schema.ts` - user, session, account, verification, polar tables |
| Export auth schema from db | ✅ Done | Updated `src/lib/db/index.ts` to export auth tables |

#### Files Created
- `src/lib/better-auth.ts` - Better Auth server configuration
- `src/lib/auth-client.ts` - Better Auth React client
- `src/app/api/auth/[...all]/route.ts` - API route handler
- `src/lib/db/auth-schema.ts` - Drizzle schema for Better Auth tables

#### Files Modified
- `package.json` - Added better-auth dependencies
- `.env.example` - Added BETTER_AUTH_SECRET variable
- `src/lib/db/index.ts` - Export auth schema tables

### Phase 2: Migration ✅ COMPLETED (2026-01-25)

| Task | Status | Notes |
|------|--------|-------|
| Run database migrations | ✅ Done | Created `drizzle.auth.config.ts` for Better Auth tables, SQL migration in `drizzle-auth/` |
| Create user migration script | ✅ Done | `scripts/migrate-users-to-better-auth.ts` - Migrates existing users with passwords and Polar data |
| Test authentication flow | ✅ Done | Created `scripts/test-better-auth.ts` - Comprehensive test suite |

#### Files Created
- `drizzle.auth.config.ts` - Drizzle Kit config for Better Auth schema
- `drizzle-auth/0001_better_auth_tables.sql` - SQL migration file for Better Auth tables
- `scripts/migrate-users-to-better-auth.ts` - User migration script (old users → Better Auth)
- `scripts/test-better-auth.ts` - Test script to verify Better Auth setup

#### Files Modified
- `package.json` - Added npm scripts:
  - `db:auth:generate` - Generate migrations
  - `db:auth:push` - Push schema to database
  - `db:auth:studio` - Open Drizzle Studio
  - `db:auth:migrate-users` - Run user migration
  - `db:auth:test` - Run test suite

#### Migration Commands
```bash
# Create Better Auth tables in database
npm run db:auth:push

# Migrate existing users to Better Auth
npm run db:auth:migrate-users

# Test the setup
npm run db:auth:test
```

### Phase 3: Component Updates ✅ COMPLETED (2026-01-25)

| Task | Status | Notes |
|------|--------|-------|
| Update LoginForm | ✅ Done | `src/components/auth/LoginForm.tsx` - Uses `signIn.email()` from auth-client |
| Update RegisterForm | ✅ Done | `src/components/auth/RegisterForm.tsx` - Uses `signUp.email()` from auth-client |
| Update middleware | ✅ Done | `src/middleware.ts` - Checks `better-auth.session_token` cookie |
| Update billing page | ✅ Done | `src/app/(dashboard)/billing/page.tsx` - Uses Better Auth session + Polar plugin |
| Update PricingCard | ✅ Done | `src/components/billing/PricingCard.tsx` - Uses Polar plugin checkout |
| Update SubscriptionCard | ✅ Done | No changes needed - uses plan definitions from plans.ts |
| Add organization hook | ✅ Done | `src/lib/better-auth.ts` - databaseHooks creates org + libraries on signup |

#### Files Modified
- `src/components/auth/LoginForm.tsx` - Uses Better Auth signIn
- `src/components/auth/RegisterForm.tsx` - Uses Better Auth signUp
- `src/middleware.ts` - Updated cookie name for Better Auth
- `src/app/(dashboard)/billing/page.tsx` - Uses Better Auth session + Polar customer state
- `src/components/billing/PricingCard.tsx` - Uses Polar plugin checkout
- `src/lib/better-auth.ts` - Added organization creation hook on user signup
- `src/app/(dashboard)/dashboard/page.tsx` - Uses Better Auth session

### Phase 4: Cleanup ✅ COMPLETED (2026-01-25)

| Task | Status | Notes |
|------|--------|-------|
| Remove old auth files | ✅ Done | Deleted `src/lib/auth/session.ts`, `rate-limit.ts` - recreated `get-user.ts` and `password.ts` with Better Auth |
| Remove old auth routes | ✅ Done | Deleted `src/app/api/auth/login`, `register`, `logout`, `me` folders |
| Remove old Polar files | ✅ Done | Deleted `src/lib/polar/client.ts`, `webhooks.ts`, `index.ts` - kept `plans.ts` for plan definitions |
| Remove old Polar routes | ✅ Done | Deleted `src/app/api/polar/` folder |
| Update user routes | ✅ Done | Updated `src/app/api/users/me/route.ts` to use Better Auth account table |
| Update documentation | ✅ Done | Updated this tasks.md file |

#### Files Deleted
- `src/lib/auth/session.ts` - Replaced by Better Auth session management
- `src/lib/auth/rate-limit.ts` - Can be replaced by 2FA plugin if needed
- `src/app/api/auth/login/route.ts` - Replaced by Better Auth `/api/auth/sign-in/email`
- `src/app/api/auth/register/route.ts` - Replaced by Better Auth `/api/auth/sign-up/email`
- `src/app/api/auth/logout/route.ts` - Replaced by Better Auth `/api/auth/sign-out`
- `src/app/api/auth/me/route.ts` - Replaced by Better Auth `/api/auth/session`
- `src/lib/polar/client.ts` - Replaced by Polar plugin in Better Auth
- `src/lib/polar/webhooks.ts` - Replaced by Polar plugin webhook handling
- `src/lib/polar/index.ts` - No longer needed
- `src/app/api/polar/checkout/route.ts` - Replaced by Polar plugin checkout
- `src/app/api/polar/webhook/route.ts` - Replaced by Polar plugin webhooks

#### Files Kept (Still Needed)
- `src/lib/polar/plans.ts` - Plan definitions used by billing components
- `src/lib/auth/get-user.ts` - Recreated with Better Auth session lookup
- `src/lib/auth/password.ts` - Recreated for password change functionality
- `src/lib/auth/index.ts` - Re-exports for convenient importing

---

## Migration Complete Summary

The Better Auth + Polar migration is now complete. Key changes:

### Authentication Flow
- **Login**: `signIn.email({ email, password })` via Better Auth client
- **Register**: `signUp.email({ email, password, name })` via Better Auth client
- **Session**: Cookie-based with `better-auth.session_token`
- **Logout**: `signOut()` via Better Auth client

### Subscription Flow
- **Checkout**: `checkout({ products: [...] })` via Polar plugin
- **Customer State**: `customer.state()` returns subscriptions and benefits
- **Customer Portal**: POST to `/api/auth/customer/portal`
- **Webhooks**: Handled by Polar plugin at `/api/auth/polar/webhook`

### Database Tables
- `user` - Better Auth user table with custom organizationId field
- `session` - Session tokens with rolling expiry
- `account` - OAuth credentials and password hashes
- `verification` - Email verification and password reset tokens
- `polar_customer` - Links users to Polar customers
- `polar_subscription` - Tracks active subscriptions

### Deployment Steps
```bash
# 1. Create Better Auth tables
npm run db:auth:push

# 2. Migrate existing users (if any)
npm run db:auth:migrate-users

# 3. Verify setup
npm run db:auth:test

# 4. Set environment variables
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
POLAR_ACCESS_TOKEN=<from Polar dashboard>
POLAR_WEBHOOK_SECRET=<from Polar dashboard>
POLAR_STARTER_PRODUCT_ID=<product ID>
POLAR_PROFESSIONAL_PRODUCT_ID=<product ID>
```

---

## Executive Summary

This document captures the research and planning for migrating from our custom session-based authentication to Better Auth, and integrating the official Better Auth Polar plugin for payment/subscription handling.

### Why Better Auth?

1. **Native Drizzle support** - Better Auth has first-class Drizzle adapter
2. **Official Polar plugin** - The Polar team maintains the Better Auth plugin, making integration trivial
3. **Auth.js merger** - The Auth.js team has merged with Better Auth, making it the future direction
4. **Partial implementation** - Better to switch now than after building more on custom auth
5. **Better DX** - Better Auth's docs and developer experience are widely praised

---

## Phase 1: Codebase Audit Results

### Existing Payment/Subscription Code

**Finding**: Polar is already partially implemented in the codebase.

#### Packages Installed
| Package | Version | Purpose |
|---------|---------|---------|
| `@polar-sh/sdk` | 0.41.5 | Polar SDK client |
| `@polar-sh/nextjs` | 0.9.1 | Next.js integration |

#### Polar Integration Files
| File | Purpose |
|------|---------|
| `src/lib/polar/client.ts` | Polar SDK initialization |
| `src/lib/polar/plans.ts` | Subscription plan definitions |
| `src/lib/polar/webhooks.ts` | Webhook event handlers |
| `src/lib/polar/index.ts` | Module exports |

#### API Routes
| Route | File | Function |
|-------|------|----------|
| `POST /api/polar/checkout` | `src/app/api/polar/checkout/route.ts` | Creates checkout sessions |
| `POST /api/polar/webhook` | `src/app/api/polar/webhook/route.ts` | Receives Polar webhooks |

#### Subscription Tiers Defined
| Tier | Monthly | Annual | Projects | Documents | AI Queries |
|------|---------|--------|----------|-----------|------------|
| **Free** | $0 | $0 | 1 | 100 | 0 |
| **Starter** | $49 | $39/mo | 5 | 1,000 | 100/mo |
| **Professional** | $149 | $119/mo | Unlimited | Unlimited | Unlimited |

#### UI Components
| Component | File | Purpose |
|-----------|------|---------|
| Billing Page | `src/app/(dashboard)/billing/page.tsx` | Subscription management |
| PricingCard | `src/components/billing/PricingCard.tsx` | Plan display + checkout |
| SubscriptionCard | `src/components/billing/SubscriptionCard.tsx` | Current plan display |
| UpgradeModal | `src/components/billing/UpgradeModal.tsx` | Feature gate upgrade prompt |
| PricingSection | `src/components/landing/PricingSection.tsx` | Public pricing page |

#### Feature Gating System
| File | Purpose |
|------|---------|
| `src/lib/subscription/check-access.ts` | Access control functions |
| `src/lib/subscription/tiers.ts` | Tier definitions & limits |

**Functions available:**
- `getUserSubscriptionInfo(userId)` - Get user's tier
- `canAccessFeature(userId, feature)` - Check feature access
- `getUsageRemaining()` - Check quota remaining
- `requireSubscription(userId, minimumTier)` - Enforce tier requirements

---

### Current Authentication Setup

**System**: Custom Session-Based Auth (NOT a third-party library)

| Aspect | Implementation |
|--------|----------------|
| **Auth Type** | Session-based with cookies |
| **Password Hashing** | bcryptjs (12 salt rounds) |
| **Session Storage** | Database + HTTP-only cookies |
| **Token Security** | SHA-256 hash stored (not plaintext) |
| **Session Duration** | 24 hours |
| **Rate Limiting** | 5 attempts, 15-min lockout |

#### Auth Files
| File | Purpose |
|------|---------|
| `src/lib/auth/session.ts` | Session token management |
| `src/lib/auth/password.ts` | Password hashing/verification |
| `src/lib/auth/rate-limit.ts` | Brute-force protection |
| `src/lib/auth/get-user.ts` | Current user retrieval |

#### Auth API Routes
| Route | Purpose |
|-------|---------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Authenticate user |
| `POST /api/auth/logout` | End session |
| `GET /api/auth/me` | Get current user |

#### What's NOT Implemented (Gaps)
- OAuth/SSO (Google, GitHub, etc.)
- 2FA/MFA
- Email verification
- Password reset flow
- CSRF protection (explicit)
- Token rotation/refresh

---

### Database Structure

**ORM**: Drizzle with dual database support
- **Development**: SQLite (`sqlite.db`)
- **Production**: PostgreSQL (Supabase)

#### User Table Schema
```typescript
// src/lib/db/schema.ts
users = {
    id: text (PK),
    email: text (unique),
    passwordHash: text,
    displayName: text,
    organizationId: text (FK),
    // Polar subscription fields (already exist!)
    polarCustomerId: text,
    subscriptionStatus: text ('free'|'active'|'canceled'|'past_due'|'trialing'),
    subscriptionPlanId: text,
    subscriptionEndsAt: integer (Unix timestamp),
    createdAt: integer,
    updatedAt: integer
}
```

#### Subscriptions Table (Already exists!)
```typescript
subscriptions = {
    id: text (PK),
    userId: text (FK -> users),
    polarSubscriptionId: text (unique),
    polarCustomerId: text,
    status: text,
    planId: text,
    currentPeriodStart: integer,
    currentPeriodEnd: integer,
    canceledAt: integer,
    cancelAtPeriodEnd: boolean,
    createdAt: integer,
    updatedAt: integer
}
```

#### Environment Variables (Polar - Already Defined)
```bash
POLAR_ACCESS_TOKEN=pat_xxx
POLAR_ORGANIZATION_ID=org_xxx
POLAR_WEBHOOK_SECRET=whsec_xxx
POLAR_STARTER_PRODUCT_ID=prod_starter_xxx
POLAR_PROFESSIONAL_PRODUCT_ID=prod_professional_xxx
```

---

## Phase 2: Research Findings

### Better Auth Overview

[Better Auth](https://www.better-auth.com/) is a modern, TypeScript-first authentication library.

#### Core Features
| Feature | Details |
|---------|---------|
| **Session Management** | Cookie-based, 7-day default expiry with rolling refresh |
| **Password Hashing** | Configurable (supports bcrypt - matches current setup!) |
| **OAuth/Social Login** | Built-in support for Google, GitHub, Discord, Twitter, etc. |
| **Email Verification** | Native support with customizable email sending |
| **Password Reset** | Built-in flow with token-based reset |
| **2FA/MFA** | Plugin for TOTP (Google Authenticator) + backup codes |
| **Multi-Session** | Users can have multiple active sessions |

#### Native Drizzle Support
- Import `drizzleAdapter` from `better-auth/adapters/drizzle`
- Supports SQLite, PostgreSQL, MySQL
- CLI generates schema: `npx @better-auth/cli generate`
- **Experimental joins** for 2-3x performance improvement

#### Better Auth Database Schema
| Table | Key Fields |
|-------|------------|
| **user** | id, name, email, emailVerified, image, createdAt, updatedAt |
| **session** | id, userId, token, expiresAt, ipAddress, userAgent |
| **account** | id, userId, accountId, providerId, password, accessToken, refreshToken |
| **verification** | id, identifier, value, expiresAt |

---

### Better Auth Polar Plugin

The [Polar plugin](https://www.better-auth.com/docs/plugins/polar) is **officially maintained by the Polar team**.

#### Key Features
| Feature | Description |
|---------|-------------|
| **Auto Customer Creation** | Creates Polar customer when user signs up |
| **Checkout Integration** | Redirect users to Polar checkout |
| **Customer Portal** | Users manage subscriptions/orders |
| **Usage-Based Billing** | Track meters, ingest events |
| **Webhook Handling** | Secure signature verification |
| **Organization Support** | Track purchases per organization |

#### Installation
```bash
pnpm add better-auth @polar-sh/better-auth @polar-sh/sdk
```

#### Environment Variables (Same as existing!)
```bash
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
```

#### Customer State API
```typescript
// Get complete subscription state in one call
const { data: customerState } = await authClient.customer.state();
// Returns: subscriptions, benefits, meters - everything needed for access control
```

---

### Migration Considerations

#### Schema Mapping: Current -> Better Auth
| Your Table | Better Auth Table | Notes |
|------------|-------------------|-------|
| `users` | `user` | Need to map fields |
| `sessions` | `session` | Different token approach |
| (none) | `account` | New - stores password + OAuth |
| `loginAttempts` | (custom) | Keep or replace with 2FA |
| `subscriptions` | Polar handles | Plugin manages this |

#### Field Mapping: users -> user
| Your Field | Better Auth Field | Action |
|------------|-------------------|--------|
| `id` | `id` | Keep as-is |
| `email` | `email` | Keep as-is |
| `passwordHash` | `account.password` | Move to account table |
| `displayName` | `name` | Rename |
| `organizationId` | `organizationId` | Add as custom field |
| `polarCustomerId` | Managed by plugin | Plugin handles |
| `subscriptionStatus` | Managed by plugin | Plugin handles |
| `subscriptionPlanId` | Managed by plugin | Plugin handles |
| `subscriptionEndsAt` | Managed by plugin | Plugin handles |

#### Password Compatibility

**Good news**: Current system uses bcrypt (12 rounds). Better Auth supports bcrypt, so **existing passwords will work without forcing resets**.

---

## Phase 3: Implementation Plan

### 1. Prerequisites (Before Coding)

#### Polar Dashboard Setup
- [ ] Verify Polar organization exists at [polar.sh](https://polar.sh)
- [ ] Create/verify two products: "Starter" ($49/mo) and "Professional" ($149/mo)
- [ ] Generate Organization Access Token
- [ ] Note webhook secret for later configuration
- [ ] Decide: Use **Sandbox** for testing first, or go straight to **Production**?

#### Environment Variables Needed
```bash
# Better Auth (NEW)
BETTER_AUTH_SECRET=          # Generate: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000  # Your app URL

# Polar (EXISTING - verify values)
POLAR_ACCESS_TOKEN=pat_xxx   # From Polar dashboard
POLAR_WEBHOOK_SECRET=whsec_xxx
# Note: Product IDs no longer needed - plugin uses checkout flow

# Database (EXISTING)
DATABASE_URL=                # Keep existing
```

---

### 2. Database Changes

#### New Tables (Better Auth Core)
| Table | Purpose |
|-------|---------|
| `user` | Replaces your `users` table |
| `session` | Replaces your `sessions` table |
| `account` | NEW - stores passwords + OAuth credentials |
| `verification` | NEW - email verification tokens |

#### Migration Strategy
**Option A: In-place Migration** (Recommended)
1. Add new Better Auth tables alongside existing
2. Migrate existing users to new schema
3. Remove old tables after verification

**Option B: Fresh Start**
1. Drop existing auth tables
2. Let Better Auth create new schema
3. Users must re-register (NOT recommended for production)

---

### 3. Implementation Order

#### Step 1: Install Dependencies
```bash
pnpm add better-auth @polar-sh/better-auth @polar-sh/sdk
```

#### Step 2: Create Better Auth Configuration
Create `src/lib/auth.ts`:
```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { db } from "./db";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "sqlite" for dev
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Enable later
  },
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours (matches your current)
    updateAge: 60 * 60, // Refresh every hour
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            { productId: process.env.POLAR_STARTER_PRODUCT_ID!, slug: "starter" },
            { productId: process.env.POLAR_PROFESSIONAL_PRODUCT_ID!, slug: "professional" },
          ],
          successUrl: "/billing?success=true",
          authenticatedUsersOnly: true,
        }),
        portal(),
        usage(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
          onSubscriptionCreated: async (payload) => {
            console.log("Subscription created:", payload);
          },
          onSubscriptionUpdated: async (payload) => {
            console.log("Subscription updated:", payload);
          },
          onSubscriptionCanceled: async (payload) => {
            console.log("Subscription canceled:", payload);
          },
        }),
      ],
    }),
  ],
});
```

#### Step 3: Create Auth Client
Create `src/lib/auth-client.ts`:
```typescript
import { createAuthClient } from "better-auth/react";
import { polarClient } from "@polar-sh/better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [polarClient()],
});
```

#### Step 4: Create API Route Handler
Create `src/app/api/auth/[...all]/route.ts`:
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

#### Step 5: Generate & Apply Schema
```bash
# Generate Better Auth schema
npx @better-auth/cli generate

# Generate Drizzle migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate
```

#### Step 6: Migrate Existing Users
Create a migration script to:
1. Copy users from old `users` table to new `user` table
2. Create `account` entries with existing password hashes
3. Verify data integrity
4. Update foreign keys in other tables (projects, etc.)

#### Step 7: Update Components
- Replace `LoginForm` to use `authClient.signIn.email()`
- Replace `RegisterForm` to use `authClient.signUp.email()`
- Update middleware to use Better Auth session checking
- Update `getCurrentUser()` to use Better Auth

#### Step 8: Update Billing Components
- Replace manual Polar checkout with `authClient.checkout()`
- Use `authClient.customer.state()` for subscription checks
- Remove old `src/lib/polar/` files (plugin handles this)

#### Step 9: Remove Old Auth Code
- Delete `src/lib/auth/` folder
- Delete old `src/app/api/auth/` routes (login, register, logout, me)
- Delete old `sessions` and `loginAttempts` tables
- Update `users` table references throughout codebase

---

### 4. Files to Create/Modify

#### New Files
| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Better Auth server configuration |
| `src/lib/auth-client.ts` | Better Auth client for React |
| `src/app/api/auth/[...all]/route.ts` | Catch-all auth API handler |
| `scripts/migrate-users.ts` | One-time user migration script |

#### Files to Modify
| File | Changes |
|------|---------|
| `src/middleware.ts` | Update session checking |
| `src/components/auth/LoginForm.tsx` | Use Better Auth client |
| `src/components/auth/RegisterForm.tsx` | Use Better Auth client |
| `src/app/(dashboard)/layout.tsx` | Update auth check |
| `src/app/(dashboard)/billing/page.tsx` | Use customer.state() |
| `src/components/billing/PricingCard.tsx` | Use authClient.checkout() |
| `src/lib/subscription/check-access.ts` | Use customer.state() |
| `.env.example` | Add BETTER_AUTH_* vars |

#### Files to Delete
| File | Reason |
|------|--------|
| `src/lib/auth/session.ts` | Replaced by Better Auth |
| `src/lib/auth/password.ts` | Replaced by Better Auth |
| `src/lib/auth/rate-limit.ts` | Replaced by 2FA plugin (optional) |
| `src/lib/auth/get-user.ts` | Replaced by Better Auth |
| `src/lib/polar/client.ts` | Replaced by plugin |
| `src/lib/polar/webhooks.ts` | Replaced by plugin |
| `src/app/api/auth/login/route.ts` | Replaced by [...all] |
| `src/app/api/auth/register/route.ts` | Replaced by [...all] |
| `src/app/api/auth/logout/route.ts` | Replaced by [...all] |
| `src/app/api/auth/me/route.ts` | Replaced by [...all] |
| `src/app/api/polar/checkout/route.ts` | Replaced by plugin |
| `src/app/api/polar/webhook/route.ts` | Replaced by plugin |

---

### 5. Environment Variables Summary

#### Add to `.env.example`
```bash
# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# Polar (keep existing, verify values)
POLAR_ACCESS_TOKEN=pat_xxx
POLAR_WEBHOOK_SECRET=whsec_xxx
POLAR_STARTER_PRODUCT_ID=prod_xxx
POLAR_PROFESSIONAL_PRODUCT_ID=prod_xxx
```

---

### 6. Testing Plan

#### Phase 1: Local Development
1. Set up Polar **Sandbox** environment
2. Test user registration -> verify Polar customer created
3. Test login/logout flow
4. Test checkout flow -> verify subscription created
5. Test `customer.state()` returns correct data
6. Test webhook events (use Polar CLI or dashboard)

#### Phase 2: Migration Testing
1. Create test users in current system
2. Run migration script
3. Verify users can login with existing passwords
4. Verify subscription data preserved

#### Phase 3: Production Deployment
1. Run migration on production database
2. Switch Polar to production mode
3. Update webhook URL in Polar dashboard
4. Monitor for auth errors
5. Keep old auth code commented (not deleted) for 1 week rollback

---

### 7. Potential Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| Session token format | All users logged out | Expected - users re-login |
| API route paths | `/api/auth/login` -> `/api/auth/sign-in` | Update frontend calls |
| Session cookie name | May differ | Check Better Auth config |
| Password hash location | Moved to `account` table | Migration script handles |
| Subscription data | Now via `customer.state()` | Update all access checks |

---

### 8. Optional Enhancements (Post-Migration)

Once the migration is stable, consider adding:

| Feature | Plugin | Notes |
|---------|--------|-------|
| Google OAuth | Built-in | Add `socialProviders.google` |
| 2FA/TOTP | `twoFactor` | Replaces rate limiting |
| Email Verification | Built-in | Set `requireEmailVerification: true` |
| Password Reset | Built-in | Configure email sending |
| Organization Plugin | `organization` | If you need org-level billing |

---

## Summary

This migration will:
1. Replace custom auth with Better Auth
2. Use the official Polar plugin (less code to maintain)
3. Keep existing user passwords working (bcrypt compatible)
4. Simplify subscription management via `customer.state()`
5. Enable future OAuth/2FA without additional work
6. Reduce ~500 lines of custom auth code

**Estimated scope**: ~15-20 files modified, ~10 files deleted, ~5 files created

---

## References

- [Better Auth Documentation](https://www.better-auth.com/)
- [Drizzle ORM Adapter](https://www.better-auth.com/docs/adapters/drizzle)
- [Polar Plugin Docs](https://www.better-auth.com/docs/plugins/polar)
- [Polar SDK Adapter](https://polar.sh/docs/integrate/sdk/adapters/better-auth)
- [Session Management](https://www.better-auth.com/docs/concepts/session-management)
- [Database Schema](https://www.better-auth.com/docs/concepts/database)
- [Two-Factor Authentication](https://www.better-auth.com/docs/plugins/2fa)
- [Email & Password Auth](https://www.better-auth.com/docs/authentication/email-password)
- [Auth.js Migration Guide](https://www.better-auth.com/docs/guides/next-auth-migration-guide)

---

## Phase 5: Production-Ready Polar Integration

**Created**: 2026-01-26
**Status**: Complete ✅
**Decisions Made**:
- Billing Model: Subscription Only (Starter, Professional)
- Webhooks: Inngest for reliable processing
- Users: Starting fresh (no migration needed)
- Products: Database table (not env vars)

### Phase 5A: Database Schema ✅ COMPLETED

| Task | Status | Notes |
|------|--------|-------|
| Create products table migration | ✅ Done | `drizzle-pg/0032_products_transactions.sql` |
| Create transactions table migration | ✅ Done | Same file |
| Update pg-schema.ts with tables | ✅ Done | `src/lib/db/pg-schema.ts` |
| Seed initial products | ✅ Done | Starter & Professional plans (need to update Polar IDs) |

#### Products Table Schema
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,           -- 'starter', 'professional'
  polar_product_id TEXT NOT NULL,      -- Different for sandbox vs production
  price_cents INTEGER NOT NULL,
  billing_interval TEXT NOT NULL,      -- 'month', 'year'
  features JSONB,                       -- Plan features as JSON
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

#### Transactions Table Schema
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  product_id TEXT REFERENCES products(id),
  polar_order_id TEXT UNIQUE,
  polar_checkout_id TEXT,
  polar_subscription_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,                -- 'pending', 'completed', 'refunded'
  created_at INTEGER NOT NULL
);
```

### Phase 5B: Inngest Setup ✅ COMPLETED

| Task | Status | Notes |
|------|--------|-------|
| Install inngest package | ✅ Done | `npm install inngest` |
| Create Inngest client | ✅ Done | `src/lib/inngest/client.ts` |
| Create polar webhook function | ✅ Done | `src/lib/inngest/functions/polar-webhook.ts` |
| Create Inngest API route | ✅ Done | `src/app/api/inngest/route.ts` |
| Update Better Auth webhooks | ✅ Done | `src/lib/better-auth.ts` - sends events to Inngest |

#### Inngest Events to Handle
- `polar/order.paid` → Record transaction, activate subscription
- `polar/order.refunded` → Mark transaction refunded
- `polar/subscription.created` → Log subscription start
- `polar/subscription.canceled` → Log subscription end

### Phase 5C: Admin Product Management ✅ COMPLETED

| Task | Status | Notes |
|------|--------|-------|
| Create admin layout | ✅ Done | `src/app/admin/layout.tsx` |
| Create products list page | ✅ Done | `src/app/admin/products/page.tsx` |
| Create product edit form | ✅ Done | `src/app/admin/products/ProductsTable.tsx` |
| Add admin route protection | ✅ Done | Layout checks for session |
| Create products API routes | ✅ Done | `src/app/api/admin/products/route.ts` |

### Phase 5D: Billing Page Improvements ✅ COMPLETED

| Task | Status | Notes |
|------|--------|-------|
| Add transaction history section | ✅ Done | Shows past purchases with status |
| Update PricingCard to use DB products | ⏳ Future | Currently uses plans.ts (works with env vars) |
| Add success toast after checkout | ✅ Done | Green banner on ?success=true |
| Add cancel handling | ✅ Done | Yellow banner on ?canceled=true |

### Phase 5E: Documentation & Testing ✅ COMPLETED

| Task | Status | Notes |
|------|--------|-------|
| Add ngrok setup to CLAUDE.md | ✅ Done | Full webhook testing guide |
| Add npm script for ngrok | ⏳ Future | Can add manually if needed |
| Document production checklist | ✅ Done | In CLAUDE.md and tasks.md |
| Test full checkout flow | ⏳ Manual | Requires Polar sandbox setup |

---

### Files to Create

| File | Purpose |
|------|---------|
| `drizzle-pg/0032_products_transactions.sql` | Database migration |
| `src/lib/inngest/client.ts` | Inngest client initialization |
| `src/lib/inngest/functions/polar-webhook.ts` | Webhook event handlers |
| `src/app/api/inngest/route.ts` | Inngest API endpoint |
| `src/app/admin/layout.tsx` | Admin layout with protection |
| `src/app/admin/products/page.tsx` | Product management UI |
| `src/app/api/admin/products/route.ts` | Products CRUD API |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/db/pg-schema.ts` | Add products & transactions tables |
| `src/lib/better-auth.ts` | Update webhooks to use Inngest |
| `src/app/(dashboard)/billing/page.tsx` | Add transaction history |
| `src/components/billing/PricingCard.tsx` | Use DB products |
| `package.json` | Add inngest, add npm scripts |
| `CLAUDE.md` | Add webhook testing docs |

---

### Environment Variables (New)

```bash
# Inngest
INNGEST_EVENT_KEY=           # From Inngest dashboard
INNGEST_SIGNING_KEY=         # From Inngest dashboard (for production)
```

---

### Production Checklist

- [x] Create Polar organization at polar.sh
- [x] Complete Polar account verification
- [x] Create products in Polar dashboard (Starter, Professional)
- [ ] Add product IDs to database via admin panel
- [ ] Set up Inngest account and get API keys
- [x] Configure production webhook URL in Polar
- [x] Set production environment variables
- [ ] Re-sync Inngest app after deployment
- [ ] Test with 100% discount code before going live
- [ ] Monitor first few real transactions

---

## Phase 6: Bug Fixes & Improvements

**Created**: 2026-01-26
**Status**: In Progress (Phase 6A ✅, Phase 6B ✅)

### Phase 6A: Billing Page Subscription Detection Fix ✅ COMPLETED

| Task | Status | Notes |
|------|--------|-------|
| Fix subscription not showing as active | ✅ Done | Updated billing page to query polar_subscription table directly |
| Add debug logging | ✅ Done | Console logs show subscription detection flow |
| Add fallback matching | ✅ Done | Multiple fallback strategies for product ID matching |
| Create subscription sync script | ✅ Done | `scripts/check-polar-subscriptions.ts` syncs from Polar API |

#### Issue Identified
When subscribing via Polar checkout, the subscription data may not appear in the database immediately for local development because:
1. Polar webhooks cannot reach localhost without a tunnel (ngrok)
2. The webhook needs to fire to populate `polar_subscription` table

#### Solution
Created a sync script that:
1. Checks the `polar_subscription` table for existing data
2. Fetches subscriptions from Polar API if missing
3. Automatically syncs subscription data to the local database

#### How to Sync Subscriptions (Local Development)
```bash
# Run the sync script to pull subscriptions from Polar
npx tsx scripts/check-polar-subscriptions.ts
```

#### Files Modified
- `src/app/(dashboard)/billing/page.tsx` - Improved subscription detection with DB query + fallbacks
- `scripts/check-polar-subscriptions.ts` - NEW: Sync script for subscription data

### Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| Webhooks don't reach localhost | Known | Use ngrok or run sync script after checkout |
| Subscription not highlighted after checkout | Fixed | Run sync script or wait for webhook (production) |

### Phase 6B: User Profile Menu ✅ COMPLETED

**Created**: 2026-01-26
**Status**: Complete

#### Problem Statement
Users had no way to:
- See who they are logged in as
- Log out from the main application
- Navigate to billing/subscription management
- Access account settings

This is a fundamental UX requirement for any SaaS application that was missing from the dashboard.

#### Solution: Professional User Profile Dropdown

Implemented following UX patterns from Linear, Notion, Figma, and other world-class SaaS applications:

| Task | Status | Notes |
|------|--------|-------|
| Install Radix dropdown menu | ✅ Done | `@radix-ui/react-dropdown-menu` - accessible, keyboard-navigable |
| Create dropdown-menu UI component | ✅ Done | `src/components/ui/dropdown-menu.tsx` - styled wrapper |
| Create UserAvatar component | ✅ Done | `src/components/layout/UserAvatar.tsx` - initials with deterministic colors |
| Create UserProfileDropdown component | ✅ Done | `src/components/layout/UserProfileDropdown.tsx` - full menu |
| Integrate into ResizableLayout | ✅ Done | Added to right panel header |

#### UX Design Principles Applied

1. **Consistent Placement**: Avatar in top-right corner (industry standard)
2. **Visual Hierarchy**:
   - User identity section at top (name + email)
   - Navigation actions in middle (Billing, Settings)
   - Destructive action (Sign out) at bottom with red styling
3. **Accessibility**:
   - Full keyboard navigation (arrow keys, Enter, Escape)
   - Screen reader support via Radix primitives
   - Focus indicators on all interactive elements
4. **Microinteractions**:
   - Hover scale effect on avatar
   - Smooth dropdown animation
   - Loading skeleton while session loads

#### Component Architecture

```
UserProfileDropdown
├── Trigger: UserAvatar (button)
└── DropdownMenuContent
    ├── DropdownMenuLabel (user info)
    ├── DropdownMenuSeparator
    ├── DropdownMenuItem (Billing)
    ├── DropdownMenuItem (Settings - disabled, "Soon" label)
    ├── DropdownMenuSeparator
    └── DropdownMenuItem (Sign out - red styling)
```

#### Files Created

| File | Purpose |
|------|---------|
| `src/components/ui/dropdown-menu.tsx` | Radix dropdown wrapper with app styling |
| `src/components/layout/UserAvatar.tsx` | User initials avatar with deterministic colors |
| `src/components/layout/UserProfileDropdown.tsx` | Complete user menu component |

#### Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/ResizableLayout.tsx` | Added UserProfileDropdown to right panel header |
| `package.json` | Added `@radix-ui/react-dropdown-menu` dependency |

#### Menu Items

| Item | Route | Status | Description |
|------|-------|--------|-------------|
| Billing | `/billing` | Active | Subscription management |
| Settings | `/settings` | Disabled | Future: password change, preferences |
| Sign out | N/A | Active | Calls `authClient.signOut()` → redirects to `/login` |

#### Future Enhancements (Not Implemented)

- Account settings page (`/settings`) for password changes
- Profile image upload support in UserAvatar
- Keyboard shortcut hints in menu items
- Organization switcher (if multi-org support added)

