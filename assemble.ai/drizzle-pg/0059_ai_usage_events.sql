CREATE TABLE IF NOT EXISTS "ai_usage_events" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "organization_id" text NOT NULL REFERENCES "organizations"("id"),
    "project_id" text REFERENCES "projects"("id") ON DELETE cascade,
    "action" text NOT NULL,
    "status" text DEFAULT 'reserved' NOT NULL,
    "period_start" timestamp NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "error" text,
    "created_at" timestamp DEFAULT now(),
    "completed_at" timestamp,
    "failed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_ai_usage_events_user_period"
    ON "ai_usage_events" ("user_id", "organization_id", "period_start");

CREATE INDEX IF NOT EXISTS "idx_ai_usage_events_project"
    ON "ai_usage_events" ("project_id");

CREATE INDEX IF NOT EXISTS "idx_ai_usage_events_status"
    ON "ai_usage_events" ("status");
