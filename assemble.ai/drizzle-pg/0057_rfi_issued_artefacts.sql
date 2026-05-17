CREATE TABLE IF NOT EXISTS "rfi_issued_artefacts" (
    "id" text PRIMARY KEY NOT NULL,
    "rfi_id" text NOT NULL REFERENCES "rfi_records"("id") ON DELETE cascade,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
    "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
    "version_number" integer NOT NULL,
    "format" text NOT NULL,
    "file_asset_id" text NOT NULL REFERENCES "file_assets"("id"),
    "filename" text NOT NULL,
    "mime_type" text NOT NULL,
    "size_bytes" integer NOT NULL,
    "hash" text NOT NULL,
    "source_rfi_row_version" integer NOT NULL,
    "generated_by" text NOT NULL,
    "generated_by_name" text,
    "generated_at" timestamp DEFAULT now(),
    "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "rfi_issued_artefacts_rfi_version_unique"
ON "rfi_issued_artefacts" ("rfi_id", "version_number");

CREATE INDEX IF NOT EXISTS "idx_rfi_issued_artefacts_rfi"
ON "rfi_issued_artefacts" ("rfi_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_issued_artefacts_project"
ON "rfi_issued_artefacts" ("project_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_issued_artefacts_org_project"
ON "rfi_issued_artefacts" ("organization_id", "project_id");

CREATE INDEX IF NOT EXISTS "idx_rfi_issued_artefacts_file_asset"
ON "rfi_issued_artefacts" ("file_asset_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rfi_issued_artefacts_format_check'
    ) THEN
        ALTER TABLE "rfi_issued_artefacts"
        ADD CONSTRAINT "rfi_issued_artefacts_format_check"
        CHECK ("format" IN ('pdf', 'docx'));
    END IF;
END $$;
