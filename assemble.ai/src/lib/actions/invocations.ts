import { db } from '@/lib/db';
import { actionInvocations } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ActionContext, ActionInvocationStatus } from './types';

export interface OpenActionInvocationArgs {
    actionId: string;
    ctx: ActionContext;
    input: unknown;
    status?: ActionInvocationStatus;
}

export async function openActionInvocation(args: OpenActionInvocationArgs): Promise<string> {
    const [row] = await db
        .insert(actionInvocations)
        .values({
            actionId: args.actionId,
            actorKind: args.ctx.actorKind,
            actorId: args.ctx.actorId,
            organizationId: args.ctx.organizationId,
            projectId: args.ctx.projectId,
            threadId: args.ctx.threadId ?? null,
            runId: args.ctx.runId ?? null,
            workflowStepId: args.ctx.workflowStepId ?? null,
            input: args.input as object,
            viewContext: args.ctx.viewContext as object | undefined,
            status: args.status ?? 'running',
        })
        .returning({ id: actionInvocations.id });
    return row.id;
}

export async function finishActionInvocation(
    id: string,
    args: {
        status: ActionInvocationStatus;
        output?: unknown;
        approvalId?: string | null;
        error?: unknown;
    }
): Promise<void> {
    await db
        .update(actionInvocations)
        .set({
            status: args.status,
            output: args.output as object | undefined,
            approvalId: args.approvalId ?? undefined,
            error: args.error as object | undefined,
            finishedAt: new Date(),
        })
        .where(eq(actionInvocations.id, id));
}
