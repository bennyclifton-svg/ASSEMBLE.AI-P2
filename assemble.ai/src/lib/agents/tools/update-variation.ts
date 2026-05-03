/**
 * update_variation - propose edits to a variation register item.
 */

import { db } from '@/lib/db';
import { variations } from '@/lib/db/pg-schema';
import { and, eq, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    asObject,
    copyToolUseId,
    ensureAtLeastOneDefined,
    moneyValue,
    optionalEnum,
    optionalNonNegativeInteger,
    optionalNullableIsoDate,
    optionalNullableString,
    requiredString,
    updateDiffChanges,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface UpdateVariationInput extends Record<string, unknown> {
    id: string;
    category?: VariationCategory;
    description?: string;
    status?: VariationStatus;
    costLineId?: string | null;
    amountForecastCents?: number;
    amountApprovedCents?: number;
    dateSubmitted?: string | null;
    dateApproved?: string | null;
    requestedBy?: string | null;
    approvedBy?: string | null;
    _toolUseId?: string;
}

const VARIATION_CATEGORIES = ['Principal', 'Contractor', 'Lessor Works'] as const;
const VARIATION_STATUSES = ['Forecast', 'Approved', 'Rejected', 'Withdrawn'] as const;
type VariationCategory = (typeof VARIATION_CATEGORIES)[number];
type VariationStatus = (typeof VARIATION_STATUSES)[number];
const TOOL = 'update_variation';
const CHANGE_KEYS = [
    'category',
    'description',
    'status',
    'costLineId',
    'amountForecastCents',
    'amountApprovedCents',
    'dateSubmitted',
    'dateApproved',
    'requestedBy',
    'approvedBy',
];

const definition: AgentToolDefinition<UpdateVariationInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose edits to one variation. Call list_variations first to find the current row. Amounts are in cents and the change requires user approval.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Variation id from list_variations.' },
                category: { type: 'string', enum: [...VARIATION_CATEGORIES] },
                description: { type: 'string' },
                status: { type: 'string', enum: [...VARIATION_STATUSES] },
                costLineId: { type: ['string', 'null'] },
                amountForecastCents: { type: 'integer', minimum: 0 },
                amountApprovedCents: { type: 'integer', minimum: 0 },
                dateSubmitted: { type: ['string', 'null'], description: 'YYYY-MM-DD or null.' },
                dateApproved: { type: ['string', 'null'], description: 'YYYY-MM-DD or null.' },
                requestedBy: { type: ['string', 'null'] },
                approvedBy: { type: ['string', 'null'] },
            },
            required: ['id'],
        },
    },
    mutating: true,
    validate(input: unknown): UpdateVariationInput {
        const obj = asObject(input, TOOL);
        const out: UpdateVariationInput = { id: requiredString(obj, 'id', TOOL) };
        const category = optionalEnum(obj, 'category', VARIATION_CATEGORIES, TOOL);
        if (category !== undefined) out.category = category;
        const description = optionalNullableString(obj, 'description', TOOL);
        if (description !== undefined) {
            if (description === null) throw new Error(`${TOOL}: "description" cannot be null`);
            out.description = description;
        }
        const status = optionalEnum(obj, 'status', VARIATION_STATUSES, TOOL);
        if (status !== undefined) out.status = status;
        for (const key of ['costLineId', 'requestedBy', 'approvedBy'] as const) {
            const value = optionalNullableString(obj, key, TOOL);
            if (value !== undefined) out[key] = value;
        }
        for (const key of ['amountForecastCents', 'amountApprovedCents'] as const) {
            const value = optionalNonNegativeInteger(obj, key, TOOL);
            if (value !== undefined) out[key] = value;
        }
        for (const key of ['dateSubmitted', 'dateApproved'] as const) {
            const value = optionalNullableIsoDate(obj, key, TOOL);
            if (value !== undefined) out[key] = value;
        }
        copyToolUseId(obj, out);
        ensureAtLeastOneDefined(out, CHANGE_KEYS, TOOL);
        return out;
    },
    async execute(ctx: ToolContext, input: UpdateVariationInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const [row] = await db
            .select()
            .from(variations)
            .where(
                and(
                    eq(variations.id, input.id),
                    eq(variations.projectId, ctx.projectId),
                    isNull(variations.deletedAt)
                )
            )
            .limit(1);

        if (!row) throw new Error(`Variation ${input.id} not found in this project.`);

        const changes = updateDiffChanges(input, row as unknown as Record<string, unknown>, [
            { key: 'category', label: 'Category' },
            { key: 'description', label: 'Description' },
            { key: 'status', label: 'Status' },
            { key: 'costLineId', label: 'Cost line' },
            { key: 'amountForecastCents', label: 'Forecast amount', format: moneyValue },
            { key: 'amountApprovedCents', label: 'Approved amount', format: moneyValue },
            { key: 'dateSubmitted', label: 'Date submitted' },
            { key: 'dateApproved', label: 'Date approved' },
            { key: 'requestedBy', label: 'Requested by' },
            { key: 'approvedBy', label: 'Approved by' },
        ]);
        if (changes.length === 0) throw new Error(`${TOOL}: proposed values are identical to the current variation.`);

        const summary = `Update variation ${row.variationNumber}`;
        const diff: ProposedDiff = {
            entity: 'variation',
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

export { definition as updateVariationTool };
