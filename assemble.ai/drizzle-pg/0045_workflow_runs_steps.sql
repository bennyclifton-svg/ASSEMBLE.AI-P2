CREATE TABLE IF NOT EXISTS workflow_runs (
    id text PRIMARY KEY,
    workflow_key text NOT NULL,
    user_goal text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    organization_id text NOT NULL REFERENCES organizations(id),
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    thread_id text REFERENCES chat_threads(id) ON DELETE SET NULL,
    actor_user_id text,
    active_agent text,
    current_step_ids jsonb DEFAULT '[]'::jsonb,
    preference_snapshot jsonb,
    plan jsonb,
    summary text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    finished_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_project ON workflow_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_thread ON workflow_runs(thread_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_key ON workflow_runs(workflow_key);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id text PRIMARY KEY,
    workflow_run_id text NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    step_key text NOT NULL,
    title text NOT NULL,
    action_id text NOT NULL,
    state text NOT NULL DEFAULT 'pending',
    dependency_ids jsonb DEFAULT '[]'::jsonb,
    input jsonb NOT NULL,
    output jsonb,
    approval_id text REFERENCES approvals(id) ON DELETE SET NULL,
    failure_policy text NOT NULL DEFAULT 'ask_user',
    risk text NOT NULL DEFAULT 'propose',
    preview jsonb,
    error jsonb,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_run ON workflow_steps(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_state ON workflow_steps(state);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_approval ON workflow_steps(approval_id);
