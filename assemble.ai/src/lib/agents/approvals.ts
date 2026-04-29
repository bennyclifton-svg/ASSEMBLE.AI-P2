/**
 * Approval gate primitives.
 *
 * Mutating tools never write directly. They call proposeApproval(), which:
 *   1. Inserts an `approvals` row in status='pending'
 *   2. Emits an `awaiting_approval` SSE event so the chat UI can render the
 *      Approve/Reject card inline
 *   3. Returns a tool_result payload describing the proposal — the model
 *      sees this and ends its turn with text like "submitted for approval".
 *
 * Applying or rejecting the approval lives in the API route, not here —
 * see src/app/api/chat/approvals/[id]/respond/route.ts.
 */

import { db } from '@/lib/db';
import { approvals } from '@/lib/db/pg-schema';
import { emitChatEvent } from './events';
import type { ToolContext } from './tools/_context';

/**
 * Structured diff payload. Keep it self-contained so the UI can render
 * before/after without follow-up DB lookups.
 */
export interface ProposedDiff {
    /** Logical entity name (e.g., 'cost_line', 'variation'). */
    entity: string;
    /** Primary key of the entity being changed (or null for create). */
    entityId: string | null;
    /** Short human-readable summary line for the UI title. */
    summary: string;
    /** Field-level changes. Each entry: name, before, after. */
    changes: Array<{
        field: string;
        label: string;
        before: unknown;
        after: unknown;
    }>;
}

export interface ProposeApprovalArgs {
    ctx: ToolContext;
    toolName: string;
    /** Anthropic tool_use_id — kept for audit + future deferred-result paths. */
    toolUseId: string;
    /** Raw input the tool received (post-validation). */
    input: unknown;
    proposedDiff: ProposedDiff;
    /** Snapshot of the row's row_version at propose time. */
    expectedRowVersion: number | null;
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
        .returning({ id: approvals.id });

    const approvalId = row.id;

    emitChatEvent(args.ctx.threadId, {
        type: 'awaiting_approval',
        runId: args.ctx.runId,
        approvalId,
        toolName: args.toolName,
        proposedDiff: args.proposedDiff,
    });

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
    const dollars = (c: number) =>
        new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            maximumFractionDigits: 0,
        }).format(c / 100);
    return `${dollars(beforeCents)} → ${dollars(afterCents)}`;
}
