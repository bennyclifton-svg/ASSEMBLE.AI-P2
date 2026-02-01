-- Add rft_number column to rft_new table for multi-instance support
ALTER TABLE "rft_new" ADD COLUMN "rft_number" integer NOT NULL DEFAULT 1;

-- Add trr_number column to trr table for multi-instance support
ALTER TABLE "trr" ADD COLUMN "trr_number" integer NOT NULL DEFAULT 1;
