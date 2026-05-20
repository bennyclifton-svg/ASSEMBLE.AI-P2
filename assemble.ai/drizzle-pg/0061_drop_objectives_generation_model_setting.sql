-- Collapse `objectives_generation` into `generation`.
-- After this migration the admin Models page renders three rows: extraction, generation, chat.
DELETE FROM "model_settings" WHERE "feature_group" = 'objectives_generation';
