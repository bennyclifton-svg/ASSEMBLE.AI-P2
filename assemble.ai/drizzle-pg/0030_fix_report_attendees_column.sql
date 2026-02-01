-- Migration: 0030_fix_report_attendees_column.sql
-- Fix: Add missing adhoc_sub_group column to report_attendees table
-- This column was present in the Drizzle schema but missing from the original migration

-- Add the missing column (IF NOT EXISTS pattern for PostgreSQL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'report_attendees'
        AND column_name = 'adhoc_sub_group'
    ) THEN
        ALTER TABLE report_attendees ADD COLUMN adhoc_sub_group TEXT;
    END IF;
END $$;
