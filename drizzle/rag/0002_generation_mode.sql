-- T099g: Add generationMode column to report_templates
-- Migration: 0002_generation_mode
-- Phase 9: Report Generation Modes

-- Add generation_mode column with default 'ai_assisted'
ALTER TABLE report_templates
ADD COLUMN generation_mode TEXT DEFAULT 'ai_assisted'
CHECK (generation_mode IN ('data_only', 'ai_assisted'));

-- Backfill existing reports to 'ai_assisted' (already handled by DEFAULT)
-- This ensures backward compatibility with existing reports

-- Add comment
COMMENT ON COLUMN report_templates.generation_mode IS 'Report generation mode: data_only (template-based) or ai_assisted (RAG + AI)';
