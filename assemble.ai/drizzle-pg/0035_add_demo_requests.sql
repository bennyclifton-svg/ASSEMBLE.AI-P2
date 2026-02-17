-- Migration: Demo Requests Table
-- Landing Page Lead Capture

CREATE TABLE IF NOT EXISTS "demo_requests" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'demo_form',
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "demo_requests_created_at_idx" ON "demo_requests" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "demo_requests_email_idx" ON "demo_requests" ("email");
