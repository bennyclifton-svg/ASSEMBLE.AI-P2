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

import {
    pgTable,
    text,
    integer,
    timestamp,
    jsonb,
    boolean,
    real,
    index,
    uniqueIndex,
    customType,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Custom vector type for pgvector
// Using customType since drizzle-orm doesn't have native pgvector support
const vector = customType<{ data: number[]; driverData: string }>({
    dataType(config) {
        return `vector(${(config as { dimensions: number }).dimensions})`;
    },
    toDriver(value: number[]): string {
        return `[${value.join(',')}]`;
    },
    fromDriver(value: string): number[] {
        // Parse "[1,2,3]" format from PostgreSQL
        return value
            .slice(1, -1)
            .split(',')
            .map((v) => parseFloat(v));
    },
});

// ============================================
// T006: document_chunks
// ============================================
// Stores parsed document content with vector embeddings
export const documentChunks = pgTable(
    'document_chunks',
    {
        id: text('id').primaryKey(),
        documentId: text('document_id').notNull(), // External FK to SQLite documents
        parentChunkId: text('parent_chunk_id'), // Self-referential for hierarchy
        hierarchyLevel: integer('hierarchy_level').notNull().default(0), // 0=doc, 1=section, 2=subsection, 3=clause
        hierarchyPath: text('hierarchy_path'), // e.g., "1.2.3" for section/clause
        sectionTitle: text('section_title'),
        clauseNumber: text('clause_number'),
        content: text('content').notNull(),
        embedding: vector('embedding', { dimensions: 1024 }), // voyage-large-2-instruct
        tokenCount: integer('token_count'),
        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at').defaultNow(),
    },
    (table) => [
        index('idx_chunks_document').on(table.documentId),
        index('idx_chunks_parent').on(table.parentChunkId),
        index('idx_chunks_hierarchy').on(table.hierarchyLevel, table.hierarchyPath),
    ]
);

// Self-referential relation for chunk hierarchy
export const documentChunksRelations = relations(documentChunks, ({ one, many }) => ({
    parentChunk: one(documentChunks, {
        fields: [documentChunks.parentChunkId],
        references: [documentChunks.id],
        relationName: 'chunkHierarchy',
    }),
    childChunks: many(documentChunks, { relationName: 'chunkHierarchy' }),
}));

// ============================================
// T007: document_sets
// ============================================
// Groups documents for RAG context (distinct from transmittals)
// Supports both project-scoped repos and global organization-level repos
export const documentSets = pgTable(
    'document_sets',
    {
        id: text('id').primaryKey(),
        projectId: text('project_id'), // External FK to SQLite projects (NULL for global repos)
        name: text('name').notNull(),
        description: text('description'),
        discipline: text('discipline'), // Links to consultant discipline
        isDefault: boolean('is_default').default(false),
        autoSyncCategoryIds: text('auto_sync_category_ids').array(), // Categories to auto-sync
        // Phase 10: RAG Context Architecture - Global & Project Repos
        repoType: text('repo_type', {
            enum: ['project', 'due_diligence', 'house', 'apartments', 'fitout', 'industrial', 'remediation'],
        }).default('project'), // Type of repo
        organizationId: text('organization_id'), // Required for global repos, NULL for project-scoped
        isGlobal: boolean('is_global').default(false), // true for 6 project type repos (org-level)
        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at').defaultNow(),
    },
    (table) => [
        index('idx_document_sets_project').on(table.projectId),
        index('idx_document_sets_repo_type').on(table.repoType),
        index('idx_document_sets_organization').on(table.organizationId),
        index('idx_document_sets_is_global').on(table.isGlobal),
        // Note: Partial unique index for is_default=true will be created via raw SQL migration
        // Note: Partial unique index for global repos (organization_id, repo_type) WHERE is_global=true
    ]
);

export const documentSetsRelations = relations(documentSets, ({ many }) => ({
    members: many(documentSetMembers),
    reports: many(reportTemplates),
}));

// ============================================
// T008: document_set_members
// ============================================
// Links documents to document sets (many-to-many) with sync status
export const documentSetMembers = pgTable(
    'document_set_members',
    {
        id: text('id').primaryKey(),
        documentSetId: text('document_set_id')
            .notNull()
            .references(() => documentSets.id, { onDelete: 'cascade' }),
        documentId: text('document_id').notNull(), // External FK to SQLite documents
        syncStatus: text('sync_status', {
            enum: ['pending', 'processing', 'synced', 'failed'],
        }).default('pending'),
        errorMessage: text('error_message'),
        syncedAt: timestamp('synced_at'),
        chunksCreated: integer('chunks_created').default(0),
        createdAt: timestamp('created_at').defaultNow(),
    },
    (table) => [
        index('idx_set_members_status').on(table.syncStatus),
        index('idx_set_members_document').on(table.documentId),
        uniqueIndex('idx_set_members_unique').on(table.documentSetId, table.documentId),
    ]
);

export const documentSetMembersRelations = relations(documentSetMembers, ({ one }) => ({
    documentSet: one(documentSets, {
        fields: [documentSetMembers.documentSetId],
        references: [documentSets.id],
    }),
}));

// ============================================
// T009: report_templates
// ============================================
// Stores report generation state and TOC
export const reportTemplates = pgTable(
    'report_templates',
    {
        id: text('id').primaryKey(),
        projectId: text('project_id').notNull(), // External FK to SQLite projects
        documentSetIds: text('document_set_ids').array().notNull(), // Which sets to use for context
        reportType: text('report_type', {
            enum: ['tender_request'],
        }).notNull(), // V1 only
        title: text('title').notNull(),
        discipline: text('discipline'), // e.g., "Fire Services"
        disciplineId: text('discipline_id'), // Consultant discipline ID for filtering
        tradeId: text('trade_id'), // Contractor trade ID for filtering
        tableOfContents: jsonb('table_of_contents').notNull().default([]),
        status: text('status', {
            enum: ['draft', 'toc_pending', 'generating', 'complete', 'failed'],
        }).default('draft'),
        // T099a: Report Generation Modes
        generationMode: text('generation_mode', {
            enum: ['data_only', 'ai_assisted'],
        }).default('ai_assisted'), // Default for backward compatibility
        // T127: Phase 11 - Unified Report Editor
        editedContent: text('edited_content'), // Complete unified HTML
        lastEditedAt: timestamp('last_edited_at'),
        isEdited: boolean('is_edited').default(false),
        parentReportId: text('parent_report_id'), // Link Long → Short
        reportChain: text('report_chain', {
            enum: ['short', 'long'],
        }).default('short'),
        detailLevel: text('detail_level', {
            enum: ['standard', 'comprehensive'],
        }), // For Long RFT
        // T099l: Content length for Long RFT AI generation
        contentLength: text('content_length', {
            enum: ['concise', 'lengthy'],
        }).default('concise'), // Default to concise for faster generation
        viewMode: text('view_mode', {
            enum: ['sections', 'unified'],
        }).default('unified'), // Display mode for backward compatibility
        // Locking
        lockedBy: text('locked_by'), // User ID
        lockedByName: text('locked_by_name'), // User display name
        lockedAt: timestamp('locked_at'),
        // LangGraph state
        graphState: jsonb('graph_state'),
        currentSectionIndex: integer('current_section_index').default(0),
        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at').defaultNow(),
    },
    (table) => [
        index('idx_reports_project').on(table.projectId),
        index('idx_reports_status').on(table.status),
        index('idx_reports_locked').on(table.lockedBy),
        index('idx_reports_discipline_id').on(table.disciplineId),
        index('idx_reports_trade_id').on(table.tradeId),
    ]
);

export const reportTemplatesRelations = relations(reportTemplates, ({ many }) => ({
    sections: many(reportSections),
}));

// ============================================
// T010: report_sections
// ============================================
// Stores generated section content with source attribution
export const reportSections = pgTable(
    'report_sections',
    {
        id: text('id').primaryKey(),
        reportId: text('report_id')
            .notNull()
            .references(() => reportTemplates.id, { onDelete: 'cascade' }),
        sectionIndex: integer('section_index').notNull(),
        title: text('title').notNull(),
        content: text('content'),
        sourceChunkIds: text('source_chunk_ids').array(), // Which chunks were used
        sourceRelevance: jsonb('source_relevance'), // { chunk_id: relevance_score }
        status: text('status', {
            enum: ['pending', 'generating', 'complete', 'regenerating'],
        }).default('pending'),
        generatedAt: timestamp('generated_at'),
        regenerationCount: integer('regeneration_count').default(0),
        createdAt: timestamp('created_at').defaultNow(),
    },
    (table) => [
        index('idx_sections_report').on(table.reportId),
        index('idx_sections_status').on(table.status),
        uniqueIndex('idx_sections_unique').on(table.reportId, table.sectionIndex),
    ]
);

export const reportSectionsRelations = relations(reportSections, ({ one }) => ({
    report: one(reportTemplates, {
        fields: [reportSections.reportId],
        references: [reportTemplates.id],
    }),
}));

// ============================================
// T011: report_memory
// ============================================
// Cross-project learning for TOC patterns
export const reportMemory = pgTable(
    'report_memory',
    {
        id: text('id').primaryKey(),
        organizationId: text('organization_id').notNull(),
        reportType: text('report_type').notNull(),
        discipline: text('discipline'),
        approvedToc: jsonb('approved_toc').notNull(), // Merged TOC patterns
        sectionTemplates: jsonb('section_templates'), // Common section starters
        timesUsed: integer('times_used').default(1),
        successRate: real('success_rate'), // Track which patterns work
        lastUsedAt: timestamp('last_used_at').defaultNow(),
        createdAt: timestamp('created_at').defaultNow(),
    },
    (table) => [
        index('idx_memory_org').on(table.organizationId),
        index('idx_memory_lookup').on(table.organizationId, table.reportType, table.discipline),
        uniqueIndex('idx_memory_unique').on(table.organizationId, table.reportType, table.discipline),
    ]
);

// ============================================
// Phase 10: Global Repo Types
// ============================================

// The 6 global project type repos available per organization
export const GLOBAL_REPO_TYPES = [
    'due_diligence',
    'house',
    'apartments',
    'fitout',
    'industrial',
    'remediation',
] as const;

export type GlobalRepoType = (typeof GLOBAL_REPO_TYPES)[number];

export type RepoType = 'project' | GlobalRepoType;

// Display names for repo types
export const REPO_TYPE_LABELS: Record<RepoType, string> = {
    project: 'Project',
    due_diligence: 'Due Diligence',
    house: 'House',
    apartments: 'Apartments',
    fitout: 'Fitout',
    industrial: 'Industrial',
    remediation: 'Remediation',
};

// ============================================
// TypeScript Types for JSONB fields
// ============================================

// T099a: Generation Mode Type
export type GenerationMode = 'data_only' | 'ai_assisted';

// T099l: Content Length for Long RFT
export type ContentLength = 'concise' | 'lengthy';

// T127: Phase 11 - Unified Report Editor Types
export type ReportChain = 'short' | 'long';
export type DetailLevel = 'standard' | 'comprehensive';
export type ViewMode = 'sections' | 'unified';

export interface TableOfContents {
    version: number;
    source: 'memory' | 'generated';
    sections: Array<{
        id: string;
        title: string;
        level: number; // 1=section, 2=subsection
        description?: string;
        estimatedTokens?: number;
    }>;
}

export interface ApprovedToc {
    version: number;
    sections: Array<{
        title: string;
        level: number;
        frequency: number; // How often this section appears
        variants: string[]; // Alternative titles used
    }>;
}

export interface GraphState {
    threadId: string;
    checkpointId: string;
    messages: Array<{
        role: string;
        content: string;
    }>;
    interruptData?: {
        type: 'toc_approval' | 'section_feedback';
        payload: unknown;
    };
}

export interface SourceRelevance {
    [chunkId: string]: number; // 0-1 relevance score
}
