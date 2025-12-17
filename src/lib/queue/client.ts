/**
 * T018: BullMQ Queue Client
 * Document processing queue with Upstash Redis
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection for Upstash
// Note: Upstash requires TLS (rediss://)
const getRedisConnection = () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required');
    }

    return new IORedis(redisUrl, {
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    });
};

// Queue names
export const QUEUE_NAMES = {
    DOCUMENT_PROCESSING: 'document-processing',
    CHUNK_EMBEDDING: 'chunk-embedding',
    REPORT_GENERATION: 'report-generation',
} as const;

// Job types
export interface DocumentProcessingJob {
    type: 'process_document';
    documentId: string;
    documentSetId: string;
    filename: string;
    storagePath: string; // File path reference (worker reads from disk)
}

export interface ChunkEmbeddingJob {
    type: 'embed_chunk';
    chunkId: string;
    content: string;
}

export interface ReportGenerationJob {
    type: 'generate_section';
    reportId: string;
    sectionIndex: number;
    query: string;
    documentSetIds: string[];
}

export type QueueJob = DocumentProcessingJob | ChunkEmbeddingJob | ReportGenerationJob;

// Queue configuration
const DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 1000,
    },
    removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
        age: 24 * 60 * 60, // Keep for 24 hours
    },
    removeOnFail: {
        count: 500, // Keep last 500 failed jobs for debugging
    },
};

// Singleton queue instances
let documentQueue: Queue | null = null;
let chunkQueue: Queue | null = null;
let reportQueue: Queue | null = null;
let connection: IORedis | null = null;

/**
 * Get or create Redis connection
 */
export function getConnection(): IORedis {
    if (!connection) {
        connection = getRedisConnection();
    }
    return connection;
}

/**
 * Get or create document processing queue
 */
export function getDocumentQueue(): Queue<DocumentProcessingJob> {
    if (!documentQueue) {
        documentQueue = new Queue(QUEUE_NAMES.DOCUMENT_PROCESSING, {
            connection: getConnection(),
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });
    }
    return documentQueue as Queue<DocumentProcessingJob>;
}

/**
 * Get or create chunk embedding queue
 */
export function getChunkQueue(): Queue<ChunkEmbeddingJob> {
    if (!chunkQueue) {
        chunkQueue = new Queue(QUEUE_NAMES.CHUNK_EMBEDDING, {
            connection: getConnection(),
            defaultJobOptions: {
                ...DEFAULT_JOB_OPTIONS,
                attempts: 5, // More retries for API calls
            },
        });
    }
    return chunkQueue as Queue<ChunkEmbeddingJob>;
}

/**
 * Get or create report generation queue
 */
export function getReportQueue(): Queue<ReportGenerationJob> {
    if (!reportQueue) {
        reportQueue = new Queue(QUEUE_NAMES.REPORT_GENERATION, {
            connection: getConnection(),
            defaultJobOptions: {
                ...DEFAULT_JOB_OPTIONS,
                attempts: 2, // Fewer retries for expensive LLM calls
            },
        });
    }
    return reportQueue as Queue<ReportGenerationJob>;
}

/**
 * Add document for processing
 */
export async function addDocumentForProcessing(
    documentId: string,
    documentSetId: string,
    filename: string,
    storagePath: string
): Promise<Job<DocumentProcessingJob>> {
    const queue = getDocumentQueue();

    // Ensure queue is not paused
    if (await queue.isPaused()) {
        await queue.resume();
    }

    return queue.add(
        'process',
        {
            type: 'process_document',
            documentId,
            documentSetId,
            filename,
            storagePath,
        },
        {
            jobId: `doc-${documentId}-${Date.now()}`,
            // No priority - BullMQ 5.x has issues with prioritized queue
        }
    );
}

/**
 * Add chunk for embedding
 */
export async function addChunkForEmbedding(
    chunkId: string,
    content: string
): Promise<Job<ChunkEmbeddingJob>> {
    const queue = getChunkQueue();

    return queue.add(
        'embed',
        {
            type: 'embed_chunk',
            chunkId,
            content,
        },
        {
            jobId: `chunk-${chunkId}`,
            priority: 2, // Lower priority than document processing
        }
    );
}

/**
 * Add report section for generation
 */
export async function addSectionForGeneration(
    reportId: string,
    sectionIndex: number,
    query: string,
    documentSetIds: string[]
): Promise<Job<ReportGenerationJob>> {
    const queue = getReportQueue();

    return queue.add(
        'generate',
        {
            type: 'generate_section',
            reportId,
            sectionIndex,
            query,
            documentSetIds,
        },
        {
            jobId: `report-${reportId}-section-${sectionIndex}`,
            priority: 3, // Lowest priority
        }
    );
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    const docQueue = getDocumentQueue();
    const chunkQueueInstance = getChunkQueue();
    const repQueue = getReportQueue();

    const [docCounts, chunkCounts, repCounts] = await Promise.all([
        docQueue.getJobCounts(),
        chunkQueueInstance.getJobCounts(),
        repQueue.getJobCounts(),
    ]);

    return {
        documentProcessing: docCounts,
        chunkEmbedding: chunkCounts,
        reportGeneration: repCounts,
    };
}

/**
 * Clean up all queues (for graceful shutdown)
 */
export async function closeQueues(): Promise<void> {
    const queues = [documentQueue, chunkQueue, reportQueue].filter(Boolean);

    await Promise.all(queues.map(q => q?.close()));

    if (connection) {
        await connection.quit();
        connection = null;
    }

    documentQueue = null;
    chunkQueue = null;
    reportQueue = null;
}

/**
 * Drain queue (remove all jobs)
 */
export async function drainQueue(
    queueName: keyof typeof QUEUE_NAMES
): Promise<void> {
    const queue = queueName === 'DOCUMENT_PROCESSING'
        ? getDocumentQueue()
        : queueName === 'CHUNK_EMBEDDING'
            ? getChunkQueue()
            : getReportQueue();

    await queue.drain();
}

/**
 * Pause queue processing
 */
export async function pauseQueue(
    queueName: keyof typeof QUEUE_NAMES
): Promise<void> {
    const queue = queueName === 'DOCUMENT_PROCESSING'
        ? getDocumentQueue()
        : queueName === 'CHUNK_EMBEDDING'
            ? getChunkQueue()
            : getReportQueue();

    await queue.pause();
}

/**
 * Resume queue processing
 */
export async function resumeQueue(
    queueName: keyof typeof QUEUE_NAMES
): Promise<void> {
    const queue = queueName === 'DOCUMENT_PROCESSING'
        ? getDocumentQueue()
        : queueName === 'CHUNK_EMBEDDING'
            ? getChunkQueue()
            : getReportQueue();

    await queue.resume();
}
