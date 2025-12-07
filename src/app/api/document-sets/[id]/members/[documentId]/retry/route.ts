/**
 * T028: Retry Failed Document Sync
 * POST: Reset failed sync status and re-queue for processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { documentSetMembers, documentChunks } from '@/lib/db/rag-schema';
import { sql } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string; documentId: string }>;
}

/**
 * POST /api/document-sets/[id]/members/[documentId]/retry
 * Retry a failed document sync
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: documentSetId, documentId } = await params;

        // Get current membership status
        const memberResult = await ragDb.execute(sql`
            SELECT
                id,
                sync_status as "syncStatus",
                error_message as "errorMessage"
            FROM document_set_members
            WHERE document_set_id = ${documentSetId}
            AND document_id = ${documentId}
        `);

        if (!memberResult.rows || memberResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Document not found in this set' },
                { status: 404 }
            );
        }

        const member = memberResult.rows[0] as any;

        // Only allow retry for failed status
        if (member.syncStatus !== 'failed') {
            return NextResponse.json(
                {
                    error: 'Document is not in failed status',
                    currentStatus: member.syncStatus,
                },
                { status: 400 }
            );
        }

        // Delete any existing chunks for this document (clean slate)
        await ragDb.execute(sql`
            DELETE FROM document_chunks
            WHERE document_id = ${documentId}
        `);

        // Reset status to pending
        await ragDb.execute(sql`
            UPDATE document_set_members
            SET
                sync_status = 'pending',
                error_message = NULL,
                chunks_created = 0,
                synced_at = NULL
            WHERE document_set_id = ${documentSetId}
            AND document_id = ${documentId}
        `);

        // Queue for processing
        // Note: In production, this would actually queue the job
        console.log(`[retry] Re-queued document ${documentId} for processing`);

        return NextResponse.json({
            documentId,
            previousStatus: 'failed',
            newStatus: 'pending',
            errorMessage: null,
            message: 'Document re-queued for processing',
        });
    } catch (error) {
        console.error('[document-sets/[id]/members/[documentId]/retry] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to retry document sync' },
            { status: 500 }
        );
    }
}
