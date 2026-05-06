import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db, reports, reportGroups, reportSections } from '@/lib/db';
import { defineAction } from '../define';
import type { ActionContext } from '../types';
import type { ProposedDiff } from '@/lib/agents/approvals';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CONTENTS_TYPES = ['standard', 'detailed', 'custom'] as const;

const emptyStringToUndefined = (value: unknown) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalDate = z.preprocess(
    emptyStringToUndefined,
    z.string().regex(ISO_DATE).optional()
);

const optionalText = (max: number) =>
    z.preprocess(emptyStringToUndefined, z.string().trim().min(1).max(max).optional());

const inputSchema = z.object({
    title: z.string().trim().min(1).max(200),
    groupId: optionalText(200),
    reportDate: optionalDate,
    preparedFor: optionalText(200),
    preparedBy: optionalText(200),
    contentsType: z.enum(CONTENTS_TYPES).default('standard'),
    reportingPeriodStart: optionalDate,
    reportingPeriodEnd: optionalDate,
    _toolUseId: z.string().optional(),
});

type CreateReportInput = z.infer<typeof inputSchema>;

function createReportDiff(input: CreateReportInput): ProposedDiff {
    const changes: ProposedDiff['changes'] = [
        { field: 'title', label: 'Title', before: '-', after: input.title },
        { field: 'contentsType', label: 'Contents type', before: '-', after: input.contentsType },
    ];

    for (const [field, label] of [
        ['reportDate', 'Report date'],
        ['preparedFor', 'Prepared for'],
        ['preparedBy', 'Prepared by'],
        ['groupId', 'Report group'],
        ['reportingPeriodStart', 'Reporting period start'],
        ['reportingPeriodEnd', 'Reporting period end'],
    ] as const) {
        const value = input[field];
        if (value !== undefined) {
            changes.push({ field, label, before: '-', after: value });
        }
    }

    return {
        entity: 'report',
        entityId: null,
        summary: `Create report - ${input.title}`,
        changes,
    };
}

async function assertReportGroup(ctx: ActionContext, groupId: string | undefined): Promise<void> {
    if (!groupId) return;

    const [group] = await db
        .select({ id: reportGroups.id })
        .from(reportGroups)
        .where(
            and(
                eq(reportGroups.id, groupId),
                eq(reportGroups.projectId, ctx.projectId),
                eq(reportGroups.organizationId, ctx.organizationId)
            )
        )
        .limit(1);

    if (!group) {
        throw new Error('Report group was not found in this project.');
    }
}

export const createReportAction = defineAction<CreateReportInput, Record<string, unknown>>({
    id: 'correspondence.report.create',
    toolName: 'create_report',
    domain: 'correspondence',
    description:
        'Create a project report in the Notes/Meetings/Reports report section. Use this for monthly project reports and PCG (Project Control Group) reports; do not use it for invoice/progress-claim ledger entries.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design', 'orchestrator'],
    emits: [{ entity: 'report', op: 'created' }],
    uiTarget: { tab: 'meetings-reports', focusEntity: 'report' },
    prepareProposal(_ctx, input) {
        return {
            proposedDiff: createReportDiff(input),
            input,
        };
    },
    async apply(ctx, input) {
        await assertReportGroup(ctx, input.groupId);

        const {
            generateReportContentsSections,
            splitParentAndChildSections,
            toReportSectionRows,
        } = await import('@/lib/services/section-generation');

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const values = {
            id,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            groupId: input.groupId ?? null,
            title: input.title,
            reportDate: input.reportDate ?? null,
            preparedFor: input.preparedFor ?? null,
            preparedBy: input.preparedBy ?? null,
            contentsType: input.contentsType,
            reportingPeriodStart: input.reportingPeriodStart ?? null,
            reportingPeriodEnd: input.reportingPeriodEnd ?? null,
            createdAt: now,
            updatedAt: now,
        };

        const generatedSections = await generateReportContentsSections(ctx.projectId, input.contentsType);
        const sectionRows = toReportSectionRows(generatedSections, id, now);
        const { parentSections, childSections } = splitParentAndChildSections(sectionRows);

        const output = await db.transaction(async (tx) => {
            await tx.insert(reports).values(values);
            if (parentSections.length > 0) {
                await tx.insert(reportSections).values(parentSections);
            }
            if (childSections.length > 0) {
                await tx.insert(reportSections).values(childSections);
            }

            return {
                ...values,
                sectionCount: sectionRows.length,
                attendeeCount: 0,
                transmittalCount: 0,
            } as Record<string, unknown>;
        });

        return output;
    },
});
