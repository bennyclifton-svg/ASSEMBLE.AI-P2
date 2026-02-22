import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { ragDb } from '@/lib/db/rag-client';
import { documentSets } from '@/lib/db/rag-schema';
import { knowledgeDomainSources } from '@/lib/db/knowledge-domain-sources-schema';
import { sql, eq } from 'drizzle-orm';
import type { KnowledgeDomainDTO } from '../route';

// GET /api/knowledge-domains/[domainId] - Domain details with sources and chunk count
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domainId: string }> }
) {
    return handleApiError(async () => {
        const { domainId } = await params;

        const result = await ragDb.execute(sql`
            SELECT
                ds.id,
                ds.name,
                ds.description,
                ds.domain_type AS "domainType",
                ds.domain_tags AS "domainTags",
                ds.repo_type AS "repoType",
                ds.is_global AS "isGlobal",
                ds.organization_id AS "organizationId",
                ds.created_at AS "createdAt",
                ds.updated_at AS "updatedAt",
                kds.id AS "sourceId",
                kds.source_type AS "sourceType",
                kds.source_version AS "sourceVersion",
                kds.last_verified_at AS "lastVerifiedAt",
                kds.applicable_project_types AS "applicableProjectTypes",
                kds.applicable_states AS "applicableStates",
                kds.is_active AS "isActive",
                COALESCE(mc.chunk_count, 0)::int AS "chunkCount"
            FROM document_sets ds
            LEFT JOIN knowledge_domain_sources kds ON kds.document_set_id = ds.id
            LEFT JOIN (
                SELECT document_set_id, COUNT(*)::int AS chunk_count
                FROM document_set_members
                WHERE sync_status = 'synced'
                GROUP BY document_set_id
            ) mc ON mc.document_set_id = ds.id
            WHERE ds.id = ${domainId}
            AND ds.domain_type IS NOT NULL
        `);

        const row = (result.rows || [])[0] as any;
        if (!row) {
            return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
        }

        const domain: KnowledgeDomainDTO = {
            id: row.id,
            name: row.name,
            description: row.description,
            domainType: row.domainType,
            domainTags: row.domainTags,
            repoType: row.repoType,
            isGlobal: row.isGlobal,
            organizationId: row.organizationId,
            chunkCount: row.chunkCount ?? 0,
            source: row.sourceId
                ? {
                      id: row.sourceId,
                      sourceType: row.sourceType,
                      sourceVersion: row.sourceVersion,
                      lastVerifiedAt: row.lastVerifiedAt,
                      applicableProjectTypes: row.applicableProjectTypes,
                      applicableStates: row.applicableStates,
                      isActive: row.isActive,
                  }
                : null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };

        return NextResponse.json({ domain });
    });
}

// PATCH /api/knowledge-domains/[domainId] - Update domain metadata
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ domainId: string }> }
) {
    return handleApiError(async () => {
        const { domainId } = await params;
        const body = await request.json();
        const { name, description, domainTags, isActive } = body;

        // Verify domain exists
        const [existing] = await ragDb
            .select({ id: documentSets.id })
            .from(documentSets)
            .where(eq(documentSets.id, domainId))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
        }

        // Update document_set fields (name, description, domainTags)
        const setUpdates: Record<string, unknown> = { updatedAt: new Date() };
        if (name !== undefined) setUpdates.name = name;
        if (description !== undefined) setUpdates.description = description;
        if (domainTags !== undefined) setUpdates.domainTags = domainTags;

        await ragDb
            .update(documentSets)
            .set(setUpdates)
            .where(eq(documentSets.id, domainId));

        // Update isActive on knowledge_domain_sources if provided
        if (isActive !== undefined) {
            await ragDb
                .update(knowledgeDomainSources)
                .set({ isActive, updatedAt: new Date() })
                .where(eq(knowledgeDomainSources.documentSetId, domainId));
        }

        // Refetch and return updated domain
        const updated = await ragDb.execute(sql`
            SELECT
                ds.id,
                ds.name,
                ds.description,
                ds.domain_type AS "domainType",
                ds.domain_tags AS "domainTags",
                ds.repo_type AS "repoType",
                ds.is_global AS "isGlobal",
                ds.organization_id AS "organizationId",
                ds.created_at AS "createdAt",
                ds.updated_at AS "updatedAt",
                kds.id AS "sourceId",
                kds.source_type AS "sourceType",
                kds.source_version AS "sourceVersion",
                kds.last_verified_at AS "lastVerifiedAt",
                kds.applicable_project_types AS "applicableProjectTypes",
                kds.applicable_states AS "applicableStates",
                kds.is_active AS "isActive",
                COALESCE(mc.chunk_count, 0)::int AS "chunkCount"
            FROM document_sets ds
            LEFT JOIN knowledge_domain_sources kds ON kds.document_set_id = ds.id
            LEFT JOIN (
                SELECT document_set_id, COUNT(*)::int AS chunk_count
                FROM document_set_members
                WHERE sync_status = 'synced'
                GROUP BY document_set_id
            ) mc ON mc.document_set_id = ds.id
            WHERE ds.id = ${domainId}
        `);

        const row = (updated.rows || [])[0] as any;
        if (!row) {
            return NextResponse.json({ error: 'Failed to fetch updated domain' }, { status: 500 });
        }

        const domain: KnowledgeDomainDTO = {
            id: row.id,
            name: row.name,
            description: row.description,
            domainType: row.domainType,
            domainTags: row.domainTags,
            repoType: row.repoType,
            isGlobal: row.isGlobal,
            organizationId: row.organizationId,
            chunkCount: row.chunkCount ?? 0,
            source: row.sourceId
                ? {
                      id: row.sourceId,
                      sourceType: row.sourceType,
                      sourceVersion: row.sourceVersion,
                      lastVerifiedAt: row.lastVerifiedAt,
                      applicableProjectTypes: row.applicableProjectTypes,
                      applicableStates: row.applicableStates,
                      isActive: row.isActive,
                  }
                : null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };

        return NextResponse.json({ domain });
    });
}

// DELETE /api/knowledge-domains/[domainId] - Soft-delete (set isActive = false)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ domainId: string }> }
) {
    return handleApiError(async () => {
        const { domainId } = await params;

        // Verify domain exists
        const [existing] = await ragDb
            .select({ id: documentSets.id, isGlobal: documentSets.isGlobal })
            .from(documentSets)
            .where(eq(documentSets.id, domainId))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
        }

        // Prebuilt (global) domains cannot be deleted
        if (existing.isGlobal) {
            return NextResponse.json(
                { error: 'Prebuilt domains cannot be deleted' },
                { status: 403 }
            );
        }

        // Soft-delete: set isActive = false on knowledge_domain_sources
        await ragDb
            .update(knowledgeDomainSources)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(knowledgeDomainSources.documentSetId, domainId));

        return NextResponse.json({ success: true, id: domainId });
    });
}
