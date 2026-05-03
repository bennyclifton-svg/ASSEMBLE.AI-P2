import { z } from 'zod';
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
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyUpdateNote } from '@/lib/agents/applicators';
import type { ActionApplyResult, ActionContext } from '../types';
import { defineAction } from '../define';

const DEFAULT_LIMIT = 200;
const HARD_LIMIT = 500;

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

const optionalTrimmedString = z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1)
).optional();
const dedupedStringArray = z.preprocess(
    (value) =>
        Array.isArray(value)
            ? Array.from(new Set(value.map((item) => (typeof item === 'string' ? item.trim() : item))))
            : value,
    z.array(z.string().min(1))
);
const clampedLimit = z.preprocess(
    (value) => (typeof value === 'number' ? Math.max(1, Math.min(HARD_LIMIT, value)) : value),
    z.number().int().min(1).max(HARD_LIMIT)
);

const inputSchema = z
    .object({
        noteId: optionalTrimmedString,
        noteTitle: optionalTrimmedString,
        documentIds: dedupedStringArray.optional(),
        categoryId: optionalTrimmedString,
        subcategoryId: optionalTrimmedString,
        categoryName: optionalTrimmedString,
        subcategoryName: optionalTrimmedString,
        disciplineOrTrade: optionalTrimmedString,
        allProjectDocuments: z.boolean().optional(),
        limit: clampedLimit.optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (!input.noteId && !input.noteTitle) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'provide noteId or noteTitle',
                path: ['noteId'],
            });
        }

        const hasDocumentSource =
            (input.documentIds?.length ?? 0) > 0 ||
            Boolean(input.categoryId) ||
            Boolean(input.subcategoryId) ||
            Boolean(input.categoryName) ||
            Boolean(input.subcategoryName) ||
            Boolean(input.disciplineOrTrade) ||
            input.allProjectDocuments === true;
        if (!hasDocumentSource) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'provide documentIds, a document filter, or allProjectDocuments=true',
                path: ['documentIds'],
            });
        }
    });

type AttachDocumentsToNoteInput = z.infer<typeof inputSchema>;

async function resolveNote(ctx: ActionContext, input: AttachDocumentsToNoteInput): Promise<ResolvedNote> {
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
        if (!row) throw new Error('attach_documents_to_note: noteId was not found in this project');
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
        throw new Error(`attach_documents_to_note: multiple notes are titled "${title}". Use noteId to choose one.`);
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
            `attach_documents_to_note: multiple notes matched "${title}": ${partialRows
                .map((row) => row.title)
                .join(', ')}. Use the exact note title or noteId.`
        );
    }

    throw new Error(`attach_documents_to_note: note "${title}" was not found in this project`);
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
        throw new Error(`attach_documents_to_note: document(s) not found in this project: ${missing.join(', ')}`);
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
            `attach_documents_to_note: more than ${limit} documents matched. Narrow the filter or provide explicit documentIds.`
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

async function newDocumentsForAttachment(noteId: string, docs: ResolvedDocument[]): Promise<ResolvedDocument[]> {
    const existingRows = await db
        .select({ documentId: noteTransmittals.documentId })
        .from(noteTransmittals)
        .where(eq(noteTransmittals.noteId, noteId));
    const existingDocumentIds = new Set(existingRows.map((row) => row.documentId));
    return docs.filter((doc) => !existingDocumentIds.has(doc.id));
}

async function resolveAttachment(ctx: ActionContext, input: AttachDocumentsToNoteInput) {
    const note = await resolveNote(ctx, input);
    const documentsToConsider = input.documentIds?.length
        ? await resolveExplicitDocuments(ctx.projectId, input.documentIds)
        : await resolveFilteredDocuments(ctx.projectId, input);

    if (documentsToConsider.length === 0) {
        throw new Error('attach_documents_to_note: no matching project documents were found');
    }

    const newDocuments = await newDocumentsForAttachment(note.id, documentsToConsider);
    if (newDocuments.length === 0) {
        throw new Error(
            `attach_documents_to_note: all ${documentsToConsider.length} matching document(s) are already attached to note "${note.title}"`
        );
    }

    return { note, newDocuments };
}

function formatDocumentList(docs: ResolvedDocument[]): string {
    const names = docs.map((doc) => doc.name).slice(0, 20);
    const suffix = docs.length > names.length ? `, +${docs.length - names.length} more` : '';
    return `${docs.length} document${docs.length === 1 ? '' : 's'}: ${names.join(', ')}${suffix}`;
}

export const attachDocumentsToNoteAction = defineAction<
    AttachDocumentsToNoteInput,
    Record<string, unknown>
>({
    id: 'correspondence.note.attach_documents',
    toolName: 'attach_documents_to_note',
    domain: 'correspondence',
    description: 'Attach existing project documents to an existing note.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'program', 'design', 'orchestrator'],
    emits: [{ entity: 'note', op: 'updated' }],
    uiTarget: { tab: 'notes', focusEntity: 'note' },
    async prepareProposal(ctx, input) {
        const { note, newDocuments } = await resolveAttachment(ctx, input);
        return {
            proposedDiff: {
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
            },
            expectedRowVersion: note.rowVersion ?? 1,
        };
    },
    async applyResult(ctx, input, meta): Promise<ActionApplyResult<Record<string, unknown>>> {
        let resolved: Awaited<ReturnType<typeof resolveAttachment>>;
        try {
            resolved = await resolveAttachment(ctx, input);
        } catch (err) {
            return { kind: 'gone', reason: err instanceof Error ? err.message : String(err) };
        }
        return applyUpdateNote(
            {
                id: resolved.note.id,
                attachDocumentIds: resolved.newDocuments.map((doc) => doc.id),
            },
            meta?.expectedRowVersion ?? null,
            ctx
        );
    },
});
