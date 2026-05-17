CREATE TABLE IF NOT EXISTS "tender_submission_packages" (
    "id" text PRIMARY KEY NOT NULL,
    "evaluation_id" text NOT NULL REFERENCES "evaluations"("id") ON DELETE cascade,
    "evaluation_price_id" text REFERENCES "evaluation_price"("id") ON DELETE cascade,
    "firm_id" text NOT NULL,
    "firm_type" text NOT NULL,
    "status" text DEFAULT 'active',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_tender_submission_packages_eval_firm"
ON "tender_submission_packages" ("evaluation_id", "evaluation_price_id", "firm_id");

ALTER TABLE "tender_submissions"
ADD COLUMN IF NOT EXISTS "package_id" text REFERENCES "tender_submission_packages"("id") ON DELETE cascade,
ADD COLUMN IF NOT EXISTS "evaluation_price_id" text REFERENCES "evaluation_price"("id") ON DELETE cascade,
ADD COLUMN IF NOT EXISTS "document_id" text REFERENCES "documents"("id") ON DELETE set null,
ADD COLUMN IF NOT EXISTS "version_id" text REFERENCES "versions"("id") ON DELETE set null;

INSERT INTO "tender_submission_packages" (
    "id",
    "evaluation_id",
    "evaluation_price_id",
    "firm_id",
    "firm_type",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    'tsp-' || "evaluation_id" || '-' || "firm_type" || '-' || "firm_id",
    "evaluation_id",
    NULL,
    "firm_id",
    "firm_type",
    'active',
    MIN(COALESCE("created_at", now())),
    MAX(COALESCE("created_at", now()))
FROM "tender_submissions"
WHERE "package_id" IS NULL
GROUP BY "evaluation_id", "firm_id", "firm_type"
ON CONFLICT ("id") DO NOTHING;

UPDATE "tender_submissions" ts
SET "package_id" = 'tsp-' || ts."evaluation_id" || '-' || ts."firm_type" || '-' || ts."firm_id"
WHERE ts."package_id" IS NULL;
