/**
 * T104: RAG Repos API - List Global & Project Repos
 * GET: List all repos for current context (6 global + project repo)
 * POST: Initialize global repos for an organization (auto-creates 6)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { documentSets, GLOBAL_REPO_TYPES, REPO_TYPE_LABELS } from '@/lib/db/rag-schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/rag-repos
 * List all repos for current context
 * Query params:
 *   - projectId: Required - fetch project-specific repo
 *   - organizationId: Required - fetch 6 global repos for org
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get('projectId');
        const organizationId = searchParams.get('organizationId');

        if (!projectId || !organizationId) {
            return NextResponse.json(
                { error: 'Both projectId and organizationId are required' },
                { status: 400 }
            );
        }

        // Fetch global repos (is_global = true, organization_id matches)
        const globalReposResult = await ragDb.execute(sql`
            SELECT
                ds.id,
                ds.project_id as "projectId",
                ds.name,
                ds.description,
                ds.discipline,
                ds.repo_type as "repoType",
                ds.organization_id as "organizationId",
                ds.is_global as "isGlobal",
                ds.created_at as "createdAt",
                ds.updated_at as "updatedAt",
                COUNT(dsm.id)::int as "memberCount",
                COUNT(CASE WHEN dsm.sync_status = 'synced' THEN 1 END)::int as "syncedCount"
            FROM document_sets ds
            LEFT JOIN document_set_members dsm ON ds.id = dsm.document_set_id
            WHERE ds.is_global = true
              AND ds.organization_id = ${organizationId}
            GROUP BY ds.id
            ORDER BY
                CASE ds.repo_type
                    WHEN 'due_diligence' THEN 1
                    WHEN 'house' THEN 2
                    WHEN 'apartments' THEN 3
                    WHEN 'fitout' THEN 4
                    WHEN 'industrial' THEN 5
                    WHEN 'remediation' THEN 6
                END
        `);

        // Fetch project repo (is_global = false, project_id matches, repo_type = 'project')
        const projectRepoResult = await ragDb.execute(sql`
            SELECT
                ds.id,
                ds.project_id as "projectId",
                ds.name,
                ds.description,
                ds.discipline,
                ds.repo_type as "repoType",
                ds.organization_id as "organizationId",
                ds.is_global as "isGlobal",
                ds.created_at as "createdAt",
                ds.updated_at as "updatedAt",
                COUNT(dsm.id)::int as "memberCount",
                COUNT(CASE WHEN dsm.sync_status = 'synced' THEN 1 END)::int as "syncedCount"
            FROM document_sets ds
            LEFT JOIN document_set_members dsm ON ds.id = dsm.document_set_id
            WHERE ds.is_global = false
              AND ds.project_id = ${projectId}
              AND ds.repo_type = 'project'
            GROUP BY ds.id
            LIMIT 1
        `);

        const globalRepos = globalReposResult.rows || [];
        const projectRepo = projectRepoResult.rows?.[0] || null;

        // Check if global repos need to be initialized
        const missingGlobalRepoTypes = GLOBAL_REPO_TYPES.filter(
            (type) => !globalRepos.find((repo: { repoType: string }) => repo.repoType === type)
        );

        return NextResponse.json({
            globalRepos,
            projectRepo,
            needsInitialization: missingGlobalRepoTypes.length > 0,
            missingTypes: missingGlobalRepoTypes,
        });
    } catch (error) {
        console.error('[rag-repos] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch RAG repos' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/rag-repos
 * Initialize repos for an organization and/or project
 * Body:
 *   - organizationId: Required - creates 6 global repos if missing
 *   - projectId: Optional - creates project repo if missing
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { organizationId, projectId } = body;

        if (!organizationId) {
            return NextResponse.json(
                { error: 'organizationId is required' },
                { status: 400 }
            );
        }

        const now = new Date();
        const createdRepos: Array<{ id: string; type: string; name: string }> = [];

        // Check and create missing global repos
        for (const repoType of GLOBAL_REPO_TYPES) {
            const existingResult = await ragDb.execute(sql`
                SELECT id FROM document_sets
                WHERE is_global = true
                  AND organization_id = ${organizationId}
                  AND repo_type = ${repoType}
                LIMIT 1
            `);

            if (!existingResult.rows?.length) {
                const id = uuidv4();
                const name = REPO_TYPE_LABELS[repoType];

                await ragDb.insert(documentSets).values({
                    id,
                    projectId: null, // Global repos don't belong to a specific project
                    name,
                    description: `Global ${name} knowledge library`,
                    discipline: null,
                    isDefault: false,
                    repoType,
                    organizationId,
                    isGlobal: true,
                    createdAt: now,
                    updatedAt: now,
                });

                createdRepos.push({ id, type: repoType, name });
            }
        }

        // Create project repo if projectId provided and doesn't exist
        if (projectId) {
            const existingProjectRepo = await ragDb.execute(sql`
                SELECT id FROM document_sets
                WHERE is_global = false
                  AND project_id = ${projectId}
                  AND repo_type = 'project'
                LIMIT 1
            `);

            if (!existingProjectRepo.rows?.length) {
                const id = uuidv4();

                await ragDb.insert(documentSets).values({
                    id,
                    projectId,
                    name: 'Project',
                    description: 'Project-specific document context',
                    discipline: null,
                    isDefault: true,
                    repoType: 'project',
                    organizationId: null,
                    isGlobal: false,
                    createdAt: now,
                    updatedAt: now,
                });

                createdRepos.push({ id, type: 'project', name: 'Project' });
            }
        }

        return NextResponse.json({
            created: createdRepos,
            message: createdRepos.length > 0
                ? `Created ${createdRepos.length} repo(s)`
                : 'All repos already exist',
        }, { status: createdRepos.length > 0 ? 201 : 200 });
    } catch (error) {
        console.error('[rag-repos] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to initialize RAG repos' },
            { status: 500 }
        );
    }
}
