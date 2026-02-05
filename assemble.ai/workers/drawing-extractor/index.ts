/**
 * Drawing Extraction Worker
 * BullMQ worker for extracting drawing numbers from construction documents
 *
 * NOTE: Uses dynamic imports to ensure dotenv loads BEFORE modules
 * that depend on environment variables
 */

import { config } from 'dotenv';

// Load environment variables FIRST - before any other imports
// In production (Docker), env vars are injected so this is a no-op
// In development, load env files in same order as Next.js (highest to lowest priority)
if (process.env.NODE_ENV !== 'production') {
    config({ path: '.env.local' });
    config({ path: '.env.development' });
    config({ path: '.env' });
}

// Verify required env vars
console.log('[drawing-worker] Checking environment variables...');
console.log('[drawing-worker] REDIS_URL:', process.env.REDIS_URL ? 'set' : 'NOT SET');
console.log('[drawing-worker] ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET');
console.log('[drawing-worker] DATABASE_URL:', process.env.DATABASE_URL ? 'set (PostgreSQL)' : 'NOT SET (SQLite)');
console.log('[drawing-worker] SUPABASE_POSTGRES_URL:', process.env.SUPABASE_POSTGRES_URL ? 'set' : 'NOT SET');

if (!process.env.REDIS_URL) {
    console.error('[drawing-worker] FATAL: REDIS_URL is not set!');
    process.exit(1);
}

// Now we can safely import modules that depend on env vars
async function bootstrap() {
    const { Worker, Job } = await import('bullmq');
    const { db } = await import('../../src/lib/db');
    const { fileAssets, versions, documents, projects } = await import('../../src/lib/db/schema');
    const { extractDrawingInfo } = await import('../../src/lib/services/drawing-extraction');
    const { QUEUE_NAMES, getConnection } = await import('../../src/lib/queue/client');
    const { eq } = await import('drizzle-orm');
    const { storage } = await import('../../src/lib/storage/local');

    // Types
    interface DrawingExtractionJob {
        type: 'extract_drawing';
        fileAssetId: string;
        storagePath: string;
        filename: string;
        mimeType: string;
    }

    // Worker concurrency - increased for fast vision-first extraction
    // Vision extraction is a single API call (no polling), so higher concurrency is safe
    const EXTRACTION_CONCURRENCY = 5;

    /**
     * Check if extraction is enabled for the project containing this file
     */
    async function isExtractionEnabled(fileAssetId: string): Promise<boolean> {
        try {
            // Get project ID via fileAsset -> version -> document -> project chain
            const result = await db
                .select({ projectId: documents.projectId })
                .from(versions)
                .innerJoin(documents, eq(versions.documentId, documents.id))
                .where(eq(versions.fileAssetId, fileAssetId))
                .limit(1);

            if (!result.length || !result[0].projectId) {
                // No project found - default to enabled
                return true;
            }

            const projectId = result[0].projectId;

            const projectResult = await db
                .select({ enabled: projects.drawingExtractionEnabled })
                .from(projects)
                .where(eq(projects.id, projectId))
                .limit(1);

            if (!projectResult.length) {
                return true; // Default to enabled
            }

            // Handle null as enabled (default)
            return projectResult[0].enabled !== false;
        } catch (error) {
            console.error('[drawing-worker] Error checking extraction enabled:', error);
            return true; // Default to enabled on error
        }
    }

    /**
     * Process a drawing extraction job
     */
    async function processDrawingExtraction(
        job: InstanceType<typeof Job<DrawingExtractionJob>>
    ): Promise<void> {
        const { fileAssetId, storagePath, filename, mimeType } = job.data;

        console.log(`[drawing-worker] Processing: ${filename} (${fileAssetId})`);

        try {
            // Check if extraction is enabled for this project
            const enabled = await isExtractionEnabled(fileAssetId);
            if (!enabled) {
                console.log(`[drawing-worker] Extraction disabled for project, skipping: ${filename}`);
                await db
                    .update(fileAssets)
                    .set({ drawingExtractionStatus: 'SKIPPED' })
                    .where(eq(fileAssets.id, fileAssetId));
                return;
            }

            // Update status to processing
            await db
                .update(fileAssets)
                .set({ drawingExtractionStatus: 'PROCESSING' })
                .where(eq(fileAssets.id, fileAssetId));

            // Read file from storage
            job.updateProgress(20);
            console.log(`[drawing-worker] Reading file: ${storagePath}`);
            const buffer = await storage.get(storagePath);

            // Extract drawing info using AI
            job.updateProgress(50);
            const result = await extractDrawingInfo({
                fileBuffer: buffer,
                filename,
                mimeType,
            });

            // Update fileAsset with results
            job.updateProgress(90);
            await db
                .update(fileAssets)
                .set({
                    drawingNumber: result.drawingNumber,
                    drawingName: result.drawingName,
                    drawingRevision: result.drawingRevision,
                    drawingExtractionStatus: 'COMPLETED',
                    drawingExtractionConfidence: result.confidence,
                })
                .where(eq(fileAssets.id, fileAssetId));

            job.updateProgress(100);
            console.log(
                `[drawing-worker] Completed: ${filename} -> ` +
                `${result.drawingNumber || 'no number found'} (confidence: ${result.confidence}, source: ${result.source})`
            );
        } catch (error) {
            console.error(`[drawing-worker] Failed: ${filename}`, error);

            // Update status to failed
            try {
                await db
                    .update(fileAssets)
                    .set({ drawingExtractionStatus: 'FAILED' })
                    .where(eq(fileAssets.id, fileAssetId));
            } catch (updateError) {
                console.error('[drawing-worker] Failed to update status to failed:', updateError);
            }

            throw error;
        }
    }

    /**
     * Start the drawing extraction worker
     */
    function startDrawingWorker() {
        const connection = getConnection();

        const worker = new Worker<DrawingExtractionJob>(
            QUEUE_NAMES.DRAWING_EXTRACTION,
            processDrawingExtraction,
            {
                connection,
                concurrency: EXTRACTION_CONCURRENCY,
            }
        );

        worker.on('completed', (job) => {
            console.log(`[drawing-worker] Job ${job.id} completed`);
        });

        worker.on('failed', (job, err) => {
            console.error(`[drawing-worker] Job ${job?.id} failed:`, err.message);
        });

        worker.on('error', (err) => {
            console.error('[drawing-worker] Worker error:', err);
        });

        return worker;
    }

    // Main entry point
    console.log('[drawing-worker] Starting drawing extraction worker...');

    const drawingWorker = startDrawingWorker();

    console.log('[drawing-worker] Worker started. Waiting for jobs...');

    // Graceful shutdown
    const shutdown = async () => {
        console.log('[drawing-worker] Shutting down worker...');
        await drawingWorker.close();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

// Run bootstrap
bootstrap().catch((err) => {
    console.error('[drawing-worker] Fatal error:', err);
    process.exit(1);
});
