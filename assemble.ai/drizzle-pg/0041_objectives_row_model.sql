-- 0041_objectives_row_model.sql
--
-- Convert the project_objectives table from the legacy 4-blob model
-- (functional/quality/budget/program text columns, one row per project) to
-- the per-row model defined in src/lib/db/objectives-schema.ts.
--
-- The legacy table also held question_answers for the project initialiser /
-- cost-plan flows. That column is moved to a new project_question_answers
-- table so it survives the drop.
--
-- Idempotent: safe to re-run. The DROP/CREATE on project_objectives is
-- guarded by checking whether the legacy "functional" column is present.

BEGIN;

-- 1. Question answers — new home for what used to live on project_objectives.
CREATE TABLE IF NOT EXISTS "project_question_answers" (
    "project_id" text PRIMARY KEY NOT NULL,
    "answers" text,
    "updated_at" timestamp DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'project_question_answers_project_id_projects_id_fk'
    ) THEN
        ALTER TABLE "project_question_answers"
            ADD CONSTRAINT "project_question_answers_project_id_projects_id_fk"
            FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
            ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- 2. Migrate any existing question_answers from the legacy table before drop.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_objectives'
          AND column_name = 'question_answers'
    ) THEN
        INSERT INTO "project_question_answers" ("project_id", "answers", "updated_at")
        SELECT "project_id", "question_answers", COALESCE("updated_at", now())
        FROM "project_objectives"
        WHERE "question_answers" IS NOT NULL
        ON CONFLICT ("project_id") DO NOTHING;
    END IF;
END $$;

-- 3. Drop the legacy project_objectives table and recreate with the row model.
--    Detected by presence of the legacy "functional" text column.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_objectives'
          AND column_name = 'functional'
    ) THEN
        DROP TABLE "project_objectives";
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "project_objectives" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" text NOT NULL,
    "objective_type" text NOT NULL,
    "source" text NOT NULL,
    "text" text NOT NULL,
    "text_polished" text,
    "category" text,
    "status" text DEFAULT 'draft' NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "rule_id" text,
    "confidence" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'project_objectives_project_id_projects_id_fk'
    ) THEN
        ALTER TABLE "project_objectives"
            ADD CONSTRAINT "project_objectives_project_id_projects_id_fk"
            FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
            ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_project_objectives_project_type"
    ON "project_objectives" ("project_id", "objective_type")
    WHERE "is_deleted" = false;

-- 4. Generation sessions table — also defined in objectives-schema.ts but
--    never had a creation migration. Create it now if missing.
CREATE TABLE IF NOT EXISTS "objective_generation_sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" text NOT NULL,
    "objective_type" text NOT NULL,
    "iteration" integer NOT NULL,
    "profiler_snapshot" jsonb,
    "matched_rules" jsonb,
    "generated_items" jsonb,
    "created_at" timestamp DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'objective_generation_sessions_project_id_projects_id_fk'
    ) THEN
        ALTER TABLE "objective_generation_sessions"
            ADD CONSTRAINT "objective_generation_sessions_project_id_projects_id_fk"
            FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
            ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

COMMIT;
