import { and, eq } from 'drizzle-orm';
import { documentChunks, documentSetMembers } from '@/lib/db/rag-schema';
import { chunkDocument, chunkSeedContent, type Chunk } from './chunking';
import { generateEmbeddings, type BatchEmbeddingResult } from './embeddings';

export const RAG_SYNC_STATUS = {
    pending: 'pending',
    processing: 'processing',
    synced: 'synced',
    failed: 'failed',
} as const;

export type RagSyncStatus = (typeof RAG_SYNC_STATUS)[keyof typeof RAG_SYNC_STATUS];

export const DOCUMENT_CHUNK_INSERT_BATCH_SIZE = 50;

export interface DocumentChunkInsertRow {
    id: string;
    documentId: string;
    parentChunkId: string | null;
    hierarchyLevel: number;
    hierarchyPath: string | null;
    sectionTitle: string | null;
    clauseNumber: string | null;
    content: string;
    embedding: number[];
    tokenCount: number;
}

export interface SeedKnowledgeFrontmatter {
    domainSlug: string;
    name: string;
    domainType: string;
    tags: string[];
    version: string;
    repoType: string;
    applicableProjectTypes: string[];
    applicableStates: string[];
}

export interface SeedKnowledgeSection {
    title: string | null;
    content: string;
}

export interface EmbeddedDocumentChunkRowsResult {
    chunks: Chunk[];
    chunkRows: DocumentChunkInsertRow[];
    totalTokens: number;
}

export interface CreateEmbeddedDocumentChunkRowsArgs {
    documentId: string;
    content: string;
    chunk: (content: string, documentId: string) => Chunk[];
    embed?: (texts: string[]) => Promise<BatchEmbeddingResult>;
}

type RagChunkInsertClient = {
    insert: (table: unknown) => {
        values: (values: unknown) => Promise<unknown>;
    };
};

type RagChunkReplaceClient = RagChunkInsertClient & {
    delete: (table: unknown) => {
        where: (condition: unknown) => Promise<unknown>;
    };
};

type RagMemberStatusClient = {
    update: (table: unknown) => {
        set: (values: Record<string, unknown>) => {
            where: (condition: unknown) => Promise<unknown>;
        };
    };
};

type RagMemberSelectClient = {
    select: (...args: unknown[]) => {
        from: (table: unknown) => {
            where: (condition: unknown) => {
                limit: (limit: number) => Promise<unknown[]>;
            };
        };
    };
};

type RagMemberUpsertClient = RagMemberStatusClient & RagChunkInsertClient & RagMemberSelectClient;

type RagDocumentIngestionClient = RagChunkReplaceClient & RagMemberStatusClient & Partial<RagMemberSelectClient>;

export interface UpdateDocumentSetMemberSyncStatusArgs {
    documentSetId: string;
    documentId: string;
    syncStatus: RagSyncStatus;
    errorMessage?: string | null;
    syncedAt?: Date | null;
    chunksCreated?: number;
}

export interface UpsertDocumentSetMemberSyncStatusArgs extends UpdateDocumentSetMemberSyncStatusArgs {
    id?: string;
    createId?: () => string;
    createdAt?: Date;
}

export type RagIngestionContentKind = 'project_document' | 'seed_knowledge' | 'knowledge_library';

export type RagIngestionStage =
    | 'processing'
    | 'loaded'
    | 'chunked'
    | 'embedded'
    | 'persisted'
    | 'synced'
    | 'failed';

export interface RagIngestionStageEvent {
    stage: RagIngestionStage;
    documentId: string;
    documentSetId: string;
    contentKind: RagIngestionContentKind;
    at: Date;
    details?: Record<string, unknown>;
}

export interface RagDocumentIngestionArgs {
    client: RagDocumentIngestionClient;
    documentSetId: string;
    documentId: string;
    contentKind: RagIngestionContentKind;
    loadContent: () => string | Promise<string>;
    chunk: (content: string, documentId: string) => Chunk[];
    embed?: (texts: string[]) => Promise<BatchEmbeddingResult>;
    replaceExistingChunks?: boolean;
    allowEmptyChunks?: boolean;
    batchSize?: number;
    createMemberId?: () => string;
    now?: () => Date;
    onStage?: (event: RagIngestionStageEvent) => void | Promise<void>;
}

export interface RagDocumentIngestionResult extends EmbeddedDocumentChunkRowsResult {
    status: typeof RAG_SYNC_STATUS.synced;
    contentKind: RagIngestionContentKind;
    documentId: string;
    documentSetId: string;
    insertedCount: number;
    syncedAt: Date;
    events: RagIngestionStageEvent[];
}

export interface QueueRagDocumentForIngestionArgs {
    documentSetId: string;
    documentId: string;
    existingStatus?: RagSyncStatus | null;
    existingMember?: boolean;
    createMemberId: () => string;
    enqueue: () => Promise<unknown>;
    canQueue?: boolean;
    unavailableMessage?: string;
    now?: () => Date;
}

export type QueueRagDocumentForIngestionResult =
    | { status: 'queued'; previousStatus: RagSyncStatus | null }
    | { status: 'already_active'; previousStatus: Exclude<RagSyncStatus, 'failed'> }
    | { status: 'failed'; previousStatus: RagSyncStatus | null; errorMessage: string };

function parseSeedKnowledgeList(value: string): string[] {
    if (!value.startsWith('[') || !value.endsWith(']')) return [];
    return value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
}

export function parseSeedKnowledgeMarkdown(raw: string): {
    frontmatter: SeedKnowledgeFrontmatter;
    body: string;
} {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) {
        throw new Error('Missing or malformed seed knowledge frontmatter');
    }

    const fm: Record<string, string | string[]> = {};
    for (const line of match[1].split('\n')) {
        const kv = line.replace(/\r$/, '').match(/^(\w+):\s*(.*)$/);
        if (!kv) continue;

        const [, key, rawValue] = kv;
        const value = rawValue.trim();
        fm[key] = value.startsWith('[')
            ? parseSeedKnowledgeList(value)
            : value.replace(/^["']|["']$/g, '');
    }

    return { frontmatter: fm as unknown as SeedKnowledgeFrontmatter, body: match[2] };
}

export function hasSeedKnowledgeBodyContent(body: string): boolean {
    const stripped = body.replace(/<!--[\s\S]*?-->/g, '').trim();
    return stripped.length > 20;
}

export function splitSeedKnowledgeBody(body: string): SeedKnowledgeSection[] {
    const sections = body.split(/(?=^## )/m).filter((section) => section.trim());
    const chunks: SeedKnowledgeSection[] = [];

    for (const section of sections) {
        const sectionTitle = section.match(/^## (.+)$/m)?.[1]?.trim() ?? null;
        const subsections = section.split(/(?=^### )/m).filter((sub) => sub.trim());

        if (subsections.length <= 1) {
            chunks.push({ title: sectionTitle, content: section.trim() });
            continue;
        }

        for (const subsection of subsections) {
            const subsectionTitle = subsection.match(/^### (.+)$/m)?.[1]?.trim() ?? sectionTitle;
            chunks.push({ title: subsectionTitle, content: subsection.trim() });
        }
    }

    return chunks;
}

export function batchItems<T>(items: T[], batchSize: number = DOCUMENT_CHUNK_INSERT_BATCH_SIZE): T[][] {
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
        throw new Error('batchSize must be a positive integer');
    }

    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches;
}

export function chunksToDocumentChunkRows(
    documentId: string,
    chunks: Chunk[],
    embeddings: number[][]
): DocumentChunkInsertRow[] {
    if (chunks.length !== embeddings.length) {
        throw new Error(
            `Chunk/embedding count mismatch for ${documentId}: ${chunks.length} chunks, ${embeddings.length} embeddings`
        );
    }

    return chunks.map((chunk, index) => ({
        id: chunk.id,
        documentId,
        parentChunkId: chunk.parentId,
        hierarchyLevel: chunk.hierarchyLevel,
        hierarchyPath: chunk.hierarchyPath,
        sectionTitle: chunk.sectionTitle,
        clauseNumber: chunk.clauseNumber,
        content: chunk.content,
        embedding: embeddings[index],
        tokenCount: chunk.tokenCount,
    }));
}

export async function createEmbeddedDocumentChunkRows(
    args: CreateEmbeddedDocumentChunkRowsArgs
): Promise<EmbeddedDocumentChunkRowsResult> {
    const chunks = args.chunk(args.content, args.documentId);
    if (chunks.length === 0) {
        return {
            chunks,
            chunkRows: [],
            totalTokens: 0,
        };
    }

    const embeddingsResult = await (args.embed ?? generateEmbeddings)(
        chunks.map((chunk) => chunk.content)
    );
    const chunkRows = chunksToDocumentChunkRows(
        args.documentId,
        chunks,
        embeddingsResult.embeddings
    );

    return {
        chunks,
        chunkRows,
        totalTokens: embeddingsResult.totalTokens,
    };
}

export function createEmbeddedProjectDocumentChunkRows(args: {
    documentId: string;
    content: string;
}): Promise<EmbeddedDocumentChunkRowsResult> {
    return createEmbeddedDocumentChunkRows({
        documentId: args.documentId,
        content: args.content,
        chunk: chunkDocument,
    });
}

export function createEmbeddedSeedKnowledgeChunkRows(args: {
    documentId: string;
    content: string;
}): Promise<EmbeddedDocumentChunkRowsResult> {
    return createEmbeddedDocumentChunkRows({
        documentId: args.documentId,
        content: args.content,
        chunk: (content) => chunkSeedContent(content),
    });
}

export async function insertDocumentChunkRows(
    client: RagChunkInsertClient,
    rows: DocumentChunkInsertRow[],
    batchSize: number = DOCUMENT_CHUNK_INSERT_BATCH_SIZE
): Promise<{ insertedCount: number }> {
    for (const batch of batchItems(rows, batchSize)) {
        await client.insert(documentChunks).values(batch);
    }

    return { insertedCount: rows.length };
}

export async function replaceDocumentChunkRows(
    client: RagChunkReplaceClient,
    documentId: string,
    rows: DocumentChunkInsertRow[],
    batchSize: number = DOCUMENT_CHUNK_INSERT_BATCH_SIZE
): Promise<{ insertedCount: number }> {
    await client.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    return insertDocumentChunkRows(client, rows, batchSize);
}

export async function updateDocumentSetMemberSyncStatus(
    client: RagMemberStatusClient,
    args: UpdateDocumentSetMemberSyncStatusArgs
): Promise<void> {
    await client
        .update(documentSetMembers)
        .set(documentSetMemberSyncStatusValues(args))
        .where(
            and(
                eq(documentSetMembers.documentSetId, args.documentSetId),
                eq(documentSetMembers.documentId, args.documentId)
            )
        );
}

export async function upsertDocumentSetMemberSyncStatus(
    client: RagMemberUpsertClient,
    args: UpsertDocumentSetMemberSyncStatusArgs
): Promise<void> {
    const existing = await client
        .select({ id: documentSetMembers.id })
        .from(documentSetMembers)
        .where(
            and(
                eq(documentSetMembers.documentSetId, args.documentSetId),
                eq(documentSetMembers.documentId, args.documentId)
            )
        )
        .limit(1) as Array<{ id: string }>;

    const values = documentSetMemberSyncStatusValues(args);
    if (existing.length > 0) {
        await client
            .update(documentSetMembers)
            .set(values)
            .where(eq(documentSetMembers.id, existing[0].id));
        return;
    }

    const id = args.id ?? args.createId?.();
    if (!id) {
        throw new Error('createId is required when inserting a document_set_members row');
    }

    await client.insert(documentSetMembers).values({
        id,
        documentSetId: args.documentSetId,
        documentId: args.documentId,
        ...values,
        ...(args.createdAt ? { createdAt: args.createdAt } : {}),
    });
}

export async function queueRagDocumentForIngestion(
    client: RagMemberStatusClient & RagChunkInsertClient,
    args: QueueRagDocumentForIngestionArgs
): Promise<QueueRagDocumentForIngestionResult> {
    const previousStatus = args.existingStatus ?? null;
    if (
        previousStatus === RAG_SYNC_STATUS.synced ||
        previousStatus === RAG_SYNC_STATUS.processing ||
        previousStatus === RAG_SYNC_STATUS.pending
    ) {
        return { status: 'already_active', previousStatus };
    }

    const now = args.now?.() ?? new Date();
    const existingMember = args.existingMember ?? previousStatus !== null;
    if (previousStatus === RAG_SYNC_STATUS.failed || existingMember) {
        await updateDocumentSetMemberSyncStatus(client, {
            documentSetId: args.documentSetId,
            documentId: args.documentId,
            syncStatus: RAG_SYNC_STATUS.pending,
            errorMessage: null,
            chunksCreated: 0,
            syncedAt: null,
        });
    } else {
        await client.insert(documentSetMembers).values({
            id: args.createMemberId(),
            documentSetId: args.documentSetId,
            documentId: args.documentId,
            syncStatus: RAG_SYNC_STATUS.pending,
            createdAt: now,
        });
    }

    if (args.canQueue === false) {
        const errorMessage = args.unavailableMessage ?? 'Document cannot be queued for RAG ingestion.';
        await updateDocumentSetMemberSyncStatus(client, {
            documentSetId: args.documentSetId,
            documentId: args.documentId,
            syncStatus: RAG_SYNC_STATUS.failed,
            errorMessage,
        });
        return { status: 'failed', previousStatus, errorMessage };
    }

    try {
        await args.enqueue();
        return { status: 'queued', previousStatus };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await updateDocumentSetMemberSyncStatus(client, {
            documentSetId: args.documentSetId,
            documentId: args.documentId,
            syncStatus: RAG_SYNC_STATUS.failed,
            errorMessage,
        });
        return { status: 'failed', previousStatus, errorMessage };
    }
}

export function ingestProjectDocument(
    args: Omit<RagDocumentIngestionArgs, 'contentKind' | 'chunk'>
): Promise<RagDocumentIngestionResult> {
    return ingestRagDocument({
        ...args,
        contentKind: 'project_document',
        chunk: chunkDocument,
        replaceExistingChunks: args.replaceExistingChunks ?? true,
    });
}

export function ingestSeedKnowledgeDocument(
    args: Omit<RagDocumentIngestionArgs, 'contentKind' | 'chunk'>
): Promise<RagDocumentIngestionResult> {
    return ingestRagDocument({
        ...args,
        contentKind: 'seed_knowledge',
        chunk: (content) => chunkSeedContent(content),
        replaceExistingChunks: args.replaceExistingChunks ?? true,
    });
}

export function ingestKnowledgeLibraryDocument(
    args: Omit<RagDocumentIngestionArgs, 'contentKind' | 'chunk'>
): Promise<RagDocumentIngestionResult> {
    return ingestRagDocument({
        ...args,
        contentKind: 'knowledge_library',
        chunk: (content) => chunkSeedContent(content),
        replaceExistingChunks: args.replaceExistingChunks ?? true,
    });
}

export async function ingestRagDocument(
    args: RagDocumentIngestionArgs
): Promise<RagDocumentIngestionResult> {
    const events: RagIngestionStageEvent[] = [];
    const now = args.now ?? (() => new Date());
    const replaceExistingChunks = args.replaceExistingChunks ?? true;

    const emit = async (stage: RagIngestionStage, details?: Record<string, unknown>) => {
        const event: RagIngestionStageEvent = {
            stage,
            documentId: args.documentId,
            documentSetId: args.documentSetId,
            contentKind: args.contentKind,
            at: now(),
            ...(details ? { details } : {}),
        };
        events.push(event);
        await args.onStage?.(event);
    };

    const setStatus = async (statusArgs: UpdateDocumentSetMemberSyncStatusArgs) => {
        if (args.createMemberId) {
            await upsertDocumentSetMemberSyncStatus(args.client as RagMemberUpsertClient, {
                ...statusArgs,
                createId: args.createMemberId,
            });
            return;
        }

        await updateDocumentSetMemberSyncStatus(args.client, statusArgs);
    };

    try {
        await setStatus({
            documentSetId: args.documentSetId,
            documentId: args.documentId,
            syncStatus: RAG_SYNC_STATUS.processing,
            errorMessage: null,
            syncedAt: null,
            chunksCreated: 0,
        });
        await emit('processing');

        const content = await args.loadContent();
        await emit('loaded', { contentLength: content.length });

        const embedded = await createEmbeddedDocumentChunkRows({
            documentId: args.documentId,
            content,
            chunk: args.chunk,
            embed: args.embed,
        });
        await emit('chunked', { chunkCount: embedded.chunks.length });

        if (embedded.chunks.length === 0 && args.allowEmptyChunks !== true) {
            throw new Error(`No chunks produced for ${args.documentId}`);
        }

        await emit('embedded', { totalTokens: embedded.totalTokens });

        const persistence = replaceExistingChunks
            ? await replaceDocumentChunkRows(
                  args.client,
                  args.documentId,
                  embedded.chunkRows,
                  args.batchSize
              )
            : await insertDocumentChunkRows(args.client, embedded.chunkRows, args.batchSize);
        await emit('persisted', { insertedCount: persistence.insertedCount });

        const syncedAt = now();
        await setStatus({
            documentSetId: args.documentSetId,
            documentId: args.documentId,
            syncStatus: RAG_SYNC_STATUS.synced,
            errorMessage: null,
            syncedAt,
            chunksCreated: embedded.chunks.length,
        });
        await emit('synced', { chunksCreated: embedded.chunks.length });

        return {
            ...embedded,
            status: RAG_SYNC_STATUS.synced,
            contentKind: args.contentKind,
            documentId: args.documentId,
            documentSetId: args.documentSetId,
            insertedCount: persistence.insertedCount,
            syncedAt,
            events,
        };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        try {
            await setStatus({
                documentSetId: args.documentSetId,
                documentId: args.documentId,
                syncStatus: RAG_SYNC_STATUS.failed,
                errorMessage,
                syncedAt: null,
            });
        } finally {
            await emit('failed', { errorMessage });
        }
        throw err;
    }
}

function documentSetMemberSyncStatusValues(
    args: UpdateDocumentSetMemberSyncStatusArgs
): Record<string, unknown> {
    const values: Record<string, unknown> = {
        syncStatus: args.syncStatus,
    };
    if (args.errorMessage !== undefined) values.errorMessage = args.errorMessage;
    if (args.syncedAt !== undefined) values.syncedAt = args.syncedAt;
    if (args.chunksCreated !== undefined) values.chunksCreated = args.chunksCreated;
    return values;
}
