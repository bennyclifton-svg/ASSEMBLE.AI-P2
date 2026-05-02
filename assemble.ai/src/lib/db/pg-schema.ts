/**
 * PostgreSQL Schema for Production
 * Converted from SQLite schema with subscription support
 */

import { pgTable, text, integer, bigint, boolean, timestamp, serial, varchar, unique, index, primaryKey, jsonb } from 'drizzle-orm/pg-core';
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
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    isSystem: boolean('is_system').default(false),
    sortOrder: integer('sort_order').default(0),
});

export const categoryVisibility = pgTable('category_visibility', {
    projectId: text('project_id').references(() => projects.id).notNull(),
    categoryId: text('category_id').references(() => categories.id).notNull(),
    isVisible: boolean('is_visible').notNull().default(true),
}, (table) => [
    primaryKey({ columns: [table.projectId, table.categoryId] }),
]);

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
    // Drawing extraction fields (Feature: AI-powered drawing number extraction)
    drawingNumber: text('drawing_number'),              // e.g., "A-101", "SK-001", "DWG-2024-001"
    drawingName: text('drawing_name'),                  // e.g., "Floor Plan - Level 1"
    drawingRevision: text('drawing_revision'),          // e.g., "A", "P01", "Rev B"
    drawingExtractionStatus: text('drawing_extraction_status').default('PENDING'),
    drawingExtractionConfidence: integer('drawing_extraction_confidence'), // 0-100
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
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
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
    uiPreferences: text('ui_preferences').notNull().default('{}'),
    // Project Initiator (Feature 018) - 14 project types
    projectType: text('project_type', {
        enum: [
            'due-diligence', 'feasibility', 'house', 'apartments', 'apartments-btr',
            'student-housing', 'townhouses', 'retirement-living', 'office', 'retail',
            'industrial', 'fitout', 'refurbishment', 'remediation'
        ]
    }),
    drawingExtractionEnabled: boolean('drawing_extraction_enabled').default(true),
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
    tenderReleaseDate: text('tender_release_date'),
    // Geocoded coordinates from Google Places / Nominatim
    latitude: text('latitude'),
    longitude: text('longitude'),
    placeId: text('place_id'),
    formattedAddress: text('formatted_address'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Row-model project objectives — defined in objectives-schema.ts and
// re-exported here so existing `from '@/lib/db/pg-schema'` imports keep
// pointing at the same table object.
export { projectObjectives } from './objectives-schema';

// Per-project question answers from the project initialiser wizard.
// Used by the cost-plan generator for answer recall. Previously lived as a
// column on the legacy project_objectives blob table.
export const projectQuestionAnswers = pgTable('project_question_answers', {
    projectId: text('project_id').primaryKey().references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    answers: text('answers'), // JSON string of questionnaire answers
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
    rowVersion: integer('row_version').notNull().default(1),
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
    // Key: "{state}:{lat.toFixed(6)},{lng.toFixed(6)}"
    coordKey: text('coord_key').notNull().unique(),
    latitude: text('latitude').notNull(),
    longitude: text('longitude').notNull(),
    state: text('state').notNull(),
    // LEP Planning Controls
    landZone: text('land_zone'),
    floorSpaceRatio: text('floor_space_ratio'),
    buildingHeight: text('building_height'),
    heritageStatus: text('heritage_status'),
    floodZone: text('flood_zone'),
    bushfireProne: text('bushfire_prone'),
    minLotSize: text('min_lot_size'),
    // Extracted fields from API response (not full raw JSON)
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
    shortlisted: boolean('shortlisted').default(true),
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
    shortlisted: boolean('shortlisted').default(true),
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
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    section: text('section').notNull(),
    costCode: text('cost_code'),
    activity: text('activity').notNull(),
    reference: text('reference'),
    budgetCents: bigint('budget_cents', { mode: 'number' }).default(0),
    approvedContractCents: bigint('approved_contract_cents', { mode: 'number' }).default(0),
    masterStage: text('master_stage'),  // NEW: Links to one of 5 master stages (initiation, schematic_design, design_development, procurement, delivery)
    sortOrder: integer('sort_order').notNull(),
    // Phase 3 of the agent integration plan: optimistic locking. Bumped on every
    // user PATCH or applied agent approval. Agent tools capture this value at
    // propose time and require it to match at apply time.
    rowVersion: integer('row_version').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const costLineAllocations = pgTable('cost_line_allocations', {
    id: text('id').primaryKey(),
    costLineId: text('cost_line_id').references(() => costLines.id).notNull(),
    fiscalYear: integer('fiscal_year').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).default(0),
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
    amountForecastCents: bigint('amount_forecast_cents', { mode: 'number' }).default(0),
    amountApprovedCents: bigint('amount_approved_cents', { mode: 'number' }).default(0),
    dateSubmitted: text('date_submitted'),
    dateApproved: text('date_approved'),
    requestedBy: text('requested_by'),
    approvedBy: text('approved_by'),
    rowVersion: integer('row_version').notNull().default(1),
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
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    gstCents: bigint('gst_cents', { mode: 'number' }).default(0),
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
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
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
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    rftNumber: integer('rft_number').notNull().default(1),
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

// Evaluation Price instances (multi-instance with numbered tabs like RFT/TRR)
export const evaluationPrice = pgTable('evaluation_price', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    evaluationPriceNumber: integer('evaluation_price_number').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Evaluations (now used for non-price evaluation only)
export const evaluations = pgTable('evaluations', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    deletedCostLineIds: text('deleted_cost_line_ids').default('[]'),
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
        .references(() => evaluations.id, { onDelete: 'cascade' }),
    evaluationPriceId: text('evaluation_price_id')
        .references(() => evaluationPrice.id, { onDelete: 'cascade' }),
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
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    trrNumber: integer('trr_number').notNull().default(1),
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
    masterStage: text('master_stage'),  // NEW: Links to one of 5 master stages (initiation, schematic_design, design_development, procurement, delivery)
    color: text('color'),
    sortOrder: integer('sort_order').notNull(),
    rowVersion: integer('row_version').notNull().default(1),
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
    rowVersion: integer('row_version').notNull().default(1),
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

export const evaluationPriceRelations = relations(evaluationPrice, ({ one, many }) => ({
    project: one(projects, {
        fields: [evaluationPrice.projectId],
        references: [projects.id],
    }),
    stakeholder: one(projectStakeholders, {
        fields: [evaluationPrice.stakeholderId],
        references: [projectStakeholders.id],
    }),
    rows: many(evaluationRows),
}));

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
    evaluationPriceInstance: one(evaluationPrice, {
        fields: [evaluationRows.evaluationPriceId],
        references: [evaluationPrice.id],
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
export const projectProfiles = pgTable('project_profiles', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    buildingClass: text('building_class').notNull(),
    projectType: text('project_type_v2').notNull(),
    subclass: text('subclass').notNull(), // JSON array for multi-select (Mixed class)
    subclassOther: text('subclass_other'), // JSON array of free-text entries
    scaleData: text('scale_data').notNull(), // JSON: { levels: 5, gfa_sqm: 12000 }
    complexity: text('complexity').notNull(), // JSON: { quality: "premium", site: "heritage" }
    workScope: text('work_scope'), // JSON array of selected work scope items (for refurb/remediation/extend)
    complexityScore: integer('complexity_score'), // Calculated 1-10 score
    // Multi-Region Support (Feature 022 - Phase 11)
    region: text('region').default('AU'), // Default to Australia; valid: AU, NZ, UK, US
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    unique('project_profiles_project_id_unique').on(table.projectId),
    index('idx_profiles_class_type').on(table.buildingClass, table.projectType),
    index('idx_profiles_region').on(table.region),
]);

// Profiler Objectives — DEPRECATED: legacy 2-blob model, replaced by projectObjectives per-row model
export const profilerObjectives = pgTable('profiler_objectives', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    functionalQuality: text('functional_quality').notNull(), // @deprecated — replaced by projectObjectives per-row model
    planningCompliance: text('planning_compliance').notNull(), // @deprecated — replaced by projectObjectives per-row model
    profileContext: text('profile_context'), // JSON snapshot of profile at generation time
    generatedAt: timestamp('generated_at'),
    polishedAt: timestamp('polished_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    unique('profiler_objectives_project_id_unique').on(table.projectId),
]);

// Profile Patterns (AI learning - aggregate, anonymous)
export const profilePatterns = pgTable('profile_patterns', {
    id: text('id').primaryKey(),
    buildingClass: text('building_class').notNull(),
    projectType: text('project_type').notNull(),
    patternType: text('pattern_type').notNull(),
    patternValue: text('pattern_value').notNull(),
    occurrenceCount: integer('occurrence_count').default(1),
    lastSeen: timestamp('last_seen').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    unique('idx_patterns_unique').on(table.buildingClass, table.projectType, table.patternType, table.patternValue),
]);

// ============================================================================
// PROFILER MODULE RELATIONS
// ============================================================================

export const projectProfilesRelations = relations(projectProfiles, ({ one }) => ({
    project: one(projects, {
        fields: [projectProfiles.projectId],
        references: [projects.id],
    }),
}));

// Objectives Transmittals (document attachments for objectives extraction)
export const objectivesTransmittals = pgTable('objectives_transmittals', {
    id: text('id').primaryKey(),
    objectivesId: text('objectives_id').references(() => profilerObjectives.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at'),
});

export const profilerObjectivesRelations = relations(profilerObjectives, ({ one, many }) => ({
    project: one(projects, {
        fields: [profilerObjectives.projectId],
        references: [projects.id],
    }),
    transmittals: many(objectivesTransmittals),
}));

export const objectivesTransmittalsRelations = relations(objectivesTransmittals, ({ one }) => ({
    objectives: one(profilerObjectives, {
        fields: [objectivesTransmittals.objectivesId],
        references: [profilerObjectives.id],
    }),
    document: one(documents, {
        fields: [objectivesTransmittals.documentId],
        references: [documents.id],
    }),
}));

// ============================================================================
// UNIFIED STAKEHOLDER SCHEMA (Feature 020 - Replaces Consultant/Contractor Lists)
// ============================================================================

// Project Stakeholders (Unified table replacing consultantDisciplines, contractorTrades, stakeholders)
export const projectStakeholders = pgTable('project_stakeholders', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    companyId: text('company_id').references(() => companies.id, { onDelete: 'set null' }),

    // Classification
    stakeholderGroup: text('stakeholder_group').notNull(), // 'client' | 'authority' | 'consultant' | 'contractor'

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
    isEnabled: boolean('is_enabled').default(true),
    briefServices: text('brief_services'),
    briefDeliverables: text('brief_deliverables'),
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
    isAiGenerated: boolean('is_ai_generated').default(false),
    rowVersion: integer('row_version').notNull().default(1),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
}, (table) => [
    index('idx_stakeholders_project').on(table.projectId),
    index('idx_stakeholders_group').on(table.projectId, table.stakeholderGroup),
    index('idx_stakeholders_company').on(table.companyId),
]);

// Stakeholder Tender Statuses (For Consultant/Contractor groups)
export const stakeholderTenderStatuses = pgTable('stakeholder_tender_statuses', {
    id: text('id').primaryKey(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id, { onDelete: 'cascade' }).notNull(),

    statusType: text('status_type').notNull(), // 'brief' | 'tender' | 'rec' | 'award'
    isActive: boolean('is_active').default(false),
    isComplete: boolean('is_complete').default(false),
    completedAt: timestamp('completed_at'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    index('idx_tender_statuses_stakeholder').on(table.stakeholderId),
    unique('stakeholder_tender_status_unique').on(table.stakeholderId, table.statusType),
]);

// Stakeholder Submission Statuses (For Authority group)
export const stakeholderSubmissionStatuses = pgTable('stakeholder_submission_statuses', {
    id: text('id').primaryKey(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id, { onDelete: 'cascade' }).notNull(),

    status: text('status').notNull().default('pending'), // 'pending' | 'submitted' | 'approved' | 'rejected' | 'withdrawn'

    submittedAt: timestamp('submitted_at'),
    submissionRef: text('submission_ref'),
    responseDue: timestamp('response_due'),

    responseReceivedAt: timestamp('response_received_at'),
    responseNotes: text('response_notes'),

    conditions: text('conditions'), // JSON array
    conditionsCleared: boolean('conditions_cleared').default(false),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    unique('stakeholder_submission_status_unique').on(table.stakeholderId),
    index('idx_submission_statuses_status').on(table.status),
]);

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
// NOTES SCHEMA
// ============================================================================

export const notes = pgTable('notes', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    title: text('title').notNull().default('New Note'),
    content: text('content'),
    isStarred: boolean('is_starred').default(false),
    color: text('color').default('yellow'), // 'yellow' | 'blue' | 'green' | 'pink' | 'white'
    type: text('type').notNull().default('note'),
    status: text('status').notNull().default('open'),
    noteDate: text('note_date'),
    reportingPeriodStart: text('reporting_period_start'),
    reportingPeriodEnd: text('reporting_period_end'),
    rowVersion: integer('row_version').notNull().default(1),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
    deletedAt: text('deleted_at'),
});

export const noteTransmittals = pgTable('note_transmittals', {
    id: text('id').primaryKey(),
    noteId: text('note_id').references(() => notes.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at'),
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
// MEETING GROUPS SCHEMA
// ============================================================================

export const meetingGroups = pgTable('meeting_groups', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    groupNumber: integer('group_number').notNull().default(1),
    title: text('title').notNull().default('New Meeting'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// MEETINGS SCHEMA
// ============================================================================

export const meetings = pgTable('meetings', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    groupId: text('group_id').references(() => meetingGroups.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('New Meeting'),
    meetingDate: text('meeting_date'),
    agendaType: text('agenda_type').default('standard'),
    reportingPeriodStart: text('reporting_period_start'),
    reportingPeriodEnd: text('reporting_period_end'),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
    deletedAt: text('deleted_at'),
});

export const meetingSections = pgTable('meeting_sections', {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
    sectionKey: text('section_key').notNull(),
    sectionLabel: text('section_label').notNull(),
    content: text('content'),
    sortOrder: integer('sort_order').notNull().default(0),
    parentSectionId: text('parent_section_id'),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
});

export const meetingAttendees = pgTable('meeting_attendees', {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    adhocName: text('adhoc_name'),
    adhocFirm: text('adhoc_firm'),
    adhocGroup: text('adhoc_group'),
    adhocSubGroup: text('adhoc_sub_group'),
    isAttending: boolean('is_attending').default(true),
    isDistribution: boolean('is_distribution').default(true),
    createdAt: text('created_at'),
});

export const meetingTransmittals = pgTable('meeting_transmittals', {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at'),
});

// Meeting Groups Relations
export const meetingGroupsRelations = relations(meetingGroups, ({ one, many }) => ({
    project: one(projects, {
        fields: [meetingGroups.projectId],
        references: [projects.id],
    }),
    organization: one(organizations, {
        fields: [meetingGroups.organizationId],
        references: [organizations.id],
    }),
    meetings: many(meetings),
}));

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
    group: one(meetingGroups, {
        fields: [meetings.groupId],
        references: [meetingGroups.id],
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
// REPORT GROUPS SCHEMA
// ============================================================================

export const reportGroups = pgTable('report_groups', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    groupNumber: integer('group_number').notNull().default(1),
    title: text('title').notNull().default('New Report'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// REPORTS SCHEMA
// ============================================================================

export const reports = pgTable('reports', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    groupId: text('group_id').references(() => reportGroups.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('New Report'),
    reportDate: text('report_date'),
    preparedFor: text('prepared_for'),
    preparedBy: text('prepared_by'),
    contentsType: text('contents_type').default('standard'),
    reportingPeriodStart: text('reporting_period_start'),
    reportingPeriodEnd: text('reporting_period_end'),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
    deletedAt: text('deleted_at'),
});

export const reportSections = pgTable('report_sections', {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
    sectionKey: text('section_key').notNull(),
    sectionLabel: text('section_label').notNull(),
    content: text('content'),
    sortOrder: integer('sort_order').notNull().default(0),
    parentSectionId: text('parent_section_id'),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
});

export const reportAttendees = pgTable('report_attendees', {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    adhocName: text('adhoc_name'),
    adhocFirm: text('adhoc_firm'),
    adhocGroup: text('adhoc_group'),
    adhocSubGroup: text('adhoc_sub_group'),
    isDistribution: boolean('is_distribution').default(true),
    createdAt: text('created_at'),
});

export const reportTransmittals = pgTable('report_transmittals', {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at'),
});

// Report Groups Relations
export const reportGroupsRelations = relations(reportGroups, ({ one, many }) => ({
    project: one(projects, {
        fields: [reportGroups.projectId],
        references: [projects.id],
    }),
    organization: one(organizations, {
        fields: [reportGroups.organizationId],
        references: [organizations.id],
    }),
    reports: many(reports),
}));

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
    group: one(reportGroups, {
        fields: [reports.groupId],
        references: [reportGroups.id],
    }),
    sections: many(reportSections),
    attendees: many(reportAttendees),
    transmittals: many(reportTransmittals),
}));

export const reportSectionsRelations = relations(reportSections, ({ one }) => ({
    report: one(reports, {
        fields: [reportSections.reportId],
        references: [reports.id],
    }),
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

// ============================================================================
// DEMO REQUESTS / LEADS (Landing Page Lead Capture)
// ============================================================================

export const demoRequests = pgTable('demo_requests', {
    id: text('id').primaryKey(),
    name: text('name'),
    email: text('email').notNull(),
    company: text('company'),
    message: text('message'),
    source: text('source').notNull().default('demo_form'), // 'demo_form' | 'hero_email'
    createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// BILLING / PRODUCTS SCHEMA (Phase 5 - Polar Integration)
// ============================================================================

/**
 * Products Table
 * Stores subscription plan/product configuration.
 * Allows different Polar product IDs for sandbox vs production.
 */
export const products = pgTable('products', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    slug: text('slug').notNull().unique(),                    // 'starter', 'professional'
    polarProductId: text('polar_product_id').notNull(),       // Polar product ID (different per environment)
    priceCents: integer('price_cents').notNull(),             // Price in cents (4900 = $49.00)
    billingInterval: text('billing_interval').notNull().default('month'), // 'month' or 'year'
    features: text('features'),                               // Plan features as JSON string
    isActive: boolean('is_active').default(true),
    displayOrder: integer('display_order').default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
}, (table) => [
    index('products_slug_idx').on(table.slug),
    index('products_active_idx').on(table.isActive, table.displayOrder),
]);

/**
 * Transactions Table
 * Tracks all payment transactions from Polar.
 * Used for audit trail and transaction history in billing page.
 */
export const transactions = pgTable('transactions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),                        // References Better Auth user table
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    polarOrderId: text('polar_order_id').unique(),            // Polar order ID (idempotency key)
    polarCheckoutId: text('polar_checkout_id'),               // Polar checkout session ID
    polarSubscriptionId: text('polar_subscription_id'),       // Associated subscription if any
    amountCents: integer('amount_cents').notNull(),           // Amount charged in cents
    currency: text('currency').default('usd'),
    status: text('status').notNull().default('pending'),      // 'pending', 'completed', 'refunded'
    metadata: text('metadata'),                               // Additional data from Polar as JSON
    createdAt: integer('created_at').notNull(),
}, (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_polar_order_idx').on(table.polarOrderId),
    index('transactions_subscription_idx').on(table.polarSubscriptionId),
]);

// ============================================================================
// BILLING RELATIONS
// ============================================================================

export const productsRelations = relations(products, ({ many }) => ({
    transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    product: one(products, {
        fields: [transactions.productId],
        references: [products.id],
    }),
}));

// ============================================================================
// AGENTS / CHAT (Phase 1 of agent integration plan)
// ============================================================================
// Tables that back the chat dock and the agent runtime. Defined inline here
// (rather than in a separate agents-schema.ts) to avoid a circular ESM import
// — Turbopack on Next 16 is stricter about cycles than Webpack was.

export type ChatMessageRole = 'user' | 'assistant' | 'tool' | 'system';
export type ChatThreadStatus = 'active' | 'archived';
export type AgentRunStatus = 'running' | 'complete' | 'error' | 'cancelled';
export type ToolCallStatus = 'running' | 'complete' | 'error' | 'awaiting_approval';

export const chatThreads = pgTable('chat_threads', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').notNull().references(() => organizations.id),
    // userId is the Better Auth user id (from auth-schema's user table). No FK
    // here so this stays decoupled from the auth migration cycle. Application
    // enforcement via getCurrentUser().
    userId: text('user_id').notNull(),
    title: text('title').notNull().default('New conversation'),
    status: text('status').notNull().$type<ChatThreadStatus>().default('active'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    index('idx_chat_threads_project').on(table.projectId),
    index('idx_chat_threads_user').on(table.userId),
    index('idx_chat_threads_org').on(table.organizationId),
]);

export const chatMessages = pgTable('chat_messages', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    threadId: text('thread_id').notNull().references(() => chatThreads.id, { onDelete: 'cascade' }),
    role: text('role').notNull().$type<ChatMessageRole>(),
    content: text('content').notNull(),
    agentName: text('agent_name'),
    runId: text('run_id'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_chat_messages_thread').on(table.threadId),
]);

export const agentRuns = pgTable('agent_runs', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    threadId: text('thread_id').notNull().references(() => chatThreads.id, { onDelete: 'cascade' }),
    triggerMessageId: text('trigger_message_id').references(() => chatMessages.id),
    agentName: text('agent_name').notNull(),
    status: text('status').notNull().$type<AgentRunStatus>().default('running'),
    model: text('model'),
    inputTokens: integer('input_tokens').default(0),
    outputTokens: integer('output_tokens').default(0),
    costMicrousd: integer('cost_microusd').default(0),
    error: jsonb('error'),
    startedAt: timestamp('started_at').defaultNow(),
    finishedAt: timestamp('finished_at'),
}, (table) => [
    index('idx_agent_runs_thread').on(table.threadId),
]);

export const toolCalls = pgTable('tool_calls', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    runId: text('run_id').notNull().references(() => agentRuns.id, { onDelete: 'cascade' }),
    toolName: text('tool_name').notNull(),
    input: jsonb('input').notNull(),
    output: jsonb('output'),
    status: text('status').notNull().$type<ToolCallStatus>().default('running'),
    durationMs: integer('duration_ms'),
    error: jsonb('error'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_tool_calls_run').on(table.runId),
]);

// Phase 3: approvals — proposed mutations awaiting user sign-off. A mutating
// tool inserts a row here instead of writing directly. The user clicks
// approve/reject in the chat, which transitions status to applied/rejected
// and (on apply) executes the mutation under optimistic-locking.
export type ApprovalStatus =
    | 'pending'
    | 'applying'
    | 'approved'
    | 'rejected'
    | 'expired'
    | 'applied'
    | 'conflict';

export const approvals = pgTable('approvals', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    runId: text('run_id').notNull().references(() => agentRuns.id, { onDelete: 'cascade' }),
    threadId: text('thread_id').notNull().references(() => chatThreads.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').notNull().references(() => organizations.id),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    toolName: text('tool_name').notNull(),
    toolUseId: text('tool_use_id').notNull(),
    input: jsonb('input').notNull(),
    proposedDiff: jsonb('proposed_diff').notNull(),
    status: text('status').notNull().$type<ApprovalStatus>().default('pending'),
    appliedOutput: jsonb('applied_output'),
    expectedRowVersion: integer('expected_row_version'),
    respondedBy: text('responded_by'),
    respondedAt: timestamp('responded_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_approvals_thread').on(table.threadId),
    index('idx_approvals_status').on(table.status),
    index('idx_approvals_project').on(table.projectId),
]);

// Unified action audit trail. This is the bridge between traditional UI
// operations, chat-driven tools, and future workflow steps.
export type ActionInvocationActorKind = 'user' | 'agent' | 'workflow' | 'system';
export type ActionInvocationStatus = 'running' | 'applied' | 'proposed' | 'rejected' | 'error';

export const actionInvocations = pgTable('action_invocations', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    actionId: text('action_id').notNull(),
    actorKind: text('actor_kind').notNull().$type<ActionInvocationActorKind>(),
    actorId: text('actor_id').notNull(),
    organizationId: text('organization_id').notNull().references(() => organizations.id),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    threadId: text('thread_id').references(() => chatThreads.id, { onDelete: 'set null' }),
    runId: text('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
    workflowStepId: text('workflow_step_id'),
    input: jsonb('input').notNull(),
    output: jsonb('output'),
    approvalId: text('approval_id').references(() => approvals.id, { onDelete: 'set null' }),
    viewContext: jsonb('view_context'),
    status: text('status').notNull().$type<ActionInvocationStatus>().default('running'),
    error: jsonb('error'),
    createdAt: timestamp('created_at').defaultNow(),
    finishedAt: timestamp('finished_at'),
}, (table) => [
    index('idx_action_invocations_action').on(table.actionId),
    index('idx_action_invocations_project').on(table.projectId),
    index('idx_action_invocations_actor').on(table.actorKind, table.actorId),
    index('idx_action_invocations_approval').on(table.approvalId),
]);

export type WorkflowRunStatus =
    | 'draft'
    | 'previewed'
    | 'awaiting_approval'
    | 'running'
    | 'applied'
    | 'skipped'
    | 'rejected'
    | 'failed';
export type WorkflowStepState =
    | 'pending'
    | 'running'
    | 'awaiting_approval'
    | 'applied'
    | 'skipped'
    | 'rejected'
    | 'failed';
export type WorkflowFailurePolicy = 'abort_workflow' | 'continue' | 'retry_n' | 'ask_user';

export const workflowRuns = pgTable('workflow_runs', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workflowKey: text('workflow_key').notNull(),
    userGoal: text('user_goal').notNull(),
    status: text('status').notNull().$type<WorkflowRunStatus>().default('draft'),
    organizationId: text('organization_id').notNull().references(() => organizations.id),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    threadId: text('thread_id').references(() => chatThreads.id, { onDelete: 'set null' }),
    actorUserId: text('actor_user_id'),
    activeAgent: text('active_agent'),
    currentStepIds: jsonb('current_step_ids').$type<string[]>().default([]),
    preferenceSnapshot: jsonb('preference_snapshot'),
    plan: jsonb('plan'),
    summary: text('summary'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    finishedAt: timestamp('finished_at'),
}, (table) => [
    index('idx_workflow_runs_project').on(table.projectId),
    index('idx_workflow_runs_thread').on(table.threadId),
    index('idx_workflow_runs_status').on(table.status),
    index('idx_workflow_runs_key').on(table.workflowKey),
]);

export const workflowSteps = pgTable('workflow_steps', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workflowRunId: text('workflow_run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
    stepKey: text('step_key').notNull(),
    title: text('title').notNull(),
    actionId: text('action_id').notNull(),
    state: text('state').notNull().$type<WorkflowStepState>().default('pending'),
    dependencyIds: jsonb('dependency_ids').$type<string[]>().default([]),
    input: jsonb('input').notNull(),
    output: jsonb('output'),
    approvalId: text('approval_id').references(() => approvals.id, { onDelete: 'set null' }),
    failurePolicy: text('failure_policy').notNull().$type<WorkflowFailurePolicy>().default('ask_user'),
    risk: text('risk').notNull(),
    preview: jsonb('preview'),
    error: jsonb('error'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    index('idx_workflow_steps_run').on(table.workflowRunId),
    index('idx_workflow_steps_state').on(table.state),
    index('idx_workflow_steps_approval').on(table.approvalId),
]);

