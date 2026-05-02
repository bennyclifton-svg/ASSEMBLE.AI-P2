CREATE TABLE IF NOT EXISTS action_invocations (
    id text PRIMARY KEY,
    action_id text NOT NULL,
    actor_kind text NOT NULL,
    actor_id text NOT NULL,
    organization_id text NOT NULL REFERENCES organizations(id),
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    thread_id text REFERENCES chat_threads(id) ON DELETE SET NULL,
    run_id text REFERENCES agent_runs(id) ON DELETE SET NULL,
    workflow_step_id text,
    input jsonb NOT NULL,
    output jsonb,
    approval_id text REFERENCES approvals(id) ON DELETE SET NULL,
    view_context jsonb,
    status text NOT NULL DEFAULT 'running',
    error jsonb,
    created_at timestamp DEFAULT now(),
    finished_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_action_invocations_action ON action_invocations(action_id);
CREATE INDEX IF NOT EXISTS idx_action_invocations_project ON action_invocations(project_id);
CREATE INDEX IF NOT EXISTS idx_action_invocations_actor ON action_invocations(actor_kind, actor_id);
CREATE INDEX IF NOT EXISTS idx_action_invocations_approval ON action_invocations(approval_id);
