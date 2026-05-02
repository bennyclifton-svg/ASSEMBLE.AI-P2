-- Migration: 0004_per_agent_feature_groups.sql
-- Adds per-agent feature groups so Finance/Program/Design/Orchestrator
-- can be independently tuned. Also adds objectives_generation.
-- Idempotent: inserts skip existing feature_group rows.

INSERT INTO "model_settings" ("feature_group", "provider", "model_id") VALUES
    -- Finance: Sonnet - complex QS reasoning and multi-turn tool loops
    ('agent_finance',         'anthropic', 'claude-sonnet-4-6'),
    -- Program: Sonnet - schedule analysis and milestone interpretation
    ('agent_program',         'anthropic', 'claude-sonnet-4-6'),
    -- Design: Haiku - primarily searches and stakeholder reads
    ('agent_design',          'anthropic', 'claude-haiku-4-5-20251001'),
    -- Objectives: Sonnet - high-quality strategic output
    ('objectives_generation', 'anthropic', 'claude-sonnet-4-6')
ON CONFLICT ("feature_group") DO NOTHING;

-- Orchestrator only routes messages, so downgrade its default to Haiku.
UPDATE "model_settings"
SET "model_id" = 'claude-haiku-4-5-20251001'
WHERE "feature_group" = 'agent_orchestrator'
  AND "model_id" = 'claude-sonnet-4-6';
