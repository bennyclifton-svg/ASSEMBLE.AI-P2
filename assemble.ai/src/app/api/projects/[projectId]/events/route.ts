/**
 * /api/projects/[projectId]/events
 *
 * Server-Sent Events. Emits entity_updated events when project-scoped
 * mutations land (today: agent-approved cost-line writes). Auth-gated:
 * caller must belong to the project's organization.
 *
 * Pattern mirrors src/app/api/chat/threads/[threadId]/stream/route.ts.
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { and, eq } from 'drizzle-orm';
import {
    registerProjectConnection,
    unregisterProjectConnection,
} from '@/lib/agents/project-events';

interface RouteParams {
    params: Promise<{ projectId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { projectId } = await params;

    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return new Response('Unauthorized', { status: 401 });
    }
    const orgId = authResult.user.organizationId;
    if (!orgId) {
        return new Response('User has no organization', { status: 400 });
    }

    const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
        .limit(1);

    if (!project) {
        return new Response('Project not found', { status: 404 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            registerProjectConnection(projectId, controller);
            controller.enqueue(
                encoder.encode(`event: connected\ndata: ${JSON.stringify({ projectId })}\n\n`)
            );
        },
        cancel(controller) {
            unregisterProjectConnection(projectId, controller);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
