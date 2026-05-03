/**
 * /api/chat/threads/[threadId]/stream
 *
 * Server-Sent Events. Client subscribes to receive run/tool/message events
 * emitted by the agent runner in real time. Auth-gated per request — only
 * the thread's owning user, in the matching org, can subscribe.
 *
 * Pattern mirrors src/app/api/reports/[id]/stream/route.ts.
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { chatThreads, approvals } from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { and, eq, asc } from 'drizzle-orm';
import { registerChatConnection, unregisterChatConnection } from '@/lib/agents/events';
import { filterActionablePendingApprovals } from '@/lib/workflows';

interface RouteParams {
    params: Promise<{ threadId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { threadId } = await params;

    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return new Response('Unauthorized', { status: 401 });
    }
    const orgId = authResult.user.organizationId;
    if (!orgId) {
        return new Response('User has no organization', { status: 400 });
    }

    const [thread] = await db
        .select({ id: chatThreads.id, userId: chatThreads.userId })
        .from(chatThreads)
        .where(and(eq(chatThreads.id, threadId), eq(chatThreads.organizationId, orgId)))
        .limit(1);

    if (!thread) {
        return new Response('Thread not found', { status: 404 });
    }
    if (thread.userId !== authResult.user.id) {
        return new Response('Forbidden', { status: 403 });
    }

    const encoder = new TextEncoder();
    let savedController: ReadableStreamDefaultController;
    const stream = new ReadableStream({
        start(controller) {
            savedController = controller;
            registerChatConnection(threadId, controller);
            controller.enqueue(
                encoder.encode(`event: connected\ndata: ${JSON.stringify({ threadId })}\n\n`)
            );

            // Replay any pending approvals for this thread so the UI rehydrates
            // after a reload, dock collapse-and-reopen, or SSE reconnect.
            // Pending approvals only — resolved ones don't need a card.
            void replayPendingApprovals(controller, threadId);
        },
        cancel() {
            unregisterChatConnection(threadId, savedController);
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

async function replayPendingApprovals(
    controller: ReadableStreamDefaultController,
    threadId: string
): Promise<void> {
    try {
        const rows = await db
            .select({
                id: approvals.id,
                runId: approvals.runId,
                toolName: approvals.toolName,
                proposedDiff: approvals.proposedDiff,
                status: approvals.status,
                createdAt: approvals.createdAt,
            })
            .from(approvals)
            .where(and(eq(approvals.threadId, threadId), eq(approvals.status, 'pending')))
            .orderBy(asc(approvals.createdAt));

        const actionableRows = await filterActionablePendingApprovals(rows);
        if (actionableRows.length === 0) return;

        const encoder = new TextEncoder();
        for (const r of actionableRows) {
            const event = {
                type: 'awaiting_approval' as const,
                runId: r.runId,
                approvalId: r.id,
                toolName: r.toolName,
                proposedDiff: r.proposedDiff,
                createdAt: r.createdAt,
            };
            try {
                controller.enqueue(
                    encoder.encode(`event: awaiting_approval\ndata: ${JSON.stringify(event)}\n\n`)
                );
            } catch {
                // controller closed; nothing to do
                return;
            }
        }
    } catch (err) {
        console.error('[chat-stream] failed to replay pending approvals', { threadId, err });
    }
}
