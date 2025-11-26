-- Seed default project for MVP testing
INSERT OR IGNORE INTO projects (id, name, code, status, created_at, updated_at)
VALUES (
  'default-project',
  'Default Project',
  'DEFAULT',
  'active',
  datetime('now'),
  datetime('now')
);
