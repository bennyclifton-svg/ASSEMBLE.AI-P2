-- Migration: Add Profiler Module Tables (Feature 019)

-- Project Profiles (Class/Type/Subclass/Scale/Complexity taxonomy)
CREATE TABLE IF NOT EXISTS "project_profiles" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "building_class" text NOT NULL,
    "project_type_v2" text NOT NULL,
    "subclass" text NOT NULL,
    "subclass_other" text,
    "scale_data" text NOT NULL,
    "complexity" text NOT NULL,
    "complexity_score" integer,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "project_profiles_project_id_unique" UNIQUE("project_id")
);

-- Index for querying by class and type
CREATE INDEX IF NOT EXISTS "idx_profiles_class_type" ON "project_profiles" ("building_class", "project_type_v2");

-- Profiler Objectives (new 2-category structure)
CREATE TABLE IF NOT EXISTS "profiler_objectives" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "functional_quality" text NOT NULL,
    "planning_compliance" text NOT NULL,
    "profile_context" text,
    "generated_at" timestamp,
    "polished_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "profiler_objectives_project_id_unique" UNIQUE("project_id")
);

-- Profile Patterns (AI learning - aggregate, anonymous)
CREATE TABLE IF NOT EXISTS "profile_patterns" (
    "id" text PRIMARY KEY NOT NULL,
    "building_class" text NOT NULL,
    "project_type" text NOT NULL,
    "pattern_type" text NOT NULL,
    "pattern_value" text NOT NULL,
    "occurrence_count" integer DEFAULT 1,
    "last_seen" timestamp DEFAULT now(),
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "idx_patterns_unique" UNIQUE("building_class", "project_type", "pattern_type", "pattern_value")
);
