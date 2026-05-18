import { z } from 'zod';
import { defineAction } from '../define';
import type { ActionContext } from '../types';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { createWeeklyReportDraft } from '@/lib/weekly-report-draft/service';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const emptyStringToUndefined = (value: unknown) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalDate = z.preprocess(
    emptyStringToUndefined,
    z.string().regex(ISO_DATE).optional()
);

const optionalText = (max: number) =>
    z.preprocess(emptyStringToUndefined, z.string().trim().min(1).max(max).optional());

const inputSchema = z.object({
    title: optionalText(200),
    groupId: optionalText(200),
    reportDate: optionalDate,
    preparedFor: optionalText(200),
    preparedBy: optionalText(200),
    reportingPeriodStart: optionalDate,
    reportingPeriodEnd: optionalDate,
    _toolUseId: z.string().optional(),
}).refine(
    (value) => Boolean(value.reportingPeriodStart) === Boolean(value.reportingPeriodEnd),
    { message: 'Provide both reportingPeriodStart and reportingPeriodEnd, or neither.' }
);

type CreateWeeklyReportDraftInput = z.infer<typeof inputSchema>;

function createWeeklyReportDraftDiff(input: CreateWeeklyReportDraftInput): ProposedDiff {
    const period = input.reportingPeriodStart && input.reportingPeriodEnd
        ? `${input.reportingPeriodStart} to ${input.reportingPeriodEnd}`
        : 'Last 7 days';

    const changes: ProposedDiff['changes'] = [
        {
            field: 'workflow',
            label: 'Draft workflow',
            before: '-',
            after: 'Create grounded weekly report draft from project records, typed RFIs, documents, and approved memory.',
        },
        { field: 'reportingPeriod', label: 'Reporting period', before: '-', after: period },
        { field: 'contentsType', label: 'Contents type', before: '-', after: 'custom weekly draft' },
    ];

    for (const [field, label] of [
        ['title', 'Title'],
        ['reportDate', 'Report date'],
        ['preparedFor', 'Prepared for'],
        ['preparedBy', 'Prepared by'],
        ['groupId', 'Report group'],
    ] as const) {
        const value = input[field];
        if (value !== undefined) {
            changes.push({ field, label, before: '-', after: value });
        }
    }

    return {
        entity: 'report',
        entityId: null,
        summary: 'Create weekly report draft',
        changes,
    };
}

export const createWeeklyReportDraftAction = defineAction<
    CreateWeeklyReportDraftInput,
    Record<string, unknown>
>({
    id: 'correspondence.weekly_report.create_draft',
    toolName: 'create_weekly_report_draft',
    domain: 'correspondence',
    description:
        'Create a grounded weekly project report draft from current project records, typed RFIs, documents/RAG excerpts, risks, cost/programme context, and approved memory. The result is reviewable and is not issued or sent.',
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
            proposedDiff: createWeeklyReportDraftDiff(input),
            input,
        };
    },
    async apply(ctx: ActionContext, input) {
        return await createWeeklyReportDraft({
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            title: input.title,
            groupId: input.groupId ?? null,
            reportDate: input.reportDate,
            preparedFor: input.preparedFor,
            preparedBy: input.preparedBy,
            reportingPeriodStart: input.reportingPeriodStart,
            reportingPeriodEnd: input.reportingPeriodEnd,
        }) as unknown as Record<string, unknown>;
    },
});
