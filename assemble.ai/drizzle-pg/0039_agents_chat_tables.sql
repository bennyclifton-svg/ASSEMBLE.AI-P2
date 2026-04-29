-- Migration: 0039_agents_chat_tables.sql
-- Phase 1 of the agent-integration plan: chat dock tables.
-- Adds chat_threads, chat_messages, agent_runs, tool_calls.
-- Read-only-Q&A MVP; mutating tools and approvals come in a later phase.

CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    -- user_id is a Better Auth user id; no FK to keep this migration independent of the auth schema cycle
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New conversation',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_project ON chat_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_org ON chat_threads(organization_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    agent_name TEXT,
    run_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);

CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    trigger_message_id TEXT REFERENCES chat_messages(id),
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    model TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_microusd INTEGER DEFAULT 0,
    error JSONB,
    started_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_thread ON agent_runs(thread_id);

CREATE TABLE IF NOT EXISTS tool_calls (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    input JSONB NOT NULL,
    output JSONB,
    status TEXT NOT NULL DEFAULT 'running',
    duration_ms INTEGER,
    error JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_run ON tool_calls(run_id);
