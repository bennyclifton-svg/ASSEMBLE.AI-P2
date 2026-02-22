import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { ragDb } from '@/lib/db/rag-client';
import { documentSets, documentSetMembers } from '@/lib/db/rag-schema';
import { knowledgeDomainSources } from '@/lib/db/knowledge-domain-sources-schema';
import { sql, eq, isNotNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeDomainDTO {
    id: string;
    name: string;
    description: string | null;
    domainType: string | null;
    domainTags: string[] | null;
    repoType: string | null;
    isGlobal: boolean | null;
    organizationId: string | null;
    chunkCount: number;
    source: {
        id: string;
        sourceType: string;
        sourceVersion: string | null;
        lastVerifiedAt: string | null;
        applicableProjectTypes: string[] | null;
        applicableStates: string[] | null;
        isActive: boolean | null;
    } | null;
    createdAt: string | null;
    updatedAt: string | null;
}

// GET /api/knowledge-domains?organizationId=X
export async function GET(request: NextRequest) {
    return handleApiError(async () => {
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get('organizationId');

        // Query document_sets with domainType IS NOT NULL, joined with knowledge_domain_sources
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
            WHERE ds.domain_type IS NOT NULL
            ORDER BY ds.is_global DESC, ds.name ASC
        `);

        const domains: KnowledgeDomainDTO[] = ((result.rows || []) as any[]).map((row) => ({
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
        }));

        return NextResponse.json({ domains });
    });
}

// POST /api/knowledge-domains - Create a custom domain (organization-scoped)
export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        const body = await request.json();
        const { name, description, domainType, domainTags, organizationId } = body;

        if (!name) {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }
        if (!organizationId) {
            return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
        }

        const domainSetId = uuidv4();
        const sourceId = uuidv4();

        // Create document_set with domain metadata
        await ragDb
            .insert(documentSets)
            .values({
                id: domainSetId,
                name,
                description: description || null,
                repoType: 'knowledge_practices',
                organizationId,
                isGlobal: false,
                domainType: domainType || 'custom',
                domainTags: domainTags || [],
            });

        // Create knowledge_domain_sources record
        await ragDb
            .insert(knowledgeDomainSources)
            .values({
                id: sourceId,
                documentSetId: domainSetId,
                sourceType: 'organization_library',
                isActive: true,
            });

        // Fetch the created domain to return
        const created = await ragDb.execute(sql`
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
                kds.is_active AS "isActive"
            FROM document_sets ds
            LEFT JOIN knowledge_domain_sources kds ON kds.document_set_id = ds.id
            WHERE ds.id = ${domainSetId}
        `);

        const row = (created.rows || [])[0] as any;
        if (!row) {
            return NextResponse.json({ error: 'Failed to create domain' }, { status: 500 });
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
            chunkCount: 0,
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
