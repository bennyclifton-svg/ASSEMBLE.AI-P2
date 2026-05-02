import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-utils';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/lib/db';
import { agentRuns, chatThreads, projects } from '@/lib/db/pg-schema';
import {
    getAction,
    parseActionInput,
    proposeAction,
    type ActionContext,
} from '@/lib/actions';
import { sanitizeChatViewContext } from '@/lib/chat/view-context';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id } = await params;
        const actionId = decodeURIComponent(id);
        const action = getAction(actionId);
        if (!action) {
            return NextResponse.json({ error: `Action "${actionId}" not found` }, { status: 404 });
        }

        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const orgId = authResult.user.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const projectId = typeof body?.projectId === 'string' ? body.projectId : null;
        const threadId = typeof body?.threadId === 'string' ? body.threadId : null;
        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }
        if (!threadId) {
            return NextResponse.json(
                { error: 'threadId is required for action proposals in this phase' },
                { status: 400 }
            );
        }

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

        const [thread] = await db
            .select({
                id: chatThreads.id,
                userId: chatThreads.userId,
                projectId: chatThreads.projectId,
                organizationId: chatThreads.organizationId,
            })
            .from(chatThreads)
            .where(and(eq(chatThreads.id, threadId), eq(chatThreads.organizationId, orgId)))
            .limit(1);
        if (!thread || thread.projectId !== projectId) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }
        if (thread.userId !== authResult.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const [run] = await db
            .insert(agentRuns)
            .values({
                threadId,
                triggerMessageId: null,
                agentName: `action:${action.id}`,
                status: 'complete',
                finishedAt: new Date(),
            })
            .returning({ id: agentRuns.id });

        const input = parseActionInput(action, body?.input ?? {});
        const viewContext = sanitizeChatViewContext(body?.viewContext, projectId);
        const ctx: ActionContext = {
            userId: authResult.user.id,
            organizationId: orgId,
            projectId,
            actorKind: 'user',
            actorId: authResult.user.id,
            threadId,
            runId: run.id,
            viewContext,
        };
        const result = await proposeAction({ action, ctx, input });

        return NextResponse.json({
            status: 'proposed',
            invocationId: result.invocationId,
            approvalId: result.approvalId,
            summary: result.summary,
        });
    });
}
