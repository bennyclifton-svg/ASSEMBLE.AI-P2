-- Migration: Multi-Region Support (Feature 022 - Phase 11)
-- Adds region column to project_profiles table to support AU, NZ, UK, US regions
-- with different building codes, approval pathways, and cost benchmarks

-- Add region column with default 'AU' for existing profiles
ALTER TABLE project_profiles ADD COLUMN region TEXT DEFAULT 'AU';

-- Create index for region-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_region ON project_profiles(region);

-- Note: Valid region values are: 'AU', 'NZ', 'UK', 'US'
-- AU = Australia (NCC - National Construction Code)
-- NZ = New Zealand (NZBC - New Zealand Building Code)
-- UK = United Kingdom (BR - Building Regulations)
-- US = United States (IBC - International Building Code)
