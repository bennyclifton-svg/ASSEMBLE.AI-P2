import { z } from 'zod';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { ProposedDiff } from '@/lib/actions/types';
import { emitChatEvent } from '@/lib/agents/events';
import { emitProjectEvent } from '@/lib/agents/project-events';
import { documentTitleSearchCondition } from '@/lib/agents/tools/document-search';
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
import { defineAction } from '../define';
import type { ActionContext } from '../types';

const DEFAULT_LIMIT = 50;
const HARD_LIMIT = 200;

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
        documentIds: dedupedStringArray.optional(),
        categoryId: optionalTrimmedString,
        subcategoryId: optionalTrimmedString,
        categoryName: optionalTrimmedString,
        subcategoryName: optionalTrimmedString,
        disciplineOrTrade: optionalTrimmedString,
        drawingNumber: optionalTrimmedString,
        documentName: optionalTrimmedString,
        allProjectDocuments: z.boolean().optional(),
        documentSetId: optionalTrimmedString,
        documentSetName: optionalTrimmedString,
        limit: clampedLimit.optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        const hasDocumentSource =
            (input.documentIds?.length ?? 0) > 0 ||
            Boolean(input.categoryId) ||
            Boolean(input.subcategoryId) ||
            Boolean(input.categoryName) ||
            Boolean(input.subcategoryName) ||
            Boolean(input.disciplineOrTrade) ||
            Boolean(input.drawingNumber) ||
            Boolean(input.documentName) ||
            input.allProjectDocuments === true;
        if (!hasDocumentSource) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'provide documentIds, a document filter, or allProjectDocuments=true',
                path: ['documentIds'],
            });
        }
    });

type SyncProjectDocumentsToAiInput = z.infer<typeof inputSchema>;
type SyncStatus = 'pending' | 'processing' | 'synced' | 'failed' | null;

interface ResolvedDocument {
    id: string;
    name: string;
    drawingNumber: string | null;
    drawingRevision: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
    storagePath: string | null;
    originalName: string | null;
}

interface ResolvedDocumentSet {
    id: string;
    name: string;
}

interface SyncOutput {
    status: 'sync_started';
    projectId: string;
    documentSetId: string;
    documentSetName: string;
    documentIds: string[];
    documentCount: number;
    queuedForProcessing: number;
    queueFailed: number;
    alreadySyncedOrQueued: number;
}

function makeId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `document-set-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        throw new Error(`sync_project_documents_to_ai: document(s) not found in this project: ${missing.join(', ')}`);
    }
    return ids.map((id) => byId.get(id)!).filter(Boolean);
}

async function resolveFilteredDocuments(
    projectId: string,
    input: SyncProjectDocumentsToAiInput
): Promise<ResolvedDocument[]> {
    const conditions = [eq(documents.projectId, projectId)];
    if (input.categoryId) conditions.push(eq(documents.categoryId, input.categoryId));
    if (input.subcategoryId) conditions.push(eq(documents.subcategoryId, input.subcategoryId));
    if (input.categoryName) conditions.push(ilike(categories.name, `%${input.categoryName}%`));
    if (input.subcategoryName) conditions.push(documentNameCondition(input.subcategoryName));
    if (input.disciplineOrTrade) conditions.push(documentNameCondition(input.disciplineOrTrade));
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

    const limit = input.limit ?? DEFAULT_LIMIT;
    const rows = await baseDocumentQuery()
        .where(and(...conditions))
        .orderBy(desc(documents.updatedAt))
        .limit(limit + 1);

    if (rows.length > limit) {
        throw new Error(
            `sync_project_documents_to_ai: more than ${limit} documents matched. Narrow the filter or provide explicit documentIds.`
        );
    }

    return rows.map(toResolvedDocument);
}

async function resolveDocuments(ctx: ActionContext, input: SyncProjectDocumentsToAiInput): Promise<ResolvedDocument[]> {
    const docs = input.documentIds?.length
        ? await resolveExplicitDocuments(ctx.projectId, input.documentIds)
        : await resolveFilteredDocuments(ctx.projectId, input);
    if (docs.length === 0) {
        throw new Error('sync_project_documents_to_ai: no matching project documents were found');
    }
    return docs;
}

function baseDocumentQuery() {
    return db
        .select({
            id: documents.id,
            originalName: fileAssets.originalName,
            drawingNumber: fileAssets.drawingNumber,
            drawingName: fileAssets.drawingName,
            drawingRevision: fileAssets.drawingRevision,
            storagePath: fileAssets.storagePath,
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
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
    storagePath: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
}): ResolvedDocument {
    return {
        id: row.id,
        name: row.drawingName ?? row.originalName ?? row.id,
        drawingNumber: row.drawingNumber ?? null,
        drawingRevision: row.drawingRevision ?? null,
        storagePath: row.storagePath ?? null,
        originalName: row.originalName ?? null,
        categoryName: row.categoryName ?? null,
        subcategoryName: row.subcategoryName ?? null,
    };
}

function normaliseDrawingNumber(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titleCase(value: string): string {
    return value
        .trim()
        .split(/\s+/)
        .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function defaultDocumentSetName(input: SyncProjectDocumentsToAiInput): string {
    const label =
        input.documentSetName ??
        input.disciplineOrTrade ??
        input.subcategoryName ??
        input.categoryName ??
        input.documentName ??
        'Project';
    return `${titleCase(label)} AI Documents`;
}

function formatDocumentList(docs: ResolvedDocument[]): string {
    const names = docs
        .map((doc) => {
            const number = doc.drawingNumber ? `${doc.drawingNumber} - ` : '';
            const revision = doc.drawingRevision ? ` (${doc.drawingRevision})` : '';
            return `${number}${doc.name}${revision}`;
        })
        .slice(0, 20);
    const suffix = docs.length > names.length ? `, +${docs.length - names.length} more` : '';
    return `${docs.length} document${docs.length === 1 ? '' : 's'}: ${names.join(', ')}${suffix}`;
}

function emitDocumentSelection(ctx: ActionContext, documentIds: string[]): void {
    if (documentIds.length === 0) return;
    emitProjectEvent(ctx.projectId, {
        type: 'document_selection_changed',
        mode: 'replace',
        documentIds,
    });
    if (ctx.threadId) {
        emitChatEvent(ctx.threadId, {
            type: 'document_selection_changed',
            projectId: ctx.projectId,
            mode: 'replace',
            documentIds,
        });
    }
}

function emitDocumentSyncStatusChanged(
    ctx: ActionContext,
    documentIds: string[],
    documentSetId: string
): void {
    if (documentIds.length === 0) return;
    emitProjectEvent(ctx.projectId, {
        type: 'document_sync_status_changed',
        documentIds,
        documentSetId,
    });
}

async function aiStatuses(documentIds: string[]): Promise<Map<string, SyncStatus>> {
    const statuses = new Map<string, SyncStatus>();
    if (documentIds.length === 0) return statuses;

    try {
        const [{ ragDb }, { documentSetMembers }] = await Promise.all([
            import('@/lib/db/rag-client'),
            import('@/lib/db/rag-schema'),
        ]);
        const rows = await ragDb
            .select({
                documentId: documentSetMembers.documentId,
                syncStatus: documentSetMembers.syncStatus,
            })
            .from(documentSetMembers)
            .where(inArray(documentSetMembers.documentId, documentIds));

        const rank: Record<Exclude<SyncStatus, null>, number> = {
            synced: 4,
            processing: 3,
            pending: 2,
            failed: 1,
        };
        for (const row of rows) {
            const current = statuses.get(row.documentId) ?? null;
            const next = row.syncStatus ?? null;
            if (!next) continue;
            if (!current || rank[next] > rank[current]) statuses.set(row.documentId, next);
        }
    } catch {
        return statuses;
    }

    return statuses;
}

async function findOrCreateDocumentSet(
    ctx: ActionContext,
    input: SyncProjectDocumentsToAiInput
): Promise<ResolvedDocumentSet> {
    const [{ ragDb }, { documentSets }] = await Promise.all([
        import('@/lib/db/rag-client'),
        import('@/lib/db/rag-schema'),
    ]);

    if (input.documentSetId) {
        const [row] = await ragDb
            .select({ id: documentSets.id, name: documentSets.name, projectId: documentSets.projectId })
            .from(documentSets)
            .where(eq(documentSets.id, input.documentSetId))
            .limit(1);
        if (!row || row.projectId !== ctx.projectId) {
            throw new Error('sync_project_documents_to_ai: documentSetId was not found for this project');
        }
        return { id: row.id, name: row.name };
    }

    const name = defaultDocumentSetName(input);
    const [existingByName] = await ragDb
        .select({ id: documentSets.id, name: documentSets.name })
        .from(documentSets)
        .where(and(eq(documentSets.projectId, ctx.projectId), eq(documentSets.name, name)))
        .limit(1);
    if (existingByName) return existingByName;

    const discipline = input.disciplineOrTrade ?? input.subcategoryName ?? null;
    if (discipline) {
        const [existingByDiscipline] = await ragDb
            .select({ id: documentSets.id, name: documentSets.name })
            .from(documentSets)
            .where(and(eq(documentSets.projectId, ctx.projectId), eq(documentSets.discipline, discipline)))
            .limit(1);
        if (existingByDiscipline) return existingByDiscipline;
    }

    const id = makeId();
    const now = new Date();
    await ragDb.insert(documentSets).values({
        id,
        projectId: ctx.projectId,
        name,
        description: `AI-searchable documents queued by the project assistant.`,
        discipline,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
    });
    return { id, name };
}

async function applySync(
    ctx: ActionContext,
    input: SyncProjectDocumentsToAiInput
): Promise<SyncOutput> {
    const docs = await resolveDocuments(ctx, input);
    const documentSet = await findOrCreateDocumentSet(ctx, input);
    const [{ ragDb }, { documentSetMembers, documentSets }, { queueRagDocumentForIngestion }] = await Promise.all([
        import('@/lib/db/rag-client'),
        import('@/lib/db/rag-schema'),
        import('@/lib/rag/ingestion'),
    ]);

    const docIds = docs.map((doc) => doc.id);
    const existingRows = await ragDb
        .select({
            documentId: documentSetMembers.documentId,
            syncStatus: documentSetMembers.syncStatus,
        })
        .from(documentSetMembers)
        .where(
            and(
                eq(documentSetMembers.documentSetId, documentSet.id),
                inArray(documentSetMembers.documentId, docIds)
            )
        );
    const existing = new Map(existingRows.map((row) => [row.documentId, row.syncStatus]));

    let queuedForProcessing = 0;
    let queueFailed = 0;
    let alreadySyncedOrQueued = 0;
    const now = new Date();

    for (const doc of docs) {
        const status = existing.get(doc.id);
        const queueResult = await queueRagDocumentForIngestion(ragDb, {
            documentSetId: documentSet.id,
            documentId: doc.id,
            existingStatus: status ?? null,
            existingMember: existing.has(doc.id),
            createMemberId: makeId,
            canQueue: Boolean(doc.storagePath),
            unavailableMessage: 'Document has no stored file path for AI processing.',
            now: () => now,
            enqueue: async () => {
                const { addDocumentForProcessing } = await import('@/lib/queue/client');
                await addDocumentForProcessing(
                    doc.id,
                    documentSet.id,
                    doc.originalName ?? doc.name,
                    doc.storagePath!
                );
            },
        });

        if (queueResult.status === 'queued') {
            queuedForProcessing++;
        } else if (queueResult.status === 'already_active') {
            alreadySyncedOrQueued++;
        } else {
            queueFailed++;
            console.warn('[sync_project_documents_to_ai] Failed to queue document for AI processing', {
                documentId: doc.id,
                documentSetId: documentSet.id,
                error: queueResult.errorMessage,
            });
        }
    }

    await ragDb
        .update(documentSets)
        .set({ updatedAt: now })
        .where(eq(documentSets.id, documentSet.id));

    console.log('[sync_project_documents_to_ai] Applied document sync request', {
        projectId: ctx.projectId,
        documentSetId: documentSet.id,
        documentCount: docs.length,
        queuedForProcessing,
        queueFailed,
        alreadySyncedOrQueued,
    });

    emitDocumentSelection(ctx, docIds);
    emitDocumentSyncStatusChanged(ctx, docIds, documentSet.id);

    return {
        status: 'sync_started',
        projectId: ctx.projectId,
        documentSetId: documentSet.id,
        documentSetName: documentSet.name,
        documentIds: docIds,
        documentCount: docs.length,
        queuedForProcessing,
        queueFailed,
        alreadySyncedOrQueued,
    };
}

export const syncProjectDocumentsToAiAction = defineAction<
    SyncProjectDocumentsToAiInput,
    SyncOutput
>({
    id: 'documents.ai.sync_project_documents',
    toolName: 'sync_project_documents_to_ai',
    domain: 'documents',
    description:
        'Propose syncing uploaded project documents into the AI/RAG knowledge base so search_rag can query their contents. Use this when relevant uploaded documents are not yet searchable by AI.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design'],
    uiTarget: { tab: 'documents' },
    async prepareProposal(ctx, input) {
        const docs = await resolveDocuments(ctx, input);
        emitDocumentSelection(ctx, docs.map((doc) => doc.id));
        const statuses = await aiStatuses(docs.map((doc) => doc.id));
        const pendingDocs = docs.filter((doc) => statuses.get(doc.id) !== 'synced');
        const proposedDiff: ProposedDiff = {
            entity: 'document',
            entityId: null,
            summary: `Sync documents to AI - ${defaultDocumentSetName(input)}`,
            changes: [
                {
                    field: 'documentSet',
                    label: 'AI document set',
                    before: '-',
                    after: input.documentSetId ?? defaultDocumentSetName(input),
                },
                {
                    field: 'documents',
                    label: 'Documents',
                    before: '-',
                    after: formatDocumentList(docs),
                },
                {
                    field: 'syncScope',
                    label: 'Sync scope',
                    before: '-',
                    after:
                        pendingDocs.length === docs.length
                            ? `${docs.length} document(s) to queue`
                            : `${pendingDocs.length} not yet synced; ${docs.length - pendingDocs.length} already synced`,
                },
            ],
        };

        return {
            proposedDiff,
            input: {
                documentIds: docs.map((doc) => doc.id),
                ...(input.documentSetId
                    ? { documentSetId: input.documentSetId }
                    : { documentSetName: defaultDocumentSetName(input) }),
                ...(input.disciplineOrTrade ? { disciplineOrTrade: input.disciplineOrTrade } : {}),
                ...(input._toolUseId ? { _toolUseId: input._toolUseId } : {}),
            },
        };
    },
    async apply(ctx, input) {
        return applySync(ctx, input);
    },
});
