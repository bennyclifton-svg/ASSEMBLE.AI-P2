/**
 * T105: RAG Repos Sync API - Save documents to a repo
 * POST: Replace existing documents with new selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { documentSets, documentSetMembers } from '@/lib/db/rag-schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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
            message: documentIds.length > 0
                ? `Saved ${documentIds.length} document(s) to ${repo.name}`
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
