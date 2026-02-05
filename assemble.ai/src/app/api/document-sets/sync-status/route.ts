/**
 * T029: Document Sync Status API
 * GET: Get sync status for multiple documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { sql } from 'drizzle-orm';

/**
 * GET /api/document-sets/sync-status?documentIds=doc1,doc2,doc3
 * Get sync status map for multiple documents
 */
export async function GET(request: NextRequest) {
    try {
        console.log('[sync-status] SUPABASE_POSTGRES_URL set:', !!process.env.SUPABASE_POSTGRES_URL);

        // Check if RAG database is configured
        if (!process.env.SUPABASE_POSTGRES_URL) {
            console.log('[sync-status] RAG database not configured, returning empty statuses');
            // Return empty statuses when RAG database is not configured
            return NextResponse.json({
                statuses: {},
            });
        }

        const searchParams = request.nextUrl.searchParams;
        const documentIdsParam = searchParams.get('documentIds');

        if (!documentIdsParam) {
            return NextResponse.json(
                { error: 'documentIds query parameter is required' },
                { status: 400 }
            );
        }

        const documentIds = documentIdsParam.split(',').filter(Boolean);

        if (documentIds.length === 0) {
            return NextResponse.json(
                { error: 'At least one documentId is required' },
                { status: 400 }
            );
        }

        // Get sync status for all requested documents
        // Validate UUIDs to prevent SQL injection
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validDocumentIds = documentIds.filter(id => uuidRegex.test(id));

        if (validDocumentIds.length === 0) {
            return NextResponse.json({
                statuses: {},
            });
        }

        // Build array literal for PostgreSQL: ARRAY['id1', 'id2']::text[]
        const arrayLiteral = `ARRAY[${validDocumentIds.map(id => `'${id}'`).join(',')}]::text[]`;

        console.log('[sync-status] Querying for document IDs:', validDocumentIds.slice(0, 5), validDocumentIds.length > 5 ? `... (${validDocumentIds.length} total)` : '');

        const result = await ragDb.execute(sql.raw(`
            SELECT
                dsm.document_id as "documentId",
                dsm.sync_status as "syncStatus",
                dsm.document_set_id as "documentSetId",
                dsm.chunks_created as "chunksCreated",
                dsm.error_message as "errorMessage",
                dsm.synced_at as "syncedAt"
            FROM document_set_members dsm
            WHERE dsm.document_id = ANY(${arrayLiteral})
            ORDER BY dsm.document_id, dsm.created_at DESC
        `));

        console.log('[sync-status] Query returned', result.rows?.length || 0, 'rows');

        // Group by documentId
        const statusMap: Record<string, {
            status: string | null;
            documentSetIds: string[];
            chunksCreated: number;
            errorMessage: string | null;
            syncedAt: string | null;
        }> = {};

        // Initialize all requested documents
        for (const docId of validDocumentIds) {
            statusMap[docId] = {
                status: null,
                documentSetIds: [],
                chunksCreated: 0,
                errorMessage: null,
                syncedAt: null,
            };
        }

        // Populate from results
        for (const row of (result.rows || []) as any[]) {
            const docId = row.documentId;
            if (!statusMap[docId].documentSetIds.includes(row.documentSetId)) {
                statusMap[docId].documentSetIds.push(row.documentSetId);
            }

            // Use the most relevant status (synced > processing > pending > failed)
            const currentStatus = statusMap[docId].status;
            const newStatus = row.syncStatus;

            if (!currentStatus) {
                statusMap[docId].status = newStatus;
            } else if (newStatus === 'synced') {
                statusMap[docId].status = 'synced';
            } else if (newStatus === 'processing' && currentStatus !== 'synced') {
                statusMap[docId].status = 'processing';
            } else if (newStatus === 'pending' && currentStatus === 'failed') {
                statusMap[docId].status = 'pending';
            }

            // Aggregate chunks
            statusMap[docId].chunksCreated += row.chunksCreated || 0;

            // Capture error if failed
            if (row.syncStatus === 'failed' && row.errorMessage) {
                statusMap[docId].errorMessage = row.errorMessage;
            }

            // Capture latest sync time
            if (row.syncedAt) {
                statusMap[docId].syncedAt = row.syncedAt;
            }
        }

        return NextResponse.json({
            statuses: statusMap,
        });
    } catch (error) {
        console.error('[document-sets/sync-status] GET error:', error);
        // Return empty statuses when RAG database is unavailable
        // This allows the app to function without RAG integration
        return NextResponse.json({
            statuses: {},
        });
    }
}
