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
    projectId: text('project_id').references(() => projects.id), // Required for stakeholder-based transmittals
    subcategoryId: text('subcategory_id').references(() => subcategories.id), // Optional - for legacy subcategory-based transmittals
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id), // Optional - for stakeholder-based transmittals
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
    // Organization association (Feature 010)
    organizationId: text('organization_id').references(() => organizations.id),
    // Cost Planning fields (Feature 006)
    currentReportMonth: text('current_report_month'), // ISO date string (first of month)
    revision: text('revision').default('REV A'),
    currencyCode: text('currency_code').default('AUD'),
    showGst: integer('show_gst', { mode: 'boolean' }).default(false),
    // Project Initiator (Feature 018) - 14 project types
    projectType: text('project_type', {
        enum: [
            'due-diligence', 'feasibility', 'house', 'apartments', 'apartments-btr',
            'student-housing', 'townhouses', 'retirement-living', 'office', 'retail',
            'industrial', 'fitout', 'refurbishment', 'remediation'
        ]
    }),
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

// Project Objectives (5 fields)
export const projectObjectives = sqliteTable('project_objectives', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    functional: text('functional'),
    quality: text('quality'),
    budget: text('budget'),
    program: text('program'),
    questionAnswers: text('question_answers'), // JSON string of questionnaire answers for recall
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
    briefDeliverables: text('brief_deliverables'),
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
    scopeDeliverables: text('scope_deliverables'),
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
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    section: text('section', { enum: ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'] }).notNull(),
    costCode: text('cost_code'),
    activity: text('activity').notNull(),
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
    stakeholder: one(projectStakeholders, {
        fields: [costLines.stakeholderId],
        references: [projectStakeholders.id],
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

// ============================================================================
// AUTHENTICATION & LANDING PAGE SCHEMA (Feature 010)
// ============================================================================

// Organizations (Tenant/Company)
export const organizations = sqliteTable('organizations', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    defaultSettings: text('default_settings').default('{}'), // JSON string
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
});

// Users
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    organizationId: text('organization_id').references(() => organizations.id),
    // Polar subscription fields (Feature 014 - SaaS Launch)
    polarCustomerId: text('polar_customer_id'),
    subscriptionStatus: text('subscription_status').default('free'), // free, active, canceled, past_due, trialing
    subscriptionPlanId: text('subscription_plan_id'),
    subscriptionEndsAt: integer('subscription_ends_at'), // Unix timestamp
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
});

// Subscriptions (Feature 014 - SaaS Launch)
export const subscriptions = sqliteTable('subscriptions', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    polarSubscriptionId: text('polar_subscription_id').unique(),
    polarCustomerId: text('polar_customer_id'),
    status: text('status').notNull(), // active, canceled, past_due, trialing, incomplete
    planId: text('plan_id').notNull(), // free, starter, professional
    currentPeriodStart: integer('current_period_start'),
    currentPeriodEnd: integer('current_period_end'),
    canceledAt: integer('canceled_at'),
    cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
});

// Sessions
export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
});

// Login Attempts (Rate Limiting)
export const loginAttempts = sqliteTable('login_attempts', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    attempts: integer('attempts').notNull().default(0),
    lockedUntil: integer('locked_until'),
    updatedAt: integer('updated_at').notNull(),
});

// Knowledge Libraries
export const knowledgeLibraries = sqliteTable('knowledge_libraries', {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').notNull().references(() => organizations.id),
    type: text('type').notNull(), // 'due-diligence' | 'house' | 'apartments' | 'fitout' | 'industrial' | 'remediation'
    documentCount: integer('document_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
});

// Library Documents
export const libraryDocuments = sqliteTable('library_documents', {
    id: text('id').primaryKey(),
    libraryId: text('library_id').notNull().references(() => knowledgeLibraries.id, { onDelete: 'cascade' }),
    fileAssetId: text('file_asset_id').notNull().references(() => fileAssets.id),
    addedAt: integer('added_at').notNull(),
    addedBy: text('added_by').references(() => users.id, { onDelete: 'set null' }),
    syncStatus: text('sync_status', { enum: ['pending', 'processing', 'synced', 'failed'] }).default('pending'),
});

// ============================================================================
// AUTHENTICATION RELATIONS
// ============================================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
    users: many(users),
    knowledgeLibraries: many(knowledgeLibraries),
    projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
    organization: one(organizations, {
        fields: [projects.organizationId],
        references: [organizations.id],
    }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [users.organizationId],
        references: [organizations.id],
    }),
    sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const knowledgeLibrariesRelations = relations(knowledgeLibraries, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [knowledgeLibraries.organizationId],
        references: [organizations.id],
    }),
    documents: many(libraryDocuments),
}));

export const libraryDocumentsRelations = relations(libraryDocuments, ({ one }) => ({
    library: one(knowledgeLibraries, {
        fields: [libraryDocuments.libraryId],
        references: [knowledgeLibraries.id],
    }),
    fileAsset: one(fileAssets, {
        fields: [libraryDocuments.fileAssetId],
        references: [fileAssets.id],
    }),
    addedByUser: one(users, {
        fields: [libraryDocuments.addedBy],
        references: [users.id],
    }),
}));

// ============================================================================
// ADDENDUM SCHEMA (Feature 004 - Phase 15)
// ============================================================================

// Addenda (Addendum reports per stakeholder)
export const addenda = sqliteTable('addenda', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    addendumNumber: integer('addendum_number').notNull(),
    content: text('content'),
    addendumDate: text('addendum_date'), // Date field for TRR report
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Addendum Transmittals (Links addenda to documents - independent from RFT transmittals)
export const addendumTransmittals = sqliteTable('addendum_transmittals', {
    id: text('id').primaryKey(),
    addendumId: text('addendum_id').references(() => addenda.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// ADDENDUM RELATIONS
// ============================================================================

export const addendaRelations = relations(addenda, ({ one, many }) => ({
    project: one(projects, {
        fields: [addenda.projectId],
        references: [projects.id],
    }),
    stakeholder: one(projectStakeholders, {
        fields: [addenda.stakeholderId],
        references: [projectStakeholders.id],
    }),
    transmittals: many(addendumTransmittals),
}));

export const addendumTransmittalsRelations = relations(addendumTransmittals, ({ one }) => ({
    addendum: one(addenda, {
        fields: [addendumTransmittals.addendumId],
        references: [addenda.id],
    }),
    document: one(documents, {
        fields: [addendumTransmittals.documentId],
        references: [documents.id],
    }),
}));

// ============================================================================
// RFT NEW SCHEMA (Feature 004 - Procurement - RFT NEW)
// ============================================================================

// RFT NEW reports (one per stakeholder, comprehensive RFT documents)
export const rftNew = sqliteTable('rft_new', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    rftDate: text('rft_date'), // Date field for TRR report
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// RFT NEW Transmittals (Links RFT NEW to documents)
export const rftNewTransmittals = sqliteTable('rft_new_transmittals', {
    id: text('id').primaryKey(),
    rftNewId: text('rft_new_id').references(() => rftNew.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// RFT NEW RELATIONS
// ============================================================================

export const rftNewRelations = relations(rftNew, ({ one, many }) => ({
    project: one(projects, {
        fields: [rftNew.projectId],
        references: [projects.id],
    }),
    stakeholder: one(projectStakeholders, {
        fields: [rftNew.stakeholderId],
        references: [projectStakeholders.id],
    }),
    transmittals: many(rftNewTransmittals),
}));

export const rftNewTransmittalsRelations = relations(rftNewTransmittals, ({ one }) => ({
    rftNew: one(rftNew, {
        fields: [rftNewTransmittals.rftNewId],
        references: [rftNew.id],
    }),
    document: one(documents, {
        fields: [rftNewTransmittals.documentId],
        references: [documents.id],
    }),
}));

// ============================================================================
// EVALUATION SCHEMA (Feature 011 - Evaluation Report)
// ============================================================================

// Evaluations (one per stakeholder per project)
export const evaluations = sqliteTable('evaluations', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tender Submissions (audit trail for tender parsing - Feature 011 US7)
export const tenderSubmissions = sqliteTable('tender_submissions', {
    id: text('id').primaryKey(),
    evaluationId: text('evaluation_id')
        .references(() => evaluations.id, { onDelete: 'cascade' })
        .notNull(),
    firmId: text('firm_id').notNull(),
    firmType: text('firm_type', { enum: ['consultant', 'contractor'] }).notNull(),
    filename: text('filename').notNull(),
    fileAssetId: text('file_asset_id').references(() => fileAssets.id),
    parsedAt: text('parsed_at').default(sql`CURRENT_TIMESTAMP`),
    parserUsed: text('parser_used').default('claude'),
    confidence: integer('confidence'), // 0-100
    rawExtractedItems: text('raw_extracted_items'), // JSON array of extracted items before mapping
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Evaluation Rows (rows within evaluation tables)
export const evaluationRows = sqliteTable('evaluation_rows', {
    id: text('id').primaryKey(),
    evaluationId: text('evaluation_id')
        .references(() => evaluations.id, { onDelete: 'cascade' })
        .notNull(),
    tableType: text('table_type', { enum: ['initial_price', 'adds_subs'] }).notNull(),
    description: text('description').notNull(),
    orderIndex: integer('order_index').notNull(),
    isSystemRow: integer('is_system_row', { mode: 'boolean' }).default(false),
    costLineId: text('cost_line_id').references(() => costLines.id),
    // Feature 011 US7: Track row origin
    source: text('source', { enum: ['cost_plan', 'ai_parsed', 'manual'] }).default('cost_plan'),
    sourceSubmissionId: text('source_submission_id').references(() => tenderSubmissions.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Evaluation Cells (amounts per firm per row)
export const evaluationCells = sqliteTable('evaluation_cells', {
    id: text('id').primaryKey(),
    rowId: text('row_id')
        .references(() => evaluationRows.id, { onDelete: 'cascade' })
        .notNull(),
    firmId: text('firm_id').notNull(),
    firmType: text('firm_type', { enum: ['consultant', 'contractor'] }).notNull(),
    amountCents: integer('amount_cents').default(0),
    source: text('source', { enum: ['manual', 'ai'] }).default('manual'),
    confidence: integer('confidence'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// EVALUATION RELATIONS
// ============================================================================

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
    project: one(projects, {
        fields: [evaluations.projectId],
        references: [projects.id],
    }),
    stakeholder: one(projectStakeholders, {
        fields: [evaluations.stakeholderId],
        references: [projectStakeholders.id],
    }),
    rows: many(evaluationRows),
    submissions: many(tenderSubmissions),
}));

// Tender Submissions Relations
export const tenderSubmissionsRelations = relations(tenderSubmissions, ({ one }) => ({
    evaluation: one(evaluations, {
        fields: [tenderSubmissions.evaluationId],
        references: [evaluations.id],
    }),
    fileAsset: one(fileAssets, {
        fields: [tenderSubmissions.fileAssetId],
        references: [fileAssets.id],
    }),
}));

export const evaluationRowsRelations = relations(evaluationRows, ({ one, many }) => ({
    evaluation: one(evaluations, {
        fields: [evaluationRows.evaluationId],
        references: [evaluations.id],
    }),
    costLine: one(costLines, {
        fields: [evaluationRows.costLineId],
        references: [costLines.id],
    }),
    sourceSubmission: one(tenderSubmissions, {
        fields: [evaluationRows.sourceSubmissionId],
        references: [tenderSubmissions.id],
    }),
    cells: many(evaluationCells),
}));

export const evaluationCellsRelations = relations(evaluationCells, ({ one }) => ({
    row: one(evaluationRows, {
        fields: [evaluationCells.rowId],
        references: [evaluationRows.id],
    }),
}));

// ============================================================================
// EVALUATION NON-PRICE SCHEMA (Feature 013 - Evaluation Non-Price)
// ============================================================================

// Non-Price Criteria (7 fixed criteria per evaluation)
export const evaluationNonPriceCriteria = sqliteTable('evaluation_non_price_criteria', {
    id: text('id').primaryKey(),
    evaluationId: text('evaluation_id')
        .references(() => evaluations.id, { onDelete: 'cascade' })
        .notNull(),
    criteriaKey: text('criteria_key', {
        enum: ['methodology', 'program', 'personnel', 'experience', 'health_safety', 'insurance', 'departures']
    }).notNull(),
    criteriaLabel: text('criteria_label').notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Non-Price Cells (one per criterion per firm)
export const evaluationNonPriceCells = sqliteTable('evaluation_non_price_cells', {
    id: text('id').primaryKey(),
    criteriaId: text('criteria_id')
        .references(() => evaluationNonPriceCriteria.id, { onDelete: 'cascade' })
        .notNull(),
    firmId: text('firm_id').notNull(),
    firmType: text('firm_type', { enum: ['consultant', 'contractor'] }).notNull(),
    // AI-extracted content
    extractedContent: text('extracted_content'),
    qualityRating: text('quality_rating', { enum: ['good', 'average', 'poor'] }),
    // User overrides
    userEditedContent: text('user_edited_content'),
    userEditedRating: text('user_edited_rating', { enum: ['good', 'average', 'poor'] }),
    // Metadata
    source: text('source', { enum: ['manual', 'ai'] }).default('manual'),
    confidence: integer('confidence'), // 0-100
    sourceChunks: text('source_chunks'), // JSON array of chunk IDs
    sourceSubmissionId: text('source_submission_id').references(() => tenderSubmissions.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// EVALUATION NON-PRICE RELATIONS
// ============================================================================

export const evaluationNonPriceCriteriaRelations = relations(evaluationNonPriceCriteria, ({ one, many }) => ({
    evaluation: one(evaluations, {
        fields: [evaluationNonPriceCriteria.evaluationId],
        references: [evaluations.id],
    }),
    cells: many(evaluationNonPriceCells),
}));

export const evaluationNonPriceCellsRelations = relations(evaluationNonPriceCells, ({ one }) => ({
    criteria: one(evaluationNonPriceCriteria, {
        fields: [evaluationNonPriceCells.criteriaId],
        references: [evaluationNonPriceCriteria.id],
    }),
    tenderSubmission: one(tenderSubmissions, {
        fields: [evaluationNonPriceCells.sourceSubmissionId],
        references: [tenderSubmissions.id],
    }),
}));

// ============================================================================
// TRR SCHEMA (Feature 012 - Tender Recommendation Report)
// ============================================================================

// TRR (Tender Recommendation Report) - one per stakeholder per project
export const trr = sqliteTable('trr', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    executiveSummary: text('executive_summary'),
    clarifications: text('clarifications'),
    recommendation: text('recommendation'),
    reportDate: text('report_date'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// TRR Transmittals (Documents attached to a TRR report)
export const trrTransmittals = sqliteTable('trr_transmittals', {
    id: text('id').primaryKey(),
    trrId: text('trr_id').references(() => trr.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// TRR RELATIONS
// ============================================================================

export const trrRelations = relations(trr, ({ one, many }) => ({
    project: one(projects, {
        fields: [trr.projectId],
        references: [projects.id],
    }),
    stakeholder: one(projectStakeholders, {
        fields: [trr.stakeholderId],
        references: [projectStakeholders.id],
    }),
    transmittals: many(trrTransmittals),
}));

export const trrTransmittalsRelations = relations(trrTransmittals, ({ one }) => ({
    trr: one(trr, {
        fields: [trrTransmittals.trrId],
        references: [trr.id],
    }),
    document: one(documents, {
        fields: [trrTransmittals.documentId],
        references: [documents.id],
    }),
}));

// ============================================================================
// PROGRAM MODULE SCHEMA (Feature 015 - Program/Gantt Chart)
// ============================================================================

// Program Activities (Gantt chart rows)
export const programActivities = sqliteTable('program_activities', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    parentId: text('parent_id'), // Self-reference for 2-tier hierarchy
    name: text('name').notNull(),
    startDate: text('start_date'), // ISO date string
    endDate: text('end_date'), // ISO date string
    collapsed: integer('collapsed', { mode: 'boolean' }).default(false),
    color: text('color'), // Auto-assigned from muted palette
    sortOrder: integer('sort_order').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Program Dependencies (FS, SS, FF connections between activities)
export const programDependencies = sqliteTable('program_dependencies', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    fromActivityId: text('from_activity_id').references(() => programActivities.id, { onDelete: 'cascade' }).notNull(),
    toActivityId: text('to_activity_id').references(() => programActivities.id, { onDelete: 'cascade' }).notNull(),
    type: text('type', { enum: ['FS', 'SS', 'FF'] }).notNull(), // Finish-to-Start, Start-to-Start, Finish-to-Finish
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Program Milestones (Diamond markers within activities)
export const programMilestones = sqliteTable('program_milestones', {
    id: text('id').primaryKey(),
    activityId: text('activity_id').references(() => programActivities.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    date: text('date').notNull(), // ISO date string
    sortOrder: integer('sort_order').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// PROGRAM MODULE RELATIONS
// ============================================================================

export const programActivitiesRelations = relations(programActivities, ({ one, many }) => ({
    project: one(projects, {
        fields: [programActivities.projectId],
        references: [projects.id],
    }),
    parent: one(programActivities, {
        fields: [programActivities.parentId],
        references: [programActivities.id],
        relationName: 'parentChild',
    }),
    children: many(programActivities, { relationName: 'parentChild' }),
    milestones: many(programMilestones),
    dependenciesFrom: many(programDependencies, { relationName: 'fromActivity' }),
    dependenciesTo: many(programDependencies, { relationName: 'toActivity' }),
}));

export const programDependenciesRelations = relations(programDependencies, ({ one }) => ({
    project: one(projects, {
        fields: [programDependencies.projectId],
        references: [projects.id],
    }),
    fromActivity: one(programActivities, {
        fields: [programDependencies.fromActivityId],
        references: [programActivities.id],
        relationName: 'fromActivity',
    }),
    toActivity: one(programActivities, {
        fields: [programDependencies.toActivityId],
        references: [programActivities.id],
        relationName: 'toActivity',
    }),
}));

export const programMilestonesRelations = relations(programMilestones, ({ one }) => ({
    activity: one(programActivities, {
        fields: [programMilestones.activityId],
        references: [programActivities.id],
    }),
}));

// ============================================================================
// PROFILER MODULE SCHEMA (Feature 019 - Replaces Project Initiator)
// ============================================================================

// Project Profiles (Class/Type/Subclass/Scale/Complexity taxonomy)
export const projectProfiles = sqliteTable('project_profiles', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    buildingClass: text('building_class', {
        enum: ['residential', 'commercial', 'industrial', 'institution', 'mixed', 'infrastructure', 'agricultural', 'defense_secure']
    }).notNull(),
    projectType: text('project_type_v2', {
        enum: ['refurb', 'extend', 'new', 'remediation', 'advisory']
    }).notNull(),
    subclass: text('subclass').notNull(), // JSON array for multi-select (Mixed class)
    subclassOther: text('subclass_other'), // JSON array of free-text entries
    scaleData: text('scale_data').notNull(), // JSON: { levels: 5, gfa_sqm: 12000 }
    complexity: text('complexity').notNull(), // JSON: { quality: "premium", site: "heritage" }
    workScope: text('work_scope'), // JSON array of selected work scope items (for refurb/remediation/extend)
    complexityScore: integer('complexity_score'), // Calculated 1-10 score
    // Multi-Region Support (Feature 022 - Phase 11)
    region: text('region', {
        enum: ['AU', 'NZ', 'UK', 'US']
    }).default('AU'), // Default to Australia
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Profiler Objectives (new 2-category structure: Functional Quality + Planning Compliance)
export const profilerObjectives = sqliteTable('profiler_objectives', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    functionalQuality: text('functional_quality').notNull(), // JSON: { content, source, originalAi, editHistory }
    planningCompliance: text('planning_compliance').notNull(), // JSON: { content, source, originalAi, editHistory }
    profileContext: text('profile_context'), // JSON snapshot of profile at generation time
    generatedAt: text('generated_at'),
    polishedAt: text('polished_at'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Profile Patterns (AI learning - aggregate, anonymous)
export const profilePatterns = sqliteTable('profile_patterns', {
    id: text('id').primaryKey(),
    buildingClass: text('building_class').notNull(),
    projectType: text('project_type').notNull(),
    patternType: text('pattern_type', {
        enum: ['subclass_other', 'objective_theme', 'polish_edit']
    }).notNull(),
    patternValue: text('pattern_value').notNull(),
    occurrenceCount: integer('occurrence_count').default(1),
    lastSeen: text('last_seen').default(sql`CURRENT_TIMESTAMP`),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// PROFILER MODULE RELATIONS
// ============================================================================

export const projectProfilesRelations = relations(projectProfiles, ({ one }) => ({
    project: one(projects, {
        fields: [projectProfiles.projectId],
        references: [projects.id],
    }),
}));

export const profilerObjectivesRelations = relations(profilerObjectives, ({ one }) => ({
    project: one(projects, {
        fields: [profilerObjectives.projectId],
        references: [projects.id],
    }),
}));

// ============================================================================
// UNIFIED STAKEHOLDER SCHEMA (Feature 020 - Replaces Consultant/Contractor Lists)
// ============================================================================

// Stakeholder Group Enum
export const stakeholderGroupEnum = ['client', 'authority', 'consultant', 'contractor'] as const;
export type StakeholderGroup = typeof stakeholderGroupEnum[number];

// Tender Status Type Enum
export const tenderStatusTypeEnum = ['brief', 'tender', 'rec', 'award'] as const;
export type TenderStatusType = typeof tenderStatusTypeEnum[number];

// Submission Status Enum
export const submissionStatusEnum = ['pending', 'submitted', 'approved', 'rejected', 'withdrawn'] as const;
export type SubmissionStatus = typeof submissionStatusEnum[number];

// Project Stakeholders (Unified table replacing consultantDisciplines, contractorTrades, stakeholders)
export const projectStakeholders = sqliteTable('project_stakeholders', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    companyId: text('company_id').references(() => companies.id, { onDelete: 'set null' }),

    // Classification
    stakeholderGroup: text('stakeholder_group').notNull().$type<StakeholderGroup>(),

    // Core Fields
    name: text('name').notNull(),
    role: text('role'),
    organization: text('organization'),

    // Contact Info
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),

    // Consultant/Contractor specific
    disciplineOrTrade: text('discipline_or_trade'),
    isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
    briefServices: text('brief_services'),
    briefFee: text('brief_fee'),
    briefProgram: text('brief_program'),
    scopeWorks: text('scope_works'),
    scopePrice: text('scope_price'),
    scopeProgram: text('scope_program'),

    // Authority specific
    submissionRef: text('submission_ref'),
    submissionType: text('submission_type'),

    // Metadata
    sortOrder: integer('sort_order').default(0),
    notes: text('notes'),
    isAiGenerated: integer('is_ai_generated', { mode: 'boolean' }).default(false),

    // Timestamps
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
});

// Stakeholder Tender Statuses (For Consultant/Contractor groups)
export const stakeholderTenderStatuses = sqliteTable('stakeholder_tender_statuses', {
    id: text('id').primaryKey(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id, { onDelete: 'cascade' }).notNull(),

    statusType: text('status_type').notNull().$type<TenderStatusType>(),
    isActive: integer('is_active', { mode: 'boolean' }).default(false),
    isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
    completedAt: text('completed_at'),

    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Stakeholder Submission Statuses (For Authority group)
export const stakeholderSubmissionStatuses = sqliteTable('stakeholder_submission_statuses', {
    id: text('id').primaryKey(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id, { onDelete: 'cascade' }).notNull(),

    status: text('status').notNull().$type<SubmissionStatus>().default('pending'),

    submittedAt: text('submitted_at'),
    submissionRef: text('submission_ref'),
    responseDue: text('response_due'),

    responseReceivedAt: text('response_received_at'),
    responseNotes: text('response_notes'),

    conditions: text('conditions'), // JSON array
    conditionsCleared: integer('conditions_cleared', { mode: 'boolean' }).default(false),

    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// UNIFIED STAKEHOLDER RELATIONS
// ============================================================================

export const projectStakeholdersRelations = relations(projectStakeholders, ({ one, many }) => ({
    project: one(projects, {
        fields: [projectStakeholders.projectId],
        references: [projects.id],
    }),
    company: one(companies, {
        fields: [projectStakeholders.companyId],
        references: [companies.id],
    }),
    tenderStatuses: many(stakeholderTenderStatuses),
    submissionStatuses: many(stakeholderSubmissionStatuses),
}));

export const stakeholderTenderStatusesRelations = relations(stakeholderTenderStatuses, ({ one }) => ({
    stakeholder: one(projectStakeholders, {
        fields: [stakeholderTenderStatuses.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

export const stakeholderSubmissionStatusesRelations = relations(stakeholderSubmissionStatuses, ({ one }) => ({
    stakeholder: one(projectStakeholders, {
        fields: [stakeholderSubmissionStatuses.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

// ============================================================================
// NOTES, MEETINGS & REPORTS SCHEMA (Feature 021)
// ============================================================================

// ============================================================================
// NOTES SCHEMA
// ============================================================================

export const notes = sqliteTable('notes', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    title: text('title').notNull().default('New Note'),
    content: text('content'),
    isStarred: integer('is_starred', { mode: 'boolean' }).default(false),
    reportingPeriodStart: text('reporting_period_start'),
    reportingPeriodEnd: text('reporting_period_end'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
});

export const noteTransmittals = sqliteTable('note_transmittals', {
    id: text('id').primaryKey(),
    noteId: text('note_id').references(() => notes.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
});

// Notes Relations
export const notesRelations = relations(notes, ({ one, many }) => ({
    project: one(projects, {
        fields: [notes.projectId],
        references: [projects.id],
    }),
    organization: one(organizations, {
        fields: [notes.organizationId],
        references: [organizations.id],
    }),
    transmittals: many(noteTransmittals),
}));

export const noteTransmittalsRelations = relations(noteTransmittals, ({ one }) => ({
    note: one(notes, {
        fields: [noteTransmittals.noteId],
        references: [notes.id],
    }),
    document: one(documents, {
        fields: [noteTransmittals.documentId],
        references: [documents.id],
    }),
}));

// ============================================================================
// MEETINGS SCHEMA
// ============================================================================

export const meetingAgendaTypeEnum = ['standard', 'detailed', 'custom'] as const;
export type MeetingAgendaType = typeof meetingAgendaTypeEnum[number];

export const meetings = sqliteTable('meetings', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    title: text('title').notNull().default('New Meeting'),
    meetingDate: text('meeting_date'),
    agendaType: text('agenda_type').$type<MeetingAgendaType>().default('standard'),
    reportingPeriodStart: text('reporting_period_start'),
    reportingPeriodEnd: text('reporting_period_end'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
});

export const meetingSections = sqliteTable('meeting_sections', {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
    sectionKey: text('section_key').notNull(),
    sectionLabel: text('section_label').notNull(),
    content: text('content'),
    sortOrder: integer('sort_order').notNull().default(0),
    parentSectionId: text('parent_section_id').references(() => meetingSections.id, { onDelete: 'cascade' }),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const meetingAttendees = sqliteTable('meeting_attendees', {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    adhocName: text('adhoc_name'),
    adhocFirm: text('adhoc_firm'),
    adhocGroup: text('adhoc_group'),
    adhocSubGroup: text('adhoc_sub_group'),
    isAttending: integer('is_attending', { mode: 'boolean' }).default(true),
    isDistribution: integer('is_distribution', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const meetingTransmittals = sqliteTable('meeting_transmittals', {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
});

// Meetings Relations
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
    project: one(projects, {
        fields: [meetings.projectId],
        references: [projects.id],
    }),
    organization: one(organizations, {
        fields: [meetings.organizationId],
        references: [organizations.id],
    }),
    sections: many(meetingSections),
    attendees: many(meetingAttendees),
    transmittals: many(meetingTransmittals),
}));

export const meetingSectionsRelations = relations(meetingSections, ({ one, many }) => ({
    meeting: one(meetings, {
        fields: [meetingSections.meetingId],
        references: [meetings.id],
    }),
    parentSection: one(meetingSections, {
        fields: [meetingSections.parentSectionId],
        references: [meetingSections.id],
        relationName: 'parentChild',
    }),
    childSections: many(meetingSections, { relationName: 'parentChild' }),
    stakeholder: one(projectStakeholders, {
        fields: [meetingSections.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
    meeting: one(meetings, {
        fields: [meetingAttendees.meetingId],
        references: [meetings.id],
    }),
    stakeholder: one(projectStakeholders, {
        fields: [meetingAttendees.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

export const meetingTransmittalsRelations = relations(meetingTransmittals, ({ one }) => ({
    meeting: one(meetings, {
        fields: [meetingTransmittals.meetingId],
        references: [meetings.id],
    }),
    document: one(documents, {
        fields: [meetingTransmittals.documentId],
        references: [documents.id],
    }),
}));

// ============================================================================
// REPORTS SCHEMA
// ============================================================================

export const reportContentsTypeEnum = ['standard', 'detailed', 'custom'] as const;
export type ReportContentsType = typeof reportContentsTypeEnum[number];

export const reports = sqliteTable('reports', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    title: text('title').notNull().default('New Report'),
    reportDate: text('report_date'),
    preparedFor: text('prepared_for'),
    preparedBy: text('prepared_by'),
    contentsType: text('contents_type').$type<ReportContentsType>().default('standard'),
    reportingPeriodStart: text('reporting_period_start'),
    reportingPeriodEnd: text('reporting_period_end'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
});

export const reportSections = sqliteTable('report_sections', {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
    sectionKey: text('section_key').notNull(),
    sectionLabel: text('section_label').notNull(),
    content: text('content'),
    sortOrder: integer('sort_order').notNull().default(0),
    parentSectionId: text('parent_section_id').references(() => reportSections.id, { onDelete: 'cascade' }),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reportAttendees = sqliteTable('report_attendees', {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    adhocName: text('adhoc_name'),
    adhocFirm: text('adhoc_firm'),
    adhocGroup: text('adhoc_group'),
    adhocSubGroup: text('adhoc_sub_group'),
    isDistribution: integer('is_distribution', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reportTransmittals = sqliteTable('report_transmittals', {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
});

// Reports Relations
export const reportsRelations = relations(reports, ({ one, many }) => ({
    project: one(projects, {
        fields: [reports.projectId],
        references: [projects.id],
    }),
    organization: one(organizations, {
        fields: [reports.organizationId],
        references: [organizations.id],
    }),
    sections: many(reportSections),
    attendees: many(reportAttendees),
    transmittals: many(reportTransmittals),
}));

export const reportSectionsRelations = relations(reportSections, ({ one, many }) => ({
    report: one(reports, {
        fields: [reportSections.reportId],
        references: [reports.id],
    }),
    parentSection: one(reportSections, {
        fields: [reportSections.parentSectionId],
        references: [reportSections.id],
        relationName: 'parentChild',
    }),
    childSections: many(reportSections, { relationName: 'parentChild' }),
    stakeholder: one(projectStakeholders, {
        fields: [reportSections.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

export const reportAttendeesRelations = relations(reportAttendees, ({ one }) => ({
    report: one(reports, {
        fields: [reportAttendees.reportId],
        references: [reports.id],
    }),
    stakeholder: one(projectStakeholders, {
        fields: [reportAttendees.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

export const reportTransmittalsRelations = relations(reportTransmittals, ({ one }) => ({
    report: one(reports, {
        fields: [reportTransmittals.reportId],
        references: [reports.id],
    }),
    document: one(documents, {
        fields: [reportTransmittals.documentId],
        references: [documents.id],
    }),
}));

