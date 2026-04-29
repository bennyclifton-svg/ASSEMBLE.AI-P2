/**
 * /api/chat/threads/[threadId]
 *
 * GET — return the thread + ordered messages (org-scoped).
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { approvals, chatThreads, chatMessages } from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { and, asc, eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ threadId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
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

        const [thread] = await db
            .select()
            .from(chatThreads)
            .where(and(eq(chatThreads.id, threadId), eq(chatThreads.organizationId, orgId)))
            .limit(1);

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }

        const messages = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.threadId, threadId))
            .orderBy(asc(chatMessages.createdAt));

        const pendingApprovals = await db
            .select({
                id: approvals.id,
                runId: approvals.runId,
                toolName: approvals.toolName,
                proposedDiff: approvals.proposedDiff,
            })
            .from(approvals)
            .where(and(eq(approvals.threadId, threadId), eq(approvals.status, 'pending')))
            .orderBy(asc(approvals.createdAt));

        return NextResponse.json({ thread, messages, pendingApprovals });
    });
}
