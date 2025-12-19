-- Migration 0025: Program Module Tables (Feature 015)
-- Program/Gantt Chart for project scheduling

-- Program Activities (Gantt chart rows with 2-tier hierarchy)
CREATE TABLE IF NOT EXISTS program_activities (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    parent_id TEXT,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    collapsed INTEGER DEFAULT 0,
    color TEXT,
    sort_order INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Program Dependencies (FS, SS, FF connections between activities)
CREATE TABLE IF NOT EXISTS program_dependencies (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    from_activity_id TEXT NOT NULL REFERENCES program_activities(id) ON DELETE CASCADE,
    to_activity_id TEXT NOT NULL REFERENCES program_activities(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('FS', 'SS', 'FF')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Program Milestones (Diamond markers within activities)
CREATE TABLE IF NOT EXISTS program_milestones (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES program_activities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_activities_project ON program_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_program_activities_parent ON program_activities(parent_id);
CREATE INDEX IF NOT EXISTS idx_program_activities_sort ON program_activities(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_program_dependencies_project ON program_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_program_dependencies_from ON program_dependencies(from_activity_id);
CREATE INDEX IF NOT EXISTS idx_program_dependencies_to ON program_dependencies(to_activity_id);
CREATE INDEX IF NOT EXISTS idx_program_milestones_activity ON program_milestones(activity_id);
