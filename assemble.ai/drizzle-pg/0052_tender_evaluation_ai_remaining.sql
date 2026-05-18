-- Tender Evaluation AI remaining V1 slice.
-- Adds clarification records, AI artefact pointers, recommendation state, and
-- TRR price/snapshot linkage.

ALTER TABLE "evaluations"
ADD COLUMN IF NOT EXISTS "recommendation_state" text NOT NULL DEFAULT 'draft';

CREATE TABLE IF NOT EXISTS "ai_artefacts" (
    "id" text PRIMARY KEY NOT NULL,
    "kind" text NOT NULL,
    "hash" text NOT NULL,
    "status" text NOT NULL DEFAULT 'ready',
    "payload_file_asset_id" text REFERENCES "file_assets"("id") ON DELETE set null,
    "evaluation_id" text REFERENCES "evaluations"("id") ON DELETE cascade,
    "evaluation_price_id" text REFERENCES "evaluation_price"("id") ON DELETE cascade,
    "package_id" text REFERENCES "tender_submission_packages"("id") ON DELETE cascade,
    "submission_id" text REFERENCES "tender_submissions"("id") ON DELETE cascade,
    "action_invocation_id" text,
    "trr_id" text,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ai_artefacts_kind_hash"
ON "ai_artefacts" ("kind", "hash");

CREATE INDEX IF NOT EXISTS "idx_ai_artefacts_evaluation"
ON "ai_artefacts" ("evaluation_id");

CREATE INDEX IF NOT EXISTS "idx_ai_artefacts_package"
ON "ai_artefacts" ("package_id");

CREATE INDEX IF NOT EXISTS "idx_ai_artefacts_trr"
ON "ai_artefacts" ("trr_id");

CREATE TABLE IF NOT EXISTS "clarifications" (
    "id" text PRIMARY KEY NOT NULL,
    "evaluation_id" text NOT NULL REFERENCES "evaluations"("id") ON DELETE cascade,
    "evaluation_price_id" text REFERENCES "evaluation_price"("id") ON DELETE cascade,
    "firm_id" text NOT NULL,
    "firm_type" text NOT NULL,
    "question_text" text NOT NULL,
    "category" text,
    "materiality" text NOT NULL DEFAULT 'medium',
    "status" text NOT NULL DEFAULT 'draft',
    "response_text" text,
    "response_document_id" text REFERENCES "documents"("id") ON DELETE set null,
    "response_file_asset_id" text REFERENCES "file_assets"("id") ON DELETE set null,
    "linked_row_ids" text NOT NULL DEFAULT '[]',
    "linked_addendum_id" text REFERENCES "addenda"("id") ON DELETE set null,
    "source_ai_artefact_id" text REFERENCES "ai_artefacts"("id") ON DELETE set null,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_clarifications_evaluation"
ON "clarifications" ("evaluation_id");

CREATE INDEX IF NOT EXISTS "idx_clarifications_evaluation_status"
ON "clarifications" ("evaluation_id", "status");

CREATE INDEX IF NOT EXISTS "idx_clarifications_addendum"
ON "clarifications" ("linked_addendum_id");

ALTER TABLE "trr"
ADD COLUMN IF NOT EXISTS "evaluation_price_id" text REFERENCES "evaluation_price"("id") ON DELETE set null,
ADD COLUMN IF NOT EXISTS "issue_snapshot_artefact_id" text REFERENCES "ai_artefacts"("id") ON DELETE set null;
