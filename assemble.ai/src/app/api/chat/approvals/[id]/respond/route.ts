/**
 * /api/chat/approvals/[id]/respond
 *
 * POST — user approves or rejects a pending agent-proposed mutation.
 *
 * Approve:
 *   1. Verifies the approval row belongs to the caller's org and project.
 *   2. Atomically claims the pending approval so repeated clicks/retries
 *      cannot apply an append-style mutation more than once.
 *   3. Calls the matching applicator under optimistic-locking.
 *   4. Marks status='applied' (or 'conflict' if rowVersion didn't match).
 *   5. Emits SSE approval_resolved so the chat UI updates the card.
 *
 * Reject:
 *   1. Same ownership check.
 *   2. Marks status='rejected'.
 *   3. Emits SSE approval_resolved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { actionInvocations, approvals, chatThreads } from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { and, eq } from 'drizzle-orm';
import { emitChatEvent } from '@/lib/agents/events';
import { emitProjectEvent, type ProjectEntity } from '@/lib/agents/project-events';
import { applyApproval } from '@/lib/agents/applicators';
import { getActionByToolName } from '@/lib/actions/registry';
import {
    syncWorkflowStepForApproval,
    workflowDependenciesAreApplied,
} from '@/lib/workflows';
import '@/lib/actions';

/** Map a mutating tool name to the project event it should emit. */
function eventForTool(toolName: string): { entity: ProjectEntity; op: 'created' | 'updated' } | null {
    switch (toolName) {
        case 'create_addendum':
            return { entity: 'addendum', op: 'created' };
        case 'create_cost_line':
            return { entity: 'cost_line', op: 'created' };
        case 'update_cost_line':
            return { entity: 'cost_line', op: 'updated' };
        case 'record_invoice':
            return { entity: 'invoice', op: 'created' };
        case 'create_note':
            return { entity: 'note', op: 'created' };
        case 'update_note':
        case 'attach_documents_to_note':
            return { entity: 'note', op: 'updated' };
        case 'create_risk':
            return { entity: 'risk', op: 'created' };
        case 'update_risk':
            return { entity: 'risk', op: 'updated' };
        case 'create_variation':
            return { entity: 'variation', op: 'created' };
        case 'update_variation':
            return { entity: 'variation', op: 'updated' };
        case 'create_meeting':
            return { entity: 'meeting', op: 'created' };
        case 'update_program_activity':
            return { entity: 'program_activity', op: 'updated' };
        case 'create_program_milestone':
            return { entity: 'program_milestone', op: 'created' };
        case 'update_program_milestone':
            return { entity: 'program_milestone', op: 'updated' };
        case 'update_stakeholder':
            return { entity: 'stakeholder', op: 'updated' };
        case 'set_project_objectives':
            return { entity: 'objective', op: 'updated' };
        default:
            return null;
    }
}

function emitActionEvents(
    projectId: string,
    action: ReturnType<typeof getActionByToolName>,
    output: unknown
): boolean {
    if (!action?.emits?.length) return false;
    const record =
        output && typeof output === 'object' && !Array.isArray(output)
            ? (output as Record<string, unknown>)
            : {};

    for (const event of action.emits) {
        const outputKey = event.idFromOutput ?? 'id';
        const id = record[outputKey];
        if (typeof id !== 'string') continue;
        emitProjectEvent(projectId, {
            type: 'entity_updated',
            entity: event.entity,
            op: event.op,
            id,
        });
    }

    return true;
}

function stringArrayFromOutput(record: Record<string, unknown>, key: string): string[] {
    const value = record[key];
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function emitCreateTransmittalProjectEvents(projectId: string, output: unknown): void {
    const record =
        output && typeof output === 'object' && !Array.isArray(output)
            ? (output as Record<string, unknown>)
            : {};
    const id = typeof record.id === 'string' ? record.id : null;
    const documentIds = [
        ...stringArrayFromOutput(record, 'attachedDocumentIds'),
        ...stringArrayFromOutput(record, 'documentIds'),
    ].filter((documentId, index, all) => all.indexOf(documentId) === index);

    if (record.transmittalTarget === 'note' && id) {
        emitProjectEvent(projectId, {
            type: 'entity_updated',
            entity: 'note',
            op: 'created',
            id,
        });
    }

    if (documentIds.length > 0) {
        emitProjectEvent(projectId, {
            type: 'document_selection_changed',
            mode: 'replace',
            documentIds,
        });
    }
}

interface RouteParams {
    params: Promise<{ id: string }>;
}

async function updateActionInvocationForApproval(
    approvalId: string,
    patch: Partial<typeof actionInvocations.$inferInsert>
): Promise<void> {
    try {
        await db
            .update(actionInvocations)
            .set(patch)
            .where(eq(actionInvocations.approvalId, approvalId));
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[chat] action invocation audit update skipped', { approvalId, error: message });
    }
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

        const overrideInput =
            decision === 'approve' &&
            body?.overrideInput !== null &&
            typeof body?.overrideInput === 'object' &&
            !Array.isArray(body?.overrideInput)
                ? (body.overrideInput as Record<string, unknown>)
                : null;

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
            const [claimed] = await db
                .update(approvals)
                .set({
                    status: 'rejected',
                    respondedBy: authResult.user.id,
                    respondedAt: new Date(),
                })
                .where(and(eq(approvals.id, approvalId), eq(approvals.status, 'pending')))
                .returning({ id: approvals.id });

            if (!claimed) {
                return NextResponse.json(
                    { error: 'Approval is already being processed or resolved.' },
                    { status: 409 }
                );
            }

            await updateActionInvocationForApproval(approvalId, {
                status: 'rejected',
                error: { reason: 'User rejected the proposed action.' },
                finishedAt: new Date(),
            });
            await syncWorkflowStepForApproval({
                approvalId,
                state: 'rejected',
                error: { reason: 'User rejected the proposed action.' },
            });

            emitChatEvent(approval.threadId, {
                type: 'approval_resolved',
                approvalId,
                status: 'rejected',
            });

            return NextResponse.json({ status: 'rejected' });
        }

        // Approve path — run the applicator under optimistic locking.
        const dependencyCheck = await workflowDependenciesAreApplied(approvalId);
        if (dependencyCheck.ok === false) {
            return NextResponse.json(
                { status: 'blocked', error: dependencyCheck.reason },
                { status: 409 }
            );
        }

        const [claimed] = await db
            .update(approvals)
            .set({
                status: 'applying',
                respondedBy: authResult.user.id,
                respondedAt: new Date(),
            })
            .where(and(eq(approvals.id, approvalId), eq(approvals.status, 'pending')))
            .returning({ id: approvals.id });

        if (!claimed) {
            return NextResponse.json(
                { error: 'Approval is already being processed or resolved.' },
                { status: 409 }
            );
        }

        let result: Awaited<ReturnType<typeof applyApproval>>;
        try {
            result = await applyApproval({
                toolName: approval.toolName,
                input: overrideInput
                    ? { ...(approval.input as object), ...overrideInput }
                    : approval.input,
                expectedRowVersion: approval.expectedRowVersion ?? null,
                ctx: {
                    organizationId: orgId,
                    projectId: approval.projectId,
                    userId: authResult.user.id,
                    threadId: approval.threadId,
                    runId: approval.runId,
                },
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to apply approval';
            await db
                .update(approvals)
                .set({
                    status: 'conflict',
                    respondedBy: authResult.user.id,
                    respondedAt: new Date(),
                })
                .where(eq(approvals.id, approvalId));

            await updateActionInvocationForApproval(approvalId, {
                status: 'error',
                error: { message },
                finishedAt: new Date(),
            });
            await syncWorkflowStepForApproval({
                approvalId,
                state: 'failed',
                error: { message },
            });

            emitChatEvent(approval.threadId, {
                type: 'approval_resolved',
                approvalId,
                status: 'conflict',
                error: message,
            });

            throw err;
        }

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

            await updateActionInvocationForApproval(approvalId, {
                status: 'applied',
                output: result.output as object,
                finishedAt: new Date(),
            });
            const newlyActionableApprovals =
                (await syncWorkflowStepForApproval({
                    approvalId,
                    state: 'applied',
                    output: result.output,
                })) ?? [];

            emitChatEvent(approval.threadId, {
                type: 'approval_resolved',
                approvalId,
                status: 'applied',
                appliedOutput: result.output,
            });

            for (const nextApproval of newlyActionableApprovals) {
                emitChatEvent(approval.threadId, {
                    type: 'awaiting_approval',
                    runId: nextApproval.runId,
                    approvalId: nextApproval.id,
                    toolName: nextApproval.toolName,
                    proposedDiff: nextApproval.proposedDiff,
                    createdAt: nextApproval.createdAt,
                });
            }

            const action = getActionByToolName(approval.toolName);
            if (approval.toolName === 'create_transmittal') {
                emitCreateTransmittalProjectEvents(approval.projectId, result.output);
            } else if (!emitActionEvents(approval.projectId, action, result.output)) {
                const event = eventForTool(approval.toolName);
                const appliedId = (result.output as { id?: unknown })?.id;
                if (event && typeof appliedId === 'string') {
                    emitProjectEvent(approval.projectId, {
                        type: 'entity_updated',
                        entity: event.entity,
                        op: event.op,
                        id: appliedId,
                    });
                }
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

            await updateActionInvocationForApproval(approvalId, {
                status: 'error',
                error: { reason: result.reason },
                finishedAt: new Date(),
            });
            await syncWorkflowStepForApproval({
                approvalId,
                state: 'failed',
                error: { reason: result.reason },
            });

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

        await updateActionInvocationForApproval(approvalId, {
            status: 'error',
            error: { reason: result.reason },
            finishedAt: new Date(),
        });
        await syncWorkflowStepForApproval({
            approvalId,
            state: 'failed',
            error: { reason: result.reason },
        });

        emitChatEvent(approval.threadId, {
            type: 'approval_resolved',
            approvalId,
            status: 'conflict', // ChatEvent union doesn't have 'gone'; extend events.ts when adding gone UI
            error: result.reason,
        });

        return NextResponse.json({ status: 'gone', error: result.reason }, { status: 410 });
    });
}
