-- Repair early/dev versions of action_invocations that were created before
-- the full audit schema landed. Migration 0044 uses CREATE TABLE IF NOT EXISTS,
-- so it cannot add missing columns to an already-created table.

ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS action_id text;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS actor_kind text;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS actor_id text;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS organization_id text;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS project_id text;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS thread_id text;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS run_id text;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS workflow_step_id text;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS input jsonb;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS output jsonb;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS approval_id text;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS view_context jsonb;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'running';
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS error jsonb;
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE action_invocations ADD COLUMN IF NOT EXISTS finished_at timestamp;

ALTER TABLE action_invocations ALTER COLUMN action_id TYPE text USING action_id::text;
ALTER TABLE action_invocations ALTER COLUMN actor_kind TYPE text USING actor_kind::text;
ALTER TABLE action_invocations ALTER COLUMN actor_id TYPE text USING actor_id::text;
ALTER TABLE action_invocations ALTER COLUMN organization_id TYPE text USING organization_id::text;
ALTER TABLE action_invocations ALTER COLUMN project_id TYPE text USING project_id::text;
ALTER TABLE action_invocations ALTER COLUMN thread_id TYPE text USING thread_id::text;
ALTER TABLE action_invocations ALTER COLUMN run_id TYPE text USING run_id::text;
ALTER TABLE action_invocations ALTER COLUMN workflow_step_id TYPE text USING workflow_step_id::text;
ALTER TABLE action_invocations ALTER COLUMN approval_id TYPE text USING approval_id::text;
ALTER TABLE action_invocations ALTER COLUMN status TYPE text USING status::text;

CREATE INDEX IF NOT EXISTS idx_action_invocations_action ON action_invocations(action_id);
CREATE INDEX IF NOT EXISTS idx_action_invocations_project ON action_invocations(project_id);
CREATE INDEX IF NOT EXISTS idx_action_invocations_actor ON action_invocations(actor_kind, actor_id);
CREATE INDEX IF NOT EXISTS idx_action_invocations_approval ON action_invocations(approval_id);
