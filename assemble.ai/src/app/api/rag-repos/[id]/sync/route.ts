/**
 * T105: RAG Repos Sync API - Save documents to a repo
 * POST: Replace existing documents with new selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { documentSetMembers } from '@/lib/db/rag-schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { addDocumentForProcessing } from '@/lib/queue/client';
import { db } from '@/lib/db';
import { documents, versions, fileAssets } from '@/lib/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/rag-repos/[id]/sync
 * Save selected documents to the specified repo
 * Replaces existing members (full sync, not incremental)
 * Body:
 *   - documentIds: string[] - List of document IDs to sync
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: repoId } = await params;
        const body = await request.json();
        const { documentIds } = body;

        if (!Array.isArray(documentIds)) {
            return NextResponse.json(
                { error: 'documentIds must be an array' },
                { status: 400 }
            );
        }

        // Verify the repo exists
        const repoResult = await ragDb.execute(sql`
            SELECT id, name, repo_type as "repoType", is_global as "isGlobal"
            FROM document_sets
            WHERE id = ${repoId}
        `);

        if (!repoResult.rows?.length) {
            return NextResponse.json(
                { error: 'Repo not found' },
                { status: 404 }
            );
        }

        const repo = repoResult.rows[0] as {
            id: string;
            name: string;
            repoType: string;
            isGlobal: boolean;
        };

        // Delete existing members for this repo
        await ragDb.execute(sql`
            DELETE FROM document_set_members
            WHERE document_set_id = ${repoId}
        `);

        // Insert new members (if any documents selected)
        const now = new Date();
        const insertedIds: string[] = [];
        let queuedCount = 0;

        if (documentIds.length > 0) {
            for (const documentId of documentIds) {
                const memberId = uuidv4();
                await ragDb.insert(documentSetMembers).values({
                    id: memberId,
                    documentSetId: repoId,
                    documentId,
                    syncStatus: 'pending', // Will be processed by background worker
                    createdAt: now,
                });
                insertedIds.push(memberId);

                // Queue document for background processing
                try {
                    // 1. Get document's latest version to find the file asset
                    const doc = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);

                    if (!doc[0]?.latestVersionId) {
                        console.warn(`[rag-repos/sync] No latest version for document ${documentId}`);
                        continue;
                    }

                    // 2. Get the version's file asset
                    const version = await db.select()
                        .from(versions)
                        .where(eq(versions.id, doc[0].latestVersionId))
                        .limit(1);

                    if (!version[0]?.fileAssetId) {
                        console.warn(`[rag-repos/sync] No file asset for version ${doc[0].latestVersionId}`);
                        continue;
                    }

                    // 3. Get the file asset info (storagePath)
                    const asset = await db.select()
                        .from(fileAssets)
                        .where(eq(fileAssets.id, version[0].fileAssetId))
                        .limit(1);

                    if (!asset[0]?.storagePath) {
                        console.warn(`[rag-repos/sync] No storage path for asset ${version[0].fileAssetId}`);
                        continue;
                    }

                    // 4. Queue the document for processing (worker reads file from disk)
                    await addDocumentForProcessing(
                        documentId,
                        repoId,
                        asset[0].originalName,
                        asset[0].storagePath
                    );

                    queuedCount++;
                    console.log(`[rag-repos/sync] Queued document ${documentId} for processing (path: ${asset[0].storagePath})`);
                } catch (queueError) {
                    console.error(`[rag-repos/sync] Failed to queue document ${documentId}:`, queueError);
                    // Don't throw - document is still added to set, just not queued yet
                }
            }
        }

        // Update repo's updatedAt timestamp
        await ragDb.execute(sql`
            UPDATE document_sets
            SET updated_at = ${now}
            WHERE id = ${repoId}
        `);

        return NextResponse.json({
            success: true,
            repoId,
            repoName: repo.name,
            repoType: repo.repoType,
            documentCount: documentIds.length,
            queuedForProcessing: queuedCount,
            message: documentIds.length > 0
                ? `Saved ${documentIds.length} document(s) to ${repo.name}, ${queuedCount} queued for RAG processing`
                : `Cleared all documents from ${repo.name}`,
        });
    } catch (error) {
        console.error('[rag-repos/sync] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to sync documents to repo' },
            { status: 500 }
        );
    }
}
