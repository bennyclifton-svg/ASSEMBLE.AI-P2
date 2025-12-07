-- Migration: Add Brief fields to consultant_disciplines and Scope fields to contractor_trades
-- Phase 8: UI Refactor - Brief/Scope Sections

-- Add Brief fields to consultant_disciplines table
ALTER TABLE consultant_disciplines ADD COLUMN brief_services TEXT;
ALTER TABLE consultant_disciplines ADD COLUMN brief_fee TEXT;
ALTER TABLE consultant_disciplines ADD COLUMN brief_program TEXT;

-- Add Scope fields to contractor_trades table
ALTER TABLE contractor_trades ADD COLUMN scope_works TEXT;
ALTER TABLE contractor_trades ADD COLUMN scope_price TEXT;
ALTER TABLE contractor_trades ADD COLUMN scope_program TEXT;
