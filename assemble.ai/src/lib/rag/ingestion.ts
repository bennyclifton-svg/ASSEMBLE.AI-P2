import type { Chunk } from './chunking';

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
