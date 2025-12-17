/**
 * PostgreSQL Schema for Production
 * Converted from SQLite schema with subscription support
 */

import { pgTable, text, integer, boolean, timestamp, serial, varchar, unique, index } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// ============================================================================
// CATEGORIES & DOCUMENTS
// ============================================================================

export const categories = pgTable('categories', {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    isSystem: boolean('is_system').default(false),
});

export const subcategories = pgTable('subcategories', {
    id: text('id').primaryKey(),
    categoryId: text('category_id').references(() => categories.id).notNull(),
    name: text('name').notNull(),
    isSystem: boolean('is_system').default(false),
});

export const documents = pgTable('documents', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    categoryId: text('category_id'),
    subcategoryId: text('subcategory_id'),
    latestVersionId: text('latest_version_id'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const fileAssets = pgTable('file_assets', {
    id: text('id').primaryKey(),
    storagePath: text('storage_path').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    hash: text('hash').notNull(),
    ocrStatus: text('ocr_status').default('PENDING'),
    ocrText: text('ocr_text'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const versions = pgTable('versions', {
    id: text('id').primaryKey(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    fileAssetId: text('file_asset_id').references(() => fileAssets.id).notNull(),
    versionNumber: integer('version_number').notNull(),
    uploadedBy: text('uploaded_by').default('User'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const transmittals = pgTable('transmittals', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    subcategoryId: text('subcategory_id').references(() => subcategories.id),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id),
    tradeId: text('trade_id').references(() => contractorTrades.id),
    name: text('name').notNull(),
    status: text('status').default('DRAFT'),
    issuedAt: timestamp('issued_at'),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const transmittalItems = pgTable('transmittal_items', {
    id: text('id').primaryKey(),
    transmittalId: text('transmittal_id').references(() => transmittals.id).notNull(),
    versionId: text('version_id').references(() => versions.id).notNull(),
    addedAt: timestamp('added_at').defaultNow(),
});

// ============================================================================
// PLANNING CARD SCHEMA
// ============================================================================

export const projects = pgTable('projects', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code'),
    status: text('status').default('active'),
    organizationId: text('organization_id').references(() => organizations.id),
    currentReportMonth: text('current_report_month'),
    revision: text('revision').default('REV A'),
    currencyCode: text('currency_code').default('AUD'),
    showGst: boolean('show_gst').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const projectDetails = pgTable('project_details', {
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
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const projectObjectives = pgTable('project_objectives', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    functional: text('functional'),
    quality: text('quality'),
    budget: text('budget'),
    program: text('program'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const projectStages = pgTable('project_stages', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    stageNumber: integer('stage_number').notNull(),
    stageName: text('stage_name').notNull(),
    startDate: text('start_date'),
    endDate: text('end_date'),
    duration: integer('duration'),
    status: text('status').default('not_started'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const risks = pgTable('risks', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    likelihood: text('likelihood'),
    impact: text('impact'),
    mitigation: text('mitigation'),
    status: text('status').default('identified'),
    order: integer('order').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const stakeholders = pgTable('stakeholders', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    name: text('name').notNull(),
    role: text('role'),
    organization: text('organization'),
    email: text('email'),
    phone: text('phone'),
    order: integer('order').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const consultantDisciplines = pgTable('consultant_disciplines', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    disciplineName: text('discipline_name').notNull(),
    isEnabled: boolean('is_enabled').default(false),
    order: integer('order').notNull(),
    briefServices: text('brief_services'),
    briefDeliverables: text('brief_deliverables'),
    briefFee: text('brief_fee'),
    briefProgram: text('brief_program'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const consultantStatuses = pgTable('consultant_statuses', {
    id: text('id').primaryKey(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id).notNull(),
    statusType: text('status_type').notNull(),
    isActive: boolean('is_active').default(false),
    completedAt: timestamp('completed_at'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const contractorTrades = pgTable('contractor_trades', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    tradeName: text('trade_name').notNull(),
    isEnabled: boolean('is_enabled').default(false),
    order: integer('order').notNull(),
    scopeWorks: text('scope_works'),
    scopeDeliverables: text('scope_deliverables'),
    scopePrice: text('scope_price'),
    scopeProgram: text('scope_program'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const contractorStatuses = pgTable('contractor_statuses', {
    id: text('id').primaryKey(),
    tradeId: text('trade_id').references(() => contractorTrades.id).notNull(),
    statusType: text('status_type').notNull(),
    isActive: boolean('is_active').default(false),
    completedAt: timestamp('completed_at'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const disciplineFeeItems = pgTable('discipline_fee_items', {
    id: text('id').primaryKey(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id).notNull(),
    description: text('description').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const tradePriceItems = pgTable('trade_price_items', {
    id: text('id').primaryKey(),
    tradeId: text('trade_id').references(() => contractorTrades.id).notNull(),
    description: text('description').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const revisionHistory = pgTable('revision_history', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    fieldName: text('field_name').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    userId: text('user_id').notNull(),
    userName: text('user_name').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const gisCache = pgTable('gis_cache', {
    id: text('id').primaryKey(),
    address: text('address').notNull().unique(),
    zoning: text('zoning'),
    jurisdiction: text('jurisdiction'),
    lotArea: integer('lot_area'),
    rawData: text('raw_data'),
    cachedAt: timestamp('cached_at').defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
});

// ============================================================================
// CONSULTANT & CONTRACTOR FIRMS
// ============================================================================

export const consultants = pgTable('consultants', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    companyName: text('company_name').notNull(),
    contactPerson: text('contact_person'),
    discipline: text('discipline').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    mobile: text('mobile'),
    address: text('address'),
    abn: text('abn'),
    notes: text('notes'),
    shortlisted: boolean('shortlisted').default(false),
    awarded: boolean('awarded').default(false),
    companyId: text('company_id').references(() => companies.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const contractors = pgTable('contractors', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    companyName: text('company_name').notNull(),
    contactPerson: text('contact_person'),
    trade: text('trade').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    address: text('address'),
    abn: text('abn'),
    notes: text('notes'),
    shortlisted: boolean('shortlisted').default(false),
    awarded: boolean('awarded').default(false),
    companyId: text('company_id').references(() => companies.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// COST PLANNING SCHEMA
// ============================================================================

export const companies = pgTable('companies', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    abn: text('abn'),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    address: text('address'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const costLines = pgTable('cost_lines', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id),
    tradeId: text('trade_id').references(() => contractorTrades.id),
    section: text('section').notNull(),
    costCode: text('cost_code'),
    activity: text('activity').notNull(),
    reference: text('reference'),
    budgetCents: integer('budget_cents').default(0),
    approvedContractCents: integer('approved_contract_cents').default(0),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const costLineAllocations = pgTable('cost_line_allocations', {
    id: text('id').primaryKey(),
    costLineId: text('cost_line_id').references(() => costLines.id).notNull(),
    fiscalYear: integer('fiscal_year').notNull(),
    amountCents: integer('amount_cents').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const variations = pgTable('variations', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    costLineId: text('cost_line_id').references(() => costLines.id),
    variationNumber: text('variation_number').notNull(),
    category: text('category').notNull(),
    description: text('description').notNull(),
    status: text('status').default('Forecast'),
    amountForecastCents: integer('amount_forecast_cents').default(0),
    amountApprovedCents: integer('amount_approved_cents').default(0),
    dateSubmitted: text('date_submitted'),
    dateApproved: text('date_approved'),
    requestedBy: text('requested_by'),
    approvedBy: text('approved_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const invoices = pgTable('invoices', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    costLineId: text('cost_line_id').references(() => costLines.id),
    variationId: text('variation_id').references(() => variations.id),
    companyId: text('company_id').references(() => companies.id),
    fileAssetId: text('file_asset_id').references(() => fileAssets.id),
    invoiceDate: text('invoice_date').notNull(),
    poNumber: text('po_number'),
    invoiceNumber: text('invoice_number').notNull(),
    description: text('description'),
    amountCents: integer('amount_cents').notNull(),
    gstCents: integer('gst_cents').default(0),
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month').notNull(),
    paidStatus: text('paid_status').default('unpaid'),
    paidDate: text('paid_date'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const costLineComments = pgTable('cost_line_comments', {
    id: text('id').primaryKey(),
    costLineId: text('cost_line_id').references(() => costLines.id).notNull(),
    columnKey: text('column_key').notNull(),
    commentText: text('comment_text').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const projectSnapshots = pgTable('project_snapshots', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    snapshotName: text('snapshot_name').notNull(),
    snapshotDate: text('snapshot_date').notNull(),
    snapshotData: text('snapshot_data').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const importTemplates = pgTable('import_templates', {
    id: text('id').primaryKey(),
    templateName: text('template_name').notNull(),
    columnMappings: text('column_mappings').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// AUTHENTICATION & ORGANIZATION SCHEMA
// ============================================================================

export const organizations = pgTable('organizations', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    defaultSettings: text('default_settings').default('{}'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
});

export const users = pgTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    organizationId: text('organization_id').references(() => organizations.id),
    // Polar subscription fields
    polarCustomerId: text('polar_customer_id'),
    subscriptionStatus: text('subscription_status').default('free'), // free, active, canceled, past_due, trialing
    subscriptionPlanId: text('subscription_plan_id'),
    subscriptionEndsAt: integer('subscription_ends_at'), // Unix timestamp
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
}, (table) => [
    index('users_email_idx').on(table.email),
    index('users_polar_customer_idx').on(table.polarCustomerId),
]);

export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
});

export const loginAttempts = pgTable('login_attempts', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    attempts: integer('attempts').notNull().default(0),
    lockedUntil: integer('locked_until'),
    updatedAt: integer('updated_at').notNull(),
});

// ============================================================================
// SUBSCRIPTIONS TABLE (Feature 014 - SaaS Launch)
// ============================================================================

export const subscriptions = pgTable('subscriptions', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    polarSubscriptionId: text('polar_subscription_id').unique(),
    polarCustomerId: text('polar_customer_id'),
    status: text('status').notNull(), // active, canceled, past_due, trialing, incomplete
    planId: text('plan_id').notNull(), // free, starter, professional
    currentPeriodStart: integer('current_period_start'),
    currentPeriodEnd: integer('current_period_end'),
    canceledAt: integer('canceled_at'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
}, (table) => [
    index('subscriptions_user_idx').on(table.userId),
    index('subscriptions_polar_sub_idx').on(table.polarSubscriptionId),
]);

// ============================================================================
// KNOWLEDGE LIBRARIES
// ============================================================================

export const knowledgeLibraries = pgTable('knowledge_libraries', {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').notNull().references(() => organizations.id),
    type: text('type').notNull(),
    documentCount: integer('document_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
});

export const libraryDocuments = pgTable('library_documents', {
    id: text('id').primaryKey(),
    libraryId: text('library_id').notNull().references(() => knowledgeLibraries.id, { onDelete: 'cascade' }),
    fileAssetId: text('file_asset_id').notNull().references(() => fileAssets.id),
    addedAt: integer('added_at').notNull(),
    addedBy: text('added_by').references(() => users.id, { onDelete: 'set null' }),
    syncStatus: text('sync_status').default('pending'),
});

// ============================================================================
// ADDENDUM SCHEMA
// ============================================================================

export const addenda = pgTable('addenda', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id),
    tradeId: text('trade_id').references(() => contractorTrades.id),
    addendumNumber: integer('addendum_number').notNull(),
    content: text('content'),
    addendumDate: text('addendum_date'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const addendumTransmittals = pgTable('addendum_transmittals', {
    id: text('id').primaryKey(),
    addendumId: text('addendum_id').references(() => addenda.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// RFT NEW SCHEMA
// ============================================================================

export const rftNew = pgTable('rft_new', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id),
    tradeId: text('trade_id').references(() => contractorTrades.id),
    rftDate: text('rft_date'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const rftNewTransmittals = pgTable('rft_new_transmittals', {
    id: text('id').primaryKey(),
    rftNewId: text('rft_new_id').references(() => rftNew.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: timestamp('added_at').defaultNow(),
});

// ============================================================================
// EVALUATION SCHEMA
// ============================================================================

export const evaluations = pgTable('evaluations', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id),
    tradeId: text('trade_id').references(() => contractorTrades.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const tenderSubmissions = pgTable('tender_submissions', {
    id: text('id').primaryKey(),
    evaluationId: text('evaluation_id')
        .references(() => evaluations.id, { onDelete: 'cascade' })
        .notNull(),
    firmId: text('firm_id').notNull(),
    firmType: text('firm_type').notNull(),
    filename: text('filename').notNull(),
    fileAssetId: text('file_asset_id').references(() => fileAssets.id),
    parsedAt: timestamp('parsed_at').defaultNow(),
    parserUsed: text('parser_used').default('claude'),
    confidence: integer('confidence'),
    rawExtractedItems: text('raw_extracted_items'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const evaluationRows = pgTable('evaluation_rows', {
    id: text('id').primaryKey(),
    evaluationId: text('evaluation_id')
        .references(() => evaluations.id, { onDelete: 'cascade' })
        .notNull(),
    tableType: text('table_type').notNull(),
    description: text('description').notNull(),
    orderIndex: integer('order_index').notNull(),
    isSystemRow: boolean('is_system_row').default(false),
    costLineId: text('cost_line_id').references(() => costLines.id),
    source: text('source').default('cost_plan'),
    sourceSubmissionId: text('source_submission_id').references(() => tenderSubmissions.id),
    createdAt: timestamp('created_at').defaultNow(),
});

export const evaluationCells = pgTable('evaluation_cells', {
    id: text('id').primaryKey(),
    rowId: text('row_id')
        .references(() => evaluationRows.id, { onDelete: 'cascade' })
        .notNull(),
    firmId: text('firm_id').notNull(),
    firmType: text('firm_type').notNull(),
    amountCents: integer('amount_cents').default(0),
    source: text('source').default('manual'),
    confidence: integer('confidence'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const evaluationNonPriceCriteria = pgTable('evaluation_non_price_criteria', {
    id: text('id').primaryKey(),
    evaluationId: text('evaluation_id')
        .references(() => evaluations.id, { onDelete: 'cascade' })
        .notNull(),
    criteriaKey: text('criteria_key').notNull(),
    criteriaLabel: text('criteria_label').notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const evaluationNonPriceCells = pgTable('evaluation_non_price_cells', {
    id: text('id').primaryKey(),
    criteriaId: text('criteria_id')
        .references(() => evaluationNonPriceCriteria.id, { onDelete: 'cascade' })
        .notNull(),
    firmId: text('firm_id').notNull(),
    firmType: text('firm_type').notNull(),
    extractedContent: text('extracted_content'),
    qualityRating: text('quality_rating'),
    userEditedContent: text('user_edited_content'),
    userEditedRating: text('user_edited_rating'),
    source: text('source').default('manual'),
    confidence: integer('confidence'),
    sourceChunks: text('source_chunks'),
    sourceSubmissionId: text('source_submission_id').references(() => tenderSubmissions.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// TRR SCHEMA
// ============================================================================

export const trr = pgTable('trr', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id),
    tradeId: text('trade_id').references(() => contractorTrades.id),
    executiveSummary: text('executive_summary'),
    clarifications: text('clarifications'),
    recommendation: text('recommendation'),
    reportDate: text('report_date'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const trrTransmittals = pgTable('trr_transmittals', {
    id: text('id').primaryKey(),
    trrId: text('trr_id').references(() => trr.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: timestamp('added_at').defaultNow(),
});

// ============================================================================
// PROGRAM MODULE (Gantt Chart)
// ============================================================================

export const programActivities = pgTable('program_activities', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    parentId: text('parent_id'),
    name: text('name').notNull(),
    startDate: text('start_date'),
    endDate: text('end_date'),
    collapsed: boolean('collapsed').default(false),
    color: text('color'),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const programDependencies = pgTable('program_dependencies', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    fromActivityId: text('from_activity_id').references(() => programActivities.id, { onDelete: 'cascade' }).notNull(),
    toActivityId: text('to_activity_id').references(() => programActivities.id, { onDelete: 'cascade' }).notNull(),
    type: text('type').notNull(), // 'FS' | 'SS' | 'FF'
    createdAt: timestamp('created_at').defaultNow(),
});

export const programMilestones = pgTable('program_milestones', {
    id: text('id').primaryKey(),
    activityId: text('activity_id').references(() => programActivities.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    date: text('date').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// RELATIONS (maintaining the same structure as SQLite schema)
// ============================================================================

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

export const consultantsRelations = relations(consultants, ({ one }) => ({
    company: one(companies, {
        fields: [consultants.companyId],
        references: [companies.id],
    }),
}));

export const contractorsRelations = relations(contractors, ({ one }) => ({
    company: one(companies, {
        fields: [contractors.companyId],
        references: [companies.id],
    }),
}));

export const costLinesRelations = relations(costLines, ({ one, many }) => ({
    project: one(projects, {
        fields: [costLines.projectId],
        references: [projects.id],
    }),
    discipline: one(consultantDisciplines, {
        fields: [costLines.disciplineId],
        references: [consultantDisciplines.id],
    }),
    trade: one(contractorTrades, {
        fields: [costLines.tradeId],
        references: [contractorTrades.id],
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
    subscriptions: many(subscriptions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
    user: one(users, {
        fields: [subscriptions.userId],
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

export const addendaRelations = relations(addenda, ({ one, many }) => ({
    project: one(projects, {
        fields: [addenda.projectId],
        references: [projects.id],
    }),
    discipline: one(consultantDisciplines, {
        fields: [addenda.disciplineId],
        references: [consultantDisciplines.id],
    }),
    trade: one(contractorTrades, {
        fields: [addenda.tradeId],
        references: [contractorTrades.id],
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

export const rftNewRelations = relations(rftNew, ({ one, many }) => ({
    project: one(projects, {
        fields: [rftNew.projectId],
        references: [projects.id],
    }),
    discipline: one(consultantDisciplines, {
        fields: [rftNew.disciplineId],
        references: [consultantDisciplines.id],
    }),
    trade: one(contractorTrades, {
        fields: [rftNew.tradeId],
        references: [contractorTrades.id],
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

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
    project: one(projects, {
        fields: [evaluations.projectId],
        references: [projects.id],
    }),
    discipline: one(consultantDisciplines, {
        fields: [evaluations.disciplineId],
        references: [consultantDisciplines.id],
    }),
    trade: one(contractorTrades, {
        fields: [evaluations.tradeId],
        references: [contractorTrades.id],
    }),
    rows: many(evaluationRows),
    submissions: many(tenderSubmissions),
}));

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

export const trrRelations = relations(trr, ({ one, many }) => ({
    project: one(projects, {
        fields: [trr.projectId],
        references: [projects.id],
    }),
    discipline: one(consultantDisciplines, {
        fields: [trr.disciplineId],
        references: [consultantDisciplines.id],
    }),
    trade: one(contractorTrades, {
        fields: [trr.tradeId],
        references: [contractorTrades.id],
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
