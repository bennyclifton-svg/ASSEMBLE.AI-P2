/**
 * T025: Document Sets API - List and Create
 * GET: List document sets (filter by projectId, discipline)
 * POST: Create new document set
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { documentSets, documentSetMembers } from '@/lib/db/rag-schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/document-sets
 * List document sets with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get('projectId');
        const discipline = searchParams.get('discipline');

        // Build query with filters
        let query = ragDb.execute(sql`
            SELECT
                ds.id,
                ds.project_id as "projectId",
                ds.name,
                ds.description,
                ds.discipline,
                ds.is_default as "isDefault",
                ds.created_at as "createdAt",
                ds.updated_at as "updatedAt",
                COUNT(dsm.id) as "memberCount",
                COUNT(CASE WHEN dsm.sync_status = 'synced' THEN 1 END) as "syncedCount"
            FROM document_sets ds
            LEFT JOIN document_set_members dsm ON ds.id = dsm.document_set_id
            ${projectId ? sql`WHERE ds.project_id = ${projectId}` : sql``}
            ${discipline && projectId ? sql`AND ds.discipline = ${discipline}` : sql``}
            ${discipline && !projectId ? sql`WHERE ds.discipline = ${discipline}` : sql``}
            GROUP BY ds.id
            ORDER BY ds.created_at DESC
        `);

        const result = await query;

        return NextResponse.json({
            documentSets: result.rows || [],
        });
    } catch (error) {
        console.error('[document-sets] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch document sets' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/document-sets
 * Create a new document set
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, name, description, discipline, isDefault } = body;

        // Validation
        const errors: string[] = [];
        if (!projectId) errors.push('projectId is required');
        if (!name || name.trim().length === 0) errors.push('name is required');

        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'Validation error', details: errors },
                { status: 400 }
            );
        }

        const id = uuidv4();
        const now = new Date();

        await ragDb.insert(documentSets).values({
            id,
            projectId,
            name: name.trim(),
            description: description?.trim() || null,
            discipline: discipline || null,
            isDefault: isDefault || false,
            createdAt: now,
            updatedAt: now,
        });

        // Fetch the created record
        const created = await ragDb.execute(sql`
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

        return NextResponse.json(created.rows?.[0] || { id }, { status: 201 });
    } catch (error) {
        console.error('[document-sets] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to create document set' },
            { status: 500 }
        );
    }
}
