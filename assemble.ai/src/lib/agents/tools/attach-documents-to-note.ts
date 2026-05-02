/**
 * attach_documents_to_note - propose attaching existing project documents to an existing note.
 */

import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    categories,
    consultantDisciplines,
    contractorTrades,
    documents,
    fileAssets,
    noteTransmittals,
    notes,
    subcategories,
    versions,
} from '@/lib/db/pg-schema';
import { proposeApproval, type ProposedDiff } from '../approvals';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import {
    asObject,
    copyToolUseId,
    optionalBoolean,
    optionalNonNegativeInteger,
    optionalString,
    optionalStringArray,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface AttachDocumentsToNoteInput extends Record<string, unknown> {
    noteId?: string;
    noteTitle?: string;
    documentIds?: string[];
    categoryId?: string;
    subcategoryId?: string;
    categoryName?: string;
    subcategoryName?: string;
    disciplineOrTrade?: string;
    allProjectDocuments?: boolean;
    limit?: number;
    _toolUseId?: string;
}

interface ResolvedNote {
    id: string;
    title: string;
    rowVersion: number;
}

interface ResolvedDocument {
    id: string;
    name: string;
    categoryName: string | null;
    subcategoryName: string | null;
}

const TOOL = 'attach_documents_to_note';
const DEFAULT_LIMIT = 200;
const HARD_LIMIT = 500;

const definition: AgentToolDefinition<AttachDocumentsToNoteInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose attaching existing project documents to an existing note. Prefer this for requests like "update the note Mech Spec Review 2 and attach all mechanical documents": pass noteTitle and disciplineOrTrade, and the tool resolves the note and matching documents before creating one approval card. Use noteId when already known. This appends attachments and keeps existing note attachments.',
        inputSchema: {
            type: 'object',
            properties: {
                noteId: {
                    type: 'string',
                    description: 'Existing note id. Use when it is already known.',
                },
                noteTitle: {
                    type: 'string',
                    description:
                        'Existing note title to resolve. Exact case-insensitive matches are preferred; ambiguous partial matches will be rejected.',
                },
                documentIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific existing project document ids to attach.',
                },
                categoryId: {
                    type: 'string',
                    description: 'Optional category id filter for documents to attach.',
                },
                subcategoryId: {
                    type: 'string',
                    description: 'Optional subcategory, consultant discipline, or contractor trade id filter.',
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
                        'Use for natural requests like "all mechanical documents". Matches discipline, trade, subcategory, category, and document names.',
                },
                allProjectDocuments: {
                    type: 'boolean',
                    description:
                        'Set true only when the user explicitly asks to attach every document in the project repository.',
                },
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_LIMIT,
                    description:
                        `Safety limit for filtered attachment requests. Default ${DEFAULT_LIMIT}; maximum ${HARD_LIMIT}. If more documents match, the tool asks for a narrower filter.`,
                },
            },
        },
    },
    mutating: true,
    validate(input: unknown): AttachDocumentsToNoteInput {
        const obj = asObject(input, TOOL);
        const out: AttachDocumentsToNoteInput = {};

        const noteId = optionalString(obj, 'noteId', TOOL);
        if (noteId) out.noteId = noteId;

        const noteTitle = optionalString(obj, 'noteTitle', TOOL);
        if (noteTitle) out.noteTitle = noteTitle;

        const documentIds = optionalStringArray(obj, 'documentIds', TOOL);
        if (documentIds !== undefined && documentIds.length > 0) out.documentIds = documentIds;

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

        const allProjectDocuments = optionalBoolean(obj, 'allProjectDocuments', TOOL);
        if (allProjectDocuments !== undefined) out.allProjectDocuments = allProjectDocuments;

        const limit = optionalNonNegativeInteger(obj, 'limit', TOOL);
        if (limit !== undefined) out.limit = Math.max(1, Math.min(HARD_LIMIT, limit));

        if (!out.noteId && !out.noteTitle) {
            throw new Error(`${TOOL}: provide noteId or noteTitle`);
        }

        const hasDocumentSource =
            (out.documentIds?.length ?? 0) > 0 ||
            Boolean(out.categoryId) ||
            Boolean(out.subcategoryId) ||
            Boolean(out.categoryName) ||
            Boolean(out.subcategoryName) ||
            Boolean(out.disciplineOrTrade) ||
            out.allProjectDocuments === true;
        if (!hasDocumentSource) {
            throw new Error(
                `${TOOL}: provide documentIds, a document filter, or allProjectDocuments=true`
            );
        }

        copyToolUseId(obj, out);
        return out;
    },
    async execute(ctx: ToolContext, input: AttachDocumentsToNoteInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const note = await resolveNote(ctx, input);
        const documentsToConsider = input.documentIds?.length
            ? await resolveExplicitDocuments(ctx.projectId, input.documentIds)
            : await resolveFilteredDocuments(ctx.projectId, input);

        if (documentsToConsider.length === 0) {
            throw new Error(`${TOOL}: no matching project documents were found`);
        }

        const existingRows = await db
            .select({ documentId: noteTransmittals.documentId })
            .from(noteTransmittals)
            .where(eq(noteTransmittals.noteId, note.id));
        const existingDocumentIds = new Set(existingRows.map((row) => row.documentId));
        const newDocuments = documentsToConsider.filter((doc) => !existingDocumentIds.has(doc.id));

        if (newDocuments.length === 0) {
            throw new Error(
                `${TOOL}: all ${documentsToConsider.length} matching document(s) are already attached to note "${note.title}"`
            );
        }

        const attachDocumentIds = newDocuments.map((doc) => doc.id);
        const proposedInput = {
            id: note.id,
            attachDocumentIds,
        };

        const diff: ProposedDiff = {
            entity: 'note',
            entityId: note.id,
            summary: `Attach documents to note - ${note.title}`,
            changes: [
                {
                    field: 'attachDocumentIds',
                    label: 'Attach documents',
                    before: 'Existing attachments retained',
                    after: formatDocumentList(newDocuments),
                },
            ],
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: input._toolUseId ?? '',
                input: proposedInput,
                proposedDiff: diff,
                expectedRowVersion: note.rowVersion ?? 1,
            })
        ).toolResult;
    },
};

async function resolveNote(ctx: ToolContext, input: AttachDocumentsToNoteInput): Promise<ResolvedNote> {
    const scope = [
        eq(notes.projectId, ctx.projectId),
        eq(notes.organizationId, ctx.organizationId),
        isNull(notes.deletedAt),
    ];

    if (input.noteId) {
        const [row] = await db
            .select({ id: notes.id, title: notes.title, rowVersion: notes.rowVersion })
            .from(notes)
            .where(and(...scope, eq(notes.id, input.noteId)))
            .limit(1);
        if (!row) throw new Error(`${TOOL}: noteId was not found in this project`);
        return { id: row.id, title: row.title, rowVersion: row.rowVersion ?? 1 };
    }

    const title = input.noteTitle ?? '';
    const exactRows = await db
        .select({ id: notes.id, title: notes.title, rowVersion: notes.rowVersion })
        .from(notes)
        .where(and(...scope, sql`lower(${notes.title}) = ${title.toLowerCase()}`))
        .orderBy(desc(notes.updatedAt))
        .limit(3);

    if (exactRows.length === 1) {
        const row = exactRows[0];
        return { id: row.id, title: row.title, rowVersion: row.rowVersion ?? 1 };
    }
    if (exactRows.length > 1) {
        throw new Error(`${TOOL}: multiple notes are titled "${title}". Use noteId to choose one.`);
    }

    const partialRows = await db
        .select({ id: notes.id, title: notes.title, rowVersion: notes.rowVersion })
        .from(notes)
        .where(and(...scope, ilike(notes.title, `%${title}%`)))
        .orderBy(desc(notes.updatedAt))
        .limit(4);

    if (partialRows.length === 1) {
        const row = partialRows[0];
        return { id: row.id, title: row.title, rowVersion: row.rowVersion ?? 1 };
    }
    if (partialRows.length > 1) {
        throw new Error(
            `${TOOL}: multiple notes matched "${title}": ${partialRows
                .map((row) => row.title)
                .join(', ')}. Use the exact note title or noteId.`
        );
    }

    throw new Error(`${TOOL}: note "${title}" was not found in this project`);
}

async function resolveExplicitDocuments(
    projectId: string,
    documentIds: string[]
): Promise<ResolvedDocument[]> {
    const ids = Array.from(new Set(documentIds.filter(Boolean)));
    const rows = await baseDocumentQuery()
        .where(and(eq(documents.projectId, projectId), inArray(documents.id, ids)));

    const byId = new Map(rows.map((row) => [row.id, toResolvedDocument(row)]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
        throw new Error(`${TOOL}: document(s) not found in this project: ${missing.join(', ')}`);
    }
    return ids.map((id) => byId.get(id)!).filter(Boolean);
}

async function resolveFilteredDocuments(
    projectId: string,
    input: AttachDocumentsToNoteInput
): Promise<ResolvedDocument[]> {
    const conditions = [eq(documents.projectId, projectId)];
    if (input.categoryId) conditions.push(eq(documents.categoryId, input.categoryId));
    if (input.subcategoryId) conditions.push(eq(documents.subcategoryId, input.subcategoryId));
    if (input.categoryName) conditions.push(ilike(categories.name, `%${input.categoryName}%`));
    if (input.subcategoryName) conditions.push(documentNameCondition(input.subcategoryName));
    if (input.disciplineOrTrade) conditions.push(documentNameCondition(input.disciplineOrTrade));

    const limit = input.limit ?? DEFAULT_LIMIT;
    const rows = await baseDocumentQuery()
        .where(and(...conditions))
        .orderBy(desc(documents.updatedAt))
        .limit(limit + 1);

    if (rows.length > limit) {
        throw new Error(
            `${TOOL}: more than ${limit} documents matched. Narrow the filter or provide explicit documentIds.`
        );
    }

    return rows.map(toResolvedDocument);
}

function baseDocumentQuery() {
    return db
        .select({
            id: documents.id,
            originalName: fileAssets.originalName,
            drawingName: fileAssets.drawingName,
            categoryName: categories.name,
            subcategoryName: sql<string | null>`COALESCE(${subcategories.name}, ${consultantDisciplines.disciplineName}, ${contractorTrades.tradeName})`,
        })
        .from(documents)
        .leftJoin(versions, eq(documents.latestVersionId, versions.id))
        .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
        .leftJoin(categories, eq(documents.categoryId, categories.id))
        .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
        .leftJoin(consultantDisciplines, eq(documents.subcategoryId, consultantDisciplines.id))
        .leftJoin(contractorTrades, eq(documents.subcategoryId, contractorTrades.id))
        .$dynamic();
}

function documentNameCondition(value: string) {
    const pattern = `%${value}%`;
    return or(
        sql`COALESCE(${subcategories.name}, ${consultantDisciplines.disciplineName}, ${contractorTrades.tradeName}) ILIKE ${pattern}`,
        ilike(categories.name, pattern),
        ilike(fileAssets.originalName, pattern),
        ilike(fileAssets.drawingName, pattern)
    )!;
}

function toResolvedDocument(row: {
    id: string;
    originalName: string | null;
    drawingName: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
}): ResolvedDocument {
    return {
        id: row.id,
        name: row.drawingName ?? row.originalName ?? row.id,
        categoryName: row.categoryName ?? null,
        subcategoryName: row.subcategoryName ?? null,
    };
}

function formatDocumentList(docs: ResolvedDocument[]): string {
    const names = docs.map((doc) => doc.name).slice(0, 20);
    const suffix = docs.length > names.length ? `, +${docs.length - names.length} more` : '';
    return `${docs.length} document${docs.length === 1 ? '' : 's'}: ${names.join(', ')}${suffix}`;
}

registerTool(definition);

export { definition as attachDocumentsToNoteTool };
