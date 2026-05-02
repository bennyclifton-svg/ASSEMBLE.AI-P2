/**
 * applyApproval(set_project_objectives) behavior.
 */

const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockInsertReturning = jest.fn().mockResolvedValue([{ id: 'obj-1' }, { id: 'obj-2' }]);
const mockInsertValues = jest.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockTx = {
    update: mockUpdate,
    insert: mockInsert,
    select: jest.fn(),
};
const mockTransaction = jest.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));

jest.mock('@/lib/db', () => ({
    db: {
        transaction: (callback: (tx: typeof mockTx) => unknown) => mockTransaction(callback),
    },
}));

jest.mock('uuid', () => ({
    v4: () => 'uuid-1',
}));

import { applyApproval } from '../applicators';

describe('applyApproval - set_project_objectives', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInsertReturning.mockResolvedValue([{ id: 'obj-1' }, { id: 'obj-2' }]);
    });

    it('soft-deletes supplied sections and inserts replacement objective rows', async () => {
        const result = await applyApproval({
            toolName: 'set_project_objectives',
            input: {
                mode: 'replace',
                planning: ['DA approval pathway', 'Council lodgement strategy'],
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result.kind).toBe('applied');
        expect(mockTransaction).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockInsertValues).toHaveBeenCalledWith([
            expect.objectContaining({
                projectId: 'project-1',
                objectiveType: 'planning',
                text: 'DA approval pathway',
                sortOrder: 0,
                source: 'ai_added',
            }),
            expect.objectContaining({
                projectId: 'project-1',
                objectiveType: 'planning',
                text: 'Council lodgement strategy',
                sortOrder: 1,
                source: 'ai_added',
            }),
        ]);
        expect(result).toEqual(
            expect.objectContaining({
                output: expect.objectContaining({
                    id: 'objectives',
                    mode: 'replace',
                    sections: { planning: 2 },
                    createdIds: ['obj-1', 'obj-2'],
                }),
            })
        );
    });

    it('returns gone when no objective rows are supplied', async () => {
        const result = await applyApproval({
            toolName: 'set_project_objectives',
            input: { mode: 'replace' },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result).toEqual({
            kind: 'gone',
            reason: 'No objective sections were supplied.',
        });
        expect(mockTransaction).not.toHaveBeenCalled();
    });
});
