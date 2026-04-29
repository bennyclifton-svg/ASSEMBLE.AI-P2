/**
 * /api/chat/threads
 *
 * GET  ?projectId=X — list active threads for a project (current org only)
 * POST                — create a new thread for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { chatThreads, projects } from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { and, eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        const rows = await db
            .select()
            .from(chatThreads)
            .where(
                and(
                    eq(chatThreads.projectId, projectId),
                    eq(chatThreads.organizationId, authResult.user.organizationId),
                    eq(chatThreads.userId, authResult.user.id),
                    eq(chatThreads.status, 'active')
                )
            )
            .orderBy(desc(chatThreads.updatedAt));

        return NextResponse.json({ threads: rows });
    });
}

export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const orgId = authResult.user.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const projectId = body?.projectId;
        const title = typeof body?.title === 'string' && body.title.trim().length > 0
            ? body.title.trim().slice(0, 200)
            : 'New conversation';

        if (!projectId || typeof projectId !== 'string') {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Verify the project belongs to this user's organization
        const [project] = await db
            .select({ organizationId: projects.organizationId })
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        if (project.organizationId !== orgId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const [created] = await db
            .insert(chatThreads)
            .values({
                projectId,
                organizationId: orgId,
                userId: authResult.user.id,
                title,
            })
            .returning();

        return NextResponse.json({ thread: created }, { status: 201 });
    });
}
