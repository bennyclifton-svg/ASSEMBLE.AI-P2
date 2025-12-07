/**
 * T106: RAG Repos Load API - Get document IDs from a repo
 * GET: Load document IDs for selection restoration
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { sql } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/rag-repos/[id]/load
 * Load document IDs from a repo
 * Used by "Load" button to restore selection in DocumentRepository
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: repoId } = await params;

        // Verify the repo exists and get its info
        const repoResult = await ragDb.execute(sql`
            SELECT
                id,
                name,
                repo_type as "repoType",
                is_global as "isGlobal",
                organization_id as "organizationId",
                project_id as "projectId"
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
            organizationId: string | null;
            projectId: string | null;
        };

        // Get all document IDs in this repo
        const membersResult = await ragDb.execute(sql`
            SELECT
                dsm.document_id as "documentId",
                dsm.sync_status as "syncStatus"
            FROM document_set_members dsm
            WHERE dsm.document_set_id = ${repoId}
            ORDER BY dsm.created_at ASC
        `);

        const members = (membersResult.rows || []) as Array<{
            documentId: string;
            syncStatus: string;
        }>;

        const documentIds = members.map((m) => m.documentId);

        return NextResponse.json({
            repoId,
            repoName: repo.name,
            repoType: repo.repoType,
            isGlobal: repo.isGlobal,
            documentIds,
            documentCount: documentIds.length,
            // Also include sync status info
            syncInfo: {
                pending: members.filter((m) => m.syncStatus === 'pending').length,
                processing: members.filter((m) => m.syncStatus === 'processing').length,
                synced: members.filter((m) => m.syncStatus === 'synced').length,
                failed: members.filter((m) => m.syncStatus === 'failed').length,
            },
        });
    } catch (error) {
        console.error('[rag-repos/load] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to load documents from repo' },
            { status: 500 }
        );
    }
}
