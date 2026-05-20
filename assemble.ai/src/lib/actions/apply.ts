import {
    applyCreateCostLine,
    applyCreateMeeting,
    applyCreateRisk,
    applyRecordInvoice,
    applyUpdateRisk,
    applyUpdateVariation,
    type ApplyContext,
    type ApplyResult,
} from '@/lib/agents/applicators';
import { getActionByToolName } from './registry';
import type { ActionContext } from './types';

const loadedActionTools = new Set<string>();

async function ensureActionRegisteredForTool(toolName: string): Promise<void> {
    if (loadedActionTools.has(toolName)) return;
    switch (toolName) {
        case 'add_tender_firms':
            await import('@/lib/actions/definitions/add-tender-firms');
            break;
        case 'create_note':
            await import('@/lib/actions/definitions/create-note');
            break;
        case 'create_cost_line':
            await import('@/lib/actions/definitions/create-cost-line');
            break;
        case 'create_meeting':
            await import('@/lib/actions/definitions/create-meeting');
            break;
        case 'create_outbound_correspondence':
            await import('@/lib/actions/definitions/create-outbound-correspondence');
            break;
        case 'create_report':
            await import('@/lib/actions/definitions/create-report');
            break;
        case 'create_rfi':
            await import('@/lib/actions/definitions/create-rfi');
            break;
        case 'create_program_activity':
            await import('@/lib/actions/definitions/create-program-activity');
            break;
        case 'create_program_milestone':
            await import('@/lib/actions/definitions/create-program-milestone');
            break;
        case 'create_risk':
            await import('@/lib/actions/definitions/create-risk');
            break;
        case 'replace_program':
            await import('@/lib/actions/definitions/replace-program');
            break;
        case 'record_invoice':
            await import('@/lib/actions/definitions/record-invoice');
            break;
        case 'create_transmittal':
            await import('@/lib/actions/definitions/create-transmittal');
            break;
        case 'create_variation':
            await import('@/lib/actions/definitions/create-variation');
            break;
        case 'attach_documents_to_note':
            await import('@/lib/actions/definitions/attach-documents-to-note');
            break;
        case 'set_project_objectives':
            await import('@/lib/actions/definitions/set-project-objectives');
            break;
        case 'update_cost_line':
            await import('@/lib/actions/definitions/update-cost-line');
            break;
        case 'update_note':
            await import('@/lib/actions/definitions/update-note');
            break;
        case 'update_program_activity':
            await import('@/lib/actions/definitions/update-program-activity');
            break;
        case 'update_program_milestone':
            await import('@/lib/actions/definitions/update-program-milestone');
            break;
        case 'update_rft_brief':
            await import('@/lib/actions/definitions/update-rft-brief');
            break;
        case 'update_risk':
            await import('@/lib/actions/definitions/update-risk');
            break;
        case 'update_stakeholder':
            await import('@/lib/actions/definitions/update-stakeholder');
            break;
        case 'update_variation':
            await import('@/lib/actions/definitions/update-variation');
            break;
        default:
            await import('@/lib/actions');
            break;
    }
    loadedActionTools.add(toolName);
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function legacyCompatibleInvalidActionInput(actionId: string, rawInput: unknown): ApplyResult | null {
    const input = asRecord(rawInput);
    if (actionId === 'finance.variations.create' && input.status !== undefined) {
        return {
            kind: 'gone',
            reason: 'Invalid variation status. Use Forecast, Approved, Rejected, or Withdrawn.',
        };
    }
    if (actionId === 'planning.objectives.set') {
        return { kind: 'gone', reason: 'No objective sections were supplied.' };
    }
    if (actionId === 'correspondence.meeting.create' && input.title === undefined) {
        return { kind: 'gone', reason: 'Missing meeting title on proposal.' };
    }
    return null;
}

export async function applyApproval(args: {
    toolName: string;
    input: unknown;
    expectedRowVersion: number | null;
    ctx: ApplyContext;
}): Promise<ApplyResult> {
    let action = getActionByToolName(args.toolName);
    if (!action) {
        await ensureActionRegisteredForTool(args.toolName);
        action = getActionByToolName(args.toolName);
    }
    if (action) {
        if (!action.apply && !action.applyResult) {
            throw new Error(`Action-backed approval "${action.id}" has no apply handler`);
        }
        const parsed = action.inputSchema.safeParse(args.input);
        if (!parsed.success) {
            const compatibleResult = legacyCompatibleInvalidActionInput(action.id, args.input);
            if (compatibleResult) return compatibleResult;
            return {
                kind: 'gone',
                reason: `Invalid input for action "${action.id}": ${parsed.error.message}`,
            };
        }
        const actionCtx: ActionContext = {
            userId: args.ctx.userId ?? 'approval',
            organizationId: args.ctx.organizationId,
            projectId: args.ctx.projectId,
            actorKind: args.ctx.userId ? 'user' : 'system',
            actorId: args.ctx.userId ?? 'approval',
            threadId: args.ctx.threadId ?? null,
            runId: args.ctx.runId ?? null,
        };
        let output: unknown;
        try {
            if (action.applyResult) {
                return action.applyResult(actionCtx, parsed.data, {
                    expectedRowVersion: args.expectedRowVersion,
                }) as Promise<ApplyResult>;
            }
            output = await action.apply!(actionCtx, parsed.data, {
                expectedRowVersion: args.expectedRowVersion,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.startsWith('Document(s) not found in this project:')) {
                return { kind: 'gone', reason: message };
            }
            throw err;
        }
        return { kind: 'applied', output: output as Record<string, unknown> };
    }

    switch (args.toolName) {
        case 'create_cost_line':
            return applyCreateCostLine(args.input, args.ctx);
        case 'record_invoice':
            return applyRecordInvoice(args.input, args.ctx);
        case 'create_risk':
            return applyCreateRisk(args.input, args.ctx);
        case 'update_risk':
            return applyUpdateRisk(args.input, args.expectedRowVersion, args.ctx);
        case 'update_variation':
            return applyUpdateVariation(args.input, args.expectedRowVersion, args.ctx);
        case 'create_meeting':
            return applyCreateMeeting(args.input, args.ctx);
        default:
            throw new Error(`No applicator registered for tool "${args.toolName}"`);
    }
}
