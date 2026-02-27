-- Add projectId and sortOrder to subcategories table for Knowledge feature
ALTER TABLE "subcategories" ADD COLUMN "project_id" text REFERENCES "projects"("id");
ALTER TABLE "subcategories" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;

-- Rename administration category to authorities
UPDATE "categories" SET "id" = 'authorities', "name" = 'Authorities' WHERE "id" = 'administration';
-- Update any documents categorized under the old 'administration' ID
UPDATE "documents" SET "category_id" = 'authorities' WHERE "category_id" = 'administration';
