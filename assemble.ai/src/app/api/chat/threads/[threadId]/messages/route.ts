/**
 * /api/chat/threads/[threadId]/messages
 *
 * POST — record a user message and trigger an agent run.
 *
 * The agent run executes asynchronously after the response is sent. SSE
 * subscribers on /api/chat/threads/[threadId]/stream see live updates;
 * non-streaming clients can poll GET /api/chat/threads/[threadId] for the
 * final assistant message.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { chatThreads, chatMessages } from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { and, asc, eq } from 'drizzle-orm';
import { runAgent } from '@/lib/agents/runner';
import { DEFAULT_AGENT_NAME } from '@/lib/agents/registry';
import { runOrchestrator } from '@/lib/agents/orchestrator';
import type { AgentMessage } from '@/lib/agents/completion';

interface RouteParams {
    params: Promise<{ threadId: string }>;
}

const MAX_USER_MESSAGE_CHARS = 10_000;

export async function POST(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { threadId } = await params;

        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const orgId = authResult.user.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const text = typeof body?.content === 'string' ? body.content.trim() : '';
        if (!text) {
            return NextResponse.json({ error: 'content is required' }, { status: 400 });
        }
        if (text.length > MAX_USER_MESSAGE_CHARS) {
            return NextResponse.json(
                { error: `content exceeds ${MAX_USER_MESSAGE_CHARS} characters` },
                { status: 413 }
            );
        }
        const requestedAgent =
            typeof body?.agentName === 'string' && body.agentName ? body.agentName : DEFAULT_AGENT_NAME;

        // Load thread and validate ownership.
        const [thread] = await db
            .select()
            .from(chatThreads)
            .where(and(eq(chatThreads.id, threadId), eq(chatThreads.organizationId, orgId)))
            .limit(1);
        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }
        if (thread.userId !== authResult.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Persist the user message first so polling clients see it immediately.
        const [userMessage] = await db
            .insert(chatMessages)
            .values({
                threadId,
                role: 'user',
                content: text,
            })
            .returning();

        // Bump the thread updatedAt so it floats to the top of the list.
        await db.update(chatThreads).set({ updatedAt: new Date() }).where(eq(chatThreads.id, threadId));

        // Build conversation history. For Phase 1 we replay raw text turns
        // only; saved tool_use/tool_result blocks are not persisted yet
        // (they live only in run + tool_calls audit rows for later replay).
        const priorRows = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.threadId, threadId))
            .orderBy(asc(chatMessages.createdAt));

        const history: AgentMessage[] = priorRows
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }));

        // Kick off the run in the background. The route returns immediately;
        // the runner emits SSE events as work progresses.
        const userId = authResult.user.id;
        const projectId = thread.projectId;
        const triggerMessageId = userMessage.id;
        const runPromise =
            requestedAgent === 'orchestrator'
                ? runOrchestrator({
                    threadId,
                    organizationId: orgId,
                    userId,
                    projectId,
                    triggerMessageId,
                    history,
                })
                : runAgent({
                    agentName: requestedAgent,
                    threadId,
                    organizationId: orgId,
                    userId,
                    projectId,
                    triggerMessageId,
                    history,
                });
        void runPromise.catch((err) => {
            console.error('[chat] agent run failed', { threadId, requestedAgent, error: err });
        });

        return NextResponse.json({ message: userMessage }, { status: 202 });
    });
}
