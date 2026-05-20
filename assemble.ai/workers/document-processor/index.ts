/**
 * T019: Document Processor Worker
 * BullMQ worker for processing documents through RAG pipeline
 *
 * NOTE: Uses dynamic imports to ensure dotenv loads BEFORE modules
 * that depend on environment variables (like rag-client.ts)
 */

import { loadAppEnv } from '../../src/lib/env/load-app-env';
import { assertSaasRuntimeConfig } from '../../src/lib/env/saas-runtime-config';
import type { Job } from 'bullmq';
import type { RagIngestionStage } from '../../src/lib/rag/ingestion';

// Load environment variables FIRST - before any other imports
loadAppEnv();

if (process.env.NODE_ENV === 'production' || process.env.SITEWISE_PUBLIC_SAAS === '1') {
    assertSaasRuntimeConfig('worker');
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

if (!process.env.REDIS_URL) {
    console.error('[worker] FATAL: REDIS_URL is not set!');
    process.exit(1);
}

if (process.env.SITEWISE_WORKER_SMOKE === '1') {
    console.log('[worker] Smoke check passed: environment loaded.');
    process.exit(0);
}

// Now we can safely import modules that depend on env vars
async function bootstrap() {
    // Init Sentry after env load, before other imports that might throw
    await import('../sentry-init');

    const { Worker } = await import('bullmq');
    const { ragDb } = await import('../../src/lib/db/rag-client');
    const { documentChunks } = await import('../../src/lib/db/rag-schema');
    const { parseDocument } = await import('../../src/lib/rag/parsing');
    const { generateEmbedding } = await import('../../src/lib/rag/embeddings');
    const { ingestProjectDocument } = await import('../../src/lib/rag/ingestion');
    const { QUEUE_NAMES, getConnection } = await import('../../src/lib/queue/client');
    const { eq } = await import('drizzle-orm');
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
            const progressByStage: Partial<Record<RagIngestionStage, number>> = {
                processing: 10,
                loaded: 30,
                embedded: 50,
                persisted: 80,
                synced: 100,
            };

            const result = await ingestProjectDocument({
                client: ragDb,
                documentSetId,
                documentId,
                loadContent: async () => {
                    console.log(`[worker] Reading and parsing document: ${filename}`);
                    const buffer = await storage.get(storagePath);
                    const parsed = await parseDocument(buffer, filename);
                    return parsed.content;
                },
                onStage: async (event) => {
                    const progress = progressByStage[event.stage];
                    if (progress !== undefined) await job.updateProgress(progress);

                    if (event.stage === 'processing') {
                        console.log(`[worker] Processing status set for ${filename}`);
                    }
                    if (event.stage === 'loaded') {
                        console.log(`[worker] Parsed ${filename} (${event.details?.contentLength ?? 0} chars)`);
                    }
                    if (event.stage === 'chunked') {
                        console.log(`[worker] Created ${event.details?.chunkCount ?? 0} chunks`);
                    }
                    if (event.stage === 'embedded') {
                        console.log(
                            `[worker] Generated embeddings for ${filename} (${event.details?.totalTokens ?? 0} tokens)`
                        );
                    }
                    if (event.stage === 'persisted') {
                        console.log(`[worker] Persisted chunks for ${filename}`);
                    }
                },
            });

            console.log(`[worker] Successfully processed document: ${filename} (${result.chunks.length} chunks)`);
        } catch (error) {
            console.error(`[worker] Failed to process document: ${filename}`, error);
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
