-- Add brief short/long columns to project_stakeholders.
-- briefServices / briefDeliverables continue to hold the SHORT (bullet) version.
-- briefServicesPolished / briefDeliverablesPolished hold the LONG (polished) version.
-- briefServicesViewMode / briefDeliverablesViewMode persist which view the user
-- last selected per sub-section ('short' default).

ALTER TABLE "project_stakeholders" ADD COLUMN IF NOT EXISTS "brief_services_polished" text;
ALTER TABLE "project_stakeholders" ADD COLUMN IF NOT EXISTS "brief_deliverables_polished" text;
ALTER TABLE "project_stakeholders" ADD COLUMN IF NOT EXISTS "brief_services_view_mode" text DEFAULT 'short';
ALTER TABLE "project_stakeholders" ADD COLUMN IF NOT EXISTS "brief_deliverables_view_mode" text DEFAULT 'short';
