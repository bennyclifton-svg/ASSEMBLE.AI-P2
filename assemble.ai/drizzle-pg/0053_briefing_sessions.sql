-- Briefing (AI-led brief refinement) v1 persistence.

CREATE TABLE IF NOT EXISTS "briefing_sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
    "status" text NOT NULL DEFAULT 'active',
    "coverage" jsonb NOT NULL DEFAULT '{"planning":false,"functional":false,"quality":false,"compliance":false}'::jsonb,
    "started_at" timestamp DEFAULT now(),
    "completed_at" timestamp,
    "ended_by" text
);

CREATE INDEX IF NOT EXISTS "idx_briefing_sessions_project"
ON "briefing_sessions" ("project_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_briefing_sessions_active_project"
ON "briefing_sessions" ("project_id")
WHERE "status" = 'active';

CREATE TABLE IF NOT EXISTS "briefing_messages" (
    "id" text PRIMARY KEY NOT NULL,
    "session_id" text NOT NULL REFERENCES "briefing_sessions"("id") ON DELETE cascade,
    "role" text NOT NULL,
    "content" text NOT NULL DEFAULT '',
    "tool_calls" jsonb,
    "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_briefing_messages_session_created"
ON "briefing_messages" ("session_id", "created_at");

CREATE TABLE IF NOT EXISTS "brief_attachments" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
    "document_id" text NOT NULL REFERENCES "documents"("id") ON DELETE cascade,
    "attached_by" text NOT NULL,
    "attached_at" timestamp DEFAULT now()
);

ALTER TABLE "project_objectives"
ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'manual';

ALTER TABLE "project_objectives"
ALTER COLUMN "source" SET DEFAULT 'manual';

UPDATE "project_objectives"
SET "source" = 'inference'
WHERE "source" IN ('explicit', 'inferred', 'ai_added');

CREATE UNIQUE INDEX IF NOT EXISTS "brief_attachments_project_document_unique"
ON "brief_attachments" ("project_id", "document_id");

CREATE INDEX IF NOT EXISTS "idx_brief_attachments_project"
ON "brief_attachments" ("project_id");

CREATE INDEX IF NOT EXISTS "idx_brief_attachments_document"
ON "brief_attachments" ("document_id");
