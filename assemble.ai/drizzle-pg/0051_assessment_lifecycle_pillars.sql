-- Migration: Assessment Lifecycle Pillars
-- Broadens the Tender Readiness Health Check from 3 tender pillars
-- (scope/field/process) to 3 lifecycle pillars (design/procure/deliver).
-- Purely additive — legacy columns preserved for historical data.

ALTER TABLE "assessment_waitlist"
ADD COLUMN IF NOT EXISTS "design_score" INTEGER,
ADD COLUMN IF NOT EXISTS "procure_score" INTEGER,
ADD COLUMN IF NOT EXISTS "deliver_score" INTEGER;
