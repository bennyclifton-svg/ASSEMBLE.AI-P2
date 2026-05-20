import { emitChatEvent } from '@/lib/agents/events';
import { db } from '@/lib/db';
import { approvals } from '@/lib/db/pg-schema';
import type { ProposedDiff } from './types';

const MONEY_DIFF_SEPARATOR = ' \u2192 ';

export interface ActionProposalContext {
    userId?: string;
    organizationId: string;
    projectId: string;
    threadId: string;
    runId: string;
}

export interface ProposeApprovalArgs {
    ctx: ActionProposalContext;
    toolName: string;
    /** Provider tool_use_id, kept for audit + future deferred-result paths. */
    toolUseId: string;
    /** Raw input the tool received after validation/preparation. */
    input: unknown;
    proposedDiff: ProposedDiff;
    /** Snapshot of the row's row_version at propose time. */
    expectedRowVersion: number | null;
    /** Workflow steps may create a pending approval before it is actionable. */
    emit?: boolean;
}

export interface ProposalResult {
    approvalId: string;
    /** Payload to return as the tool_result so the model knows what happened. */
    toolResult: {
        status: 'awaiting_approval';
        approvalId: string;
        toolName: string;
        summary: string;
    };
}

export async function proposeApproval(args: ProposeApprovalArgs): Promise<ProposalResult> {
    const [row] = await db
        .insert(approvals)
        .values({
            runId: args.ctx.runId,
            threadId: args.ctx.threadId,
            organizationId: args.ctx.organizationId,
            projectId: args.ctx.projectId,
            toolName: args.toolName,
            toolUseId: args.toolUseId,
            input: args.input as object,
            proposedDiff: args.proposedDiff as object,
            expectedRowVersion: args.expectedRowVersion ?? undefined,
            status: 'pending',
        })
        .returning({ id: approvals.id, createdAt: approvals.createdAt });

    const approvalId = row.id;

    if (args.emit !== false) {
        emitChatEvent(args.ctx.threadId, {
            type: 'awaiting_approval',
            runId: args.ctx.runId,
            approvalId,
            toolName: args.toolName,
            proposedDiff: args.proposedDiff,
            createdAt: row.createdAt,
        });
    }

    return {
        approvalId,
        toolResult: {
            status: 'awaiting_approval',
            approvalId,
            toolName: args.toolName,
            summary: args.proposedDiff.summary,
        },
    };
}

/**
 * Format a money diff line for the UI.
 * Cost lines store cents; we surface dollars to the user.
 */
export function moneyDiffLabel(beforeCents: number, afterCents: number): string {
    const dollars = (cents: number) =>
        new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            maximumFractionDigits: 0,
        }).format(cents / 100);
    return `${dollars(beforeCents)}${MONEY_DIFF_SEPARATOR}${dollars(afterCents)}`;
}
