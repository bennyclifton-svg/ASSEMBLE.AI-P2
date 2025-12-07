-- Migration: Add file_asset_id to invoices table
-- Feature 006 - Cost Planning Module (Task T145)
-- Links invoices to their source PDF documents

ALTER TABLE invoices ADD COLUMN file_asset_id TEXT REFERENCES file_assets(id);
