/**
 * create_note - propose a new project note.
 */

import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
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
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    asObject,
    copyToolUseId,
    createDiffChanges,
    optionalBoolean,
    optionalEnum,
    optionalIsoDate,
    optionalNonNegativeInteger,
    optionalStringArray,
    optionalString,
    requiredString,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface CreateNoteInput extends Record<string, unknown> {
    title: string;
    content?: string;
    isStarred?: boolean;
    color?: 'yellow' | 'blue' | 'green' | 'pink' | 'white';
    type?: 'rfi' | 'notice' | 'eot' | 'defect' | 'variation' | 'risk' | 'transmittal' | 'review' | 'note';
    status?: 'open' | 'closed';
    noteDate?: string;
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

interface ResolvedDocument {
    id: string;
    name: string;
    categoryName: string | null;
    subcategoryName: string | null;
}

const NOTE_COLORS = ['yellow', 'blue', 'green', 'pink', 'white'] as const;
const NOTE_TYPES = ['rfi', 'notice', 'eot', 'defect', 'variation', 'risk', 'transmittal', 'review', 'note'] as const;
const NOTE_STATUSES = ['open', 'closed'] as const;
const TOOL = 'create_note';
const DEFAULT_DOCUMENT_LIMIT = 200;
const HARD_DOCUMENT_LIMIT = 500;

function claimsDocumentAttachment(input: Pick<CreateNoteInput, 'title' | 'content'>): boolean {
    const text = `${input.title ?? ''} ${input.content ?? ''}`.toLowerCase();
    if (!text) return false;
    if (
        /\b(no|without|do not|don't|not)\b[\s\S]{0,50}\b(attach|attached|attaching|attachment|attachments)\b/.test(text)
    ) {
        return false;
    }
    const attachment = /\b(attach|attached|attaching|attachment|attachments)\b/;
    const document = /\b(documents?|drawings?|files?)\b/;
    return attachment.test(text) && document.test(text);
}

function hasDocumentFilter(input: CreateNoteInput): boolean {
    return (
        Boolean(input.categoryId) ||
        Boolean(input.subcategoryId) ||
        Boolean(input.categoryName) ||
        Boolean(input.subcategoryName) ||
        Boolean(input.disciplineOrTrade) ||
        input.allProjectDocuments === true
    );
}

const definition: AgentToolDefinition<CreateNoteInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose a new project note. Optional documentIds attaches existing project documents to the note. For new-note requests like "create a note and attach all electrical documents", pass disciplineOrTrade="Electrical" (or another category/discipline filter) and this tool resolves the matching documents before creating the approval card. For existing-note attachment requests, use attach_documents_to_note. Do not say documents are attached unless documentIds or a document filter is populated. The note is not created until the user approves the inline approval card.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                isStarred: { type: 'boolean' },
                color: { type: 'string', enum: [...NOTE_COLORS] },
                type: { type: 'string', enum: [...NOTE_TYPES] },
                status: { type: 'string', enum: [...NOTE_STATUSES] },
                noteDate: { type: 'string', description: 'YYYY-MM-DD.' },
                documentIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional existing project document IDs to attach to this note.',
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
                        'Use for natural requests like "all electrical documents". Matches discipline, trade, subcategory, category, and document names.',
                },
                allProjectDocuments: {
                    type: 'boolean',
                    description:
                        'Set true only when the user explicitly asks to attach every document in the project repository.',
                },
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_DOCUMENT_LIMIT,
                    description:
                        `Safety limit for filtered attachment requests. Default ${DEFAULT_DOCUMENT_LIMIT}; maximum ${HARD_DOCUMENT_LIMIT}.`,
                },
            },
            required: ['title'],
        },
    },
    mutating: true,
    validate(input: unknown): CreateNoteInput {
        const obj = asObject(input, TOOL);
        const out: CreateNoteInput = { title: requiredString(obj, 'title', TOOL) };
        const content = optionalString(obj, 'content', TOOL);
        if (content !== undefined) out.content = content;
        const isStarred = optionalBoolean(obj, 'isStarred', TOOL);
        if (isStarred !== undefined) out.isStarred = isStarred;
        const color = optionalEnum(obj, 'color', NOTE_COLORS, TOOL);
        if (color !== undefined) out.color = color;
        const type = optionalEnum(obj, 'type', NOTE_TYPES, TOOL);
        if (type !== undefined) out.type = type;
        const status = optionalEnum(obj, 'status', NOTE_STATUSES, TOOL);
        if (status !== undefined) out.status = status;
        const noteDate = optionalIsoDate(obj, 'noteDate', TOOL);
        if (noteDate !== undefined) out.noteDate = noteDate;
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
        const allProjectDocuments = optionalBoolean(obj, 'allProjectDocuments', TOOL);
        if (allProjectDocuments !== undefined) out.allProjectDocuments = allProjectDocuments;
        const limit = optionalNonNegativeInteger(obj, 'limit', TOOL);
        if (limit !== undefined) out.limit = Math.max(1, Math.min(HARD_DOCUMENT_LIMIT, limit));
        if (
            claimsDocumentAttachment(out) &&
            (out.documentIds?.length ?? 0) === 0 &&
            !hasDocumentFilter(out)
        ) {
            throw new Error(
                `${TOOL}: documentIds or a document filter are required when the note claims documents are attached. ` +
                    'Pass documentIds or use disciplineOrTrade/category filters.'
            );
        }
        copyToolUseId(obj, out);
        return out;
    },
    async execute(ctx: ToolContext, input: CreateNoteInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const resolvedDocuments = (input.documentIds?.length ?? 0) > 0
            ? await resolveExplicitDocuments(ctx.projectId, input.documentIds ?? [])
            : hasDocumentFilter(input)
                ? await resolveFilteredDocuments(ctx.projectId, input)
                : [];

        if ((claimsDocumentAttachment(input) || hasDocumentFilter(input)) && resolvedDocuments.length === 0) {
            throw new Error(`${TOOL}: no matching project documents were found to attach`);
        }
        const documentNames = new Map(resolvedDocuments.map((doc) => [doc.id, doc.name]));
        const documentIds = resolvedDocuments.map((doc) => doc.id);
        const proposedInput: CreateNoteInput = {
            title: input.title,
            ...(input.content !== undefined ? { content: input.content } : {}),
            ...(input.isStarred !== undefined ? { isStarred: input.isStarred } : {}),
            ...(input.color !== undefined ? { color: input.color } : {}),
            ...(input.type !== undefined ? { type: input.type } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.noteDate !== undefined ? { noteDate: input.noteDate } : {}),
            ...(documentIds.length > 0 ? { documentIds } : {}),
            ...(input._toolUseId !== undefined ? { _toolUseId: input._toolUseId } : {}),
        };

        const changes = createDiffChanges(proposedInput, [
            { key: 'title', label: 'Title' },
            { key: 'content', label: 'Content' },
            { key: 'isStarred', label: 'Starred' },
            { key: 'color', label: 'Colour' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'noteDate', label: 'Note date' },
            {
                key: 'documentIds',
                label: 'Attached documents',
                format: (value) => formatDocumentIds(value, documentNames),
            },
        ]);
        const summary = `Create note - ${input.title}`;
        const diff: ProposedDiff = {
            entity: 'note',
            entityId: null,
            summary,
            changes,
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: input._toolUseId ?? '',
                input: proposedInput,
                proposedDiff: diff,
                expectedRowVersion: null,
            })
        ).toolResult;
    },
};

async function resolveExplicitDocuments(projectId: string, documentIds: string[]): Promise<ResolvedDocument[]> {
    const ids = Array.from(new Set(documentIds.filter(Boolean)));
    if (ids.length === 0) return [];

    const rows = await baseDocumentQuery()
        .where(and(eq(documents.projectId, projectId), inArray(documents.id, ids)));

    const byId = new Map(rows.map((row) => [row.id, toResolvedDocument(row)]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
        throw new Error(`${TOOL}: document(s) not found in this project: ${missing.join(', ')}`);
    }
    return ids.map((id) => byId.get(id)!).filter(Boolean);
}

async function resolveFilteredDocuments(projectId: string, input: CreateNoteInput): Promise<ResolvedDocument[]> {
    const conditions = [eq(documents.projectId, projectId)];
    if (input.categoryId) conditions.push(eq(documents.categoryId, input.categoryId));
    if (input.subcategoryId) conditions.push(eq(documents.subcategoryId, input.subcategoryId));
    if (input.categoryName) conditions.push(ilike(categories.name, `%${input.categoryName}%`));
    if (input.subcategoryName) conditions.push(documentNameCondition(input.subcategoryName));
    if (input.disciplineOrTrade) conditions.push(documentNameCondition(input.disciplineOrTrade));

    const limit = input.limit ?? DEFAULT_DOCUMENT_LIMIT;
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

function formatDocumentIds(value: unknown, documentNames: Map<string, string>): unknown {
    if (!Array.isArray(value)) return value;
    const ids = value.map(String);
    if (ids.length === 0) return 'None';

    const names = ids.map((id) => documentNames.get(id) ?? id).slice(0, 20);
    const suffix = ids.length > names.length ? `, +${ids.length - names.length} more` : '';
    return `${ids.length} document${ids.length === 1 ? '' : 's'}: ${names.join(', ')}${suffix}`;
}

registerTool(definition);

export { definition as createNoteTool };
