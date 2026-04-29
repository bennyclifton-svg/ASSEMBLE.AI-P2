-- Migration: 0040_agent_approvals.sql
-- Phase 3 of the agent integration plan: approval gate for mutating tools.
--   1. approvals table — records pending changes proposed by agents
--   2. rowVersion column on mutable tables — used for optimistic locking
--      so concurrent user edits don't get silently overwritten by an
--      approved agent change.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    -- Anthropic tool_use_id — kept so we can correlate with the audit row
    -- in tool_calls and (later) feed a deferred result back to the model.
    tool_use_id TEXT NOT NULL,
    -- Validated tool input as the agent submitted it.
    input JSONB NOT NULL,
    -- Structured before/after for the UI: { entity, entityId, before: {...}, after: {...} }.
    proposed_diff JSONB NOT NULL,
    -- pending → approved/rejected/expired by user; approved → applied/conflict on commit.
    status TEXT NOT NULL DEFAULT 'pending',
    -- The actual mutation result on apply (e.g., updated row), for audit replay.
    applied_output JSONB,
    -- Optimistic-locking values captured at propose time.
    expected_row_version INTEGER,
    responded_by TEXT,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_thread ON approvals(thread_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_project ON approvals(project_id);

-- Optimistic-locking column on every table an agent can mutate.
-- Existing rows default to 1; a future PATCH should bump it on every write.
ALTER TABLE cost_lines        ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE variations        ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE program_activities ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE transmittals      ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
