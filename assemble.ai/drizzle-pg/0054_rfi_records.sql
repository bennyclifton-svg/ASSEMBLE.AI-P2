-- Typed RFI register MVP.

CREATE TABLE IF NOT EXISTS "rfi_records" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
    "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
    "rfi_number" integer NOT NULL,
    "title" text NOT NULL,
    "question" text NOT NULL,
    "status" text NOT NULL DEFAULT 'draft',
    "priority" text NOT NULL DEFAULT 'medium',
    "responsible_stakeholder_id" text REFERENCES "project_stakeholders"("id") ON DELETE set null,
    "due_date" text,
    "row_version" integer NOT NULL DEFAULT 1,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "deleted_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "rfi_records_project_number_unique"
ON "rfi_records" ("project_id", "rfi_number");

CREATE INDEX IF NOT EXISTS "idx_rfi_records_project"
ON "rfi_records" ("project_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_records_org_project"
ON "rfi_records" ("organization_id", "project_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_records_project_status"
ON "rfi_records" ("project_id", "status");

CREATE INDEX IF NOT EXISTS "idx_rfi_records_project_due_date"
ON "rfi_records" ("project_id", "due_date");

CREATE INDEX IF NOT EXISTS "idx_rfi_records_responsible"
ON "rfi_records" ("responsible_stakeholder_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rfi_records_status_check'
    ) THEN
        ALTER TABLE "rfi_records"
        ADD CONSTRAINT "rfi_records_status_check"
        CHECK ("status" IN ('draft', 'open', 'responded', 'closed'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rfi_records_priority_check'
    ) THEN
        ALTER TABLE "rfi_records"
        ADD CONSTRAINT "rfi_records_priority_check"
        CHECK ("priority" IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;
