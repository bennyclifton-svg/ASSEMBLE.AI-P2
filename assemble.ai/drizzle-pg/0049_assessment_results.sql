-- Migration: Assessment Result Capture
-- Stores optional Tender Readiness Health Check scores with lead capture.

ALTER TABLE "assessment_waitlist"
ADD COLUMN IF NOT EXISTS "overall_score" INTEGER,
ADD COLUMN IF NOT EXISTS "scope_score" INTEGER,
ADD COLUMN IF NOT EXISTS "field_score" INTEGER,
ADD COLUMN IF NOT EXISTS "process_score" INTEGER,
ADD COLUMN IF NOT EXISTS "weakest_pillar" TEXT,
ADD COLUMN IF NOT EXISTS "answers" JSONB;
