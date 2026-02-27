-- Add 3 new design categories
INSERT INTO "categories" ("id", "name", "is_system") VALUES ('scheme-design', 'Scheme Design', true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "categories" ("id", "name", "is_system") VALUES ('detail-design', 'Detail Design', true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "categories" ("id", "name", "is_system") VALUES ('ifc-design', 'IFC Design', true) ON CONFLICT ("id") DO NOTHING;

-- Category visibility table (per-project toggle)
CREATE TABLE IF NOT EXISTS "category_visibility" (
    "project_id" text NOT NULL REFERENCES "projects"("id"),
    "category_id" text NOT NULL REFERENCES "categories"("id"),
    "is_visible" boolean NOT NULL DEFAULT true,
    PRIMARY KEY ("project_id", "category_id")
);
