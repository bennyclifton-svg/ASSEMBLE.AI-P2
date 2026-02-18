/**
 * T019: Document Processor Worker
 * BullMQ worker for processing documents through RAG pipeline
 *
 * NOTE: Uses dynamic imports to ensure dotenv loads BEFORE modules
 * that depend on environment variables (like rag-client.ts)
 */

import { config } from 'dotenv';

// Load environment variables FIRST - before any other imports
// In production (Docker), env vars are injected so this is a no-op
// In development, load env files in same order as Next.js
if (process.env.NODE_ENV !== 'production') {
    config({ path: '.env.local' });
    config({ path: '.env.development' });
    config({ path: '.env' });
}

// Verify required env vars
console.log('[worker] Checking environment variables...');
console.log('[worker] DATABASE_URL:', process.env.DATABASE_URL ? 'set (PostgreSQL)' : 'NOT SET');
console.log('[worker] SUPABASE_POSTGRES_URL:', process.env.SUPABASE_POSTGRES_URL ? 'set' : 'NOT SET');
console.log('[worker] REDIS_URL:', process.env.REDIS_URL ? 'set' : 'NOT SET');
console.log('[worker] VOYAGE_API_KEY:', process.env.VOYAGE_API_KEY ? 'set' : 'NOT SET');

if (!process.env.DATABASE_URL && !process.env.SUPABASE_POSTGRES_URL) {
    console.error('[worker] FATAL: DATABASE_URL or SUPABASE_POSTGRES_URL is not set!');
    process.exit(1);
}

// Now we can safely import modules that depend on env vars
async function bootstrap() {
    const { Worker, Job } = await import('bullmq');
    const { ragDb } = await import('../../src/lib/db/rag-client');
    const { documentChunks, documentSetMembers } = await import('../../src/lib/db/rag-schema');
    const { parseDocument } = await import('../../src/lib/rag/parsing');
    const { chunkDocument } = await import('../../src/lib/rag/chunking');
    const { generateEmbedding, generateEmbeddings } = await import('../../src/lib/rag/embeddings');
    const { QUEUE_NAMES, getConnection } = await import('../../src/lib/queue/client');
    const { eq, and } = await import('drizzle-orm');
    const { storage } = await import('../../src/lib/storage');

    // Types
    interface DocumentProcessingJob {
        documentId: string;
        documentSetId: string;
        filename: string;
        storagePath: string;
    }

    interface ChunkEmbeddingJob {
        chunkId: string;
        content: string;
    }

    // Worker concurrency settings
    const DOCUMENT_CONCURRENCY = 2;
    const EMBEDDING_CONCURRENCY = 5;

    /**
     * Process a document through the RAG pipeline
     */
    async function processDocument(job: InstanceType<typeof Job<DocumentProcessingJob>>): Promise<void> {
        const { documentId, documentSetId, filename, storagePath } = job.data;

        console.log(`[worker] Processing document: ${filename} (${documentId}) from ${storagePath}`);

        try {
            // Update sync status to processing
            console.log(`[worker] Updating status to 'processing' for document ${documentId} in set ${documentSetId}`);
            const processingResult = await ragDb
                .update(documentSetMembers)
                .set({ syncStatus: 'processing' })
                .where(
                    and(
                        eq(documentSetMembers.documentSetId, documentSetId),
                        eq(documentSetMembers.documentId, documentId)
                    )
                );
            console.log(`[worker] Status update result:`, processingResult);

            // Step 1: Read file from disk and parse document
            job.updateProgress(10);
            console.log(`[worker] Reading and parsing document: ${filename}`);
            const buffer = await storage.get(storagePath);
            const parsed = await parseDocument(buffer, filename);

            // Step 2: Chunk document
            job.updateProgress(30);
            console.log(`[worker] Chunking document: ${filename}`);
            const chunks = chunkDocument(parsed.content, documentId);
            console.log(`[worker] Created ${chunks.length} chunks`);

            // Step 3: Generate embeddings in batches
            job.updateProgress(50);
            console.log(`[worker] Generating embeddings for ${chunks.length} chunks`);

            const chunkContents = chunks.map((c: any) => c.content);
            const embeddingsResult = await generateEmbeddings(chunkContents);

            // Step 4: Insert chunks with embeddings
            job.updateProgress(80);
            console.log(`[worker] Inserting chunks into database`);

            const chunkRecords = chunks.map((chunk: any, idx: number) => ({
                id: chunk.id,
                documentId,
                parentChunkId: chunk.parentId,
                hierarchyLevel: chunk.hierarchyLevel,
                hierarchyPath: chunk.hierarchyPath,
                sectionTitle: chunk.sectionTitle,
                clauseNumber: chunk.clauseNumber,
                content: chunk.content,
                embedding: embeddingsResult.embeddings[idx],
                tokenCount: chunk.tokenCount,
            }));

            // Insert in batches
            for (let i = 0; i < chunkRecords.length; i += 50) {
                const batch = chunkRecords.slice(i, i + 50);
                await ragDb.insert(documentChunks).values(batch);
            }

            // Step 5: Update sync status to synced
            job.updateProgress(100);
            await ragDb
                .update(documentSetMembers)
                .set({
                    syncStatus: 'synced',
                    syncedAt: new Date(),
                    chunksCreated: chunks.length,
                })
                .where(
                    and(
                        eq(documentSetMembers.documentSetId, documentSetId),
                        eq(documentSetMembers.documentId, documentId)
                    )
                );

            console.log(`[worker] Successfully processed document: ${filename}`);
        } catch (error) {
            console.error(`[worker] Failed to process document: ${filename}`, error);

            // Update sync status to failed
            try {
                console.log(`[worker] Updating status to 'failed' for document ${documentId} in set ${documentSetId}`);
                const updateResult = await ragDb
                    .update(documentSetMembers)
                    .set({
                        syncStatus: 'failed',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    })
                    .where(
                        and(
                            eq(documentSetMembers.documentSetId, documentSetId),
                            eq(documentSetMembers.documentId, documentId)
                        )
                    );
                console.log(`[worker] Updated status to 'failed' for document ${documentId}`, updateResult);
            } catch (updateError) {
                console.error('[worker] Failed to update status to failed:', updateError);
            }

            throw error;
        }
    }

    /**
     * Process a single chunk embedding job
     */
    async function processChunkEmbedding(job: InstanceType<typeof Job<ChunkEmbeddingJob>>): Promise<void> {
        const { chunkId, content } = job.data;

        console.log(`[worker] Embedding chunk: ${chunkId}`);

        const result = await generateEmbedding(content);

        await ragDb
            .update(documentChunks)
            .set({
                embedding: result.embedding,
                tokenCount: result.tokenCount,
                updatedAt: new Date(),
            })
            .where(eq(documentChunks.id, chunkId));

        console.log(`[worker] Embedded chunk: ${chunkId}`);
    }

    /**
     * Start the document processing worker
     */
    function startDocumentWorker() {
        const connection = getConnection();

        const worker = new Worker<DocumentProcessingJob>(
            QUEUE_NAMES.DOCUMENT_PROCESSING,
            processDocument,
            {
                connection,
                concurrency: DOCUMENT_CONCURRENCY,
            }
        );

        worker.on('completed', (job) => {
            console.log(`[worker] Document job ${job.id} completed`);
        });

        worker.on('failed', (job, err) => {
            console.error(`[worker] Document job ${job?.id} failed:`, err.message);
        });

        worker.on('error', (err) => {
            console.error('[worker] Document worker error:', err);
        });

        return worker;
    }

    /**
     * Start the chunk embedding worker
     */
    function startEmbeddingWorker() {
        const connection = getConnection();

        const worker = new Worker<ChunkEmbeddingJob>(
            QUEUE_NAMES.CHUNK_EMBEDDING,
            processChunkEmbedding,
            {
                connection,
                concurrency: EMBEDDING_CONCURRENCY,
            }
        );

        worker.on('completed', (job) => {
            console.log(`[worker] Embedding job ${job.id} completed`);
        });

        worker.on('failed', (job, err) => {
            console.error(`[worker] Embedding job ${job?.id} failed:`, err.message);
        });

        worker.on('error', (err) => {
            console.error('[worker] Embedding worker error:', err);
        });

        return worker;
    }

    // Main entry point
    console.log('[worker] Starting document processor workers...');

    const documentWorker = startDocumentWorker();
    const embeddingWorker = startEmbeddingWorker();

    console.log('[worker] Workers started. Waiting for jobs...');

    // Graceful shutdown
    const shutdown = async () => {
        console.log('[worker] Shutting down workers...');
        await documentWorker.close();
        await embeddingWorker.close();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

// Run bootstrap
bootstrap().catch((err) => {
    console.error('[worker] Fatal error:', err);
    process.exit(1);
});
