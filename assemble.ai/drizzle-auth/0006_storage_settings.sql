-- Storage Settings Migration
--
-- Adds a global admin-controlled storage settings row for local/private
-- deployments. Existing file_assets rows are untouched.

CREATE TABLE IF NOT EXISTS "storage_settings" (
    "id" TEXT PRIMARY KEY,
    "backend" TEXT NOT NULL DEFAULT 'local',
    "local_base_path" TEXT NOT NULL DEFAULT 'uploads',
    "filename_strategy" TEXT NOT NULL DEFAULT 'preserve_original',
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_by" TEXT REFERENCES "user"("id") ON DELETE SET NULL
);

INSERT INTO "storage_settings" ("id", "backend", "local_base_path", "filename_strategy")
VALUES ('default', 'local', 'uploads', 'preserve_original')
ON CONFLICT ("id") DO NOTHING;
