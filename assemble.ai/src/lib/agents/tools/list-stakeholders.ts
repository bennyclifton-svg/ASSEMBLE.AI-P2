/**
 * list_stakeholders - read unified project stakeholders.
 */

import { db } from '@/lib/db';
import { projectStakeholders } from '@/lib/db/pg-schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface ListStakeholdersInput {
    stakeholderGroup?: string;
    includeDisabled?: boolean;
    limit?: number;
}

interface ListStakeholdersOutput {
    projectId: string;
    rowCount: number;
    truncated: boolean;
    rows: Array<{
        id: string;
        stakeholderGroup: string;
        name: string;
        role: string | null;
        organization: string | null;
        contactName: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        disciplineOrTrade: string | null;
        isEnabled: boolean;
        briefServices: string | null;
        briefDeliverables: string | null;
        briefFee: string | null;
        briefProgram: string | null;
        scopeWorks: string | null;
        scopePrice: string | null;
        scopeProgram: string | null;
        notes: string | null;
        rowVersion: number;
    }>;
}

const VALID_GROUPS = ['client', 'authority', 'consultant', 'contractor'] as const;
const DEFAULT_LIMIT = 100;
const HARD_LIMIT = 300;

const definition: AgentToolDefinition<ListStakeholdersInput, ListStakeholdersOutput> = {
    spec: {
        name: 'list_stakeholders',
        description:
            'List project stakeholders from the unified stakeholder table, including brief/scope fields used by RFT content. Use before stakeholder updates and for design/procurement coordination questions.',
        inputSchema: {
            type: 'object',
            properties: {
                stakeholderGroup: { type: 'string', enum: [...VALID_GROUPS] },
                includeDisabled: {
                    type: 'boolean',
                    description: 'Include disabled stakeholders. Defaults to false.',
                },
                limit: { type: 'integer', minimum: 1, maximum: HARD_LIMIT },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListStakeholdersInput {
        if (input === undefined || input === null) return {};
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('list_stakeholders: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        const out: ListStakeholdersInput = {};
        if (obj.stakeholderGroup !== undefined) {
            if (
                typeof obj.stakeholderGroup !== 'string' ||
                !(VALID_GROUPS as readonly string[]).includes(obj.stakeholderGroup)
            ) {
                throw new Error(`list_stakeholders: "stakeholderGroup" must be one of ${VALID_GROUPS.join(', ')}`);
            }
            out.stakeholderGroup = obj.stakeholderGroup;
        }
        if (obj.includeDisabled !== undefined) {
            if (typeof obj.includeDisabled !== 'boolean') throw new Error('list_stakeholders: "includeDisabled" must be a boolean');
            out.includeDisabled = obj.includeDisabled;
        }
        if (obj.limit !== undefined) {
            if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit)) {
                throw new Error('list_stakeholders: "limit" must be an integer');
            }
            out.limit = Math.max(1, Math.min(HARD_LIMIT, obj.limit));
        }
        return out;
    },
    async execute(ctx: ToolContext, input: ListStakeholdersInput): Promise<ListStakeholdersOutput> {
        await assertProjectOrg(ctx);

        const limit = input.limit ?? DEFAULT_LIMIT;
        const conditions = [
            eq(projectStakeholders.projectId, ctx.projectId),
            isNull(projectStakeholders.deletedAt),
        ];
        if (input.stakeholderGroup) {
            conditions.push(eq(projectStakeholders.stakeholderGroup, input.stakeholderGroup));
        }
        if (!input.includeDisabled) {
            conditions.push(eq(projectStakeholders.isEnabled, true));
        }

        const rows = await db
            .select({
                id: projectStakeholders.id,
                stakeholderGroup: projectStakeholders.stakeholderGroup,
                name: projectStakeholders.name,
                role: projectStakeholders.role,
                organization: projectStakeholders.organization,
                contactName: projectStakeholders.contactName,
                contactEmail: projectStakeholders.contactEmail,
                contactPhone: projectStakeholders.contactPhone,
                disciplineOrTrade: projectStakeholders.disciplineOrTrade,
                isEnabled: projectStakeholders.isEnabled,
                briefServices: projectStakeholders.briefServices,
                briefDeliverables: projectStakeholders.briefDeliverables,
                briefFee: projectStakeholders.briefFee,
                briefProgram: projectStakeholders.briefProgram,
                scopeWorks: projectStakeholders.scopeWorks,
                scopePrice: projectStakeholders.scopePrice,
                scopeProgram: projectStakeholders.scopeProgram,
                notes: projectStakeholders.notes,
                sortOrder: projectStakeholders.sortOrder,
                rowVersion: projectStakeholders.rowVersion,
            })
            .from(projectStakeholders)
            .where(and(...conditions))
            .orderBy(asc(projectStakeholders.stakeholderGroup), asc(projectStakeholders.sortOrder))
            .limit(limit + 1);

        const truncated = rows.length > limit;
        const trimmed = truncated ? rows.slice(0, limit) : rows;

        return {
            projectId: ctx.projectId,
            rowCount: trimmed.length,
            truncated,
            rows: trimmed.map((row) => ({
                id: row.id,
                stakeholderGroup: row.stakeholderGroup,
                name: row.name,
                role: row.role ?? null,
                organization: row.organization ?? null,
                contactName: row.contactName ?? null,
                contactEmail: row.contactEmail ?? null,
                contactPhone: row.contactPhone ?? null,
                disciplineOrTrade: row.disciplineOrTrade ?? null,
                isEnabled: row.isEnabled ?? true,
                briefServices: row.briefServices ?? null,
                briefDeliverables: row.briefDeliverables ?? null,
                briefFee: row.briefFee ?? null,
                briefProgram: row.briefProgram ?? null,
                scopeWorks: row.scopeWorks ?? null,
                scopePrice: row.scopePrice ?? null,
                scopeProgram: row.scopeProgram ?? null,
                notes: row.notes ?? null,
                rowVersion: row.rowVersion ?? 1,
            })),
        };
    },
};

registerTool(definition);

export { definition as listStakeholdersTool };
