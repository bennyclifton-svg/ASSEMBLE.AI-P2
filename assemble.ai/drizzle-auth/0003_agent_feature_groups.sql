-- Migration: 0003_agent_feature_groups.sql
-- Seed model_settings rows for the new agent-runtime feature groups.
-- Phase 1 of the agent integration plan. Idempotent.

INSERT INTO "model_settings" ("feature_group", "provider", "model_id") VALUES
    ('agent_specialist',    'anthropic', 'claude-sonnet-4-6'),
    ('agent_orchestrator',  'anthropic', 'claude-sonnet-4-6')
ON CONFLICT ("feature_group") DO NOTHING;
