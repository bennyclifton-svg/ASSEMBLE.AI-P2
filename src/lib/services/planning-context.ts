/**
 * T039a & T045b: Planning Context Service
 * Fetches exact Planning Card data from SQLite for report generation
 *
 * This service provides the EXACT context from the Planning Card that should be
 * used in tender request generation. Unlike RAG-retrieved context, this data
 * is authoritative and should not be approximated or summarized.
 */

import { db } from '../db';
import {
    projects,
    projectDetails,
    projectObjectives,
    projectStages,
    risks,
    stakeholders,
    consultantDisciplines,
    contractorTrades,
    transmittals,
    transmittalItems,
    versions,
    documents,
    fileAssets,
    categories,
    subcategories,
    disciplineFeeItems,
    tradePriceItems,
    costLines,
} from '../db/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { getCategoryById, getCategoryByName } from '../constants/categories';

// ============================================
// Type Definitions
// ============================================

export interface ProjectDetailsContext {
    projectName: string;
    address: string;
    legalAddress?: string;
    zoning?: string;
    jurisdiction?: string;
    lotArea?: number;
    numberOfStories?: number;
    buildingClass?: string;
}

export interface ObjectiveContext {
    id: string;
    functional?: string;
    quality?: string;
    budget?: string;
    program?: string;
}

export interface StageContext {
    id: string;
    stageNumber: number;
    stageName: string;
    startDate?: string;
    endDate?: string;
    duration?: number;
    status: 'not_started' | 'in_progress' | 'completed';
}

export interface RiskContext {
    id: string;
    title: string;
    description?: string;
    likelihood?: 'low' | 'medium' | 'high';
    impact?: 'low' | 'medium' | 'high';
    mitigation?: string;
    status: 'identified' | 'mitigated' | 'closed';
}

export interface StakeholderContext {
    id: string;
    name: string;
    role?: string;
    organization?: string;
    email?: string;
    phone?: string;
}

export interface DisciplineContext {
    id: string;
    name: string;
    isEnabled: boolean;
    briefServices?: string;
    briefFee?: string;
    briefProgram?: string;
}

export interface TradeContext {
    id: string;
    name: string;
    isEnabled: boolean;
    scopeWorks?: string;
    scopePrice?: string;
    scopeProgram?: string;
}

export interface PlanningContext {
    projectId: string;
    projectCode?: string;
    details: ProjectDetailsContext;
    objectives: ObjectiveContext;
    stages: StageContext[];
    risks: RiskContext[];
    stakeholders: StakeholderContext[];
    disciplines: DisciplineContext[];
    trades: TradeContext[];
}

// ============================================
// Transmittal Context (T045b)
// ============================================

export interface TransmittalDocument {
    id: string;
    name: string;
    version: string;
    category: string;
    categoryColor?: string;
    subcategory?: string;
    subcategoryColor?: string;
}

export interface TransmittalContext {
    id: string;
    name: string;
    disciplineId?: string;
    tradeId?: string;
    status: 'DRAFT' | 'ISSUED';
    documents: TransmittalDocument[];
}

// ============================================
// Fee/Price Structure Types
// ============================================

export interface FeeItemContext {
    id: string;
    description: string;
    sortOrder: number;
}

export interface PriceItemContext {
    id: string;
    description: string;
    sortOrder: number;
}

// ============================================
// Cost Plan Types
// ============================================

export interface CostLineContext {
    id: string;
    activity: string;
    costCode?: string;
    section: string;
}

// ============================================
// Main Functions
// ============================================

/**
 * Fetch complete Planning Context for a project
 * This returns EXACT data from the Planning Card, not approximations
 */
export async function fetchPlanningContext(projectId: string): Promise<PlanningContext | null> {
    // Fetch project
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
    });

    if (!project) {
        console.warn(`[planning-context] Project not found: ${projectId}`);
        return null;
    }

    // Fetch project details
    const details = await db.query.projectDetails.findFirst({
        where: eq(projectDetails.projectId, projectId),
    });

    // Fetch objectives
    const objectives = await db.query.projectObjectives.findFirst({
        where: eq(projectObjectives.projectId, projectId),
    });

    // Fetch stages (ordered by stage number)
    const stagesData = await db.select()
        .from(projectStages)
        .where(eq(projectStages.projectId, projectId))
        .orderBy(projectStages.stageNumber);

    // Fetch risks (ordered)
    const risksData = await db.select()
        .from(risks)
        .where(eq(risks.projectId, projectId))
        .orderBy(risks.order);

    // Fetch stakeholders (ordered)
    const stakeholdersData = await db.select()
        .from(stakeholders)
        .where(eq(stakeholders.projectId, projectId))
        .orderBy(stakeholders.order);

    // Fetch disciplines (ordered)
    const disciplinesData = await db.select()
        .from(consultantDisciplines)
        .where(eq(consultantDisciplines.projectId, projectId))
        .orderBy(consultantDisciplines.order);

    // Fetch trades (ordered)
    const tradesData = await db.select()
        .from(contractorTrades)
        .where(eq(contractorTrades.projectId, projectId))
        .orderBy(contractorTrades.order);

    return {
        projectId,
        projectCode: project.code ?? undefined,
        details: {
            projectName: details?.projectName ?? project.name,
            address: details?.address ?? '',
            legalAddress: details?.legalAddress ?? undefined,
            zoning: details?.zoning ?? undefined,
            jurisdiction: details?.jurisdiction ?? undefined,
            lotArea: details?.lotArea ?? undefined,
            numberOfStories: details?.numberOfStories ?? undefined,
            buildingClass: details?.buildingClass ?? undefined,
        },
        objectives: {
            id: objectives?.id ?? '',
            functional: objectives?.functional ?? undefined,
            quality: objectives?.quality ?? undefined,
            budget: objectives?.budget ?? undefined,
            program: objectives?.program ?? undefined,
        },
        stages: stagesData.map(s => ({
            id: s.id,
            stageNumber: s.stageNumber,
            stageName: s.stageName,
            startDate: s.startDate ?? undefined,
            endDate: s.endDate ?? undefined,
            duration: s.duration ?? undefined,
            status: (s.status ?? 'not_started') as 'not_started' | 'in_progress' | 'completed',
        })),
        risks: risksData.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description ?? undefined,
            likelihood: (r.likelihood ?? undefined) as 'low' | 'medium' | 'high' | undefined,
            impact: (r.impact ?? undefined) as 'low' | 'medium' | 'high' | undefined,
            mitigation: r.mitigation ?? undefined,
            status: (r.status ?? 'identified') as 'identified' | 'mitigated' | 'closed',
        })),
        stakeholders: stakeholdersData.map(s => ({
            id: s.id,
            name: s.name,
            role: s.role ?? undefined,
            organization: s.organization ?? undefined,
            email: s.email ?? undefined,
            phone: s.phone ?? undefined,
        })),
        disciplines: disciplinesData.map(d => ({
            id: d.id,
            name: d.disciplineName,
            isEnabled: d.isEnabled ?? false,
            briefServices: d.briefServices ?? undefined,
            briefFee: d.briefFee ?? undefined,
            briefProgram: d.briefProgram ?? undefined,
        })),
        trades: tradesData.map(t => ({
            id: t.id,
            name: t.tradeName,
            isEnabled: t.isEnabled ?? false,
            scopeWorks: t.scopeWorks ?? undefined,
            scopePrice: t.scopePrice ?? undefined,
            scopeProgram: t.scopeProgram ?? undefined,
        })),
    };
}

/**
 * Fetch transmittal for a specific discipline
 * Returns null if no transmittal exists
 */
export async function fetchTransmittalForDiscipline(
    projectId: string,
    disciplineId: string
): Promise<TransmittalContext | null> {
    console.log('[fetchTransmittalForDiscipline] Looking up transmittal for projectId:', projectId, 'disciplineId:', disciplineId);

    // Find transmittal for this discipline
    const transmittal = await db.query.transmittals.findFirst({
        where: and(
            eq(transmittals.projectId, projectId),
            eq(transmittals.disciplineId, disciplineId)
        ),
    });

    if (!transmittal) {
        console.log('[fetchTransmittalForDiscipline] No transmittal found');
        return null;
    }

    console.log('[fetchTransmittalForDiscipline] Found transmittal:', transmittal.id, transmittal.name);

    // First, check how many transmittal items exist (without joins)
    const rawItems = await db.select()
        .from(transmittalItems)
        .where(eq(transmittalItems.transmittalId, transmittal.id));
    console.log('[fetchTransmittalForDiscipline] Raw transmittal items count:', rawItems.length);

    // Fetch transmittal items with document and version info
    const items = await db.select({
        itemId: transmittalItems.id,
        versionId: transmittalItems.versionId,
        documentId: documents.id,
        versionNumber: versions.versionNumber,
        fileAssetId: versions.fileAssetId,
    })
        .from(transmittalItems)
        .innerJoin(versions, eq(transmittalItems.versionId, versions.id))
        .innerJoin(documents, eq(versions.documentId, documents.id))
        .where(eq(transmittalItems.transmittalId, transmittal.id));

    console.log('[fetchTransmittalForDiscipline] Joined items count:', items.length);

    // Fetch file assets and categories for each item
    const documentsWithDetails = await Promise.all(
        items.map(async (item) => {
            const fileAsset = await db.query.fileAssets.findFirst({
                where: eq(fileAssets.id, item.fileAssetId),
            });

            const doc = await db.query.documents.findFirst({
                where: eq(documents.id, item.documentId),
            });

            let categoryName = 'Uncategorized';
            let categoryColor = '#858585'; // Default gray
            if (doc?.categoryId) {
                const category = await db.query.categories.findFirst({
                    where: eq(categories.id, doc.categoryId),
                });
                categoryName = category?.name ?? 'Uncategorized';
                // Try to get color from constants by ID first, then by name
                const constantCategoryById = getCategoryById(doc.categoryId);
                const constantCategoryByName = getCategoryByName(categoryName);
                categoryColor = constantCategoryById?.color ?? constantCategoryByName?.color ?? '#858585';
            }

            // Fetch subcategory if exists
            let subcategoryName: string | undefined;
            if (doc?.subcategoryId) {
                const subcategory = await db.query.subcategories.findFirst({
                    where: eq(subcategories.id, doc.subcategoryId),
                });
                subcategoryName = subcategory?.name;
            }

            return {
                id: item.documentId,
                name: fileAsset?.originalName ?? 'Unknown',
                version: `Rev ${item.versionNumber}`,
                category: categoryName,
                categoryColor,
                subcategory: subcategoryName,
                subcategoryColor: categoryColor, // Uses parent category's color
            };
        })
    );

    return {
        id: transmittal.id,
        name: transmittal.name,
        disciplineId: transmittal.disciplineId ?? undefined,
        status: (transmittal.status ?? 'DRAFT') as 'DRAFT' | 'ISSUED',
        documents: documentsWithDetails,
    };
}

/**
 * Fetch transmittal for a specific trade
 * Returns null if no transmittal exists
 */
export async function fetchTransmittalForTrade(
    projectId: string,
    tradeId: string
): Promise<TransmittalContext | null> {
    // Find transmittal for this trade
    const transmittal = await db.query.transmittals.findFirst({
        where: and(
            eq(transmittals.projectId, projectId),
            eq(transmittals.tradeId, tradeId)
        ),
    });

    if (!transmittal) {
        return null;
    }

    // Fetch transmittal items with document and version info
    const items = await db.select({
        itemId: transmittalItems.id,
        versionId: transmittalItems.versionId,
        documentId: documents.id,
        versionNumber: versions.versionNumber,
        fileAssetId: versions.fileAssetId,
    })
        .from(transmittalItems)
        .innerJoin(versions, eq(transmittalItems.versionId, versions.id))
        .innerJoin(documents, eq(versions.documentId, documents.id))
        .where(eq(transmittalItems.transmittalId, transmittal.id));

    // Fetch file assets and categories for each item
    const documentsWithDetails = await Promise.all(
        items.map(async (item) => {
            const fileAsset = await db.query.fileAssets.findFirst({
                where: eq(fileAssets.id, item.fileAssetId),
            });

            const doc = await db.query.documents.findFirst({
                where: eq(documents.id, item.documentId),
            });

            let categoryName = 'Uncategorized';
            let categoryColor = '#858585'; // Default gray
            if (doc?.categoryId) {
                const category = await db.query.categories.findFirst({
                    where: eq(categories.id, doc.categoryId),
                });
                categoryName = category?.name ?? 'Uncategorized';
                // Try to get color from constants by ID first, then by name
                const constantCategoryById = getCategoryById(doc.categoryId);
                const constantCategoryByName = getCategoryByName(categoryName);
                categoryColor = constantCategoryById?.color ?? constantCategoryByName?.color ?? '#858585';
            }

            // Fetch subcategory if exists
            let subcategoryName: string | undefined;
            if (doc?.subcategoryId) {
                const subcategory = await db.query.subcategories.findFirst({
                    where: eq(subcategories.id, doc.subcategoryId),
                });
                subcategoryName = subcategory?.name;
            }

            return {
                id: item.documentId,
                name: fileAsset?.originalName ?? 'Unknown',
                version: `Rev ${item.versionNumber}`,
                category: categoryName,
                categoryColor,
                subcategory: subcategoryName,
                subcategoryColor: categoryColor, // Uses parent category's color
            };
        })
    );

    return {
        id: transmittal.id,
        name: transmittal.name,
        tradeId: transmittal.tradeId ?? undefined,
        status: (transmittal.status ?? 'DRAFT') as 'DRAFT' | 'ISSUED',
        documents: documentsWithDetails,
    };
}

/**
 * Lookup discipline by name (case-insensitive)
 */
export async function findDisciplineByName(
    projectId: string,
    disciplineName: string
): Promise<DisciplineContext | null> {
    const discipline = await db.select()
        .from(consultantDisciplines)
        .where(eq(consultantDisciplines.projectId, projectId))
        .then(disciplines =>
            disciplines.find(d =>
                d.disciplineName.toLowerCase() === disciplineName.toLowerCase()
            )
        );

    if (!discipline) {
        return null;
    }

    return {
        id: discipline.id,
        name: discipline.disciplineName,
        isEnabled: discipline.isEnabled ?? false,
        briefServices: discipline.briefServices ?? undefined,
        briefFee: discipline.briefFee ?? undefined,
        briefProgram: discipline.briefProgram ?? undefined,
    };
}

/**
 * Lookup trade by name (case-insensitive)
 */
export async function findTradeByName(
    projectId: string,
    tradeName: string
): Promise<TradeContext | null> {
    const trade = await db.select()
        .from(contractorTrades)
        .where(eq(contractorTrades.projectId, projectId))
        .then(trades =>
            trades.find(t =>
                t.tradeName.toLowerCase() === tradeName.toLowerCase()
            )
        );

    if (!trade) {
        return null;
    }

    return {
        id: trade.id,
        name: trade.tradeName,
        isEnabled: trade.isEnabled ?? false,
        scopeWorks: trade.scopeWorks ?? undefined,
        scopePrice: trade.scopePrice ?? undefined,
        scopeProgram: trade.scopeProgram ?? undefined,
    };
}

// ============================================
// Fee/Price Structure Functions
// ============================================

/**
 * Fetch fee structure items for a discipline
 */
export async function fetchDisciplineFeeItems(disciplineId: string): Promise<FeeItemContext[]> {
    const items = await db.select()
        .from(disciplineFeeItems)
        .where(eq(disciplineFeeItems.disciplineId, disciplineId))
        .orderBy(asc(disciplineFeeItems.sortOrder));

    return items.map(item => ({
        id: item.id,
        description: item.description,
        sortOrder: item.sortOrder,
    }));
}

/**
 * Fetch price structure items for a trade
 */
export async function fetchTradePriceItems(tradeId: string): Promise<PriceItemContext[]> {
    const items = await db.select()
        .from(tradePriceItems)
        .where(eq(tradePriceItems.tradeId, tradeId))
        .orderBy(asc(tradePriceItems.sortOrder));

    return items.map(item => ({
        id: item.id,
        description: item.description,
        sortOrder: item.sortOrder,
    }));
}

/**
 * Format fee items as markdown table for tender request
 */
export function formatFeeItemsAsMarkdown(items: FeeItemContext[], disciplineName: string): string {
    if (items.length === 0) {
        return `## Fee Structure

No fee structure items defined for ${disciplineName}.

Please add fee structure items to specify the fee breakdown required from tenderers.`;
    }

    const tableRows = items.map((item, index) =>
        `| ${index + 1} | ${item.description} | $ __________ |`
    );

    return `## Fee Structure

The following fee breakdown is required from tenderers for ${disciplineName}:

| # | Description | Amount (AUD) |
|---|-------------|--------------|
${tableRows.join('\n')}

**Instructions for Tenderers:**
- Complete all fee items in the table above
- All amounts should be in AUD excluding GST
- Provide a breakdown of fees for each line item

*Total fee items: ${items.length}*`;
}

/**
 * Format price items as markdown table for tender request
 */
export function formatPriceItemsAsMarkdown(items: PriceItemContext[], tradeName: string): string {
    if (items.length === 0) {
        return `## Price Structure

No price structure items defined for ${tradeName}.

Please add price structure items to specify the price breakdown required from tenderers.`;
    }

    const tableRows = items.map((item, index) =>
        `| ${index + 1} | ${item.description} | $ __________ |`
    );

    return `## Price Structure

The following price breakdown is required from tenderers for ${tradeName}:

| # | Description | Amount (AUD) |
|---|-------------|--------------|
${tableRows.join('\n')}

**Instructions for Tenderers:**
- Complete all price items in the table above
- All amounts should be in AUD excluding GST
- Provide a breakdown of prices for each line item

*Total price items: ${items.length}*`;
}

// ============================================
// Cost Plan Functions
// ============================================

/**
 * Fetch cost lines for a specific discipline
 */
export async function fetchCostLinesByDiscipline(disciplineId: string): Promise<CostLineContext[]> {
    const lines = await db.select()
        .from(costLines)
        .where(and(
            eq(costLines.disciplineId, disciplineId),
            isNull(costLines.deletedAt)
        ))
        .orderBy(asc(costLines.sortOrder));

    return lines.map(line => ({
        id: line.id,
        activity: line.activity,
        costCode: line.costCode ?? undefined,
        section: line.section,
    }));
}

/**
 * Format cost lines as markdown table for tender request
 */
export function formatCostLinesAsMarkdown(lines: CostLineContext[], disciplineName: string): string {
    if (lines.length === 0) {
        return `## Consultant Fee

No cost plan items defined for ${disciplineName}.

Please add cost plan items for this discipline to specify the fee breakdown required from tenderers.`;
    }

    const tableRows = lines.map((line, index) =>
        `| ${index + 1} | ${line.activity} | $ __________ |`
    );

    return `## Consultant Fee

The following fee breakdown is required from tenderers for ${disciplineName}:

| # | Description | Amount (AUD) |
|---|-------------|--------------|
${tableRows.join('\n')}

**Instructions for Tenderers:**
- Complete all fee items in the table above
- All amounts should be in AUD excluding GST
- Provide a breakdown of fees for each line item

*Total fee items: ${lines.length}*`;
}

// ============================================
// Format Functions
// ============================================

/**
 * Format planning context for LLM prompt
 * Returns a structured string representation
 */
export function formatPlanningContextForPrompt(context: PlanningContext): string {
    const sections: string[] = [];

    // Project Details
    sections.push(`## Project Details
- **Project Name**: ${context.details.projectName}
- **Address**: ${context.details.address}
${context.details.buildingClass ? `- **Building Class**: ${context.details.buildingClass}` : ''}
${context.details.numberOfStories ? `- **Stories**: ${context.details.numberOfStories}` : ''}
${context.details.jurisdiction ? `- **Jurisdiction**: ${context.details.jurisdiction}` : ''}
${context.details.zoning ? `- **Zoning**: ${context.details.zoning}` : ''}`);

    // Objectives
    if (context.objectives) {
        sections.push(`## Project Objectives
${context.objectives.functional ? `- **Functional**: ${context.objectives.functional}` : ''}
${context.objectives.quality ? `- **Quality**: ${context.objectives.quality}` : ''}
${context.objectives.budget ? `- **Budget**: ${context.objectives.budget}` : ''}
${context.objectives.program ? `- **Program**: ${context.objectives.program}` : ''}`);
    }

    // Stakeholders
    if (context.stakeholders.length > 0) {
        sections.push(`## Key Stakeholders
${context.stakeholders.map(s =>
            `- **${s.name}** (${s.role ?? 'Role not specified'})${s.organization ? ` - ${s.organization}` : ''}`
        ).join('\n')}`);
    }

    // Risks
    if (context.risks.length > 0) {
        sections.push(`## Project Risks
${context.risks.map(r =>
            `- **${r.title}**: ${r.description ?? 'No description'}
  - Likelihood: ${r.likelihood ?? 'Unknown'}, Impact: ${r.impact ?? 'Unknown'}
  ${r.mitigation ? `- Mitigation: ${r.mitigation}` : ''}`
        ).join('\n')}`);
    }

    // Active Disciplines
    const activeDisciplines = context.disciplines.filter(d => d.isEnabled);
    if (activeDisciplines.length > 0) {
        sections.push(`## Active Disciplines
${activeDisciplines.map(d => `- ${d.name}`).join('\n')}`);
    }

    return sections.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Format transmittal as markdown table for appendix
 */
export function formatTransmittalAsMarkdown(transmittal: TransmittalContext): string {
    if (transmittal.documents.length === 0) {
        return `## Transmittal

No documents included in this transmittal.`;
    }

    const tableRows = transmittal.documents.map(doc =>
        `| ${doc.name} | ${doc.version} | ${doc.category} |`
    );

    return `## Transmittal

The following documents are included in this tender package:

| Doc Name | Version | Category |
|----------|---------|----------|
${tableRows.join('\n')}

*Total: ${transmittal.documents.length} documents*`;
}

// ============================================
// T098b: Document Set RAG Filtering
// ============================================

/**
 * Fetch document set IDs for a discipline
 * Returns the document set associated with a discipline for RAG retrieval
 * Returns empty array if no document set exists
 */
export async function fetchDocumentSetForDiscipline(
    projectId: string,
    disciplineId: string
): Promise<string[]> {
    // Import RAG DB and schema
    const { ragDb } = await import('../db/rag-client');
    const { documentSets } = await import('../db/rag-schema');
    const { and, eq } = await import('drizzle-orm');

    try {
        // Fetch discipline to get name
        const discipline = await db.query.consultantDisciplines.findFirst({
            where: eq(consultantDisciplines.id, disciplineId),
        });

        if (!discipline) {
            console.warn(`[planning-context] Discipline not found: ${disciplineId}`);
            return [];
        }

        // Find document set for this discipline
        // Document sets are linked by discipline name (discipline field)
        const documentSet = await ragDb.query.documentSets.findFirst({
            where: and(
                eq(documentSets.projectId, projectId),
                eq(documentSets.discipline, discipline.disciplineName)
            ),
        });

        if (!documentSet) {
            console.log(`[planning-context] No document set found for discipline: ${discipline.disciplineName}`);
            return [];
        }

        return [documentSet.id];
    } catch (error) {
        console.error('[planning-context] Error fetching document set for discipline:', error);
        return [];
    }
}
