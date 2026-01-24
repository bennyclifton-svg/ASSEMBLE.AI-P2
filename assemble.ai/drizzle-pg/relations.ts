import { relations } from "drizzle-orm/relations";
import { consultantDisciplines, rftNew, projects, contractorTrades, documents, rftNewTransmittals, stakeholders, risks, users, sessions, evaluations, evaluationNonPriceCriteria, evaluationNonPriceCells, tenderSubmissions, organizations, knowledgeLibraries, libraryDocuments, fileAssets, companies, invoices, costLines, variations, projectDetails, projectSnapshots, projectStages, projectObjectives, revisionHistory, subscriptions, tradePriceItems, transmittals, subcategories, trr, trrTransmittals, categories, transmittalItems, versions, addenda, addendumTransmittals, consultantStatuses, consultants, contractorStatuses, contractors, costLineAllocations, costLineComments, disciplineFeeItems, evaluationRows, evaluationCells, programActivities, programDependencies, programMilestones } from "./schema";

export const rftNewRelations = relations(rftNew, ({one, many}) => ({
	consultantDiscipline: one(consultantDisciplines, {
		fields: [rftNew.disciplineId],
		references: [consultantDisciplines.id]
	}),
	project: one(projects, {
		fields: [rftNew.projectId],
		references: [projects.id]
	}),
	contractorTrade: one(contractorTrades, {
		fields: [rftNew.tradeId],
		references: [contractorTrades.id]
	}),
	rftNewTransmittals: many(rftNewTransmittals),
}));

export const consultantDisciplinesRelations = relations(consultantDisciplines, ({one, many}) => ({
	rftNews: many(rftNew),
	evaluations: many(evaluations),
	transmittals: many(transmittals),
	trrs: many(trr),
	addenda: many(addenda),
	project: one(projects, {
		fields: [consultantDisciplines.projectId],
		references: [projects.id]
	}),
	consultantStatuses: many(consultantStatuses),
	disciplineFeeItems: many(disciplineFeeItems),
	costLines: many(costLines),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	rftNews: many(rftNew),
	stakeholders: many(stakeholders),
	risks: many(risks),
	contractorTrades: many(contractorTrades),
	documents: many(documents),
	evaluations: many(evaluations),
	invoices: many(invoices),
	projectDetails: many(projectDetails),
	projectSnapshots: many(projectSnapshots),
	projectStages: many(projectStages),
	organization: one(organizations, {
		fields: [projects.organizationId],
		references: [organizations.id]
	}),
	projectObjectives: many(projectObjectives),
	revisionHistories: many(revisionHistory),
	transmittals: many(transmittals),
	trrs: many(trr),
	addenda: many(addenda),
	consultantDisciplines: many(consultantDisciplines),
	consultants: many(consultants),
	contractors: many(contractors),
	variations: many(variations),
	programDependencies: many(programDependencies),
	costLines: many(costLines),
	programActivities: many(programActivities),
}));

export const contractorTradesRelations = relations(contractorTrades, ({one, many}) => ({
	rftNews: many(rftNew),
	project: one(projects, {
		fields: [contractorTrades.projectId],
		references: [projects.id]
	}),
	evaluations: many(evaluations),
	tradePriceItems: many(tradePriceItems),
	transmittals: many(transmittals),
	trrs: many(trr),
	addenda: many(addenda),
	contractorStatuses: many(contractorStatuses),
	costLines: many(costLines),
}));

export const rftNewTransmittalsRelations = relations(rftNewTransmittals, ({one}) => ({
	document: one(documents, {
		fields: [rftNewTransmittals.documentId],
		references: [documents.id]
	}),
	rftNew: one(rftNew, {
		fields: [rftNewTransmittals.rftNewId],
		references: [rftNew.id]
	}),
}));

export const documentsRelations = relations(documents, ({one, many}) => ({
	rftNewTransmittals: many(rftNewTransmittals),
	project: one(projects, {
		fields: [documents.projectId],
		references: [projects.id]
	}),
	trrTransmittals: many(trrTransmittals),
	addendumTransmittals: many(addendumTransmittals),
	versions: many(versions),
}));

export const stakeholdersRelations = relations(stakeholders, ({one}) => ({
	project: one(projects, {
		fields: [stakeholders.projectId],
		references: [projects.id]
	}),
}));

export const risksRelations = relations(risks, ({one}) => ({
	project: one(projects, {
		fields: [risks.projectId],
		references: [projects.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	sessions: many(sessions),
	libraryDocuments: many(libraryDocuments),
	subscriptions: many(subscriptions),
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.id]
	}),
}));

export const evaluationNonPriceCriteriaRelations = relations(evaluationNonPriceCriteria, ({one, many}) => ({
	evaluation: one(evaluations, {
		fields: [evaluationNonPriceCriteria.evaluationId],
		references: [evaluations.id]
	}),
	evaluationNonPriceCells: many(evaluationNonPriceCells),
}));

export const evaluationsRelations = relations(evaluations, ({one, many}) => ({
	evaluationNonPriceCriteria: many(evaluationNonPriceCriteria),
	consultantDiscipline: one(consultantDisciplines, {
		fields: [evaluations.disciplineId],
		references: [consultantDisciplines.id]
	}),
	project: one(projects, {
		fields: [evaluations.projectId],
		references: [projects.id]
	}),
	contractorTrade: one(contractorTrades, {
		fields: [evaluations.tradeId],
		references: [contractorTrades.id]
	}),
	tenderSubmissions: many(tenderSubmissions),
	evaluationRows: many(evaluationRows),
}));

export const evaluationNonPriceCellsRelations = relations(evaluationNonPriceCells, ({one}) => ({
	evaluationNonPriceCriterion: one(evaluationNonPriceCriteria, {
		fields: [evaluationNonPriceCells.criteriaId],
		references: [evaluationNonPriceCriteria.id]
	}),
	tenderSubmission: one(tenderSubmissions, {
		fields: [evaluationNonPriceCells.sourceSubmissionId],
		references: [tenderSubmissions.id]
	}),
}));

export const tenderSubmissionsRelations = relations(tenderSubmissions, ({one, many}) => ({
	evaluationNonPriceCells: many(evaluationNonPriceCells),
	evaluation: one(evaluations, {
		fields: [tenderSubmissions.evaluationId],
		references: [evaluations.id]
	}),
	fileAsset: one(fileAssets, {
		fields: [tenderSubmissions.fileAssetId],
		references: [fileAssets.id]
	}),
	evaluationRows: many(evaluationRows),
}));

export const knowledgeLibrariesRelations = relations(knowledgeLibraries, ({one, many}) => ({
	organization: one(organizations, {
		fields: [knowledgeLibraries.organizationId],
		references: [organizations.id]
	}),
	libraryDocuments: many(libraryDocuments),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	knowledgeLibraries: many(knowledgeLibraries),
	projects: many(projects),
	users: many(users),
}));

export const libraryDocumentsRelations = relations(libraryDocuments, ({one}) => ({
	user: one(users, {
		fields: [libraryDocuments.addedBy],
		references: [users.id]
	}),
	fileAsset: one(fileAssets, {
		fields: [libraryDocuments.fileAssetId],
		references: [fileAssets.id]
	}),
	knowledgeLibrary: one(knowledgeLibraries, {
		fields: [libraryDocuments.libraryId],
		references: [knowledgeLibraries.id]
	}),
}));

export const fileAssetsRelations = relations(fileAssets, ({many}) => ({
	libraryDocuments: many(libraryDocuments),
	invoices: many(invoices),
	tenderSubmissions: many(tenderSubmissions),
	versions: many(versions),
}));

export const invoicesRelations = relations(invoices, ({one}) => ({
	company: one(companies, {
		fields: [invoices.companyId],
		references: [companies.id]
	}),
	costLine: one(costLines, {
		fields: [invoices.costLineId],
		references: [costLines.id]
	}),
	fileAsset: one(fileAssets, {
		fields: [invoices.fileAssetId],
		references: [fileAssets.id]
	}),
	project: one(projects, {
		fields: [invoices.projectId],
		references: [projects.id]
	}),
	variation: one(variations, {
		fields: [invoices.variationId],
		references: [variations.id]
	}),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	invoices: many(invoices),
	consultants: many(consultants),
	contractors: many(contractors),
}));

export const costLinesRelations = relations(costLines, ({one, many}) => ({
	invoices: many(invoices),
	costLineAllocations: many(costLineAllocations),
	costLineComments: many(costLineComments),
	evaluationRows: many(evaluationRows),
	variations: many(variations),
	consultantDiscipline: one(consultantDisciplines, {
		fields: [costLines.disciplineId],
		references: [consultantDisciplines.id]
	}),
	project: one(projects, {
		fields: [costLines.projectId],
		references: [projects.id]
	}),
	contractorTrade: one(contractorTrades, {
		fields: [costLines.tradeId],
		references: [contractorTrades.id]
	}),
}));

export const variationsRelations = relations(variations, ({one, many}) => ({
	invoices: many(invoices),
	costLine: one(costLines, {
		fields: [variations.costLineId],
		references: [costLines.id]
	}),
	project: one(projects, {
		fields: [variations.projectId],
		references: [projects.id]
	}),
}));

export const projectDetailsRelations = relations(projectDetails, ({one}) => ({
	project: one(projects, {
		fields: [projectDetails.projectId],
		references: [projects.id]
	}),
}));

export const projectSnapshotsRelations = relations(projectSnapshots, ({one}) => ({
	project: one(projects, {
		fields: [projectSnapshots.projectId],
		references: [projects.id]
	}),
}));

export const projectStagesRelations = relations(projectStages, ({one}) => ({
	project: one(projects, {
		fields: [projectStages.projectId],
		references: [projects.id]
	}),
}));

export const projectObjectivesRelations = relations(projectObjectives, ({one}) => ({
	project: one(projects, {
		fields: [projectObjectives.projectId],
		references: [projects.id]
	}),
}));

export const revisionHistoryRelations = relations(revisionHistory, ({one}) => ({
	project: one(projects, {
		fields: [revisionHistory.projectId],
		references: [projects.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
}));

export const tradePriceItemsRelations = relations(tradePriceItems, ({one}) => ({
	contractorTrade: one(contractorTrades, {
		fields: [tradePriceItems.tradeId],
		references: [contractorTrades.id]
	}),
}));

export const transmittalsRelations = relations(transmittals, ({one, many}) => ({
	consultantDiscipline: one(consultantDisciplines, {
		fields: [transmittals.disciplineId],
		references: [consultantDisciplines.id]
	}),
	project: one(projects, {
		fields: [transmittals.projectId],
		references: [projects.id]
	}),
	subcategory: one(subcategories, {
		fields: [transmittals.subcategoryId],
		references: [subcategories.id]
	}),
	contractorTrade: one(contractorTrades, {
		fields: [transmittals.tradeId],
		references: [contractorTrades.id]
	}),
	transmittalItems: many(transmittalItems),
}));

export const subcategoriesRelations = relations(subcategories, ({one, many}) => ({
	transmittals: many(transmittals),
	category: one(categories, {
		fields: [subcategories.categoryId],
		references: [categories.id]
	}),
}));

export const trrRelations = relations(trr, ({one, many}) => ({
	consultantDiscipline: one(consultantDisciplines, {
		fields: [trr.disciplineId],
		references: [consultantDisciplines.id]
	}),
	project: one(projects, {
		fields: [trr.projectId],
		references: [projects.id]
	}),
	contractorTrade: one(contractorTrades, {
		fields: [trr.tradeId],
		references: [contractorTrades.id]
	}),
	trrTransmittals: many(trrTransmittals),
}));

export const trrTransmittalsRelations = relations(trrTransmittals, ({one}) => ({
	document: one(documents, {
		fields: [trrTransmittals.documentId],
		references: [documents.id]
	}),
	trr: one(trr, {
		fields: [trrTransmittals.trrId],
		references: [trr.id]
	}),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	subcategories: many(subcategories),
}));

export const transmittalItemsRelations = relations(transmittalItems, ({one}) => ({
	transmittal: one(transmittals, {
		fields: [transmittalItems.transmittalId],
		references: [transmittals.id]
	}),
	version: one(versions, {
		fields: [transmittalItems.versionId],
		references: [versions.id]
	}),
}));

export const versionsRelations = relations(versions, ({one, many}) => ({
	transmittalItems: many(transmittalItems),
	document: one(documents, {
		fields: [versions.documentId],
		references: [documents.id]
	}),
	fileAsset: one(fileAssets, {
		fields: [versions.fileAssetId],
		references: [fileAssets.id]
	}),
}));

export const addendaRelations = relations(addenda, ({one, many}) => ({
	consultantDiscipline: one(consultantDisciplines, {
		fields: [addenda.disciplineId],
		references: [consultantDisciplines.id]
	}),
	project: one(projects, {
		fields: [addenda.projectId],
		references: [projects.id]
	}),
	contractorTrade: one(contractorTrades, {
		fields: [addenda.tradeId],
		references: [contractorTrades.id]
	}),
	addendumTransmittals: many(addendumTransmittals),
}));

export const addendumTransmittalsRelations = relations(addendumTransmittals, ({one}) => ({
	addendum: one(addenda, {
		fields: [addendumTransmittals.addendumId],
		references: [addenda.id]
	}),
	document: one(documents, {
		fields: [addendumTransmittals.documentId],
		references: [documents.id]
	}),
}));

export const consultantStatusesRelations = relations(consultantStatuses, ({one}) => ({
	consultantDiscipline: one(consultantDisciplines, {
		fields: [consultantStatuses.disciplineId],
		references: [consultantDisciplines.id]
	}),
}));

export const consultantsRelations = relations(consultants, ({one}) => ({
	company: one(companies, {
		fields: [consultants.companyId],
		references: [companies.id]
	}),
	project: one(projects, {
		fields: [consultants.projectId],
		references: [projects.id]
	}),
}));

export const contractorStatusesRelations = relations(contractorStatuses, ({one}) => ({
	contractorTrade: one(contractorTrades, {
		fields: [contractorStatuses.tradeId],
		references: [contractorTrades.id]
	}),
}));

export const contractorsRelations = relations(contractors, ({one}) => ({
	company: one(companies, {
		fields: [contractors.companyId],
		references: [companies.id]
	}),
	project: one(projects, {
		fields: [contractors.projectId],
		references: [projects.id]
	}),
}));

export const costLineAllocationsRelations = relations(costLineAllocations, ({one}) => ({
	costLine: one(costLines, {
		fields: [costLineAllocations.costLineId],
		references: [costLines.id]
	}),
}));

export const costLineCommentsRelations = relations(costLineComments, ({one}) => ({
	costLine: one(costLines, {
		fields: [costLineComments.costLineId],
		references: [costLines.id]
	}),
}));

export const disciplineFeeItemsRelations = relations(disciplineFeeItems, ({one}) => ({
	consultantDiscipline: one(consultantDisciplines, {
		fields: [disciplineFeeItems.disciplineId],
		references: [consultantDisciplines.id]
	}),
}));

export const evaluationRowsRelations = relations(evaluationRows, ({one, many}) => ({
	costLine: one(costLines, {
		fields: [evaluationRows.costLineId],
		references: [costLines.id]
	}),
	evaluation: one(evaluations, {
		fields: [evaluationRows.evaluationId],
		references: [evaluations.id]
	}),
	tenderSubmission: one(tenderSubmissions, {
		fields: [evaluationRows.sourceSubmissionId],
		references: [tenderSubmissions.id]
	}),
	evaluationCells: many(evaluationCells),
}));

export const evaluationCellsRelations = relations(evaluationCells, ({one}) => ({
	evaluationRow: one(evaluationRows, {
		fields: [evaluationCells.rowId],
		references: [evaluationRows.id]
	}),
}));

export const programDependenciesRelations = relations(programDependencies, ({one}) => ({
	programActivity_fromActivityId: one(programActivities, {
		fields: [programDependencies.fromActivityId],
		references: [programActivities.id],
		relationName: "programDependencies_fromActivityId_programActivities_id"
	}),
	project: one(projects, {
		fields: [programDependencies.projectId],
		references: [projects.id]
	}),
	programActivity_toActivityId: one(programActivities, {
		fields: [programDependencies.toActivityId],
		references: [programActivities.id],
		relationName: "programDependencies_toActivityId_programActivities_id"
	}),
}));

export const programActivitiesRelations = relations(programActivities, ({one, many}) => ({
	programDependencies_fromActivityId: many(programDependencies, {
		relationName: "programDependencies_fromActivityId_programActivities_id"
	}),
	programDependencies_toActivityId: many(programDependencies, {
		relationName: "programDependencies_toActivityId_programActivities_id"
	}),
	programMilestones: many(programMilestones),
	project: one(projects, {
		fields: [programActivities.projectId],
		references: [projects.id]
	}),
}));

export const programMilestonesRelations = relations(programMilestones, ({one}) => ({
	programActivity: one(programActivities, {
		fields: [programMilestones.activityId],
		references: [programActivities.id]
	}),
}));