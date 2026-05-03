/**
 * list_project_documents - count and optionally list the project's document repository.
 */

import { and, desc, eq, ilike, sql } from 'drizzle-orm';
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

interface ListProjectDocumentsInput {
    categoryId?: string;
    subcategoryId?: string;
    categoryName?: string;
    subcategoryName?: string;
    disciplineOrTrade?: string;
    drawingNumber?: string;
    documentName?: string;
    includeDocuments?: boolean;
    limit?: number;
}

interface ListProjectDocumentsOutput {
    totalCount: number;
    filters: {
        categoryId: string | null;
        subcategoryId: string | null;
        categoryName: string | null;
        subcategoryName: string | null;
        disciplineOrTrade: string | null;
        drawingNumber: string | null;
        documentName: string | null;
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
    }>;
}

const TOOL = 'list_project_documents';
const DEFAULT_LIMIT = 20;
const HARD_LIMIT = 100;

const definition: AgentToolDefinition<ListProjectDocumentsInput, ListProjectDocumentsOutput> = {
    spec: {
        name: TOOL,
        description:
            'Count, browse, or list the project document repository. Use this for questions like "how many documents are in the document repo?", "list the latest uploaded documents", "find drawing CC-20", "find section drawings", or "how many documents are in this category". Default behavior returns only the count.',
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
                        'Optional document or drawing title/name contains filter. Use for requests like "find section drawings" or "list basement floor plan drawings". Matches extracted drawing names and original filenames.',
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
        if (input.documentName) {
            const pattern = `%${input.documentName}%`;
            conditions.push(
                sql`(
                    ${fileAssets.drawingName} ILIKE ${pattern}
                    OR ${fileAssets.originalName} ILIKE ${pattern}
                )`
            );
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
        const includeDocuments = input.includeDocuments ?? false;
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

                documentRows = rows.map((row) => ({
                    id: row.id,
                    name: row.drawingName ?? row.originalName ?? null,
                    drawingNumber: row.drawingNumber ?? null,
                    drawingRevision: row.drawingRevision ?? null,
                    categoryName: row.categoryName ?? null,
                    subcategoryName: row.subcategoryName ?? null,
                    versionNumber: row.versionNumber ?? null,
                    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
                }));
            }
        }

        return {
            totalCount,
            filters: {
                categoryId: input.categoryId ?? null,
                subcategoryId: input.subcategoryId ?? null,
                categoryName: input.categoryName ?? null,
                subcategoryName: input.subcategoryName ?? null,
                disciplineOrTrade: input.disciplineOrTrade ?? null,
                drawingNumber: input.drawingNumber ?? null,
                documentName: input.documentName ?? null,
            },
            documentsIncluded: includeDocuments,
            documents: documentRows,
        };
    },
};

registerTool(definition);

function normaliseDrawingNumber(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export { definition as listProjectDocumentsTool };
