/**
 * @jest-environment node
 */

const mockCreateWeeklyReportDraft = jest.fn();

jest.mock('@/lib/weekly-report-draft/service', () => ({
    createWeeklyReportDraft: (...args: unknown[]) => mockCreateWeeklyReportDraft(...args),
}));

jest.mock('@/lib/actions/registry', () => ({
    registerAction: <T>(action: T) => action,
}));

import { createWeeklyReportDraftAction } from '../create-weekly-report-draft';
import type { ActionContext } from '../../types';

const ctx: ActionContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    actorKind: 'agent',
    actorId: 'run-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

describe('createWeeklyReportDraftAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateWeeklyReportDraft.mockResolvedValue({
            id: 'report-1',
            title: 'Weekly Project Report - 2026-05-08 to 2026-05-14',
            sectionCount: 5,
            transmittalCount: 0,
        });
    });

    it('validates optional reporting period dates as a pair', () => {
        expect(createWeeklyReportDraftAction.inputSchema.safeParse({
            reportingPeriodStart: '2026-05-08',
            reportingPeriodEnd: '2026-05-14',
        }).success).toBe(true);

        expect(createWeeklyReportDraftAction.inputSchema.safeParse({
            reportingPeriodStart: '2026-05-08',
        }).success).toBe(false);

        expect(createWeeklyReportDraftAction.inputSchema.safeParse({
            reportDate: '14/05/2026',
        }).success).toBe(false);
    });

    it('builds an approval preview that names the grounding and review boundary', async () => {
        const prepared = await createWeeklyReportDraftAction.prepareProposal!(ctx, {
            title: 'Weekly report',
            reportingPeriodStart: '2026-05-08',
            reportingPeriodEnd: '2026-05-14',
        });

        expect(prepared.proposedDiff).toEqual(
            expect.objectContaining({
                entity: 'report',
                summary: 'Create weekly report draft',
                changes: expect.arrayContaining([
                    expect.objectContaining({
                        field: 'workflow',
                        after: expect.stringContaining('typed RFIs'),
                    }),
                    expect.objectContaining({
                        field: 'reportingPeriod',
                        after: '2026-05-08 to 2026-05-14',
                    }),
                ]),
            })
        );
    });

    it('creates the draft through the weekly report service on apply', async () => {
        const output = await createWeeklyReportDraftAction.apply!(ctx, {
            title: 'Weekly report',
            reportingPeriodStart: '2026-05-08',
            reportingPeriodEnd: '2026-05-14',
            groupId: 'group-1',
        });

        expect(mockCreateWeeklyReportDraft).toHaveBeenCalledWith({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Weekly report',
            groupId: 'group-1',
            reportDate: undefined,
            preparedFor: undefined,
            preparedBy: undefined,
            reportingPeriodStart: '2026-05-08',
            reportingPeriodEnd: '2026-05-14',
        });
        expect(output).toEqual(expect.objectContaining({ id: 'report-1' }));
    });
});
