import { emitProjectEvent } from '@/lib/agents/project-events';
import { proposeApproval, type ProposedDiff } from '@/lib/agents/approvals';
import type { ToolContext } from '@/lib/agents/tools/_context';
import type { ActionContext, ActionDefinition } from './types';
import { finishActionInvocation, openActionInvocation } from './invocations';

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

export function parseActionInput<TInput>(
    action: ActionDefinition<TInput>,
    input: unknown
): TInput {
    const parsed = action.inputSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(`Invalid input for action "${action.id}": ${parsed.error.message}`);
    }
    return parsed.data;
}

export function emitActionProjectEvents<TInput, TOutput>(
    action: ActionDefinition<TInput, TOutput>,
    ctx: ActionContext,
    output: TOutput
): void {
    if (!action.emits?.length) return;
    const record = asRecord(output);
    for (const event of action.emits) {
        const outputKey = event.idFromOutput ?? 'id';
        const id = record[outputKey];
        if (typeof id !== 'string') continue;
        emitProjectEvent(ctx.projectId, {
            type: 'entity_updated',
            entity: event.entity,
            op: event.op,
            id,
        });
    }
}

type FinishActionInvocationArgs = Parameters<typeof finishActionInvocation>[1];

function warnActionInvocationAuditFailure(phase: 'open' | 'finish', err: unknown): void {
    if (process.env.NODE_ENV === 'test') return;
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[actions] action_invocations ${phase} failed; continuing without audit row`, message);
}

async function tryOpenActionInvocation(args: {
    actionId: string;
    ctx: ActionContext;
    input: unknown;
}): Promise<string | null> {
    try {
        return await openActionInvocation(args);
    } catch (err) {
        warnActionInvocationAuditFailure('open', err);
        return null;
    }
}

async function tryFinishActionInvocation(
    invocationId: string | null,
    args: FinishActionInvocationArgs
): Promise<void> {
    if (!invocationId) return;
    try {
        await finishActionInvocation(invocationId, args);
    } catch (err) {
        warnActionInvocationAuditFailure('finish', err);
    }
}

export async function runAction<TInput, TOutput>(args: {
    action: ActionDefinition<TInput, TOutput>;
    ctx: ActionContext;
    input: TInput;
}): Promise<{ invocationId: string | null; output: TOutput }> {
    if (!args.action.run && !args.action.apply && !args.action.applyResult) {
        throw new Error(`Action "${args.action.id}" cannot be run directly`);
    }

    const invocationId = await tryOpenActionInvocation({
        actionId: args.action.id,
        ctx: args.ctx,
        input: args.input,
    });

    try {
        let output: TOutput;
        if (args.action.run) {
            output = await args.action.run(args.ctx, args.input);
        } else if (args.action.apply) {
            output = await args.action.apply(args.ctx, args.input, { expectedRowVersion: null });
        } else {
            const result = await args.action.applyResult!(args.ctx, args.input, {
                expectedRowVersion: null,
            });
            if (result.kind !== 'applied') {
                throw new Error(result.reason);
            }
            output = result.output;
        }
        await tryFinishActionInvocation(invocationId, { status: 'applied', output });
        emitActionProjectEvents(args.action, args.ctx, output);
        return { invocationId, output };
    } catch (err) {
        await tryFinishActionInvocation(invocationId, {
            status: 'error',
            error: { message: err instanceof Error ? err.message : String(err) },
        });
        throw err;
    }
}

export async function proposeAction<TInput>(args: {
    action: ActionDefinition<TInput, unknown>;
    ctx: ActionContext;
    input: TInput;
    toolUseId?: string;
    emit?: boolean;
}): Promise<{ invocationId: string | null; approvalId: string; summary: string; proposedDiff: ProposedDiff }> {
    if (!args.action.preview && !args.action.prepareProposal) {
        throw new Error(`Action "${args.action.id}" cannot be proposed because it has no preview`);
    }
    if (!args.ctx.threadId || !args.ctx.runId) {
        throw new Error('Action proposals require a chat thread and synthetic run id');
    }

    const invocationId = await tryOpenActionInvocation({
        actionId: args.action.id,
        ctx: args.ctx,
        input: args.input,
    });

    try {
        const prepared = args.action.prepareProposal
            ? await args.action.prepareProposal(args.ctx, args.input)
            : {
                  proposedDiff: await args.action.preview!(args.ctx, args.input),
                  expectedRowVersion: null,
                  input: args.input,
              };
        const proposalInput = prepared.input ?? args.input;
        const proposal = await proposeApproval({
            ctx: args.ctx as ToolContext,
            toolName: args.action.toolName,
            toolUseId: args.toolUseId ?? `action:${args.action.id}`,
            input: proposalInput,
            proposedDiff: prepared.proposedDiff,
            expectedRowVersion: prepared.expectedRowVersion ?? null,
            emit: args.emit,
        });
        await tryFinishActionInvocation(invocationId, {
            status: 'proposed',
            output: proposal.toolResult,
            approvalId: proposal.approvalId,
        });
        return {
            invocationId,
            approvalId: proposal.approvalId,
            summary: proposal.toolResult.summary,
            proposedDiff: prepared.proposedDiff,
        };
    } catch (err) {
        await tryFinishActionInvocation(invocationId, {
            status: 'error',
            error: { message: err instanceof Error ? err.message : String(err) },
        });
        throw err;
    }
}
