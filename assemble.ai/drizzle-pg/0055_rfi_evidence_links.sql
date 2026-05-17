-- RFI evidence links and lightweight legacy note promotion support.

ALTER TABLE "rfi_records"
ADD COLUMN IF NOT EXISTS "source_note_id" text REFERENCES "notes"("id") ON DELETE set null;

CREATE UNIQUE INDEX IF NOT EXISTS "rfi_records_project_source_note_unique"
ON "rfi_records" ("project_id", "source_note_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_records_source_note"
ON "rfi_records" ("source_note_id");

CREATE TABLE IF NOT EXISTS "rfi_evidence_links" (
    "id" text PRIMARY KEY NOT NULL,
    "rfi_id" text NOT NULL REFERENCES "rfi_records"("id") ON DELETE cascade,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
    "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
    "target_type" text NOT NULL,
    "target_id" text NOT NULL,
    "label" text NOT NULL,
    "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "rfi_evidence_links_target_unique"
ON "rfi_evidence_links" ("rfi_id", "target_type", "target_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_evidence_links_rfi"
ON "rfi_evidence_links" ("rfi_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_evidence_links_project"
ON "rfi_evidence_links" ("project_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_evidence_links_target"
ON "rfi_evidence_links" ("target_type", "target_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rfi_evidence_links_target_type_check'
    ) THEN
        ALTER TABLE "rfi_evidence_links"
        ADD CONSTRAINT "rfi_evidence_links_target_type_check"
        CHECK ("target_type" IN ('document', 'note', 'correspondence'));
    END IF;
END $$;
