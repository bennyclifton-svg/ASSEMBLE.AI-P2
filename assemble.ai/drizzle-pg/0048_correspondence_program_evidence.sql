CREATE TABLE IF NOT EXISTS project_inboxes (
    project_id text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    local_part text NOT NULL UNIQUE,
    email_address text NOT NULL UNIQUE,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_inboxes_email ON project_inboxes(email_address);

CREATE TABLE IF NOT EXISTS correspondence_threads (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    subject text NOT NULL,
    normalized_subject text NOT NULL,
    last_message_at timestamp DEFAULT now(),
    message_count integer NOT NULL DEFAULT 0,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correspondence_threads_project ON correspondence_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_threads_subject ON correspondence_threads(project_id, normalized_subject);

CREATE TABLE IF NOT EXISTS correspondence (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    thread_id text NOT NULL REFERENCES correspondence_threads(id) ON DELETE CASCADE,
    direction text NOT NULL DEFAULT 'inbound',
    correspondence_type text NOT NULL DEFAULT 'general',
    classification_status text NOT NULL DEFAULT 'unclassified',
    provider_message_id text,
    from_name text,
    from_email text NOT NULL,
    to_emails jsonb DEFAULT '[]'::jsonb,
    cc_emails jsonb DEFAULT '[]'::jsonb,
    subject text NOT NULL,
    body_text text,
    body_html text,
    sent_at timestamp,
    received_at timestamp DEFAULT now(),
    in_reply_to text,
    references_message_ids jsonb DEFAULT '[]'::jsonb,
    raw_headers jsonb,
    raw_payload jsonb,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correspondence_project ON correspondence(project_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_thread ON correspondence(thread_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_message_id ON correspondence(project_id, provider_message_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_received ON correspondence(project_id, received_at);

CREATE TABLE IF NOT EXISTS correspondence_attachments (
    id text PRIMARY KEY,
    correspondence_id text NOT NULL REFERENCES correspondence(id) ON DELETE CASCADE,
    document_id text REFERENCES documents(id) ON DELETE SET NULL,
    file_asset_id text REFERENCES file_assets(id) ON DELETE SET NULL,
    original_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    content_id text,
    created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correspondence_attachments_correspondence ON correspondence_attachments(correspondence_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_attachments_document ON correspondence_attachments(document_id);

INSERT INTO categories (id, name, is_system)
VALUES ('correspondence', 'Correspondence', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS program_activity_expected_outputs (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    activity_id text NOT NULL REFERENCES program_activities(id) ON DELETE CASCADE,
    label text NOT NULL,
    description text,
    evidence_type text,
    is_required boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_expected_outputs_activity ON program_activity_expected_outputs(activity_id);
CREATE INDEX IF NOT EXISTS idx_program_expected_outputs_project ON program_activity_expected_outputs(project_id);

CREATE TABLE IF NOT EXISTS program_activity_evidence_links (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    activity_id text NOT NULL REFERENCES program_activities(id) ON DELETE CASCADE,
    expected_output_id text REFERENCES program_activity_expected_outputs(id) ON DELETE SET NULL,
    evidence_type text NOT NULL,
    evidence_id text NOT NULL,
    database_entity_type text,
    status text NOT NULL DEFAULT 'candidate',
    confidence integer,
    note text,
    linked_by text NOT NULL DEFAULT 'system',
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_evidence_links_activity ON program_activity_evidence_links(activity_id);
CREATE INDEX IF NOT EXISTS idx_program_evidence_links_project ON program_activity_evidence_links(project_id);
CREATE INDEX IF NOT EXISTS idx_program_evidence_links_evidence ON program_activity_evidence_links(evidence_type, evidence_id);
CREATE INDEX IF NOT EXISTS idx_program_evidence_links_expected_output ON program_activity_evidence_links(expected_output_id);
