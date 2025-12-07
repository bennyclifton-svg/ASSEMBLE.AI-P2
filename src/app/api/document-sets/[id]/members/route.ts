/**
 * T027: Document Set Members API
 * POST: Add documents to set (triggers background processing)
 * DELETE: Remove documents from set
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { documentSetMembers, documentChunks } from '@/lib/db/rag-schema';
import { sql, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { addDocumentForProcessing } from '@/lib/queue/client';
import { db } from '@/lib/db';
import { documents, versions, fileAssets } from '@/lib/db/schema';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/document-sets/[id]/members
 * Add documents to a document set
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: documentSetId } = await params;
        const body = await request.json();
        const { documentIds } = body;

        // Validation
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json(
                { error: 'documentIds array is required' },
                { status: 400 }
            );
        }

        // Check if document set exists
        const setExists = await ragDb.execute(sql`
            SELECT id FROM document_sets WHERE id = ${documentSetId}
        `);

        if (!setExists.rows || setExists.rows.length === 0) {
            return NextResponse.json(
                { error: 'Document set not found' },
                { status: 404 }
            );
        }

        // Check which documents are already in the set
        // Validate UUIDs to prevent SQL injection
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validDocumentIds = documentIds.filter((id: string) => uuidRegex.test(id));

        if (validDocumentIds.length === 0) {
            return NextResponse.json(
                { error: 'No valid document IDs provided' },
                { status: 400 }
            );
        }

        const arrayLiteral = `ARRAY[${validDocumentIds.map((id: string) => `'${id}'`).join(',')}]::text[]`;

        const existingMembers = await ragDb.execute(sql.raw(`
            SELECT document_id as "documentId"
            FROM document_set_members
            WHERE document_set_id = '${documentSetId}'
            AND document_id = ANY(${arrayLiteral})
        `));

        const existingDocIds = new Set(
            (existingMembers.rows || []).map((m: any) => m.documentId)
        );

        const added: Array<{ documentId: string; syncStatus: string }> = [];
        const skipped: string[] = [];

        // Add new members
        for (const documentId of validDocumentIds) {
            if (existingDocIds.has(documentId)) {
                skipped.push(documentId);
                continue;
            }

            const memberId = uuidv4();
            const now = new Date();

            await ragDb.insert(documentSetMembers).values({
                id: memberId,
                documentSetId,
                documentId,
                syncStatus: 'pending',
                createdAt: now,
            });

            added.push({
                documentId,
                syncStatus: 'pending',
            });

            // Queue document for processing
            try {
                // 1. Get document's latest version to find the file asset
                const doc = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);

                if (!doc[0]?.latestVersionId) {
                    console.warn(`[members] No latest version for document ${documentId}`);
                    continue;
                }

                // 2. Get the version's file asset
                const version = await db.select()
                    .from(versions)
                    .where(eq(versions.id, doc[0].latestVersionId))
                    .limit(1);

                if (!version[0]?.fileAssetId) {
                    console.warn(`[members] No file asset for version ${doc[0].latestVersionId}`);
                    continue;
                }

                // 3. Get the file asset info (storagePath)
                const asset = await db.select()
                    .from(fileAssets)
                    .where(eq(fileAssets.id, version[0].fileAssetId))
                    .limit(1);

                if (!asset[0]?.storagePath) {
                    console.warn(`[members] No storage path for asset ${version[0].fileAssetId}`);
                    continue;
                }

                // 4. Queue the document for processing (worker reads file from disk)
                await addDocumentForProcessing(
                    documentId,
                    documentSetId,
                    asset[0].originalName,
                    asset[0].storagePath
                );

                console.log(`[members] Queued document ${documentId} for processing (path: ${asset[0].storagePath})`);
            } catch (queueError) {
                console.error(`[members] Failed to queue document ${documentId}:`, queueError);
                // Don't throw - document is still added to set, just not queued yet
            }
        }

        return NextResponse.json(
            {
                added,
                skipped,
                message: `Added ${added.length} documents, skipped ${skipped.length} (already in set)`,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('[document-sets/[id]/members] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to add documents to set' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/document-sets/[id]/members
 * Remove documents from a document set
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: documentSetId } = await params;
        const body = await request.json();
        const { documentIds } = body;

        // Validation
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json(
                { error: 'documentIds array is required' },
                { status: 400 }
            );
        }

        // Check if document set exists
        const setExists = await ragDb.execute(sql`
            SELECT id FROM document_sets WHERE id = ${documentSetId}
        `);

        if (!setExists.rows || setExists.rows.length === 0) {
            return NextResponse.json(
                { error: 'Document set not found' },
                { status: 404 }
            );
        }

        // Validate UUIDs to prevent SQL injection
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validDocumentIds = documentIds.filter((id: string) => uuidRegex.test(id));

        if (validDocumentIds.length === 0) {
            return NextResponse.json(
                { error: 'No valid document IDs provided' },
                { status: 400 }
            );
        }

        const deleteArrayLiteral = `ARRAY[${validDocumentIds.map((id: string) => `'${id}'`).join(',')}]::text[]`;

        // Delete chunks for these documents
        await ragDb.execute(sql.raw(`
            DELETE FROM document_chunks
            WHERE document_id = ANY(${deleteArrayLiteral})
        `));

        // Delete memberships
        const result = await ragDb.execute(sql.raw(`
            DELETE FROM document_set_members
            WHERE document_set_id = '${documentSetId}'
            AND document_id = ANY(${deleteArrayLiteral})
        `));

        // Get count of deleted rows (PostgreSQL returns this in rowCount)
        const removedCount = (result as any).rowCount || validDocumentIds.length;

        return NextResponse.json({
            removed: removedCount,
            message: `Removed ${removedCount} documents from set`,
        });
    } catch (error) {
        console.error('[document-sets/[id]/members] DELETE error:', error);
        return NextResponse.json(
            { error: 'Failed to remove documents from set' },
            { status: 500 }
        );
    }
}
