import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

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
    categoryId: text('category_id'), // Removed FK constraint - we use string IDs directly
    subcategoryId: text('subcategory_id'), // Removed FK constraint - we use string IDs directly
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
// Supports both subcategory-based (legacy) and discipline/trade-based transmittals
export const transmittals = sqliteTable('transmittals', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id), // Required for discipline-based transmittals
    subcategoryId: text('subcategory_id').references(() => subcategories.id), // Optional - for legacy subcategory-based transmittals
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id), // Optional - for discipline-based transmittals
    tradeId: text('trade_id').references(() => contractorTrades.id), // Optional - for trade-based transmittals
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
    // Cost Planning fields (Feature 006)
    currentReportMonth: text('current_report_month'), // ISO date string (first of month)
    revision: text('revision').default('REV A'),
    currencyCode: text('currency_code').default('AUD'),
    showGst: integer('show_gst', { mode: 'boolean' }).default(false),
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
    // Brief fields (Phase 8)
    briefServices: text('brief_services'),
    briefFee: text('brief_fee'),
    briefProgram: text('brief_program'),
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
    // Scope fields (Phase 8)
    scopeWorks: text('scope_works'),
    scopePrice: text('scope_price'),
    scopeProgram: text('scope_program'),
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

// Discipline Fee Items (Fee Structure line items for tender requests)
export const disciplineFeeItems = sqliteTable('discipline_fee_items', {
    id: text('id').primaryKey(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id).notNull(),
    description: text('description').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Trade Price Items (Price Structure line items for tender requests)
export const tradePriceItems = sqliteTable('trade_price_items', {
    id: text('id').primaryKey(),
    tradeId: text('trade_id').references(() => contractorTrades.id).notNull(),
    description: text('description').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
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

// ============================================================================
// CONSULTANT & CONTRACTOR FIRMS (Feature 004)
// ============================================================================

// Consultants (Firms)
export const consultants = sqliteTable('consultants', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    companyName: text('company_name').notNull(),
    contactPerson: text('contact_person'),
    discipline: text('discipline').notNull(), // matches consultantDisciplines.disciplineName
    email: text('email').notNull(),
    phone: text('phone'),
    mobile: text('mobile'),
    address: text('address'),
    abn: text('abn'),
    notes: text('notes'),
    shortlisted: integer('shortlisted', { mode: 'boolean' }).default(false),
    awarded: integer('awarded', { mode: 'boolean' }).default(false), // Links to Cost Planning
    companyId: text('company_id').references(() => companies.id), // FK to companies master list
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Contractors (Firms)
export const contractors = sqliteTable('contractors', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    companyName: text('company_name').notNull(),
    contactPerson: text('contact_person'),
    trade: text('trade').notNull(), // matches contractorTrades.tradeName
    email: text('email').notNull(),
    phone: text('phone'),
    address: text('address'),
    abn: text('abn'),
    notes: text('notes'),
    shortlisted: integer('shortlisted', { mode: 'boolean' }).default(false),
    awarded: integer('awarded', { mode: 'boolean' }).default(false), // Links to Cost Planning
    companyId: text('company_id').references(() => companies.id), // FK to companies master list
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const consultantDisciplinesRelations = relations(consultantDisciplines, ({ many }) => ({
    statuses: many(consultantStatuses),
    feeItems: many(disciplineFeeItems),
}));

export const consultantStatusesRelations = relations(consultantStatuses, ({ one }) => ({
    discipline: one(consultantDisciplines, {
        fields: [consultantStatuses.disciplineId],
        references: [consultantDisciplines.id],
    }),
}));

export const contractorTradesRelations = relations(contractorTrades, ({ many }) => ({
    statuses: many(contractorStatuses),
    priceItems: many(tradePriceItems),
}));

export const contractorStatusesRelations = relations(contractorStatuses, ({ one }) => ({
    trade: one(contractorTrades, {
        fields: [contractorStatuses.tradeId],
        references: [contractorTrades.id],
    }),
}));

export const disciplineFeeItemsRelations = relations(disciplineFeeItems, ({ one }) => ({
    discipline: one(consultantDisciplines, {
        fields: [disciplineFeeItems.disciplineId],
        references: [consultantDisciplines.id],
    }),
}));

export const tradePriceItemsRelations = relations(tradePriceItems, ({ one }) => ({
    trade: one(contractorTrades, {
        fields: [tradePriceItems.tradeId],
        references: [contractorTrades.id],
    }),
}));

// Consultants → Companies relation (for Award toggle linking)
export const consultantsRelations = relations(consultants, ({ one }) => ({
    company: one(companies, {
        fields: [consultants.companyId],
        references: [companies.id],
    }),
}));

// Contractors → Companies relation (for Award toggle linking)
export const contractorsRelations = relations(contractors, ({ one }) => ({
    company: one(companies, {
        fields: [contractors.companyId],
        references: [companies.id],
    }),
}));

// ============================================================================
// COST PLANNING SCHEMA (Feature 006)
// ============================================================================

// Companies (Master List) - shared across projects for cost tracking
export const companies = sqliteTable('companies', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    abn: text('abn'),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    address: text('address'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'), // Soft delete
});

// Cost Lines (Budget line items in Project Summary)
export const costLines = sqliteTable('cost_lines', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    companyId: text('company_id').references(() => companies.id),
    section: text('section', { enum: ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'] }).notNull(),
    costCode: text('cost_code'),
    description: text('description').notNull(),
    reference: text('reference'), // Contract number, PO reference
    budgetCents: integer('budget_cents').default(0),
    approvedContractCents: integer('approved_contract_cents').default(0),
    sortOrder: integer('sort_order').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'), // Soft delete
});

// Cost Line Allocations (Dynamic FY columns)
export const costLineAllocations = sqliteTable('cost_line_allocations', {
    id: text('id').primaryKey(),
    costLineId: text('cost_line_id').references(() => costLines.id).notNull(),
    fiscalYear: integer('fiscal_year').notNull(), // e.g., 2026 for FY2026
    amountCents: integer('amount_cents').default(0),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Variations (Change orders)
export const variations = sqliteTable('variations', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    costLineId: text('cost_line_id').references(() => costLines.id),
    variationNumber: text('variation_number').notNull(), // e.g., "PV-001", "CV-002"
    category: text('category', { enum: ['Principal', 'Contractor', 'Lessor Works'] }).notNull(),
    description: text('description').notNull(),
    status: text('status', { enum: ['Forecast', 'Approved', 'Rejected', 'Withdrawn'] }).default('Forecast'),
    amountForecastCents: integer('amount_forecast_cents').default(0), // PM's estimate
    amountApprovedCents: integer('amount_approved_cents').default(0), // Approved amount
    dateSubmitted: text('date_submitted'),
    dateApproved: text('date_approved'),
    requestedBy: text('requested_by'),
    approvedBy: text('approved_by'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'), // Soft delete
});

// Invoices
export const invoices = sqliteTable('invoices', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    costLineId: text('cost_line_id').references(() => costLines.id),
    variationId: text('variation_id').references(() => variations.id), // Optional link to variation
    companyId: text('company_id').references(() => companies.id),
    fileAssetId: text('file_asset_id').references(() => fileAssets.id), // Link to source PDF (Phase 14)
    invoiceDate: text('invoice_date').notNull(),
    poNumber: text('po_number'),
    invoiceNumber: text('invoice_number').notNull(),
    description: text('description'),
    amountCents: integer('amount_cents').notNull(),
    gstCents: integer('gst_cents').default(0), // Store GST separately
    periodYear: integer('period_year').notNull(), // e.g., 2025
    periodMonth: integer('period_month').notNull(), // 1-12
    paidStatus: text('paid_status', { enum: ['unpaid', 'paid', 'partial'] }).default('unpaid'),
    paidDate: text('paid_date'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'), // Soft delete
});

// Cost Line Comments (Cell-level comments)
export const costLineComments = sqliteTable('cost_line_comments', {
    id: text('id').primaryKey(),
    costLineId: text('cost_line_id').references(() => costLines.id).notNull(),
    columnKey: text('column_key').notNull(), // e.g., 'budget', 'approved_contract'
    commentText: text('comment_text').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'), // Soft delete
});

// Project Snapshots (Baseline comparison)
export const projectSnapshots = sqliteTable('project_snapshots', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    snapshotName: text('snapshot_name').notNull(), // e.g., "REV A", "Tender Award"
    snapshotDate: text('snapshot_date').notNull(),
    snapshotData: text('snapshot_data').notNull(), // JSON string (full denormalized snapshot)
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Import Templates (Column mapping memory)
export const importTemplates = sqliteTable('import_templates', {
    id: text('id').primaryKey(),
    templateName: text('template_name').notNull(),
    columnMappings: text('column_mappings').notNull(), // JSON string
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// COST PLANNING RELATIONS
// ============================================================================

export const costLinesRelations = relations(costLines, ({ one, many }) => ({
    project: one(projects, {
        fields: [costLines.projectId],
        references: [projects.id],
    }),
    company: one(companies, {
        fields: [costLines.companyId],
        references: [companies.id],
    }),
    allocations: many(costLineAllocations),
    variations: many(variations),
    invoices: many(invoices),
    comments: many(costLineComments),
}));

export const costLineAllocationsRelations = relations(costLineAllocations, ({ one }) => ({
    costLine: one(costLines, {
        fields: [costLineAllocations.costLineId],
        references: [costLines.id],
    }),
}));

export const variationsRelations = relations(variations, ({ one, many }) => ({
    project: one(projects, {
        fields: [variations.projectId],
        references: [projects.id],
    }),
    costLine: one(costLines, {
        fields: [variations.costLineId],
        references: [costLines.id],
    }),
    invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
    project: one(projects, {
        fields: [invoices.projectId],
        references: [projects.id],
    }),
    costLine: one(costLines, {
        fields: [invoices.costLineId],
        references: [costLines.id],
    }),
    variation: one(variations, {
        fields: [invoices.variationId],
        references: [variations.id],
    }),
    company: one(companies, {
        fields: [invoices.companyId],
        references: [companies.id],
    }),
}));

export const costLineCommentsRelations = relations(costLineComments, ({ one }) => ({
    costLine: one(costLines, {
        fields: [costLineComments.costLineId],
        references: [costLines.id],
    }),
}));

export const projectSnapshotsRelations = relations(projectSnapshots, ({ one }) => ({
    project: one(projects, {
        fields: [projectSnapshots.projectId],
        references: [projects.id],
    }),
}));

