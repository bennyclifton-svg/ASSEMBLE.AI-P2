-- Collapse the feature_group enum from 11 values to 3.
--
-- Old groups (extraction-flavoured): document_extraction, text_extraction, cost_line_matching
-- Old groups (generation-flavoured): content_generation, content_polishing, objectives_generation
-- Old groups (chat-flavoured):       agent_specialist, agent_orchestrator,
--                                    agent_finance, agent_program, agent_design
--
-- New groups: extraction, generation, chat
--
-- Each new row inherits its provider+model from a representative donor row so
-- the user's existing model selection is preserved on first load. Falls back
-- to Anthropic Sonnet if no donor row exists. Idempotent: re-running is safe.

-- Seed `extraction` from the prior text_extraction row (if any).
INSERT INTO model_settings (feature_group, provider, model_id, updated_at)
SELECT 'extraction', provider, model_id, NOW()
FROM model_settings WHERE feature_group = 'text_extraction'
ON CONFLICT (feature_group) DO NOTHING;

-- Seed `generation` from the prior content_generation row (if any).
INSERT INTO model_settings (feature_group, provider, model_id, updated_at)
SELECT 'generation', provider, model_id, NOW()
FROM model_settings WHERE feature_group = 'content_generation'
ON CONFLICT (feature_group) DO NOTHING;

-- Seed `chat` from the prior agent_finance row (if any) — the four chat-dock
-- groups were always set to the same model in practice via the master toggle.
INSERT INTO model_settings (feature_group, provider, model_id, updated_at)
SELECT 'chat', provider, model_id, NOW()
FROM model_settings WHERE feature_group = 'agent_finance'
ON CONFLICT (feature_group) DO NOTHING;

-- Backstop seeds in case the donor rows above did not exist.
INSERT INTO model_settings (feature_group, provider, model_id, updated_at)
VALUES
  ('extraction', 'anthropic', 'claude-haiku-4-5-20251001', NOW()),
  ('generation', 'anthropic', 'claude-sonnet-4-6',         NOW()),
  ('chat',       'anthropic', 'claude-sonnet-4-6',         NOW())
ON CONFLICT (feature_group) DO NOTHING;

-- Drop the old groups.
DELETE FROM model_settings WHERE feature_group IN (
  'document_extraction', 'text_extraction', 'cost_line_matching',
  'content_generation', 'content_polishing', 'objectives_generation',
  'agent_specialist', 'agent_orchestrator',
  'agent_finance', 'agent_program', 'agent_design'
);
