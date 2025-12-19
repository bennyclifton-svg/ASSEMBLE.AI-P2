"use strict";
/**
 * RAG Schema - PostgreSQL with pgvector
 *
 * This schema is for the RAG (Retrieval-Augmented Generation) system.
 * Uses Supabase PostgreSQL with pgvector extension for vector storage.
 *
 * Tables:
 * - document_chunks: Vector embeddings for document content
 * - document_sets: Groupings of documents for RAG context
 * - document_set_members: Links documents to sets with sync status
 * - report_templates: Report generation state and TOC
 * - report_sections: Generated section content
 * - report_memory: Cross-project TOC patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPO_TYPE_LABELS = exports.GLOBAL_REPO_TYPES = exports.reportMemory = exports.reportSectionsRelations = exports.reportSections = exports.reportTemplatesRelations = exports.reportTemplates = exports.documentSetMembersRelations = exports.documentSetMembers = exports.documentSetsRelations = exports.documentSets = exports.documentChunksRelations = exports.documentChunks = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
// Custom vector type for pgvector
// Using customType since drizzle-orm doesn't have native pgvector support
var vector = (0, pg_core_1.customType)({
    dataType: function (config) {
        return "vector(".concat(config.dimensions, ")");
    },
    toDriver: function (value) {
        return "[".concat(value.join(','), "]");
    },
    fromDriver: function (value) {
        // Parse "[1,2,3]" format from PostgreSQL
        return value
            .slice(1, -1)
            .split(',')
            .map(function (v) { return parseFloat(v); });
    },
});
// ============================================
// T006: document_chunks
// ============================================
// Stores parsed document content with vector embeddings
exports.documentChunks = (0, pg_core_1.pgTable)('document_chunks', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    documentId: (0, pg_core_1.text)('document_id').notNull(), // External FK to SQLite documents
    parentChunkId: (0, pg_core_1.text)('parent_chunk_id'), // Self-referential for hierarchy
    hierarchyLevel: (0, pg_core_1.integer)('hierarchy_level').notNull().default(0), // 0=doc, 1=section, 2=subsection, 3=clause
    hierarchyPath: (0, pg_core_1.text)('hierarchy_path'), // e.g., "1.2.3" for section/clause
    sectionTitle: (0, pg_core_1.text)('section_title'),
    clauseNumber: (0, pg_core_1.text)('clause_number'),
    content: (0, pg_core_1.text)('content').notNull(),
    embedding: vector('embedding', { dimensions: 1024 }), // voyage-large-2-instruct
    tokenCount: (0, pg_core_1.integer)('token_count'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, function (table) { return [
    (0, pg_core_1.index)('idx_chunks_document').on(table.documentId),
    (0, pg_core_1.index)('idx_chunks_parent').on(table.parentChunkId),
    (0, pg_core_1.index)('idx_chunks_hierarchy').on(table.hierarchyLevel, table.hierarchyPath),
]; });
// Self-referential relation for chunk hierarchy
exports.documentChunksRelations = (0, drizzle_orm_1.relations)(exports.documentChunks, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        parentChunk: one(exports.documentChunks, {
            fields: [exports.documentChunks.parentChunkId],
            references: [exports.documentChunks.id],
            relationName: 'chunkHierarchy',
        }),
        childChunks: many(exports.documentChunks, { relationName: 'chunkHierarchy' }),
    });
});
// ============================================
// T007: document_sets
// ============================================
// Groups documents for RAG context (distinct from transmittals)
// Supports both project-scoped repos and global organization-level repos
exports.documentSets = (0, pg_core_1.pgTable)('document_sets', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    projectId: (0, pg_core_1.text)('project_id'), // External FK to SQLite projects (NULL for global repos)
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    discipline: (0, pg_core_1.text)('discipline'), // Links to consultant discipline
    isDefault: (0, pg_core_1.boolean)('is_default').default(false),
    autoSyncCategoryIds: (0, pg_core_1.text)('auto_sync_category_ids').array(), // Categories to auto-sync
    // Phase 10: RAG Context Architecture - Global & Project Repos
    repoType: (0, pg_core_1.text)('repo_type', {
        enum: ['project', 'due_diligence', 'house', 'apartments', 'fitout', 'industrial', 'remediation'],
    }).default('project'), // Type of repo
    organizationId: (0, pg_core_1.text)('organization_id'), // Required for global repos, NULL for project-scoped
    isGlobal: (0, pg_core_1.boolean)('is_global').default(false), // true for 6 project type repos (org-level)
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, function (table) { return [
    (0, pg_core_1.index)('idx_document_sets_project').on(table.projectId),
    (0, pg_core_1.index)('idx_document_sets_repo_type').on(table.repoType),
    (0, pg_core_1.index)('idx_document_sets_organization').on(table.organizationId),
    (0, pg_core_1.index)('idx_document_sets_is_global').on(table.isGlobal),
    // Note: Partial unique index for is_default=true will be created via raw SQL migration
    // Note: Partial unique index for global repos (organization_id, repo_type) WHERE is_global=true
]; });
exports.documentSetsRelations = (0, drizzle_orm_1.relations)(exports.documentSets, function (_a) {
    var many = _a.many;
    return ({
        members: many(exports.documentSetMembers),
        reports: many(exports.reportTemplates),
    });
});
// ============================================
// T008: document_set_members
// ============================================
// Links documents to document sets (many-to-many) with sync status
exports.documentSetMembers = (0, pg_core_1.pgTable)('document_set_members', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    documentSetId: (0, pg_core_1.text)('document_set_id')
        .notNull()
        .references(function () { return exports.documentSets.id; }, { onDelete: 'cascade' }),
    documentId: (0, pg_core_1.text)('document_id').notNull(), // External FK to SQLite documents
    syncStatus: (0, pg_core_1.text)('sync_status', {
        enum: ['pending', 'processing', 'synced', 'failed'],
    }).default('pending'),
    errorMessage: (0, pg_core_1.text)('error_message'),
    syncedAt: (0, pg_core_1.timestamp)('synced_at'),
    chunksCreated: (0, pg_core_1.integer)('chunks_created').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, function (table) { return [
    (0, pg_core_1.index)('idx_set_members_status').on(table.syncStatus),
    (0, pg_core_1.index)('idx_set_members_document').on(table.documentId),
    (0, pg_core_1.uniqueIndex)('idx_set_members_unique').on(table.documentSetId, table.documentId),
]; });
exports.documentSetMembersRelations = (0, drizzle_orm_1.relations)(exports.documentSetMembers, function (_a) {
    var one = _a.one;
    return ({
        documentSet: one(exports.documentSets, {
            fields: [exports.documentSetMembers.documentSetId],
            references: [exports.documentSets.id],
        }),
    });
});
// ============================================
// T009: report_templates
// ============================================
// Stores report generation state and TOC
exports.reportTemplates = (0, pg_core_1.pgTable)('report_templates', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    projectId: (0, pg_core_1.text)('project_id').notNull(), // External FK to SQLite projects
    documentSetIds: (0, pg_core_1.text)('document_set_ids').array().notNull(), // Which sets to use for context
    reportType: (0, pg_core_1.text)('report_type', {
        enum: ['tender_request'],
    }).notNull(), // V1 only
    title: (0, pg_core_1.text)('title').notNull(),
    discipline: (0, pg_core_1.text)('discipline'), // e.g., "Fire Services"
    disciplineId: (0, pg_core_1.text)('discipline_id'), // Consultant discipline ID for filtering
    tradeId: (0, pg_core_1.text)('trade_id'), // Contractor trade ID for filtering
    tableOfContents: (0, pg_core_1.jsonb)('table_of_contents').notNull().default([]),
    status: (0, pg_core_1.text)('status', {
        enum: ['draft', 'toc_pending', 'generating', 'complete', 'failed'],
    }).default('draft'),
    // T099a: Report Generation Modes
    generationMode: (0, pg_core_1.text)('generation_mode', {
        enum: ['data_only', 'ai_assisted'],
    }).default('ai_assisted'), // Default for backward compatibility
    // T127: Phase 11 - Unified Report Editor
    editedContent: (0, pg_core_1.text)('edited_content'), // Complete unified HTML
    lastEditedAt: (0, pg_core_1.timestamp)('last_edited_at'),
    isEdited: (0, pg_core_1.boolean)('is_edited').default(false),
    parentReportId: (0, pg_core_1.text)('parent_report_id'), // Link Long → Short
    reportChain: (0, pg_core_1.text)('report_chain', {
        enum: ['short', 'long'],
    }).default('short'),
    detailLevel: (0, pg_core_1.text)('detail_level', {
        enum: ['standard', 'comprehensive'],
    }), // For Long RFT
    // T099l: Content length for Long RFT AI generation
    contentLength: (0, pg_core_1.text)('content_length', {
        enum: ['concise', 'lengthy'],
    }).default('concise'), // Default to concise for faster generation
    viewMode: (0, pg_core_1.text)('view_mode', {
        enum: ['sections', 'unified'],
    }).default('unified'), // Display mode for backward compatibility
    // Locking
    lockedBy: (0, pg_core_1.text)('locked_by'), // User ID
    lockedByName: (0, pg_core_1.text)('locked_by_name'), // User display name
    lockedAt: (0, pg_core_1.timestamp)('locked_at'),
    // LangGraph state
    graphState: (0, pg_core_1.jsonb)('graph_state'),
    currentSectionIndex: (0, pg_core_1.integer)('current_section_index').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, function (table) { return [
    (0, pg_core_1.index)('idx_reports_project').on(table.projectId),
    (0, pg_core_1.index)('idx_reports_status').on(table.status),
    (0, pg_core_1.index)('idx_reports_locked').on(table.lockedBy),
    (0, pg_core_1.index)('idx_reports_discipline_id').on(table.disciplineId),
    (0, pg_core_1.index)('idx_reports_trade_id').on(table.tradeId),
]; });
exports.reportTemplatesRelations = (0, drizzle_orm_1.relations)(exports.reportTemplates, function (_a) {
    var many = _a.many;
    return ({
        sections: many(exports.reportSections),
    });
});
// ============================================
// T010: report_sections
// ============================================
// Stores generated section content with source attribution
exports.reportSections = (0, pg_core_1.pgTable)('report_sections', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    reportId: (0, pg_core_1.text)('report_id')
        .notNull()
        .references(function () { return exports.reportTemplates.id; }, { onDelete: 'cascade' }),
    sectionIndex: (0, pg_core_1.integer)('section_index').notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    content: (0, pg_core_1.text)('content'),
    sourceChunkIds: (0, pg_core_1.text)('source_chunk_ids').array(), // Which chunks were used
    sourceRelevance: (0, pg_core_1.jsonb)('source_relevance'), // { chunk_id: relevance_score }
    status: (0, pg_core_1.text)('status', {
        enum: ['pending', 'generating', 'complete', 'regenerating'],
    }).default('pending'),
    generatedAt: (0, pg_core_1.timestamp)('generated_at'),
    regenerationCount: (0, pg_core_1.integer)('regeneration_count').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, function (table) { return [
    (0, pg_core_1.index)('idx_sections_report').on(table.reportId),
    (0, pg_core_1.index)('idx_sections_status').on(table.status),
    (0, pg_core_1.uniqueIndex)('idx_sections_unique').on(table.reportId, table.sectionIndex),
]; });
exports.reportSectionsRelations = (0, drizzle_orm_1.relations)(exports.reportSections, function (_a) {
    var one = _a.one;
    return ({
        report: one(exports.reportTemplates, {
            fields: [exports.reportSections.reportId],
            references: [exports.reportTemplates.id],
        }),
    });
});
// ============================================
// T011: report_memory
// ============================================
// Cross-project learning for TOC patterns
exports.reportMemory = (0, pg_core_1.pgTable)('report_memory', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    organizationId: (0, pg_core_1.text)('organization_id').notNull(),
    reportType: (0, pg_core_1.text)('report_type').notNull(),
    discipline: (0, pg_core_1.text)('discipline'),
    approvedToc: (0, pg_core_1.jsonb)('approved_toc').notNull(), // Merged TOC patterns
    sectionTemplates: (0, pg_core_1.jsonb)('section_templates'), // Common section starters
    timesUsed: (0, pg_core_1.integer)('times_used').default(1),
    successRate: (0, pg_core_1.real)('success_rate'), // Track which patterns work
    lastUsedAt: (0, pg_core_1.timestamp)('last_used_at').defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, function (table) { return [
    (0, pg_core_1.index)('idx_memory_org').on(table.organizationId),
    (0, pg_core_1.index)('idx_memory_lookup').on(table.organizationId, table.reportType, table.discipline),
    (0, pg_core_1.uniqueIndex)('idx_memory_unique').on(table.organizationId, table.reportType, table.discipline),
]; });
// ============================================
// Phase 10: Global Repo Types
// ============================================
// The 6 global project type repos available per organization
exports.GLOBAL_REPO_TYPES = [
    'due_diligence',
    'house',
    'apartments',
    'fitout',
    'industrial',
    'remediation',
];
// Display names for repo types
exports.REPO_TYPE_LABELS = {
    project: 'Project',
    due_diligence: 'Due Diligence',
    house: 'House',
    apartments: 'Apartments',
    fitout: 'Fitout',
    industrial: 'Industrial',
    remediation: 'Remediation',
};
