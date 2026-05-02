/**
 * /api/chat/threads/[threadId]
 *
 * GET — return the thread + ordered messages (org-scoped).
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import {
    agentRuns,
    approvals,
    chatThreads,
    chatMessages,
    toolCalls,
} from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { and, asc, desc, eq, gte } from 'drizzle-orm';
import { filterActionablePendingApprovals } from '@/lib/workflows';
import type {
    DocumentSelectionChangedDetail,
    DocumentSelectionMode,
} from '@/lib/chat/document-selection-events';

interface RouteParams {
    params: Promise<{ threadId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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
                createdAt: approvals.createdAt,
            })
            .from(approvals)
            .where(and(eq(approvals.threadId, threadId), eq(approvals.status, 'pending')))
            .orderBy(asc(approvals.createdAt));
        const actionablePendingApprovals =
            await filterActionablePendingApprovals(pendingApprovals);

        const selectionSinceParam = req.nextUrl.searchParams.get('selectionSince');
        const selectionSince = selectionSinceParam ? new Date(selectionSinceParam) : null;
        const documentSelections =
            selectionSince && Number.isFinite(selectionSince.getTime())
                ? await getRecentDocumentSelections(threadId, thread.projectId, selectionSince)
                : [];

        return NextResponse.json({
            thread,
            messages,
            pendingApprovals: actionablePendingApprovals,
            documentSelections,
        });
    });
}

async function getRecentDocumentSelections(
    threadId: string,
    projectId: string,
    selectionSince: Date
): Promise<Array<DocumentSelectionChangedDetail & { createdAt: Date | null }>> {
    const rows = await db
        .select({
            output: toolCalls.output,
            createdAt: toolCalls.createdAt,
        })
        .from(toolCalls)
        .innerJoin(agentRuns, eq(toolCalls.runId, agentRuns.id))
        .where(
            and(
                eq(agentRuns.threadId, threadId),
                eq(toolCalls.toolName, 'select_project_documents'),
                eq(toolCalls.status, 'complete'),
                gte(toolCalls.createdAt, selectionSince)
            )
        )
        .orderBy(desc(toolCalls.createdAt))
        .limit(5);

    return rows
        .map((row) => parseDocumentSelectionOutput(row.output, projectId, row.createdAt))
        .filter((selection): selection is DocumentSelectionChangedDetail & { createdAt: Date | null } =>
            selection !== null
        )
        .reverse();
}

function parseDocumentSelectionOutput(
    output: unknown,
    projectId: string,
    createdAt: Date | null
): (DocumentSelectionChangedDetail & { createdAt: Date | null }) | null {
    if (!output || typeof output !== 'object' || Array.isArray(output)) return null;
    const obj = output as Record<string, unknown>;
    if (obj.status !== 'selection_updated') return null;
    if (!isDocumentSelectionMode(obj.mode)) return null;
    if (!Array.isArray(obj.documentIds)) return null;

    const documentIds = obj.documentIds.filter((id): id is string => typeof id === 'string');
    return {
        projectId,
        mode: obj.mode,
        documentIds,
        createdAt,
    };
}

function isDocumentSelectionMode(value: unknown): value is DocumentSelectionMode {
    return value === 'replace' || value === 'add' || value === 'remove' || value === 'clear';
}
