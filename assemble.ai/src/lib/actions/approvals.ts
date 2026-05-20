import { and, eq } from 'drizzle-orm';
import { emitChatEvent } from '@/lib/agents/events';
import { emitProjectEvent, type ProjectEntity } from '@/lib/agents/project-events';
import type { ApplyContext, ApplyResult } from '@/lib/agents/applicators';
import { db } from '@/lib/db';
import { actionInvocations, approvals } from '@/lib/db/pg-schema';
import {
    syncWorkflowStepForApproval,
    workflowDependenciesAreApplied,
} from '@/lib/workflows';
import type { ActionableWorkflowApproval } from '@/lib/workflows/runner';
import { applyApproval } from './apply';
import { emitActionProjectEvents } from './dispatch';
import { getActionByToolName } from './registry';
import type { ActionContext } from './types';

export { applyApproval } from './apply';

export type ActionApproval = typeof approvals.$inferSelect;

export type LoadActionApprovalResult =
    | { status: 'ready'; approval: ActionApproval }
    | { status: 'not_found' }
    | { status: 'already_resolved'; approvalStatus: string };

export type RejectActionProposalResult =
    | { status: 'rejected' }
    | { status: 'already_claimed' };

export type ApproveActionProposalResult =
    | {
          status: 'applied';
          output: Record<string, unknown>;
          newlyActionableApprovals: ActionableWorkflowApproval[];
      }
    | { status: 'blocked'; reason: string }
    | { status: 'already_claimed' }
    | { status: 'conflict'; reason: string }
    | { status: 'gone'; reason: string };

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function mergeApprovalInput(input: unknown, overrideInput: Record<string, unknown> | null): unknown {
    if (!overrideInput) return input;
    return { ...asRecord(input), ...overrideInput };
}

function actionContextFromApproval(approval: ActionApproval, userId: string): ActionContext {
    return {
        userId,
        organizationId: approval.organizationId,
        projectId: approval.projectId,
        actorKind: 'user',
        actorId: userId,
        threadId: approval.threadId,
        runId: approval.runId,
    };
}

function applyContextFromApproval(approval: ActionApproval, userId: string): ApplyContext {
    return {
        organizationId: approval.organizationId,
        projectId: approval.projectId,
        userId,
        threadId: approval.threadId,
        runId: approval.runId,
    };
}

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
        case 'create_report':
            return { entity: 'report', op: 'created' };
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
        console.warn('[actions] action invocation audit update skipped', { approvalId, error: message });
    }
}

async function emitAppliedProjectEvents(
    approval: ActionApproval,
    userId: string,
    output: Record<string, unknown>
): Promise<void> {
    const action = getActionByToolName(approval.toolName);
    const emitted = action
        ? await emitActionProjectEvents(action, actionContextFromApproval(approval, userId), output)
        : false;
    if (emitted) return;

    const event = eventForTool(approval.toolName);
    const appliedId = output.id;
    if (event && typeof appliedId === 'string') {
        emitProjectEvent(approval.projectId, {
            type: 'entity_updated',
            entity: event.entity,
            op: event.op,
            id: appliedId,
        });
    }
}

export async function loadActionApprovalForResponse(args: {
    approvalId: string;
    organizationId: string;
}): Promise<LoadActionApprovalResult> {
    const [approval] = await db
        .select()
        .from(approvals)
        .where(and(eq(approvals.id, args.approvalId), eq(approvals.organizationId, args.organizationId)))
        .limit(1);

    if (!approval) return { status: 'not_found' };
    if (approval.status !== 'pending') {
        return { status: 'already_resolved', approvalStatus: approval.status };
    }
    return { status: 'ready', approval };
}

export async function rejectActionProposal(args: {
    approval: ActionApproval;
    userId: string;
}): Promise<RejectActionProposalResult> {
    const { approval, userId } = args;
    const [claimed] = await db
        .update(approvals)
        .set({
            status: 'rejected',
            respondedBy: userId,
            respondedAt: new Date(),
        })
        .where(and(eq(approvals.id, approval.id), eq(approvals.status, 'pending')))
        .returning({ id: approvals.id });

    if (!claimed) return { status: 'already_claimed' };

    await updateActionInvocationForApproval(approval.id, {
        status: 'rejected',
        error: { reason: 'User rejected the proposed action.' },
        finishedAt: new Date(),
    });
    await syncWorkflowStepForApproval({
        approvalId: approval.id,
        state: 'rejected',
        error: { reason: 'User rejected the proposed action.' },
    });

    emitChatEvent(approval.threadId, {
        type: 'approval_resolved',
        approvalId: approval.id,
        status: 'rejected',
    });

    return { status: 'rejected' };
}

export async function approveActionProposal(args: {
    approval: ActionApproval;
    userId: string;
    overrideInput?: Record<string, unknown> | null;
}): Promise<ApproveActionProposalResult> {
    const { approval, userId } = args;
    const dependencyCheck = await workflowDependenciesAreApplied(approval.id);
    if (dependencyCheck.ok === false) {
        return { status: 'blocked', reason: dependencyCheck.reason };
    }

    const [claimed] = await db
        .update(approvals)
        .set({
            status: 'applying',
            respondedBy: userId,
            respondedAt: new Date(),
        })
        .where(and(eq(approvals.id, approval.id), eq(approvals.status, 'pending')))
        .returning({ id: approvals.id });

    if (!claimed) return { status: 'already_claimed' };

    let result: ApplyResult;
    try {
        result = await applyApproval({
            toolName: approval.toolName,
            input: mergeApprovalInput(approval.input, args.overrideInput ?? null),
            expectedRowVersion: approval.expectedRowVersion ?? null,
            ctx: applyContextFromApproval(approval, userId),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to apply approval';
        await db
            .update(approvals)
            .set({
                status: 'conflict',
                respondedBy: userId,
                respondedAt: new Date(),
            })
            .where(eq(approvals.id, approval.id));

        await updateActionInvocationForApproval(approval.id, {
            status: 'error',
            error: { message },
            finishedAt: new Date(),
        });
        await syncWorkflowStepForApproval({
            approvalId: approval.id,
            state: 'failed',
            error: { message },
        });

        emitChatEvent(approval.threadId, {
            type: 'approval_resolved',
            approvalId: approval.id,
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
                appliedOutput: result.output,
                respondedBy: userId,
                respondedAt: new Date(),
            })
            .where(eq(approvals.id, approval.id));

        await updateActionInvocationForApproval(approval.id, {
            status: 'applied',
            output: result.output,
            finishedAt: new Date(),
        });
        const newlyActionableApprovals =
            (await syncWorkflowStepForApproval({
                approvalId: approval.id,
                state: 'applied',
                output: result.output,
            })) ?? [];

        emitChatEvent(approval.threadId, {
            type: 'approval_resolved',
            approvalId: approval.id,
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

        await emitAppliedProjectEvents(approval, userId, result.output);
        return {
            status: 'applied',
            output: result.output,
            newlyActionableApprovals,
        };
    }

    if (result.kind === 'conflict') {
        await db
            .update(approvals)
            .set({
                status: 'conflict',
                respondedBy: userId,
                respondedAt: new Date(),
            })
            .where(eq(approvals.id, approval.id));

        await updateActionInvocationForApproval(approval.id, {
            status: 'error',
            error: { reason: result.reason },
            finishedAt: new Date(),
        });
        await syncWorkflowStepForApproval({
            approvalId: approval.id,
            state: 'failed',
            error: { reason: result.reason },
        });

        emitChatEvent(approval.threadId, {
            type: 'approval_resolved',
            approvalId: approval.id,
            status: 'conflict',
            error: result.reason,
        });

        return { status: 'conflict', reason: result.reason };
    }

    await db
        .update(approvals)
        .set({
            status: 'expired',
            respondedBy: userId,
            respondedAt: new Date(),
        })
        .where(eq(approvals.id, approval.id));

    await updateActionInvocationForApproval(approval.id, {
        status: 'error',
        error: { reason: result.reason },
        finishedAt: new Date(),
    });
    await syncWorkflowStepForApproval({
        approvalId: approval.id,
        state: 'failed',
        error: { reason: result.reason },
    });

    emitChatEvent(approval.threadId, {
        type: 'approval_resolved',
        approvalId: approval.id,
        status: 'conflict',
        error: result.reason,
    });

    return { status: 'gone', reason: result.reason };
}
