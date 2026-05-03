import { z } from 'zod';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    categories,
    consultantDisciplines,
    contractorTrades,
    documents,
    fileAssets,
    notes,
    noteTransmittals,
    subcategories,
    versions,
} from '@/lib/db/pg-schema';
import { defineAction } from '../define';
import type { ActionContext } from '../types';
import type { ProposedDiff } from '@/lib/agents/approvals';

const NOTE_COLORS = ['yellow', 'blue', 'green', 'pink', 'white'] as const;
const NOTE_TYPES = ['rfi', 'notice', 'eot', 'defect', 'variation', 'risk', 'transmittal', 'review', 'note'] as const;
const NOTE_STATUSES = ['open', 'closed'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_DOCUMENT_LIMIT = 200;
const HARD_DOCUMENT_LIMIT = 500;
const dedupedStringArray = z.preprocess(
    (value) =>
        Array.isArray(value)
            ? Array.from(new Set(value.map((item) => (typeof item === 'string' ? item.trim() : item))))
            : value,
    z.array(z.string().min(1))
);
const clampedLimit = z.preprocess(
    (value) => (typeof value === 'number' ? Math.max(1, Math.min(HARD_DOCUMENT_LIMIT, value)) : value),
    z.number().int().min(1).max(HARD_DOCUMENT_LIMIT)
);

interface ResolvedDocument {
    id: string;
    name: string;
    categoryName: string | null;
    subcategoryName: string | null;
}

function claimsDocumentAttachment(input: { title?: string; content?: string }): boolean {
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

function hasDocumentFilter(input: {
    categoryId?: string;
    subcategoryId?: string;
    categoryName?: string;
    subcategoryName?: string;
    disciplineOrTrade?: string;
    allProjectDocuments?: boolean;
}): boolean {
    return (
        Boolean(input.categoryId) ||
        Boolean(input.subcategoryId) ||
        Boolean(input.categoryName) ||
        Boolean(input.subcategoryName) ||
        Boolean(input.disciplineOrTrade) ||
        input.allProjectDocuments === true
    );
}

const inputSchema = z
    .object({
        title: z.string().trim().min(1),
        content: z.string().trim().optional(),
        isStarred: z.boolean().optional(),
        color: z.enum(NOTE_COLORS).optional(),
        type: z.enum(NOTE_TYPES).optional(),
        status: z.enum(NOTE_STATUSES).optional(),
        noteDate: z.string().regex(ISO_DATE).optional(),
        documentIds: dedupedStringArray.optional(),
        categoryId: z.string().trim().min(1).optional(),
        subcategoryId: z.string().trim().min(1).optional(),
        categoryName: z.string().trim().min(1).optional(),
        subcategoryName: z.string().trim().min(1).optional(),
        disciplineOrTrade: z.string().trim().min(1).optional(),
        allProjectDocuments: z.boolean().optional(),
        limit: clampedLimit.optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (
            claimsDocumentAttachment(input) &&
            (input.documentIds?.length ?? 0) === 0 &&
            !hasDocumentFilter(input)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    'documentIds or a document filter are required when the note claims documents are attached.',
                path: ['documentIds'],
            });
        }
    });

type CreateNoteInput = z.infer<typeof inputSchema>;

async function validateProjectDocuments(
    ctx: ActionContext,
    documentIds: string[] | undefined
): Promise<string[]> {
    const ids = Array.from(new Set(documentIds ?? []));
    if (ids.length === 0) return [];

    const rows = await db
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.projectId, ctx.projectId), inArray(documents.id, ids)));
    const found = new Set(rows.map((row) => row.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
        throw new Error(`Document(s) not found in this project: ${missing.join(', ')}`);
    }
    return ids;
}

function formatDocumentIds(value: unknown, documentNames: Map<string, string>): unknown {
    if (!Array.isArray(value)) return value;
    const ids = value.map(String);
    if (ids.length === 0) return 'None';

    const names = ids.map((id) => documentNames.get(id) ?? id).slice(0, 20);
    const suffix = ids.length > names.length ? `, +${ids.length - names.length} more` : '';
    return `${ids.length} document${ids.length === 1 ? '' : 's'}: ${names.join(', ')}${suffix}`;
}

function createNoteDiff(
    input: CreateNoteInput,
    documentNames = new Map<string, string>()
): ProposedDiff {
    const changes: ProposedDiff['changes'] = [
        { field: 'title', label: 'Title', before: '-', after: input.title },
    ];
    if (input.content !== undefined) {
        changes.push({ field: 'content', label: 'Content', before: '-', after: input.content });
    }
    if (input.isStarred !== undefined) {
        changes.push({ field: 'isStarred', label: 'Starred', before: '-', after: input.isStarred });
    }
    if (input.color !== undefined) {
        changes.push({ field: 'color', label: 'Colour', before: '-', after: input.color });
    }
    if (input.type !== undefined) {
        changes.push({ field: 'type', label: 'Type', before: '-', after: input.type });
    }
    if (input.status !== undefined) {
        changes.push({ field: 'status', label: 'Status', before: '-', after: input.status });
    }
    if (input.noteDate !== undefined) {
        changes.push({ field: 'noteDate', label: 'Note date', before: '-', after: input.noteDate });
    }
    if (input.documentIds !== undefined) {
        changes.push({
            field: 'documentIds',
            label: 'Attached documents',
            before: '-',
            after: formatDocumentIds(input.documentIds, documentNames),
        });
    }

    return {
        entity: 'note',
        entityId: null,
        summary: `Create note - ${input.title}`,
        changes,
    };
}

export const createNoteAction = defineAction<CreateNoteInput, Record<string, unknown>>({
    id: 'correspondence.note.create',
    // Keep the legacy safe tool name while this action replaces the old applicator path.
    toolName: 'create_note',
    domain: 'correspondence',
    description: 'Create a project note, optionally attaching existing project documents.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'program', 'design', 'orchestrator'],
    emits: [{ entity: 'note', op: 'created' }],
    uiTarget: { tab: 'notes', focusEntity: 'note' },
    async prepareProposal(ctx, input) {
        const resolvedDocuments = (input.documentIds?.length ?? 0) > 0
            ? await resolveExplicitDocuments(ctx.projectId, input.documentIds ?? [])
            : hasDocumentFilter(input)
              ? await resolveFilteredDocuments(ctx.projectId, input)
              : [];

        if (
            (claimsDocumentAttachment(input) || hasDocumentFilter(input)) &&
            resolvedDocuments.length === 0
        ) {
            throw new Error('create_note: no matching project documents were found to attach');
        }

        const documentNames = new Map(resolvedDocuments.map((doc) => [doc.id, doc.name]));
        const documentIds = resolvedDocuments.map((doc) => doc.id);
        const proposalInput: CreateNoteInput = {
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

        return {
            proposedDiff: createNoteDiff(proposalInput, documentNames),
            input: proposalInput,
        };
    },
    async apply(ctx, input) {
        const documentIds = await validateProjectDocuments(ctx, input.documentIds);
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const values = {
            id,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            title: input.title,
            content: input.content ?? null,
            isStarred: input.isStarred ?? false,
            color: input.color ?? 'yellow',
            type: input.type ?? 'note',
            status: input.status ?? 'open',
            noteDate: input.noteDate ?? null,
            rowVersion: 1,
            createdAt: now,
            updatedAt: now,
        };

        await db.transaction(async (tx) => {
            await tx.insert(notes).values(values);
            for (const documentId of documentIds) {
                await tx.insert(noteTransmittals).values({
                    id: crypto.randomUUID(),
                    noteId: id,
                    documentId,
                    addedAt: now,
                });
            }
        });

        return { ...values, attachedDocumentIds: documentIds };
    },
});

async function resolveExplicitDocuments(
    projectId: string,
    documentIds: string[]
): Promise<ResolvedDocument[]> {
    const ids = Array.from(new Set(documentIds.filter(Boolean)));
    if (ids.length === 0) return [];

    const rows = await baseDocumentQuery()
        .where(and(eq(documents.projectId, projectId), inArray(documents.id, ids)));

    const byId = new Map(rows.map((row) => [row.id, toResolvedDocument(row)]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
        throw new Error(`Document(s) not found in this project: ${missing.join(', ')}`);
    }
    return ids.map((id) => byId.get(id)!).filter(Boolean);
}

async function resolveFilteredDocuments(
    projectId: string,
    input: CreateNoteInput
): Promise<ResolvedDocument[]> {
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
            `create_note: more than ${limit} documents matched. Narrow the filter or provide explicit documentIds.`
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
