-- Migration: Add work_scope column to project_profiles (Feature 019 - Work Scope Integration)

-- Add work_scope column for storing JSON array of selected work scope items
ALTER TABLE "project_profiles" ADD COLUMN IF NOT EXISTS "work_scope" text;
