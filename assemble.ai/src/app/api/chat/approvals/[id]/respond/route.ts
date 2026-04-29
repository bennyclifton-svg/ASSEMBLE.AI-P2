/**
 * /api/chat/approvals/[id]/respond
 *
 * POST — user approves or rejects a pending agent-proposed mutation.
 *
 * Approve:
 *   1. Verifies the approval row belongs to the caller's org and project.
 *   2. Calls the matching applicator under optimistic-locking.
 *   3. Marks status='applied' (or 'conflict' if rowVersion didn't match).
 *   4. Emits SSE approval_resolved so the chat UI updates the card.
 *
 * Reject:
 *   1. Same ownership check.
 *   2. Marks status='rejected'.
 *   3. Emits SSE approval_resolved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { approvals, chatThreads } from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { and, eq } from 'drizzle-orm';
import { emitChatEvent } from '@/lib/agents/events';
import { emitProjectEvent, type ProjectEntity } from '@/lib/agents/project-events';
import { applyApproval } from '@/lib/agents/applicators';

/** Map a mutating tool name to the entity type it touches. Returns null for unknown tools. */
function entityForTool(toolName: string): ProjectEntity | null {
    switch (toolName) {
        case 'update_cost_line':
        case 'create_cost_line':
            return 'cost_line';
        default:
            return null;
    }
}

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id: approvalId } = await params;

        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const orgId = authResult.user.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const decision = body?.decision;
        if (decision !== 'approve' && decision !== 'reject') {
            return NextResponse.json(
                { error: '"decision" must be "approve" or "reject"' },
                { status: 400 }
            );
        }

        // Load approval + verify org + thread ownership
        const [approval] = await db
            .select()
            .from(approvals)
            .where(and(eq(approvals.id, approvalId), eq(approvals.organizationId, orgId)))
            .limit(1);

        if (!approval) {
            return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
        }
        if (approval.status !== 'pending') {
            return NextResponse.json(
                { error: `Approval already resolved (${approval.status})` },
                { status: 409 }
            );
        }

        // Confirm the caller owns the thread the approval belongs to.
        const [thread] = await db
            .select({ userId: chatThreads.userId })
            .from(chatThreads)
            .where(eq(chatThreads.id, approval.threadId))
            .limit(1);
        if (!thread || thread.userId !== authResult.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (decision === 'reject') {
            await db
                .update(approvals)
                .set({
                    status: 'rejected',
                    respondedBy: authResult.user.id,
                    respondedAt: new Date(),
                })
                .where(eq(approvals.id, approvalId));

            emitChatEvent(approval.threadId, {
                type: 'approval_resolved',
                approvalId,
                status: 'rejected',
            });

            return NextResponse.json({ status: 'rejected' });
        }

        // Approve path — run the applicator under optimistic locking.
        const result = await applyApproval({
            toolName: approval.toolName,
            input: approval.input,
            expectedRowVersion: approval.expectedRowVersion ?? null,
            ctx: {
                organizationId: orgId,
                projectId: approval.projectId,
            },
        });

        if (result.kind === 'applied') {
            await db
                .update(approvals)
                .set({
                    status: 'applied',
                    appliedOutput: result.output as object,
                    respondedBy: authResult.user.id,
                    respondedAt: new Date(),
                })
                .where(eq(approvals.id, approvalId));

            emitChatEvent(approval.threadId, {
                type: 'approval_resolved',
                approvalId,
                status: 'applied',
                appliedOutput: result.output,
            });

            const entity = entityForTool(approval.toolName);
            const appliedId = (result.output as { id?: unknown })?.id;
            if (entity && typeof appliedId === 'string') {
                emitProjectEvent(approval.projectId, {
                    type: 'entity_updated',
                    entity,
                    op: approval.toolName === 'create_cost_line' ? 'created' : 'updated',
                    id: appliedId,
                });
            }

            return NextResponse.json({ status: 'applied', output: result.output });
        }

        if (result.kind === 'conflict') {
            await db
                .update(approvals)
                .set({
                    status: 'conflict',
                    respondedBy: authResult.user.id,
                    respondedAt: new Date(),
                })
                .where(eq(approvals.id, approvalId));

            emitChatEvent(approval.threadId, {
                type: 'approval_resolved',
                approvalId,
                status: 'conflict',
                error: result.reason,
            });

            return NextResponse.json({ status: 'conflict', error: result.reason }, { status: 409 });
        }

        // 'gone' — row deleted between propose and apply.
        await db
            .update(approvals)
            .set({
                status: 'expired',
                respondedBy: authResult.user.id,
                respondedAt: new Date(),
            })
            .where(eq(approvals.id, approvalId));

        emitChatEvent(approval.threadId, {
            type: 'approval_resolved',
            approvalId,
            status: 'conflict',
            error: result.reason,
        });

        return NextResponse.json({ status: 'gone', error: result.reason }, { status: 410 });
    });
}
