-- Tender Evaluation AI foundations
-- Adds VM/status/lock/source scaffolding without replacing the existing evaluation model.

ALTER TABLE "evaluation_rows"
ADD COLUMN IF NOT EXISTS "ai_stable_key" text,
ADD COLUMN IF NOT EXISTS "is_locked" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "category" text,
ADD COLUMN IF NOT EXISTS "source_document_id" text,
ADD COLUMN IF NOT EXISTS "source_file_asset_id" text,
ADD COLUMN IF NOT EXISTS "vm_adoption_status" text,
ADD COLUMN IF NOT EXISTS "vm_embedded_in_base" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "vm_origin" text;

ALTER TABLE "evaluation_cells"
ADD COLUMN IF NOT EXISTS "value_type" text DEFAULT 'amount';

CREATE INDEX IF NOT EXISTS "idx_evaluation_rows_ai_stable_key"
ON "evaluation_rows" ("evaluation_price_id", "ai_stable_key");

CREATE INDEX IF NOT EXISTS "idx_evaluation_rows_table_type"
ON "evaluation_rows" ("evaluation_price_id", "table_type");
