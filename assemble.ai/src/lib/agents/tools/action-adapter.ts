import { z } from 'zod';
import { policyForActor } from '@/lib/actions/define';
import { parseActionInput, proposeAction, runAction } from '@/lib/actions/dispatch';
import type { ActionContext, ActionDefinition } from '@/lib/actions/types';
import type { AgentTool } from '../completion';
import type { ToolContext } from './_context';
import { assertProjectOrg } from './_context';
import { getTool, registerTool, type AgentToolDefinition } from './catalog';

interface AwaitingApprovalOutput {
    status: 'awaiting_approval';
    approvalId: string;
    toolName: string;
    summary: string;
}

function stripReservedInputFields(schema: Record<string, unknown>): Record<string, unknown> {
    const next = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
    const properties = next.properties;
    if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
        delete (properties as Record<string, unknown>)._toolUseId;
    }
    if (Array.isArray(next.required)) {
        next.required = next.required.filter((key) => key !== '_toolUseId');
    }
    return next;
}

export function actionInputSchemaForTool(action: ActionDefinition): AgentTool['inputSchema'] {
    const jsonSchema = z.toJSONSchema(action.inputSchema) as Record<string, unknown>;
    delete jsonSchema.$schema;
    const inputSchema = stripReservedInputFields(jsonSchema);
    if (inputSchema.type !== 'object') {
        inputSchema.type = 'object';
        inputSchema.properties ??= {};
    }
    return inputSchema as AgentTool['inputSchema'];
}

function actionContextFromToolContext(ctx: ToolContext): ActionContext {
    return {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        projectId: ctx.projectId,
        actorKind: 'agent',
        actorId: ctx.runId,
        threadId: ctx.threadId,
        runId: ctx.runId,
        viewContext: ctx.viewContext ?? null,
    };
}

function toolUseIdFromInput(input: unknown, action: ActionDefinition): string {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
        const maybeToolUseId = (input as Record<string, unknown>)._toolUseId;
        if (typeof maybeToolUseId === 'string' && maybeToolUseId.trim()) {
            return maybeToolUseId;
        }
    }
    return `action:${action.id}`;
}

export function actionToAgentTool(action: ActionDefinition): AgentToolDefinition {
    const agentPolicy = policyForActor(action, 'agent');
    const canMutate = Boolean(action.apply || action.applyResult || action.prepareProposal || action.preview);

    return {
        spec: {
            name: action.toolName,
            description: action.description,
            inputSchema: actionInputSchemaForTool(action),
        },
        mutating: canMutate || agentPolicy !== 'run',
        validate(input: unknown) {
            return parseActionInput(action, input);
        },
        async execute(ctx: ToolContext, input: unknown): Promise<unknown> {
            await assertProjectOrg(ctx);
            const actionCtx = actionContextFromToolContext(ctx);
            if (agentPolicy === 'run') {
                return (await runAction({ action, ctx: actionCtx, input })).output;
            }
            const proposal = await proposeAction({
                action,
                ctx: actionCtx,
                input,
                toolUseId: toolUseIdFromInput(input, action),
            });
            return {
                status: 'awaiting_approval',
                approvalId: proposal.approvalId,
                toolName: action.toolName,
                summary: proposal.summary,
            } satisfies AwaitingApprovalOutput;
        },
    };
}

export function registerActionTools(actions: ActionDefinition[]): void {
    for (const action of actions) {
        if (!action.agentAccess?.length) continue;
        if (getTool(action.toolName)) continue;
        registerTool(actionToAgentTool(action));
    }
}
