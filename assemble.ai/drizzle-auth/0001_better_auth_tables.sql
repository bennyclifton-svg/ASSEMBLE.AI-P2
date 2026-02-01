-- Better Auth Database Migration
-- Phase 2: Create Better Auth core tables and Polar plugin tables
--
-- This migration creates the tables required by Better Auth alongside
-- the existing auth tables. After verification, the old tables can be removed.
--
-- Run: Apply this migration to your PostgreSQL database

-- ============================================================================
-- BETTER AUTH CORE TABLES
-- ============================================================================

-- Better Auth User Table
-- This is the primary user table for Better Auth
CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    -- Custom fields for organization support
    "organization_id" TEXT,
    "display_name" TEXT
);

-- Index on email for faster lookups
CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user" ("email");

-- Better Auth Session Table
-- Manages user sessions with rolling expiry support
CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "token" TEXT NOT NULL UNIQUE,
    "expires_at" TIMESTAMP NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for session lookups
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" ("user_id");
CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session" ("token");

-- Better Auth Account Table
-- Stores OAuth provider credentials and password hashes
-- Each user can have multiple accounts (email + OAuth providers)
CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" TIMESTAMP,
    "refresh_token_expires_at" TIMESTAMP,
    "scope" TEXT,
    "id_token" TEXT,
    "password" TEXT, -- Hashed password for email/password auth
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE ("provider_id", "account_id")
);

-- Index for account lookups
CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" ("user_id");

-- Better Auth Verification Table
-- Stores verification tokens for email verification, password reset, magic links
CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for verification lookups
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- ============================================================================
-- POLAR PLUGIN TABLES
-- ============================================================================

-- Polar Customer Table
-- Links Better Auth users to Polar customer records
-- Created automatically when createCustomerOnSignUp is enabled
CREATE TABLE IF NOT EXISTS "polar_customer" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE UNIQUE,
    "polar_customer_id" TEXT NOT NULL UNIQUE,
    "email" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for polar customer lookups
CREATE INDEX IF NOT EXISTS "polar_customer_user_id_idx" ON "polar_customer" ("user_id");
CREATE INDEX IF NOT EXISTS "polar_customer_polar_id_idx" ON "polar_customer" ("polar_customer_id");

-- Polar Subscription Table
-- Tracks active subscriptions from Polar, updated via webhooks
CREATE TABLE IF NOT EXISTS "polar_subscription" (
    "id" TEXT PRIMARY KEY,
    "customer_id" TEXT NOT NULL REFERENCES "polar_customer"("id") ON DELETE CASCADE,
    "polar_subscription_id" TEXT NOT NULL UNIQUE,
    "product_id" TEXT NOT NULL,
    "price_id" TEXT,
    "status" TEXT NOT NULL, -- 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
    "current_period_start" TIMESTAMP,
    "current_period_end" TIMESTAMP,
    "cancel_at_period_end" BOOLEAN DEFAULT false,
    "canceled_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for polar subscription lookups
CREATE INDEX IF NOT EXISTS "polar_subscription_customer_id_idx" ON "polar_subscription" ("customer_id");
CREATE INDEX IF NOT EXISTS "polar_subscription_polar_id_idx" ON "polar_subscription" ("polar_subscription_id");
CREATE INDEX IF NOT EXISTS "polar_subscription_status_idx" ON "polar_subscription" ("status");

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- After applying this migration:
-- 1. Run the user migration script: npm run db:auth:migrate-users
-- 2. Test the authentication flow
-- 3. Update components to use Better Auth client
-- 4. After verification, the old auth tables can be removed:
--    - users (old)
--    - sessions (old)
--    - login_attempts
--    - subscriptions (old - now handled by polar_subscription)
