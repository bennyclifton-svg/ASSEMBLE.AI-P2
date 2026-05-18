CREATE TABLE IF NOT EXISTS "ai_memory_entries" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" text NOT NULL,
    "organization_id" text NOT NULL,
    "category" text DEFAULT 'preference' NOT NULL,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "status" text DEFAULT 'active' NOT NULL,
    "source" text DEFAULT 'manual' NOT NULL,
    "created_by" text,
    "updated_by" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "deleted_at" timestamp,
    CONSTRAINT "ai_memory_entries_project_id_projects_id_fk"
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade,
    CONSTRAINT "ai_memory_entries_organization_id_organizations_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_ai_memory_entries_project"
    ON "ai_memory_entries" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_ai_memory_entries_org_project"
    ON "ai_memory_entries" ("organization_id", "project_id");
CREATE INDEX IF NOT EXISTS "idx_ai_memory_entries_project_status"
    ON "ai_memory_entries" ("project_id", "status");
