-- RFI response lifecycle and transition audit trail.

ALTER TABLE "rfi_records"
ADD COLUMN IF NOT EXISTS "response_text" text;

ALTER TABLE "rfi_records"
ADD COLUMN IF NOT EXISTS "response_date" text;

CREATE INDEX IF NOT EXISTS "idx_rfi_records_project_response_date"
ON "rfi_records" ("project_id", "response_date");

CREATE TABLE IF NOT EXISTS "rfi_audit_events" (
    "id" text PRIMARY KEY NOT NULL,
    "rfi_id" text NOT NULL REFERENCES "rfi_records"("id") ON DELETE cascade,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
    "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
    "action" text NOT NULL,
    "actor_id" text NOT NULL,
    "actor_name" text,
    "previous_status" text NOT NULL,
    "new_status" text NOT NULL,
    "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_rfi_audit_events_rfi"
ON "rfi_audit_events" ("rfi_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_audit_events_project"
ON "rfi_audit_events" ("project_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_audit_events_org_project"
ON "rfi_audit_events" ("organization_id", "project_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rfi_audit_events_action_check'
    ) THEN
        ALTER TABLE "rfi_audit_events"
        ADD CONSTRAINT "rfi_audit_events_action_check"
        CHECK ("action" IN ('response_recorded', 'closed', 'reopened'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rfi_audit_events_previous_status_check'
    ) THEN
        ALTER TABLE "rfi_audit_events"
        ADD CONSTRAINT "rfi_audit_events_previous_status_check"
        CHECK ("previous_status" IN ('draft', 'open', 'responded', 'closed'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rfi_audit_events_new_status_check'
    ) THEN
        ALTER TABLE "rfi_audit_events"
        ADD CONSTRAINT "rfi_audit_events_new_status_check"
        CHECK ("new_status" IN ('draft', 'open', 'responded', 'closed'));
    END IF;
END $$;
