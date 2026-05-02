/**
 * update_risk - propose edits to an existing risk.
 */

import { db } from '@/lib/db';
import { risks } from '@/lib/db/pg-schema';
import { and, eq } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    asObject,
    copyToolUseId,
    ensureAtLeastOneDefined,
    optionalEnum,
    optionalNullableString,
    requiredString,
    updateDiffChanges,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface UpdateRiskInput extends Record<string, unknown> {
    id: string;
    title?: string;
    description?: string | null;
    likelihood?: RiskRating | null;
    impact?: RiskRating | null;
    mitigation?: string | null;
    status?: RiskStatus;
    _toolUseId?: string;
}

const RISK_RATINGS = ['low', 'medium', 'high', 'very_high'] as const;
const RISK_STATUSES = ['identified', 'mitigated', 'closed', 'accepted'] as const;
type RiskRating = (typeof RISK_RATINGS)[number];
type RiskStatus = (typeof RISK_STATUSES)[number];
const TOOL = 'update_risk';
const CHANGE_KEYS = ['title', 'description', 'likelihood', 'impact', 'mitigation', 'status'];

const definition: AgentToolDefinition<UpdateRiskInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose edits to one project risk. Call list_risks first to find the current row. The change requires user approval.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Risk id from list_risks.' },
                title: { type: 'string' },
                description: { type: ['string', 'null'] },
                likelihood: { type: ['string', 'null'], enum: [...RISK_RATINGS, null] },
                impact: { type: ['string', 'null'], enum: [...RISK_RATINGS, null] },
                mitigation: { type: ['string', 'null'] },
                status: { type: 'string', enum: [...RISK_STATUSES] },
            },
            required: ['id'],
        },
    },
    mutating: true,
    validate(input: unknown): UpdateRiskInput {
        const obj = asObject(input, TOOL);
        const out: UpdateRiskInput = { id: requiredString(obj, 'id', TOOL) };
        const title = optionalNullableString(obj, 'title', TOOL);
        if (title !== undefined) {
            if (title === null) throw new Error(`${TOOL}: "title" cannot be null`);
            out.title = title;
        }
        for (const key of ['description', 'mitigation'] as const) {
            const value = optionalNullableString(obj, key, TOOL);
            if (value !== undefined) out[key] = value;
        }
        if (obj.likelihood === null) out.likelihood = null;
        else {
            const likelihood = optionalEnum(obj, 'likelihood', RISK_RATINGS, TOOL);
            if (likelihood !== undefined) out.likelihood = likelihood;
        }
        if (obj.impact === null) out.impact = null;
        else {
            const impact = optionalEnum(obj, 'impact', RISK_RATINGS, TOOL);
            if (impact !== undefined) out.impact = impact;
        }
        const status = optionalEnum(obj, 'status', RISK_STATUSES, TOOL);
        if (status !== undefined) out.status = status;
        copyToolUseId(obj, out);
        ensureAtLeastOneDefined(out, CHANGE_KEYS, TOOL);
        return out;
    },
    async execute(ctx: ToolContext, input: UpdateRiskInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const [row] = await db
            .select()
            .from(risks)
            .where(and(eq(risks.id, input.id), eq(risks.projectId, ctx.projectId)))
            .limit(1);

        if (!row) throw new Error(`Risk ${input.id} not found in this project.`);

        const changes = updateDiffChanges(input, row as unknown as Record<string, unknown>, [
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
            { key: 'likelihood', label: 'Likelihood' },
            { key: 'impact', label: 'Impact' },
            { key: 'mitigation', label: 'Mitigation' },
            { key: 'status', label: 'Status' },
        ]);
        if (changes.length === 0) throw new Error(`${TOOL}: proposed values are identical to the current risk.`);

        const summary = `Update risk - ${row.title}`;
        const diff: ProposedDiff = {
            entity: 'risk',
            entityId: row.id,
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
                expectedRowVersion: row.rowVersion ?? 1,
            })
        ).toolResult;
    },
};

registerTool(definition);

export { definition as updateRiskTool };
