/**
 * applyApproval(create_variation) cost-line handling.
 *
 * Prevents a blank costLineId from reaching the FK column and verifies that
 * non-empty costLineIds are scoped to the current project before insert.
 */

const mockLimit = jest.fn();
const mockWhere = jest.fn();
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

const mockInsertValues = jest.fn().mockResolvedValue(undefined);
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

jest.mock('uuid', () => ({ v4: () => 'variation-id' }));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
        insert: () => mockInsert(),
    },
}));

import { applyApproval } from '../applicators';

describe('applyApproval - create_variation cost line handling', () => {
    beforeEach(() => {
        mockLimit.mockReset();
        mockWhere.mockReset();
        mockFrom.mockClear();
        mockSelect.mockClear();
        mockInsert.mockClear();
        mockInsertValues.mockReset();
        mockInsertValues.mockResolvedValue(undefined);
    });

    it('normalizes a blank costLineId to null', async () => {
        mockWhere.mockResolvedValueOnce([]);

        const result = await applyApproval({
            toolName: 'create_variation',
            input: {
                category: 'Principal',
                description: 'Aborted Basement Ventilation',
                status: 'Approved',
                costLineId: '',
                amountApprovedCents: 777700,
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result.kind).toBe('applied');
        expect(mockInsertValues).toHaveBeenCalledTimes(1);
        expect(mockInsertValues.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                id: 'variation-id',
                projectId: 'project-1',
                costLineId: null,
                description: 'Aborted Basement Ventilation',
                amountApprovedCents: 777700,
            })
        );
    });

    it('accepts a costLineId that belongs to the project', async () => {
        mockWhere
            .mockReturnValueOnce({ limit: mockLimit })
            .mockResolvedValueOnce([]);
        mockLimit.mockResolvedValueOnce([{ id: 'cl-1' }]);

        const result = await applyApproval({
            toolName: 'create_variation',
            input: {
                category: 'Principal',
                description: 'Aborted Basement Ventilation',
                costLineId: 'cl-1',
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result.kind).toBe('applied');
        expect(mockInsertValues.mock.calls[0][0].costLineId).toBe('cl-1');
    });

    it('does not insert when the costLineId is outside the project', async () => {
        mockWhere.mockReturnValueOnce({ limit: mockLimit });
        mockLimit.mockResolvedValueOnce([]);

        const result = await applyApproval({
            toolName: 'create_variation',
            input: {
                category: 'Principal',
                description: 'Aborted Basement Ventilation',
                costLineId: 'other-project-line',
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result).toEqual({
            kind: 'gone',
            reason: 'Cost line other-project-line no longer exists in this project.',
        });
        expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('rejects variation statuses outside the register vocabulary', async () => {
        const result = await applyApproval({
            toolName: 'create_variation',
            input: {
                category: 'Principal',
                description: 'Additional fire hydrants',
                status: 'Submitted',
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result).toEqual({
            kind: 'gone',
            reason: 'Invalid variation status. Use Forecast, Approved, Rejected, or Withdrawn.',
        });
        expect(mockInsertValues).not.toHaveBeenCalled();
    });
});
