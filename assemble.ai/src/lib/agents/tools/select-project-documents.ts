/**
 * select_project_documents - update the current project workspace document selection.
 *
 * This does not mutate project data; it emits a project SSE event so the open
 * workspace can tick/untick document rows in the document repository panel.
 */

import { and, eq, ilike, inArray, sql } from 'drizzle-orm';
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
import { emitChatEvent } from '../events';
import { emitProjectEvent } from '../project-events';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import {
    asObject,
    optionalBoolean,
    optionalEnum,
    optionalString,
    optionalStringArray,
} from './_write-helpers';
import { documentTitleSearchCondition } from './document-search';

const TOOL = 'select_project_documents';
const MODES = ['replace', 'add', 'remove', 'clear'] as const;

interface SelectProjectDocumentsInput {
    mode?: 'replace' | 'add' | 'remove' | 'clear';
    documentIds?: string[];
    categoryId?: string;
    subcategoryId?: string;
    categoryName?: string;
    subcategoryName?: string;
    disciplineOrTrade?: string;
    drawingNumber?: string;
    documentName?: string;
    allProjectDocuments?: boolean;
}

interface SelectProjectDocumentsOutput {
    status: 'selection_updated';
    mode: 'replace' | 'add' | 'remove' | 'clear';
    selectedCount: number;
    documentIds: string[];
    missingDocumentIds: string[];
}

const definition: AgentToolDefinition<SelectProjectDocumentsInput, SelectProjectDocumentsOutput> = {
    spec: {
        name: TOOL,
        description:
            'Select or deselect documents in the open project document repository UI. Use this when the user asks you to select documents, select all documents, clear selected documents, or select documents by known IDs, drawing number, document/drawing title, category, subcategory, discipline, or trade. This changes only the user interface selection; it does not edit or delete documents.',
        inputSchema: {
            type: 'object',
            properties: {
                mode: {
                    type: 'string',
                    enum: [...MODES],
                    description:
                        'replace sets the selection exactly to these documents, add adds to current selection, remove removes from current selection, clear clears all selection. Defaults to replace.',
                },
                documentIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific document IDs to select or deselect.',
                },
                categoryId: {
                    type: 'string',
                    description: 'Optional category filter for selecting documents.',
                },
                subcategoryId: {
                    type: 'string',
                    description: 'Optional subcategory, consultant discipline, or contractor trade filter.',
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
                        'Alias for subcategoryName. Use for requests like "select all mechanical documents" or "select all mech documents".',
                },
                drawingNumber: {
                    type: 'string',
                    description:
                        'Optional drawing number filter. Use for requests like "select drawing CC-20" or "select drawing number A-101".',
                },
                documentName: {
                    type: 'string',
                    description:
                        'Optional document or drawing title/name contains filter. Use for requests like "select all section drawings", "select basement floor plan drawings", or "select all documents about stairs". Matches extracted drawing names, drawing numbers combined with titles, and original filenames.',
                },
                allProjectDocuments: {
                    type: 'boolean',
                    description:
                        'Set true only when the user explicitly asks to select all documents in the project repository.',
                },
            },
        },
    },
    mutating: false,
    validate(input: unknown): SelectProjectDocumentsInput {
        const obj = input === undefined ? {} : asObject(input, TOOL);
        const out: SelectProjectDocumentsInput = {};

        const mode = optionalEnum(obj, 'mode', MODES, TOOL);
        if (mode) out.mode = mode;

        const documentIds = optionalStringArray(obj, 'documentIds', TOOL);
        if (documentIds !== undefined) out.documentIds = documentIds;

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

        const allProjectDocuments = optionalBoolean(obj, 'allProjectDocuments', TOOL);
        if (allProjectDocuments !== undefined) out.allProjectDocuments = allProjectDocuments;

        const resolvedMode = out.mode ?? 'replace';
        const hasSelector =
            (out.documentIds?.length ?? 0) > 0 ||
            Boolean(out.categoryId) ||
            Boolean(out.subcategoryId) ||
            Boolean(out.categoryName) ||
            Boolean(out.subcategoryName) ||
            Boolean(out.disciplineOrTrade) ||
            Boolean(out.drawingNumber) ||
            Boolean(out.documentName) ||
            out.allProjectDocuments === true;
        if (resolvedMode !== 'clear' && !hasSelector) {
            throw new Error(
                `${TOOL}: provide documentIds, categoryId/subcategoryId/categoryName/subcategoryName/disciplineOrTrade/drawingNumber/documentName, allProjectDocuments=true, or mode="clear"`
            );
        }

        return out;
    },
    async execute(ctx: ToolContext, input: SelectProjectDocumentsInput): Promise<SelectProjectDocumentsOutput> {
        await assertProjectOrg(ctx);

        const mode = input.mode ?? 'replace';
        let selectedIds: string[] = [];
        let missingDocumentIds: string[] = [];

        if (mode !== 'clear') {
            const conditions = [eq(documents.projectId, ctx.projectId)];
            if (input.documentIds && input.documentIds.length > 0) {
                conditions.push(inArray(documents.id, input.documentIds));
            }
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

            const rows = await db
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

            selectedIds = rows.map((row) => row.id);
            if (input.documentIds && input.documentIds.length > 0) {
                const found = new Set(selectedIds);
                missingDocumentIds = input.documentIds.filter((id) => !found.has(id));
            }
        }

        emitProjectEvent(ctx.projectId, {
            type: 'document_selection_changed',
            mode,
            documentIds: selectedIds,
        });
        emitChatEvent(ctx.threadId, {
            type: 'document_selection_changed',
            projectId: ctx.projectId,
            mode,
            documentIds: selectedIds,
        });

        return {
            status: 'selection_updated',
            mode,
            selectedCount: selectedIds.length,
            documentIds: selectedIds,
            missingDocumentIds,
        };
    },
};

registerTool(definition);

function normaliseDrawingNumber(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export { definition as selectProjectDocumentsTool };
