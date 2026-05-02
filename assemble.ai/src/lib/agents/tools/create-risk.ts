/**
 * create_risk - propose a new project risk.
 */

import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    asObject,
    copyToolUseId,
    createDiffChanges,
    optionalEnum,
    optionalString,
    requiredString,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface CreateRiskInput extends Record<string, unknown> {
    title: string;
    description?: string;
    likelihood?: RiskRating;
    impact?: RiskRating;
    mitigation?: string;
    status?: RiskStatus;
    _toolUseId?: string;
}

const RISK_RATINGS = ['low', 'medium', 'high', 'very_high'] as const;
const RISK_STATUSES = ['identified', 'mitigated', 'closed', 'accepted'] as const;
type RiskRating = (typeof RISK_RATINGS)[number];
type RiskStatus = (typeof RISK_STATUSES)[number];
const TOOL = 'create_risk';

const definition: AgentToolDefinition<CreateRiskInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose a new risk in the project risk register. The risk is created only after user approval.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                likelihood: { type: 'string', enum: [...RISK_RATINGS] },
                impact: { type: 'string', enum: [...RISK_RATINGS] },
                mitigation: { type: 'string' },
                status: { type: 'string', enum: [...RISK_STATUSES] },
            },
            required: ['title'],
        },
    },
    mutating: true,
    validate(input: unknown): CreateRiskInput {
        const obj = asObject(input, TOOL);
        const out: CreateRiskInput = { title: requiredString(obj, 'title', TOOL) };
        for (const key of ['description', 'mitigation'] as const) {
            const value = optionalString(obj, key, TOOL);
            if (value !== undefined) out[key] = value;
        }
        const likelihood = optionalEnum(obj, 'likelihood', RISK_RATINGS, TOOL);
        if (likelihood !== undefined) out.likelihood = likelihood;
        const impact = optionalEnum(obj, 'impact', RISK_RATINGS, TOOL);
        if (impact !== undefined) out.impact = impact;
        const status = optionalEnum(obj, 'status', RISK_STATUSES, TOOL);
        if (status !== undefined) out.status = status;
        copyToolUseId(obj, out);
        return out;
    },
    async execute(ctx: ToolContext, input: CreateRiskInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const changes = createDiffChanges(input, [
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
            { key: 'likelihood', label: 'Likelihood' },
            { key: 'impact', label: 'Impact' },
            { key: 'mitigation', label: 'Mitigation' },
            { key: 'status', label: 'Status' },
        ]);
        const summary = `Create risk - ${input.title}`;
        const diff: ProposedDiff = {
            entity: 'risk',
            entityId: null,
            summary,
            changes,
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: input._toolUseId ?? '',
                input,
                proposedDiff: diff,
                expectedRowVersion: null,
            })
        ).toolResult;
    },
};

registerTool(definition);

export { definition as createRiskTool };
