/**
 * applyApproval(create_meeting) behavior.
 *
 * Pins the agent path where an approved meeting proposal creates the meeting
 * and the default standard agenda sections together.
 */

const mockInsertValues = jest.fn().mockResolvedValue(undefined);
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockTx = {
    insert: mockInsert,
};
const mockTransaction = jest.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));

let mockUuidIndex = 0;
const mockUuids = [
    'meeting-id',
    'section-brief',
    'section-procurement',
    'section-planning',
    'section-design',
    'section-construction',
    'section-cost',
    'section-programme',
    'section-other',
];

jest.mock('uuid', () => ({
    v4: () => mockUuids[mockUuidIndex++] ?? `uuid-${mockUuidIndex}`,
}));

jest.mock('@/lib/db', () => ({
    db: {
        insert: () => mockInsert(),
        transaction: (callback: (tx: typeof mockTx) => unknown) => mockTransaction(callback),
    },
}));

import { applyApproval } from '../applicators';

describe('applyApproval - create_meeting', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUuidIndex = 0;
    });

    it('creates a meeting with default agenda sections', async () => {
        const result = await applyApproval({
            toolName: 'create_meeting',
            input: {
                title: 'Pre-DA Meeting',
                meetingDate: '2026-05-01',
                agendaType: 'standard',
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result.kind).toBe('applied');
        expect(mockTransaction).toHaveBeenCalledTimes(1);
        expect(mockInsertValues).toHaveBeenCalledTimes(2);
        expect(mockInsertValues.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                id: 'meeting-id',
                projectId: 'project-1',
                organizationId: 'org-1',
                title: 'Pre-DA Meeting',
                meetingDate: '2026-05-01',
                agendaType: 'standard',
            })
        );

        const sections = mockInsertValues.mock.calls[1][0];
        expect(sections).toHaveLength(8);
        expect(sections[0]).toEqual(
            expect.objectContaining({
                id: 'section-brief',
                meetingId: 'meeting-id',
                sectionKey: 'brief',
                sectionLabel: 'Brief',
                sortOrder: 0,
            })
        );
        expect(result).toEqual(
            expect.objectContaining({
                output: expect.objectContaining({
                    id: 'meeting-id',
                    title: 'Pre-DA Meeting',
                    sectionCount: 8,
                    attendeeCount: 0,
                    transmittalCount: 0,
                }),
            })
        );
    });

    it('returns gone when the title is missing', async () => {
        const result = await applyApproval({
            toolName: 'create_meeting',
            input: {},
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result).toEqual({
            kind: 'gone',
            reason: 'Missing meeting title on proposal.',
        });
        expect(mockTransaction).not.toHaveBeenCalled();
        expect(mockInsertValues).not.toHaveBeenCalled();
    });
});
