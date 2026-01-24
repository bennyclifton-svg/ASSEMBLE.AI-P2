import { pgTable, foreignKey, text, timestamp, integer, unique, boolean, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const rftNew = pgTable("rft_new", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	disciplineId: text("discipline_id"),
	tradeId: text("trade_id"),
	rftDate: text("rft_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [consultantDisciplines.id],
			name: "rft_new_discipline_id_consultant_disciplines_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "rft_new_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [contractorTrades.id],
			name: "rft_new_trade_id_contractor_trades_id_fk"
		}),
]);

export const rftNewTransmittals = pgTable("rft_new_transmittals", {
	id: text().primaryKey().notNull(),
	rftNewId: text("rft_new_id").notNull(),
	documentId: text("document_id").notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "rft_new_transmittals_document_id_documents_id_fk"
		}),
	foreignKey({
			columns: [table.rftNewId],
			foreignColumns: [rftNew.id],
			name: "rft_new_transmittals_rft_new_id_rft_new_id_fk"
		}).onDelete("cascade"),
]);

export const stakeholders = pgTable("stakeholders", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	name: text().notNull(),
	role: text(),
	organization: text(),
	email: text(),
	phone: text(),
	order: integer().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "stakeholders_project_id_projects_id_fk"
		}),
]);

export const risks = pgTable("risks", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	title: text().notNull(),
	description: text(),
	likelihood: text(),
	impact: text(),
	mitigation: text(),
	status: text().default('identified'),
	order: integer().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "risks_project_id_projects_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("sessions_token_hash_unique").on(table.tokenHash),
]);

export const categories = pgTable("categories", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	isSystem: boolean("is_system").default(false),
}, (table) => [
	unique("categories_name_unique").on(table.name),
]);

export const contractorTrades = pgTable("contractor_trades", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	tradeName: text("trade_name").notNull(),
	isEnabled: boolean("is_enabled").default(false),
	order: integer().notNull(),
	scopeWorks: text("scope_works"),
	scopeDeliverables: text("scope_deliverables"),
	scopePrice: text("scope_price"),
	scopeProgram: text("scope_program"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "contractor_trades_project_id_projects_id_fk"
		}),
]);

export const evaluationNonPriceCriteria = pgTable("evaluation_non_price_criteria", {
	id: text().primaryKey().notNull(),
	evaluationId: text("evaluation_id").notNull(),
	criteriaKey: text("criteria_key").notNull(),
	criteriaLabel: text("criteria_label").notNull(),
	orderIndex: integer("order_index").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.evaluationId],
			foreignColumns: [evaluations.id],
			name: "evaluation_non_price_criteria_evaluation_id_evaluations_id_fk"
		}).onDelete("cascade"),
]);

export const evaluationNonPriceCells = pgTable("evaluation_non_price_cells", {
	id: text().primaryKey().notNull(),
	criteriaId: text("criteria_id").notNull(),
	firmId: text("firm_id").notNull(),
	firmType: text("firm_type").notNull(),
	extractedContent: text("extracted_content"),
	qualityRating: text("quality_rating"),
	userEditedContent: text("user_edited_content"),
	userEditedRating: text("user_edited_rating"),
	source: text().default('manual'),
	confidence: integer(),
	sourceChunks: text("source_chunks"),
	sourceSubmissionId: text("source_submission_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.criteriaId],
			foreignColumns: [evaluationNonPriceCriteria.id],
			name: "evaluation_non_price_cells_criteria_id_evaluation_non_price_cri"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sourceSubmissionId],
			foreignColumns: [tenderSubmissions.id],
			name: "evaluation_non_price_cells_source_submission_id_tender_submissi"
		}),
]);

export const documents = pgTable("documents", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	categoryId: text("category_id"),
	subcategoryId: text("subcategory_id"),
	latestVersionId: text("latest_version_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "documents_project_id_projects_id_fk"
		}),
]);

export const knowledgeLibraries = pgTable("knowledge_libraries", {
	id: text().primaryKey().notNull(),
	organizationId: text("organization_id").notNull(),
	type: text().notNull(),
	documentCount: integer("document_count").default(0).notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "knowledge_libraries_organization_id_organizations_id_fk"
		}),
]);

export const gisCache = pgTable("gis_cache", {
	id: text().primaryKey().notNull(),
	address: text().notNull(),
	zoning: text(),
	jurisdiction: text(),
	lotArea: integer("lot_area"),
	rawData: text("raw_data"),
	cachedAt: timestamp("cached_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
}, (table) => [
	unique("gis_cache_address_unique").on(table.address),
]);

export const importTemplates = pgTable("import_templates", {
	id: text().primaryKey().notNull(),
	templateName: text("template_name").notNull(),
	columnMappings: text("column_mappings").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const fileAssets = pgTable("file_assets", {
	id: text().primaryKey().notNull(),
	storagePath: text("storage_path").notNull(),
	originalName: text("original_name").notNull(),
	mimeType: text("mime_type").notNull(),
	sizeBytes: integer("size_bytes").notNull(),
	hash: text().notNull(),
	ocrStatus: text("ocr_status").default('PENDING'),
	ocrText: text("ocr_text"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const libraryDocuments = pgTable("library_documents", {
	id: text().primaryKey().notNull(),
	libraryId: text("library_id").notNull(),
	fileAssetId: text("file_asset_id").notNull(),
	addedAt: integer("added_at").notNull(),
	addedBy: text("added_by"),
	syncStatus: text("sync_status").default('pending'),
}, (table) => [
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [users.id],
			name: "library_documents_added_by_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.fileAssetId],
			foreignColumns: [fileAssets.id],
			name: "library_documents_file_asset_id_file_assets_id_fk"
		}),
	foreignKey({
			columns: [table.libraryId],
			foreignColumns: [knowledgeLibraries.id],
			name: "library_documents_library_id_knowledge_libraries_id_fk"
		}).onDelete("cascade"),
]);

export const evaluations = pgTable("evaluations", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	disciplineId: text("discipline_id"),
	tradeId: text("trade_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [consultantDisciplines.id],
			name: "evaluations_discipline_id_consultant_disciplines_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "evaluations_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [contractorTrades.id],
			name: "evaluations_trade_id_contractor_trades_id_fk"
		}),
]);

export const invoices = pgTable("invoices", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	costLineId: text("cost_line_id"),
	variationId: text("variation_id"),
	companyId: text("company_id"),
	fileAssetId: text("file_asset_id"),
	invoiceDate: text("invoice_date").notNull(),
	poNumber: text("po_number"),
	invoiceNumber: text("invoice_number").notNull(),
	description: text(),
	amountCents: integer("amount_cents").notNull(),
	gstCents: integer("gst_cents").default(0),
	periodYear: integer("period_year").notNull(),
	periodMonth: integer("period_month").notNull(),
	paidStatus: text("paid_status").default('unpaid'),
	paidDate: text("paid_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "invoices_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.costLineId],
			foreignColumns: [costLines.id],
			name: "invoices_cost_line_id_cost_lines_id_fk"
		}),
	foreignKey({
			columns: [table.fileAssetId],
			foreignColumns: [fileAssets.id],
			name: "invoices_file_asset_id_file_assets_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "invoices_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.variationId],
			foreignColumns: [variations.id],
			name: "invoices_variation_id_variations_id_fk"
		}),
]);

export const loginAttempts = pgTable("login_attempts", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	attempts: integer().default(0).notNull(),
	lockedUntil: integer("locked_until"),
	updatedAt: integer("updated_at").notNull(),
}, (table) => [
	unique("login_attempts_email_unique").on(table.email),
]);

export const projectDetails = pgTable("project_details", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	projectName: text("project_name").notNull(),
	address: text().notNull(),
	legalAddress: text("legal_address"),
	zoning: text(),
	jurisdiction: text(),
	lotArea: integer("lot_area"),
	numberOfStories: integer("number_of_stories"),
	buildingClass: text("building_class"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_details_project_id_projects_id_fk"
		}),
]);

export const projectSnapshots = pgTable("project_snapshots", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	snapshotName: text("snapshot_name").notNull(),
	snapshotDate: text("snapshot_date").notNull(),
	snapshotData: text("snapshot_data").notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_snapshots_project_id_projects_id_fk"
		}),
]);

export const projectStages = pgTable("project_stages", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	stageNumber: integer("stage_number").notNull(),
	stageName: text("stage_name").notNull(),
	startDate: text("start_date"),
	endDate: text("end_date"),
	duration: integer(),
	status: text().default('not_started'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_stages_project_id_projects_id_fk"
		}),
]);

export const projects = pgTable("projects", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	code: text(),
	status: text().default('active'),
	organizationId: text("organization_id"),
	currentReportMonth: text("current_report_month"),
	revision: text().default('REV A'),
	currencyCode: text("currency_code").default('AUD'),
	showGst: boolean("show_gst").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	projectType: text("project_type"),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "projects_organization_id_organizations_id_fk"
		}),
]);

export const organizations = pgTable("organizations", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	defaultSettings: text("default_settings").default('{}'),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const projectObjectives = pgTable("project_objectives", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	functional: text(),
	quality: text(),
	budget: text(),
	program: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	questionAnswers: text("question_answers"),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_objectives_project_id_projects_id_fk"
		}),
]);

export const revisionHistory = pgTable("revision_history", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	fieldName: text("field_name").notNull(),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	userId: text("user_id").notNull(),
	userName: text("user_name").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "revision_history_project_id_projects_id_fk"
		}),
]);

export const subscriptions = pgTable("subscriptions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	polarSubscriptionId: text("polar_subscription_id"),
	polarCustomerId: text("polar_customer_id"),
	status: text().notNull(),
	planId: text("plan_id").notNull(),
	currentPeriodStart: integer("current_period_start"),
	currentPeriodEnd: integer("current_period_end"),
	canceledAt: integer("canceled_at"),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
}, (table) => [
	index("subscriptions_polar_sub_idx").using("btree", table.polarSubscriptionId.asc().nullsLast().op("text_ops")),
	index("subscriptions_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "subscriptions_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("subscriptions_polar_subscription_id_unique").on(table.polarSubscriptionId),
]);

export const tradePriceItems = pgTable("trade_price_items", {
	id: text().primaryKey().notNull(),
	tradeId: text("trade_id").notNull(),
	description: text().notNull(),
	sortOrder: integer("sort_order").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [contractorTrades.id],
			name: "trade_price_items_trade_id_contractor_trades_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	displayName: text("display_name").notNull(),
	organizationId: text("organization_id"),
	polarCustomerId: text("polar_customer_id"),
	subscriptionStatus: text("subscription_status").default('free'),
	subscriptionPlanId: text("subscription_plan_id"),
	subscriptionEndsAt: integer("subscription_ends_at"),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_polar_customer_idx").using("btree", table.polarCustomerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "users_organization_id_organizations_id_fk"
		}),
	unique("users_email_unique").on(table.email),
]);

export const transmittals = pgTable("transmittals", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id"),
	subcategoryId: text("subcategory_id"),
	disciplineId: text("discipline_id"),
	tradeId: text("trade_id"),
	name: text().notNull(),
	status: text().default('DRAFT'),
	issuedAt: timestamp("issued_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [consultantDisciplines.id],
			name: "transmittals_discipline_id_consultant_disciplines_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "transmittals_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.subcategoryId],
			foreignColumns: [subcategories.id],
			name: "transmittals_subcategory_id_subcategories_id_fk"
		}),
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [contractorTrades.id],
			name: "transmittals_trade_id_contractor_trades_id_fk"
		}),
]);

export const trr = pgTable("trr", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	disciplineId: text("discipline_id"),
	tradeId: text("trade_id"),
	executiveSummary: text("executive_summary"),
	clarifications: text(),
	recommendation: text(),
	reportDate: text("report_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [consultantDisciplines.id],
			name: "trr_discipline_id_consultant_disciplines_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "trr_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [contractorTrades.id],
			name: "trr_trade_id_contractor_trades_id_fk"
		}),
]);

export const trrTransmittals = pgTable("trr_transmittals", {
	id: text().primaryKey().notNull(),
	trrId: text("trr_id").notNull(),
	documentId: text("document_id").notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "trr_transmittals_document_id_documents_id_fk"
		}),
	foreignKey({
			columns: [table.trrId],
			foreignColumns: [trr.id],
			name: "trr_transmittals_trr_id_trr_id_fk"
		}).onDelete("cascade"),
]);

export const subcategories = pgTable("subcategories", {
	id: text().primaryKey().notNull(),
	categoryId: text("category_id").notNull(),
	name: text().notNull(),
	isSystem: boolean("is_system").default(false),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "subcategories_category_id_categories_id_fk"
		}),
]);

export const tenderSubmissions = pgTable("tender_submissions", {
	id: text().primaryKey().notNull(),
	evaluationId: text("evaluation_id").notNull(),
	firmId: text("firm_id").notNull(),
	firmType: text("firm_type").notNull(),
	filename: text().notNull(),
	fileAssetId: text("file_asset_id"),
	parsedAt: timestamp("parsed_at", { mode: 'string' }).defaultNow(),
	parserUsed: text("parser_used").default('claude'),
	confidence: integer(),
	rawExtractedItems: text("raw_extracted_items"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.evaluationId],
			foreignColumns: [evaluations.id],
			name: "tender_submissions_evaluation_id_evaluations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fileAssetId],
			foreignColumns: [fileAssets.id],
			name: "tender_submissions_file_asset_id_file_assets_id_fk"
		}),
]);

export const transmittalItems = pgTable("transmittal_items", {
	id: text().primaryKey().notNull(),
	transmittalId: text("transmittal_id").notNull(),
	versionId: text("version_id").notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.transmittalId],
			foreignColumns: [transmittals.id],
			name: "transmittal_items_transmittal_id_transmittals_id_fk"
		}),
	foreignKey({
			columns: [table.versionId],
			foreignColumns: [versions.id],
			name: "transmittal_items_version_id_versions_id_fk"
		}),
]);

export const addenda = pgTable("addenda", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	disciplineId: text("discipline_id"),
	tradeId: text("trade_id"),
	addendumNumber: integer("addendum_number").notNull(),
	content: text(),
	addendumDate: text("addendum_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [consultantDisciplines.id],
			name: "addenda_discipline_id_consultant_disciplines_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "addenda_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [contractorTrades.id],
			name: "addenda_trade_id_contractor_trades_id_fk"
		}),
]);

export const consultantDisciplines = pgTable("consultant_disciplines", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	disciplineName: text("discipline_name").notNull(),
	isEnabled: boolean("is_enabled").default(false),
	order: integer().notNull(),
	briefServices: text("brief_services"),
	briefDeliverables: text("brief_deliverables"),
	briefFee: text("brief_fee"),
	briefProgram: text("brief_program"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "consultant_disciplines_project_id_projects_id_fk"
		}),
]);

export const addendumTransmittals = pgTable("addendum_transmittals", {
	id: text().primaryKey().notNull(),
	addendumId: text("addendum_id").notNull(),
	documentId: text("document_id").notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.addendumId],
			foreignColumns: [addenda.id],
			name: "addendum_transmittals_addendum_id_addenda_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "addendum_transmittals_document_id_documents_id_fk"
		}),
]);

export const consultantStatuses = pgTable("consultant_statuses", {
	id: text().primaryKey().notNull(),
	disciplineId: text("discipline_id").notNull(),
	statusType: text("status_type").notNull(),
	isActive: boolean("is_active").default(false),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [consultantDisciplines.id],
			name: "consultant_statuses_discipline_id_consultant_disciplines_id_fk"
		}),
]);

export const consultants = pgTable("consultants", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	companyName: text("company_name").notNull(),
	contactPerson: text("contact_person"),
	discipline: text().notNull(),
	email: text().notNull(),
	phone: text(),
	mobile: text(),
	address: text(),
	abn: text(),
	notes: text(),
	shortlisted: boolean().default(false),
	awarded: boolean().default(false),
	companyId: text("company_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "consultants_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "consultants_project_id_projects_id_fk"
		}),
]);

export const companies = pgTable("companies", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	abn: text(),
	contactName: text("contact_name"),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	address: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const contractorStatuses = pgTable("contractor_statuses", {
	id: text().primaryKey().notNull(),
	tradeId: text("trade_id").notNull(),
	statusType: text("status_type").notNull(),
	isActive: boolean("is_active").default(false),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [contractorTrades.id],
			name: "contractor_statuses_trade_id_contractor_trades_id_fk"
		}),
]);

export const contractors = pgTable("contractors", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	companyName: text("company_name").notNull(),
	contactPerson: text("contact_person"),
	trade: text().notNull(),
	email: text().notNull(),
	phone: text(),
	address: text(),
	abn: text(),
	notes: text(),
	shortlisted: boolean().default(false),
	awarded: boolean().default(false),
	companyId: text("company_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "contractors_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "contractors_project_id_projects_id_fk"
		}),
]);

export const costLineAllocations = pgTable("cost_line_allocations", {
	id: text().primaryKey().notNull(),
	costLineId: text("cost_line_id").notNull(),
	fiscalYear: integer("fiscal_year").notNull(),
	amountCents: integer("amount_cents").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.costLineId],
			foreignColumns: [costLines.id],
			name: "cost_line_allocations_cost_line_id_cost_lines_id_fk"
		}),
]);

export const costLineComments = pgTable("cost_line_comments", {
	id: text().primaryKey().notNull(),
	costLineId: text("cost_line_id").notNull(),
	columnKey: text("column_key").notNull(),
	commentText: text("comment_text").notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.costLineId],
			foreignColumns: [costLines.id],
			name: "cost_line_comments_cost_line_id_cost_lines_id_fk"
		}),
]);

export const disciplineFeeItems = pgTable("discipline_fee_items", {
	id: text().primaryKey().notNull(),
	disciplineId: text("discipline_id").notNull(),
	description: text().notNull(),
	sortOrder: integer("sort_order").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [consultantDisciplines.id],
			name: "discipline_fee_items_discipline_id_consultant_disciplines_id_fk"
		}),
]);

export const evaluationRows = pgTable("evaluation_rows", {
	id: text().primaryKey().notNull(),
	evaluationId: text("evaluation_id").notNull(),
	tableType: text("table_type").notNull(),
	description: text().notNull(),
	orderIndex: integer("order_index").notNull(),
	isSystemRow: boolean("is_system_row").default(false),
	costLineId: text("cost_line_id"),
	source: text().default('cost_plan'),
	sourceSubmissionId: text("source_submission_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.costLineId],
			foreignColumns: [costLines.id],
			name: "evaluation_rows_cost_line_id_cost_lines_id_fk"
		}),
	foreignKey({
			columns: [table.evaluationId],
			foreignColumns: [evaluations.id],
			name: "evaluation_rows_evaluation_id_evaluations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sourceSubmissionId],
			foreignColumns: [tenderSubmissions.id],
			name: "evaluation_rows_source_submission_id_tender_submissions_id_fk"
		}),
]);

export const evaluationCells = pgTable("evaluation_cells", {
	id: text().primaryKey().notNull(),
	rowId: text("row_id").notNull(),
	firmId: text("firm_id").notNull(),
	firmType: text("firm_type").notNull(),
	amountCents: integer("amount_cents").default(0),
	source: text().default('manual'),
	confidence: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.rowId],
			foreignColumns: [evaluationRows.id],
			name: "evaluation_cells_row_id_evaluation_rows_id_fk"
		}).onDelete("cascade"),
]);

export const variations = pgTable("variations", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	costLineId: text("cost_line_id"),
	variationNumber: text("variation_number").notNull(),
	category: text().notNull(),
	description: text().notNull(),
	status: text().default('Forecast'),
	amountForecastCents: integer("amount_forecast_cents").default(0),
	amountApprovedCents: integer("amount_approved_cents").default(0),
	dateSubmitted: text("date_submitted"),
	dateApproved: text("date_approved"),
	requestedBy: text("requested_by"),
	approvedBy: text("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.costLineId],
			foreignColumns: [costLines.id],
			name: "variations_cost_line_id_cost_lines_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "variations_project_id_projects_id_fk"
		}),
]);

export const versions = pgTable("versions", {
	id: text().primaryKey().notNull(),
	documentId: text("document_id").notNull(),
	fileAssetId: text("file_asset_id").notNull(),
	versionNumber: integer("version_number").notNull(),
	uploadedBy: text("uploaded_by").default('User'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "versions_document_id_documents_id_fk"
		}),
	foreignKey({
			columns: [table.fileAssetId],
			foreignColumns: [fileAssets.id],
			name: "versions_file_asset_id_file_assets_id_fk"
		}),
]);

export const programDependencies = pgTable("program_dependencies", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	fromActivityId: text("from_activity_id").notNull(),
	toActivityId: text("to_activity_id").notNull(),
	type: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.fromActivityId],
			foreignColumns: [programActivities.id],
			name: "program_dependencies_from_activity_id_program_activities_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "program_dependencies_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.toActivityId],
			foreignColumns: [programActivities.id],
			name: "program_dependencies_to_activity_id_program_activities_id_fk"
		}).onDelete("cascade"),
]);

export const costLines = pgTable("cost_lines", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	disciplineId: text("discipline_id"),
	tradeId: text("trade_id"),
	section: text().notNull(),
	costCode: text("cost_code"),
	activity: text().notNull(),
	reference: text(),
	budgetCents: integer("budget_cents").default(0),
	approvedContractCents: integer("approved_contract_cents").default(0),
	sortOrder: integer("sort_order").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	masterStage: text("master_stage"),
}, (table) => [
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [consultantDisciplines.id],
			name: "cost_lines_discipline_id_consultant_disciplines_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "cost_lines_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [contractorTrades.id],
			name: "cost_lines_trade_id_contractor_trades_id_fk"
		}),
]);

export const programMilestones = pgTable("program_milestones", {
	id: text().primaryKey().notNull(),
	activityId: text("activity_id").notNull(),
	name: text().notNull(),
	date: text().notNull(),
	sortOrder: integer("sort_order").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [programActivities.id],
			name: "program_milestones_activity_id_program_activities_id_fk"
		}).onDelete("cascade"),
]);

export const programActivities = pgTable("program_activities", {
	id: text().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	parentId: text("parent_id"),
	name: text().notNull(),
	startDate: text("start_date"),
	endDate: text("end_date"),
	collapsed: boolean().default(false),
	color: text(),
	sortOrder: integer("sort_order").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	masterStage: text("master_stage"),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "program_activities_project_id_projects_id_fk"
		}),
]);
