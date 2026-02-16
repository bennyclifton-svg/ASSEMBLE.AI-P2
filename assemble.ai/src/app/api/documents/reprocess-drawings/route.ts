import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db, fileAssets, versions, documents } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import { addDrawingForExtraction } from '@/lib/queue/client';

/**
 * POST /api/documents/reprocess-drawings
 * Re-queue drawing extraction for all files in a project (or specific files)
 * Resets extraction status and re-queues jobs with the latest extraction logic
 */
export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        const body = await request.json();
        const { projectId, fileAssetIds } = body as {
            projectId?: string;
            fileAssetIds?: string[];
        };

        if (!projectId && !fileAssetIds?.length) {
            return NextResponse.json(
                { error: 'Either projectId or fileAssetIds is required' },
                { status: 400 }
            );
        }

        // Get file assets to reprocess
        let assets: { id: string; storagePath: string; originalName: string; mimeType: string }[];

        if (fileAssetIds?.length) {
            // Reprocess specific files
            assets = await db
                .select({
                    id: fileAssets.id,
                    storagePath: fileAssets.storagePath,
                    originalName: fileAssets.originalName,
                    mimeType: fileAssets.mimeType,
                })
                .from(fileAssets)
                .where(inArray(fileAssets.id, fileAssetIds));
        } else {
            // Reprocess all files in a project
            assets = await db
                .select({
                    id: fileAssets.id,
                    storagePath: fileAssets.storagePath,
                    originalName: fileAssets.originalName,
                    mimeType: fileAssets.mimeType,
                })
                .from(fileAssets)
                .innerJoin(versions, eq(versions.fileAssetId, fileAssets.id))
                .innerJoin(documents, eq(versions.documentId, documents.id))
                .where(eq(documents.projectId, projectId!));
        }

        if (!assets.length) {
            return NextResponse.json({ message: 'No files found', requeued: 0 });
        }

        // Reset extraction status and re-queue
        let requeued = 0;
        for (const asset of assets) {
            try {
                // Reset status to PENDING
                await db
                    .update(fileAssets)
                    .set({
                        drawingNumber: null,
                        drawingName: null,
                        drawingRevision: null,
                        drawingExtractionStatus: 'PENDING',
                        drawingExtractionConfidence: null,
                    })
                    .where(eq(fileAssets.id, asset.id));

                // Re-queue for extraction
                await addDrawingForExtraction(
                    asset.id,
                    asset.storagePath,
                    asset.originalName,
                    asset.mimeType
                );

                requeued++;
            } catch (error) {
                console.error(`[reprocess] Failed to re-queue ${asset.originalName}:`, error);
            }
        }

        console.log(`[reprocess] Re-queued ${requeued}/${assets.length} files for drawing extraction`);

        return NextResponse.json({
            message: `Re-queued ${requeued} files for drawing extraction`,
            requeued,
            total: assets.length,
        });
    });
}
