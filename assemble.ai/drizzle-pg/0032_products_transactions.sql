-- Migration: Products and Transactions Tables
-- Phase 5A: Production-Ready Polar Integration
-- Created: 2026-01-26

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
-- Stores subscription plan/product configuration
-- Allows different Polar product IDs for sandbox vs production
-- Replaces hardcoded plans in src/lib/polar/plans.ts

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL UNIQUE,                    -- 'starter', 'professional'
    "polar_product_id" TEXT NOT NULL,               -- Polar product ID (different per environment)
    "price_cents" INTEGER NOT NULL,                 -- Price in cents (4900 = $49.00)
    "billing_interval" TEXT NOT NULL DEFAULT 'month', -- 'month' or 'year'
    "features" JSONB,                               -- Plan features as JSON
    "is_active" BOOLEAN DEFAULT true,
    "display_order" INTEGER DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL
);

-- Index for looking up products by slug (used in checkout)
CREATE INDEX IF NOT EXISTS "products_slug_idx" ON "products" ("slug");
-- Index for active products (used in pricing page)
CREATE INDEX IF NOT EXISTS "products_active_idx" ON "products" ("is_active", "display_order");

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
-- Tracks all payment transactions from Polar
-- Used for audit trail and transaction history in billing page

CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "product_id" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
    "polar_order_id" TEXT UNIQUE,                   -- Polar order ID (idempotency key)
    "polar_checkout_id" TEXT,                       -- Polar checkout session ID
    "polar_subscription_id" TEXT,                   -- Associated subscription if any
    "amount_cents" INTEGER NOT NULL,                -- Amount charged in cents
    "currency" TEXT DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'pending',       -- 'pending', 'completed', 'refunded'
    "metadata" JSONB,                               -- Additional data from Polar
    "created_at" INTEGER NOT NULL
);

-- Index for user transaction history
CREATE INDEX IF NOT EXISTS "transactions_user_id_idx" ON "transactions" ("user_id", "created_at" DESC);
-- Index for Polar order lookup (webhook idempotency)
CREATE INDEX IF NOT EXISTS "transactions_polar_order_idx" ON "transactions" ("polar_order_id");
-- Index for subscription transactions
CREATE INDEX IF NOT EXISTS "transactions_subscription_idx" ON "transactions" ("polar_subscription_id");

-- ============================================================================
-- SEED DATA: Initial Products
-- ============================================================================
-- These match the existing plan definitions in src/lib/polar/plans.ts
-- NOTE: You must update polar_product_id with your actual Polar product IDs

INSERT INTO "products" ("id", "name", "description", "slug", "polar_product_id", "price_cents", "billing_interval", "features", "is_active", "display_order", "created_at", "updated_at")
VALUES
    (
        'prod_starter',
        'Starter',
        'For small firms getting started',
        'starter',
        'REPLACE_WITH_POLAR_STARTER_PRODUCT_ID',
        4900,
        'month',
        '{"maxProjects": 5, "maxDocuments": 1000, "aiQueriesPerMonth": 100, "hasAiDocumentProcessing": true, "hasProcurementAutomation": true, "hasCostPlanning": false, "hasTrrReportGeneration": false, "hasCustomIntegrations": false, "supportLevel": "email"}',
        true,
        1,
        EXTRACT(EPOCH FROM NOW())::INTEGER,
        EXTRACT(EPOCH FROM NOW())::INTEGER
    ),
    (
        'prod_professional',
        'Professional',
        'For growing construction firms',
        'professional',
        'REPLACE_WITH_POLAR_PROFESSIONAL_PRODUCT_ID',
        14900,
        'month',
        '{"maxProjects": -1, "maxDocuments": -1, "aiQueriesPerMonth": -1, "hasAiDocumentProcessing": true, "hasProcurementAutomation": true, "hasCostPlanning": true, "hasTrrReportGeneration": true, "hasCustomIntegrations": true, "supportLevel": "priority"}',
        true,
        2,
        EXTRACT(EPOCH FROM NOW())::INTEGER,
        EXTRACT(EPOCH FROM NOW())::INTEGER
    )
ON CONFLICT ("id") DO NOTHING;
