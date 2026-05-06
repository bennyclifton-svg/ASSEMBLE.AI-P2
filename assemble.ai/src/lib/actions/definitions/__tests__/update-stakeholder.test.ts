/**
 * @jest-environment node
 */

const limit = jest.fn();
const where = jest.fn(() => ({ limit }));
const from = jest.fn(() => ({ where }));
const select = jest.fn((projection?: unknown) => {
    void projection;
    return { from };
});

const returning = jest.fn();
const updateWhere = jest.fn(() => ({ returning }));
const set = jest.fn(() => ({ where: updateWhere }));
const update = jest.fn((target?: unknown) => {
    void target;
    return { set };
});

jest.mock('@/lib/db', () => ({
    db: {
        select: (projection?: unknown) => select(projection),
        update: (target: unknown) => update(target),
    },
}));

import { projectStakeholders } from '@/lib/db/pg-schema';
import { updateStakeholderAction } from '../update-stakeholder';

const ctx = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    actorKind: 'agent' as const,
    actorId: 'run-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

describe('updateStakeholderAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        limit.mockResolvedValue([]);
        returning.mockResolvedValue([]);
    });

    it('uses the friendly tracer tool name and preserves stakeholder validation', () => {
        expect(updateStakeholderAction.toolName).toBe('update_stakeholder');

        expect(
            updateStakeholderAction.inputSchema.safeParse({
                id: 'stk-1',
                briefServices: ' DA coordination ',
                briefDeliverables: '   ',
            }).data
        ).toEqual({
            id: 'stk-1',
            briefServices: 'DA coordination',
            briefDeliverables: null,
        });
        expect(
            updateStakeholderAction.inputSchema.safeParse({ id: 'stk-1', name: 'New name' }).success
        ).toBe(false);
        expect(updateStakeholderAction.inputSchema.safeParse({ id: 'stk-1' }).success).toBe(false);
    });

    it('prepares the same readable approval diff and sanitises proposal input', async () => {
        limit.mockResolvedValue([
            {
                id: 'stk-1',
                name: 'Electrical',
                projectId: 'project-1',
                rowVersion: 7,
                briefServices: 'Existing services',
                briefDeliverables: 'Existing deliverables',
            },
        ]);

        const prepared = await updateStakeholderAction.prepareProposal?.(ctx, {
            id: 'stk-1',
            briefServices: 'DA coordination',
            _toolUseId: 'tool-1',
            ignoredExtra: 'not stored',
        });

        expect(prepared?.expectedRowVersion).toBe(7);
        expect(prepared?.input).toEqual({
            id: 'stk-1',
            briefServices: 'DA coordination',
            _toolUseId: 'tool-1',
        });
        expect(prepared?.proposedDiff).toEqual(
            expect.objectContaining({
                entity: 'stakeholder',
                entityId: 'stk-1',
                summary: 'Update RFT brief - Electrical',
                changes: [
                    expect.objectContaining({
                        field: 'briefServices',
                        label: 'Brief services',
                        before: 'Existing services',
                        after: 'DA coordination',
                    }),
                ],
            })
        );
    });

    it('applies approved stakeholder updates with the row-version guard', async () => {
        returning.mockResolvedValue([
            {
                id: 'stk-1',
                projectId: 'project-1',
                briefServices: 'DA coordination',
                rowVersion: 8,
            },
        ]);

        const result = await updateStakeholderAction.applyResult?.(
            ctx,
            { id: 'stk-1', briefServices: 'DA coordination' },
            { expectedRowVersion: 7 }
        );

        expect(update).toHaveBeenCalledWith(projectStakeholders);
        expect(set).toHaveBeenCalledWith(
            expect.objectContaining({
                briefServices: 'DA coordination',
            })
        );
        expect(result).toEqual({
            kind: 'applied',
            output: expect.objectContaining({
                id: 'stk-1',
                briefServices: 'DA coordination',
                rowVersion: 8,
            }),
        });
    });
});
