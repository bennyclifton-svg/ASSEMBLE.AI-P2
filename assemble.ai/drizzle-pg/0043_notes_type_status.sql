-- 0043_notes_type_status.sql
-- Add lightweight construction-management capture metadata to notes.

ALTER TABLE notes ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'note';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
