-- Add brief_narrative_override column to projects.
-- When NULL, BriefPreviewPane derives the narrative paragraph from profile data.
-- When set, the stored override is shown instead — the narrative becomes a
-- user-editable field rather than a derived display.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "brief_narrative_override" text;
