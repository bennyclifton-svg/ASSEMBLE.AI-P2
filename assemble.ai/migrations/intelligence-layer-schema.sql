-- ============================================
-- Intelligence Layer Schema Migration
-- Session 1: Foundation Schema + Constants
-- ============================================
-- Run this SQL directly in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ALTER document_sets - Add domain columns
-- ============================================

-- Add domain_type column (nullable for backward compatibility)
ALTER TABLE document_sets
  ADD COLUMN IF NOT EXISTS domain_type TEXT;

-- Add domain_tags column (text array, nullable)
ALTER TABLE document_sets
  ADD COLUMN IF NOT EXISTS domain_tags TEXT[];

-- B-tree index on domain_type
CREATE INDEX IF NOT EXISTS idx_document_sets_domain_type
  ON document_sets (domain_type);

-- GIN index on domain_tags for array overlap queries (&&)
CREATE INDEX IF NOT EXISTS idx_document_sets_domain_tags
  ON document_sets USING GIN (domain_tags);

-- Note: repo_type is a TEXT column (not a PostgreSQL ENUM type),
-- so adding new values (knowledge_regulatory, knowledge_practices, knowledge_templates)
-- requires no DDL change — the application-level enum handles validation.

-- ============================================
-- 2. CREATE knowledge_domain_sources table
-- ============================================

CREATE TABLE IF NOT EXISTS knowledge_domain_sources (
  id                       TEXT PRIMARY KEY,
  document_set_id          TEXT NOT NULL REFERENCES document_sets(id) ON DELETE CASCADE,
  source_type              TEXT NOT NULL,  -- 'prebuilt_seed' | 'user_uploaded' | 'organization_library'
  source_version           TEXT,
  last_verified_at         TIMESTAMP,
  applicable_project_types TEXT[],
  applicable_states        TEXT[],
  is_active                BOOLEAN DEFAULT true,
  metadata                 JSONB,
  created_at               TIMESTAMP DEFAULT NOW(),
  updated_at               TIMESTAMP DEFAULT NOW()
);

-- B-tree indexes
CREATE INDEX IF NOT EXISTS idx_kds_document_set ON knowledge_domain_sources (document_set_id);
CREATE INDEX IF NOT EXISTS idx_kds_source_type ON knowledge_domain_sources (source_type);
CREATE INDEX IF NOT EXISTS idx_kds_active ON knowledge_domain_sources (is_active);

-- GIN indexes for array columns
CREATE INDEX IF NOT EXISTS idx_kds_project_types ON knowledge_domain_sources USING GIN (applicable_project_types);
CREATE INDEX IF NOT EXISTS idx_kds_states ON knowledge_domain_sources USING GIN (applicable_states);

-- ============================================
-- 3. CREATE coaching_checklists table
-- ============================================

CREATE TABLE IF NOT EXISTS coaching_checklists (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id       TEXT NOT NULL,
  module            TEXT NOT NULL,
  title             TEXT NOT NULL,
  coaching_category TEXT NOT NULL,
  lifecycle_stages  TEXT[] NOT NULL,
  items             TEXT NOT NULL DEFAULT '[]',
  source            TEXT NOT NULL DEFAULT 'prebuilt',
  domain_id         TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_dismissed      BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklists_project ON coaching_checklists (project_id);
CREATE INDEX IF NOT EXISTS idx_checklists_module ON coaching_checklists (project_id, module);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklists_template ON coaching_checklists (project_id, template_id);

-- ============================================
-- 4. CREATE coaching_conversations table
-- ============================================

CREATE TABLE IF NOT EXISTS coaching_conversations (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module      TEXT NOT NULL,
  title       TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_project ON coaching_conversations (project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_module ON coaching_conversations (project_id, module);

-- ============================================
-- 5. CREATE coaching_messages table
-- ============================================

CREATE TABLE IF NOT EXISTS coaching_messages (
  id                      TEXT PRIMARY KEY,
  conversation_id         TEXT NOT NULL REFERENCES coaching_conversations(id) ON DELETE CASCADE,
  role                    TEXT NOT NULL,
  content                 TEXT NOT NULL,
  sources                 TEXT,
  suggested_followups     TEXT[],
  related_checklist_items TEXT,
  is_saved                BOOLEAN DEFAULT false,
  is_pinned               BOOLEAN DEFAULT false,
  tokens_used             INTEGER,
  created_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON coaching_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_saved ON coaching_messages (conversation_id, is_saved);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON coaching_messages (conversation_id, is_pinned);

-- ============================================
-- Verification queries (run after migration)
-- ============================================

-- Check document_sets has new columns:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'document_sets' AND column_name IN ('domain_type', 'domain_tags');

-- Check new tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('knowledge_domain_sources', 'coaching_checklists', 'coaching_conversations', 'coaching_messages');

-- Check indexes:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('document_sets', 'knowledge_domain_sources', 'coaching_checklists', 'coaching_conversations', 'coaching_messages')
-- ORDER BY tablename, indexname;
