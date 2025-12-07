/**
 * T026: Document Set API - Single Resource
 * GET: Get document set with members
 * PATCH: Update document set
 * DELETE: Delete document set
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { documentSets, documentSetMembers, documentChunks } from '@/lib/db/rag-schema';
import { eq, sql } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/document-sets/[id]
 * Get document set with member details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Get document set
        const setResult = await ragDb.execute(sql`
            SELECT
                id,
                project_id as "projectId",
                name,
                description,
                discipline,
                is_default as "isDefault",
                auto_sync_category_ids as "autoSyncCategoryIds",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM document_sets
            WHERE id = ${id}
        `);

        if (!setResult.rows || setResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Document set not found' },
                { status: 404 }
            );
        }

        // Get members with sync status
        const membersResult = await ragDb.execute(sql`
            SELECT
                document_id as "documentId",
                sync_status as "syncStatus",
                error_message as "errorMessage",
                synced_at as "syncedAt",
                chunks_created as "chunksCreated",
                created_at as "addedAt"
            FROM document_set_members
            WHERE document_set_id = ${id}
            ORDER BY created_at DESC
        `);

        return NextResponse.json({
            ...setResult.rows[0],
            members: membersResult.rows || [],
        });
    } catch (error) {
        console.error('[document-sets/[id]] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch document set' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/document-sets/[id]
 * Update document set (partial update)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Check if set exists
        const existing = await ragDb.execute(sql`
            SELECT id FROM document_sets WHERE id = ${id}
        `);

        if (!existing.rows || existing.rows.length === 0) {
            return NextResponse.json(
                { error: 'Document set not found' },
                { status: 404 }
            );
        }

        // Build update fields
        const updates: string[] = [];
        const values: any[] = [];

        if (body.name !== undefined) {
            updates.push('name = $' + (values.length + 1));
            values.push(body.name.trim());
        }
        if (body.description !== undefined) {
            updates.push('description = $' + (values.length + 1));
            values.push(body.description?.trim() || null);
        }
        if (body.discipline !== undefined) {
            updates.push('discipline = $' + (values.length + 1));
            values.push(body.discipline || null);
        }
        if (body.isDefault !== undefined) {
            updates.push('is_default = $' + (values.length + 1));
            values.push(body.isDefault);
        }
        if (body.autoSyncCategoryIds !== undefined) {
            updates.push('auto_sync_category_ids = $' + (values.length + 1));
            values.push(body.autoSyncCategoryIds);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: 'No fields to update' },
                { status: 400 }
            );
        }

        // Add updated_at
        updates.push('updated_at = NOW()');

        // Execute update using raw SQL
        await ragDb.execute(sql`
            UPDATE document_sets
            SET
                ${sql.raw(updates.join(', '))}
            WHERE id = ${id}
        `);

        // Fetch updated record
        const updated = await ragDb.execute(sql`
            SELECT
                id,
                project_id as "projectId",
                name,
                description,
                discipline,
                is_default as "isDefault",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM document_sets
            WHERE id = ${id}
        `);

        return NextResponse.json(updated.rows?.[0] || { id });
    } catch (error) {
        console.error('[document-sets/[id]] PATCH error:', error);
        return NextResponse.json(
            { error: 'Failed to update document set' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/document-sets/[id]
 * Delete document set and associated data
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check if set exists
        const existing = await ragDb.execute(sql`
            SELECT id FROM document_sets WHERE id = ${id}
        `);

        if (!existing.rows || existing.rows.length === 0) {
            return NextResponse.json(
                { error: 'Document set not found' },
                { status: 404 }
            );
        }

        // Get document IDs to clean up their chunks
        const members = await ragDb.execute(sql`
            SELECT document_id as "documentId"
            FROM document_set_members
            WHERE document_set_id = ${id}
        `);

        const documentIds = (members.rows || []).map((m: any) => m.documentId);

        // Delete chunks for these documents (from this set context)
        if (documentIds.length > 0) {
            // Validate UUIDs and build PostgreSQL array literal
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const validIds = documentIds.filter((id: string) => uuidRegex.test(id));

            if (validIds.length > 0) {
                const arrayLiteral = `ARRAY[${validIds.map((id: string) => `'${id}'`).join(',')}]::text[]`;
                await ragDb.execute(sql.raw(`
                    DELETE FROM document_chunks
                    WHERE document_id = ANY(${arrayLiteral})
                `));
            }
        }

        // Delete members (cascade should handle this, but explicit for safety)
        await ragDb.execute(sql`
            DELETE FROM document_set_members
            WHERE document_set_id = ${id}
        `);

        // Delete the set
        await ragDb.execute(sql`
            DELETE FROM document_sets
            WHERE id = ${id}
        `);

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('[document-sets/[id]] DELETE error:', error);
        return NextResponse.json(
            { error: 'Failed to delete document set' },
            { status: 500 }
        );
    }
}
