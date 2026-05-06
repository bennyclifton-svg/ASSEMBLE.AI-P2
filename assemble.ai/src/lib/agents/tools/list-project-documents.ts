/**
 * list_project_documents - count and optionally list the project's document repository.
 */

import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    categories,
    consultantDisciplines,
    contractorTrades,
    documents,
    fileAssets,
    subcategories,
    versions,
} from '@/lib/db/pg-schema';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import {
    asObject,
    optionalBoolean,
    optionalNonNegativeInteger,
    optionalString,
} from './_write-helpers';
import { documentTitleSearchCondition } from './document-search';

interface ListProjectDocumentsInput {
    categoryId?: string;
    subcategoryId?: string;
    categoryName?: string;
    subcategoryName?: string;
    disciplineOrTrade?: string;
    drawingNumber?: string;
    documentName?: string;
    aiIngestionStatus?: AiIngestionStatusFilter;
    includeDocuments?: boolean;
    limit?: number;
}

type AiIngestionStatusFilter = 'synced' | 'pending' | 'processing' | 'failed' | 'not_synced';

interface AiDocumentStatus {
    status: AiIngestionStatusFilter | null;
    documentSetIds: string[];
    chunksCreated: number;
    errorMessage: string | null;
    syncedAt: string | null;
}

interface ListProjectDocumentsOutput {
    totalCount: number;
    countScope: 'uploaded_documents' | 'ai_ingestion_status';
    aiStatusAvailable: boolean;
    aiIngestionCounts: {
        synced: number;
        pending: number;
        processing: number;
        failed: number;
        notSynced: number;
    } | null;
    filters: {
        categoryId: string | null;
        subcategoryId: string | null;
        categoryName: string | null;
        subcategoryName: string | null;
        disciplineOrTrade: string | null;
        drawingNumber: string | null;
        documentName: string | null;
        aiIngestionStatus: AiIngestionStatusFilter | null;
    };
    documentsIncluded: boolean;
    documents: Array<{
        id: string;
        name: string | null;
        drawingNumber: string | null;
        drawingRevision: string | null;
        categoryName: string | null;
        subcategoryName: string | null;
        versionNumber: number | null;
        updatedAt: string | null;
        aiIngestionStatus: AiIngestionStatusFilter | null;
        aiChunksCreated: number;
        aiSyncedAt: string | null;
        aiDocumentSetIds: string[];
    }>;
}

const TOOL = 'list_project_documents';
const DEFAULT_LIMIT = 20;
const HARD_LIMIT = 500;
const AI_INGESTION_STATUSES = ['synced', 'pending', 'processing', 'failed', 'not_synced'] as const;

const definition: AgentToolDefinition<ListProjectDocumentsInput, ListProjectDocumentsOutput> = {
    spec: {
        name: TOOL,
        description:
            'Count, browse, or list the project document repository. Uploaded documents are files in the document repo. Ingested documents are only those synced to AI/RAG knowledge and searchable by search_rag; for "ingested documents", set aiIngestionStatus="synced". Use this for questions like "how many documents are in the document repo?", "what documents have been ingested?", "list the latest uploaded documents", "find drawing CC-20", "find section drawings", or "how many documents are in this category". Default behavior returns only the count.',
        inputSchema: {
            type: 'object',
            properties: {
                categoryId: {
                    type: 'string',
                    description: 'Optional document category id filter.',
                },
                subcategoryId: {
                    type: 'string',
                    description: 'Optional document subcategory, consultant discipline, or contractor trade id filter.',
                },
                categoryName: {
                    type: 'string',
                    description: 'Optional case-insensitive category name contains filter.',
                },
                subcategoryName: {
                    type: 'string',
                    description:
                        'Optional case-insensitive subcategory, consultant discipline, or contractor trade name contains filter.',
                },
                disciplineOrTrade: {
                    type: 'string',
                    description:
                        'Alias for subcategoryName. Use for requests like "all mechanical documents".',
                },
                drawingNumber: {
                    type: 'string',
                    description:
                        'Optional drawing number filter. Use for requests like "find drawing CC-20" or "look up drawing number A-101".',
                },
                documentName: {
                    type: 'string',
                    description:
                        'Optional document or drawing title/name contains filter. Use for requests like "find section drawings", "list basement floor plan drawings", or "find documents about stairs". Matches extracted drawing names, drawing numbers combined with titles, and original filenames.',
                },
                aiIngestionStatus: {
                    type: 'string',
                    enum: AI_INGESTION_STATUSES,
                    description:
                        'Optional AI/RAG ingestion filter. Use "synced" for documents fully ingested into AI knowledge and searchable by search_rag. Use "not_synced" for uploaded documents not yet in AI knowledge.',
                },
                includeDocuments: {
                    type: 'boolean',
                    description:
                        'Set true when the user asks to list or browse document names. For count-only questions, leave false.',
                },
                limit: {
                    type: 'integer',
                    minimum: 0,
                    maximum: HARD_LIMIT,
                    description: `Maximum number of document rows to include when includeDocuments is true. Default ${DEFAULT_LIMIT}.`,
                },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListProjectDocumentsInput {
        const obj = input === undefined ? {} : asObject(input, TOOL);
        const out: ListProjectDocumentsInput = {};

        const categoryId = optionalString(obj, 'categoryId', TOOL);
        if (categoryId) out.categoryId = categoryId;

        const subcategoryId = optionalString(obj, 'subcategoryId', TOOL);
        if (subcategoryId) out.subcategoryId = subcategoryId;

        const categoryName = optionalString(obj, 'categoryName', TOOL);
        if (categoryName) out.categoryName = categoryName;

        const subcategoryName = optionalString(obj, 'subcategoryName', TOOL);
        if (subcategoryName) out.subcategoryName = subcategoryName;

        const disciplineOrTrade = optionalString(obj, 'disciplineOrTrade', TOOL);
        if (disciplineOrTrade) out.disciplineOrTrade = disciplineOrTrade;

        const drawingNumber = optionalString(obj, 'drawingNumber', TOOL);
        if (drawingNumber) out.drawingNumber = drawingNumber;

        const documentName = optionalString(obj, 'documentName', TOOL);
        if (documentName) out.documentName = documentName;

        const aiIngestionStatus =
            optionalString(obj, 'aiIngestionStatus', TOOL) ??
            optionalString(obj, 'ingestionStatus', TOOL) ??
            optionalString(obj, 'ragStatus', TOOL);
        if (aiIngestionStatus) {
            out.aiIngestionStatus = normaliseAiIngestionStatus(aiIngestionStatus);
        }

        const includeDocuments = optionalBoolean(obj, 'includeDocuments', TOOL);
        if (includeDocuments !== undefined) out.includeDocuments = includeDocuments;

        const limit = optionalNonNegativeInteger(obj, 'limit', TOOL);
        if (limit !== undefined) out.limit = Math.min(HARD_LIMIT, limit);

        return out;
    },
    async execute(ctx: ToolContext, input: ListProjectDocumentsInput): Promise<ListProjectDocumentsOutput> {
        await assertProjectOrg(ctx);

        const conditions = [eq(documents.projectId, ctx.projectId)];
        if (input.categoryId) conditions.push(eq(documents.categoryId, input.categoryId));
        if (input.subcategoryId) conditions.push(eq(documents.subcategoryId, input.subcategoryId));
        if (input.categoryName) conditions.push(ilike(categories.name, `%${input.categoryName}%`));

        const subcategoryName = input.subcategoryName ?? input.disciplineOrTrade;
        if (subcategoryName) {
            conditions.push(
                sql`COALESCE(${subcategories.name}, ${consultantDisciplines.disciplineName}, ${contractorTrades.tradeName}) ILIKE ${`%${subcategoryName}%`}`
            );
        }
        if (input.drawingNumber) {
            conditions.push(
                sql`(
                    ${fileAssets.drawingNumber} ILIKE ${input.drawingNumber}
                    OR regexp_replace(lower(coalesce(${fileAssets.drawingNumber}, '')), '[^a-z0-9]', '', 'g') =
                        ${normaliseDrawingNumber(input.drawingNumber)}
                )`
            );
        }
        if (input.documentName) conditions.push(documentTitleSearchCondition(input.documentName));

        let aiStatusAvailable = true;
        let aiStatusMap = new Map<string, AiDocumentStatus>();
        let aiIngestionCounts: ListProjectDocumentsOutput['aiIngestionCounts'] = null;
        const includeDocuments = input.includeDocuments ?? false;

        if (input.aiIngestionStatus) {
            const candidateRows = await db
                .select({ id: documents.id })
                .from(documents)
                .leftJoin(versions, eq(documents.latestVersionId, versions.id))
                .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
                .leftJoin(categories, eq(documents.categoryId, categories.id))
                .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
                .leftJoin(
                    consultantDisciplines,
                    eq(documents.subcategoryId, consultantDisciplines.id)
                )
                .leftJoin(contractorTrades, eq(documents.subcategoryId, contractorTrades.id))
                .where(and(...conditions));

            const candidateIds = candidateRows.map((row) => row.id);
            const statusResult = await fetchAiDocumentStatuses(candidateIds);
            aiStatusAvailable = statusResult.available;
            aiStatusMap = statusResult.statuses;
            aiIngestionCounts = countAiStatuses(candidateIds, aiStatusMap);

            const matchingIds = candidateIds.filter((id) =>
                aiStatusMatches(aiStatusMap.get(id)?.status ?? null, input.aiIngestionStatus!)
            );

            if (matchingIds.length === 0) {
                return emptyOutput(input, includeDocuments, aiStatusAvailable, aiIngestionCounts);
            }

            conditions.push(inArray(documents.id, matchingIds));
        }

        const [countRow] = await db
            .select({ count: sql<number>`count(*)` })
            .from(documents)
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .leftJoin(
                consultantDisciplines,
                eq(documents.subcategoryId, consultantDisciplines.id)
            )
            .leftJoin(contractorTrades, eq(documents.subcategoryId, contractorTrades.id))
            .where(and(...conditions));

        const totalCount = Number(countRow?.count ?? 0);
        let documentRows: ListProjectDocumentsOutput['documents'] = [];

        if (includeDocuments) {
            const limit = input.limit ?? DEFAULT_LIMIT;
            if (limit > 0) {
                const rows = await db
                    .select({
                        id: documents.id,
                        originalName: fileAssets.originalName,
                        drawingNumber: fileAssets.drawingNumber,
                        drawingName: fileAssets.drawingName,
                        drawingRevision: fileAssets.drawingRevision,
                        categoryName: categories.name,
                        subcategoryName: sql<string | null>`COALESCE(${subcategories.name}, ${consultantDisciplines.disciplineName}, ${contractorTrades.tradeName})`,
                        versionNumber: versions.versionNumber,
                        updatedAt: documents.updatedAt,
                    })
                    .from(documents)
                    .leftJoin(versions, eq(documents.latestVersionId, versions.id))
                    .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
                    .leftJoin(categories, eq(documents.categoryId, categories.id))
                    .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
                    .leftJoin(
                        consultantDisciplines,
                        eq(documents.subcategoryId, consultantDisciplines.id)
                    )
                    .leftJoin(contractorTrades, eq(documents.subcategoryId, contractorTrades.id))
                    .where(and(...conditions))
                    .orderBy(desc(documents.updatedAt))
                    .limit(limit);

                if (!input.aiIngestionStatus) {
                    const statusResult = await fetchAiDocumentStatuses(rows.map((row) => row.id));
                    aiStatusAvailable = statusResult.available;
                    aiStatusMap = statusResult.statuses;
                }

                documentRows = rows.map((row) => ({
                    id: row.id,
                    name: row.drawingName ?? row.originalName ?? null,
                    drawingNumber: row.drawingNumber ?? null,
                    drawingRevision: row.drawingRevision ?? null,
                    categoryName: row.categoryName ?? null,
                    subcategoryName: row.subcategoryName ?? null,
                    versionNumber: row.versionNumber ?? null,
                    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
                    aiIngestionStatus: aiStatusMap.get(row.id)?.status ?? null,
                    aiChunksCreated: aiStatusMap.get(row.id)?.chunksCreated ?? 0,
                    aiSyncedAt: aiStatusMap.get(row.id)?.syncedAt ?? null,
                    aiDocumentSetIds: aiStatusMap.get(row.id)?.documentSetIds ?? [],
                }));
            }
        }

        return {
            totalCount,
            countScope: input.aiIngestionStatus ? 'ai_ingestion_status' : 'uploaded_documents',
            aiStatusAvailable,
            aiIngestionCounts,
            filters: {
                categoryId: input.categoryId ?? null,
                subcategoryId: input.subcategoryId ?? null,
                categoryName: input.categoryName ?? null,
                subcategoryName: input.subcategoryName ?? null,
                disciplineOrTrade: input.disciplineOrTrade ?? null,
                drawingNumber: input.drawingNumber ?? null,
                documentName: input.documentName ?? null,
                aiIngestionStatus: input.aiIngestionStatus ?? null,
            },
            documentsIncluded: includeDocuments,
            documents: documentRows,
        };
    },
};

registerTool(definition);

function normaliseAiIngestionStatus(value: string): AiIngestionStatusFilter {
    const normalised = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (normalised === 'ingested' || normalised === 'indexed' || normalised === 'searchable') {
        return 'synced';
    }
    if (normalised === 'not_ingested' || normalised === 'not_synced' || normalised === 'not_indexed') {
        return 'not_synced';
    }
    if ((AI_INGESTION_STATUSES as readonly string[]).includes(normalised)) {
        return normalised as AiIngestionStatusFilter;
    }
    throw new Error(
        `${TOOL}: "aiIngestionStatus" must be one of ${AI_INGESTION_STATUSES.join(', ')}`
    );
}

async function fetchAiDocumentStatuses(documentIds: string[]): Promise<{
    available: boolean;
    statuses: Map<string, AiDocumentStatus>;
}> {
    const statuses = new Map<string, AiDocumentStatus>();
    if (documentIds.length === 0) return { available: true, statuses };

    try {
        const [{ ragDb }, { documentSetMembers }] = await Promise.all([
            import('@/lib/db/rag-client'),
            import('@/lib/db/rag-schema'),
        ]);
        const rows = await ragDb
            .select({
                documentId: documentSetMembers.documentId,
                documentSetId: documentSetMembers.documentSetId,
                syncStatus: documentSetMembers.syncStatus,
                chunksCreated: documentSetMembers.chunksCreated,
                errorMessage: documentSetMembers.errorMessage,
                syncedAt: documentSetMembers.syncedAt,
            })
            .from(documentSetMembers)
            .where(inArray(documentSetMembers.documentId, documentIds));

        for (const row of rows) {
            const existing = statuses.get(row.documentId) ?? {
                status: null,
                documentSetIds: [],
                chunksCreated: 0,
                errorMessage: null,
                syncedAt: null,
            };
            if (!existing.documentSetIds.includes(row.documentSetId)) {
                existing.documentSetIds.push(row.documentSetId);
            }
            existing.status = preferredAiStatus(existing.status, row.syncStatus);
            existing.chunksCreated += row.chunksCreated ?? 0;
            if (row.syncStatus === 'failed' && row.errorMessage) {
                existing.errorMessage = row.errorMessage;
            }
            if (row.syncedAt) {
                const nextSyncedAt = row.syncedAt.toISOString();
                if (!existing.syncedAt || nextSyncedAt > existing.syncedAt) {
                    existing.syncedAt = nextSyncedAt;
                }
            }
            statuses.set(row.documentId, existing);
        }

        return { available: true, statuses };
    } catch {
        return { available: false, statuses };
    }
}

function preferredAiStatus(
    current: AiIngestionStatusFilter | null,
    next: AiIngestionStatusFilter | null
): AiIngestionStatusFilter | null {
    if (!next) return current;
    if (!current) return next;
    const rank: Record<AiIngestionStatusFilter, number> = {
        synced: 5,
        processing: 4,
        pending: 3,
        failed: 2,
        not_synced: 1,
    };
    return rank[next] > rank[current] ? next : current;
}

function aiStatusMatches(
    status: AiIngestionStatusFilter | null,
    filter: AiIngestionStatusFilter
): boolean {
    if (filter === 'not_synced') return status === null || status === 'not_synced';
    return status === filter;
}

function countAiStatuses(
    documentIds: string[],
    statusMap: Map<string, AiDocumentStatus>
): NonNullable<ListProjectDocumentsOutput['aiIngestionCounts']> {
    const counts = {
        synced: 0,
        pending: 0,
        processing: 0,
        failed: 0,
        notSynced: 0,
    };
    for (const id of documentIds) {
        const status = statusMap.get(id)?.status ?? null;
        if (status === 'synced') counts.synced++;
        else if (status === 'pending') counts.pending++;
        else if (status === 'processing') counts.processing++;
        else if (status === 'failed') counts.failed++;
        else counts.notSynced++;
    }
    return counts;
}

function emptyOutput(
    input: ListProjectDocumentsInput,
    includeDocuments: boolean,
    aiStatusAvailable: boolean,
    aiIngestionCounts: ListProjectDocumentsOutput['aiIngestionCounts']
): ListProjectDocumentsOutput {
    return {
        totalCount: 0,
        countScope: input.aiIngestionStatus ? 'ai_ingestion_status' : 'uploaded_documents',
        aiStatusAvailable,
        aiIngestionCounts,
        filters: {
            categoryId: input.categoryId ?? null,
            subcategoryId: input.subcategoryId ?? null,
            categoryName: input.categoryName ?? null,
            subcategoryName: input.subcategoryName ?? null,
            disciplineOrTrade: input.disciplineOrTrade ?? null,
            drawingNumber: input.drawingNumber ?? null,
            documentName: input.documentName ?? null,
            aiIngestionStatus: input.aiIngestionStatus ?? null,
        },
        documentsIncluded: includeDocuments,
        documents: [],
    };
}

function normaliseDrawingNumber(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export { definition as listProjectDocumentsTool };
