-- Add date fields to RFT NEW and Addenda tables for TRR report

-- Add rft_date column to rft_new table
ALTER TABLE rft_new ADD COLUMN rft_date TEXT;

-- Add addendum_date column to addenda table
ALTER TABLE addenda ADD COLUMN addendum_date TEXT;
