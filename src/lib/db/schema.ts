import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Categories
export const categories = sqliteTable('categories', {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    isSystem: integer('is_system', { mode: 'boolean' }).default(false),
});

// Subcategories
export const subcategories = sqliteTable('subcategories', {
    id: text('id').primaryKey(),
    categoryId: text('category_id').references(() => categories.id).notNull(),
    name: text('name').notNull(),
    isSystem: integer('is_system', { mode: 'boolean' }).default(false),
});

// Documents
export const documents = sqliteTable('documents', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    categoryId: text('category_id').references(() => categories.id),
    subcategoryId: text('subcategory_id').references(() => subcategories.id),
    latestVersionId: text('latest_version_id'), // Circular reference handled in logic
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// File Assets
export const fileAssets = sqliteTable('file_assets', {
    id: text('id').primaryKey(),
    storagePath: text('storage_path').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    hash: text('hash').notNull(),
    ocrStatus: text('ocr_status', { enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] }).default('PENDING'),
    ocrText: text('ocr_text'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Versions
export const versions = sqliteTable('versions', {
    id: text('id').primaryKey(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    fileAssetId: text('file_asset_id').references(() => fileAssets.id).notNull(),
    versionNumber: integer('version_number').notNull(),
    uploadedBy: text('uploaded_by').default('User'), // Placeholder for auth
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Transmittals (formerly Document Schedules)
export const transmittals = sqliteTable('transmittals', {
    id: text('id').primaryKey(),
    subcategoryId: text('subcategory_id').references(() => subcategories.id).notNull(),
    name: text('name').notNull(),
    status: text('status', { enum: ['DRAFT', 'ISSUED'] }).default('DRAFT'),
    issuedAt: text('issued_at'),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Transmittal Items (Many-to-Many link between Transmittal and Version)
export const transmittalItems = sqliteTable('transmittal_items', {
    id: text('id').primaryKey(),
    transmittalId: text('transmittal_id').references(() => transmittals.id).notNull(),
    versionId: text('version_id').references(() => versions.id).notNull(),
    addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// PLANNING CARD SCHEMA
// ============================================================================

// Projects (Main entity - may already exist, adding here for completeness)
export const projects = sqliteTable('projects', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code'),
    status: text('status', { enum: ['active', 'archived', 'pending'] }).default('active'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Project Details (8 fields)
export const projectDetails = sqliteTable('project_details', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    projectName: text('project_name').notNull(),
    address: text('address').notNull(),
    legalAddress: text('legal_address'),
    zoning: text('zoning'),
    jurisdiction: text('jurisdiction'),
    lotArea: integer('lot_area'),
    numberOfStories: integer('number_of_stories'),
    buildingClass: text('building_class'),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Project Objectives (4 fields)
export const projectObjectives = sqliteTable('project_objectives', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    functional: text('functional'),
    quality: text('quality'),
    budget: text('budget'),
    program: text('program'),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Project Stages (5 default stages)
export const projectStages = sqliteTable('project_stages', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    stageNumber: integer('stage_number').notNull(),
    stageName: text('stage_name').notNull(),
    startDate: text('start_date'),
    endDate: text('end_date'),
    duration: integer('duration'),
    status: text('status', { enum: ['not_started', 'in_progress', 'completed'] }).default('not_started'),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Risks
export const risks = sqliteTable('risks', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    likelihood: text('likelihood', { enum: ['low', 'medium', 'high'] }),
    impact: text('impact', { enum: ['low', 'medium', 'high'] }),
    mitigation: text('mitigation'),
    status: text('status', { enum: ['identified', 'mitigated', 'closed'] }).default('identified'),
    order: integer('order').notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Stakeholders
export const stakeholders = sqliteTable('stakeholders', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    name: text('name').notNull(),
    role: text('role'),
    organization: text('organization'),
    email: text('email'),
    phone: text('phone'),
    order: integer('order').notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Consultant Disciplines
export const consultantDisciplines = sqliteTable('consultant_disciplines', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    disciplineName: text('discipline_name').notNull(),
    isEnabled: integer('is_enabled', { mode: 'boolean' }).default(false),
    order: integer('order').notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Consultant Status
export const consultantStatuses = sqliteTable('consultant_statuses', {
    id: text('id').primaryKey(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id).notNull(),
    statusType: text('status_type', { enum: ['brief', 'tender', 'rec', 'award'] }).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(false),
    completedAt: text('completed_at'),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Contractor Trades
export const contractorTrades = sqliteTable('contractor_trades', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    tradeName: text('trade_name').notNull(),
    isEnabled: integer('is_enabled', { mode: 'boolean' }).default(false),
    order: integer('order').notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Contractor Status
export const contractorStatuses = sqliteTable('contractor_statuses', {
    id: text('id').primaryKey(),
    tradeId: text('trade_id').references(() => contractorTrades.id).notNull(),
    statusType: text('status_type', { enum: ['brief', 'tender', 'rec', 'award'] }).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(false),
    completedAt: text('completed_at'),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Revision History
export const revisionHistory = sqliteTable('revision_history', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    fieldName: text('field_name').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    userId: text('user_id').notNull(),
    userName: text('user_name').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// GIS Cache
export const gisCache = sqliteTable('gis_cache', {
    id: text('id').primaryKey(),
    address: text('address').notNull().unique(),
    zoning: text('zoning'),
    jurisdiction: text('jurisdiction'),
    lotArea: integer('lot_area'),
    rawData: text('raw_data'), // JSON string
    cachedAt: text('cached_at').default(sql`CURRENT_TIMESTAMP`),
    expiresAt: text('expires_at').notNull(),
});
