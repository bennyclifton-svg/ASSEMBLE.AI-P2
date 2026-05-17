/**
 * @jest-environment node
 */

const select = jest.fn();
const transaction = jest.fn();

jest.mock('@/lib/db', () => ({
    db: {
        select: (...args: unknown[]) => select(...args),
        transaction: (...args: unknown[]) => transaction(...args),
    },
}));

const mockRandomUUID = jest.fn();

jest.mock('crypto', () => ({
    ...jest.requireActual('crypto'),
    randomUUID: () => mockRandomUUID(),
}));

import { updateRftBriefAction } from '../update-rft-brief';

const ctx = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    actorKind: 'agent' as const,
    actorId: 'run-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

function selectLimitResult(result: unknown[]) {
    return {
        from: jest.fn(() => ({
            where: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue(result),
            })),
        })),
    };
}

function selectOrderByResult(result: unknown[]) {
    return {
        from: jest.fn(() => ({
            where: jest.fn(() => ({
                orderBy: jest.fn().mockResolvedValue(result),
            })),
        })),
    };
}

function selectOrderByLimitResult(result: unknown[]) {
    return {
        from: jest.fn(() => ({
            where: jest.fn(() => ({
                orderBy: jest.fn(() => ({
                    limit: jest.fn().mockResolvedValue(result),
                })),
            })),
        })),
    };
}

function makeTx(args: {
    feeLines?: unknown[];
    existingRfts?: unknown[];
    updatedStakeholder?: unknown[];
}) {
    const txSelect = jest
        .fn()
        .mockImplementationOnce(() => selectOrderByResult(args.feeLines ?? []))
        .mockImplementationOnce(() => selectOrderByLimitResult(args.existingRfts ?? []));
    const returning = jest.fn().mockResolvedValue(
        args.updatedStakeholder ?? [{ id: 'stakeholder-electrical', rowVersion: 8 }]
    );
    const where = jest.fn(() => ({ returning }));
    const set = jest.fn(() => ({ where }));
    const update = jest.fn(() => ({ set }));
    const values = jest.fn().mockResolvedValue(undefined);
    const insert = jest.fn(() => ({ values }));

    return {
        tx: { select: txSelect, update, insert },
        txSelect,
        set,
        values,
        insert,
    };
}

describe('updateRftBriefAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRandomUUID.mockReturnValue('rft-1');
        jest.useFakeTimers().setSystemTime(new Date('2026-05-16T10:20:00.000Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('previews creation of the first RFT record when none exists', async () => {
        select
            .mockImplementationOnce(() =>
                selectLimitResult([
                    {
                        id: 'stakeholder-electrical',
                        name: 'Electrical',
                        projectId: 'project-1',
                        rowVersion: 7,
                        briefServices: null,
                    },
                ])
            )
            .mockImplementationOnce(() => selectOrderByResult([]))
            .mockImplementationOnce(() => selectOrderByLimitResult([]));

        const prepared = await updateRftBriefAction.prepareProposal?.(ctx, {
            id: 'stakeholder-electrical',
            feeRowsMode: 'append',
            briefServices: '<p><strong>Electrical</strong></p>',
        });

        expect(prepared?.proposedDiff.summary).toBe('Create RFT brief - Electrical');
        expect(prepared?.proposedDiff.changes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'rftRecord',
                    label: 'RFT record',
                    before: '-',
                    after: 'Create RFT 01',
                }),
                expect.objectContaining({
                    field: 'briefServices',
                    after: '<p><strong>Electrical</strong></p>',
                }),
            ])
        );
    });

    it('creates the first RFT record when an approved RFT brief is applied', async () => {
        const { tx, set, values } = makeTx({ feeLines: [], existingRfts: [] });
        transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
            callback(tx)
        );

        const result = await updateRftBriefAction.applyResult?.(
            ctx,
            {
                id: 'stakeholder-electrical',
                feeRowsMode: 'append',
                briefServices: '<p><strong>Electrical</strong></p>',
            },
            { expectedRowVersion: 7 }
        );

        expect(set).toHaveBeenCalledWith(
            expect.objectContaining({
                briefServices: '<p><strong>Electrical</strong></p>',
            })
        );
        expect(values).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'rft-1',
                projectId: 'project-1',
                stakeholderId: 'stakeholder-electrical',
                rftNumber: 1,
                rftDate: '2026-05-16',
            })
        );
        expect(result).toEqual({
            kind: 'applied',
            output: expect.objectContaining({
                id: 'stakeholder-electrical',
                stakeholderId: 'stakeholder-electrical',
                rftId: 'rft-1',
                createdRftId: 'rft-1',
            }),
        });
    });

    it('reuses an existing RFT record instead of creating a duplicate', async () => {
        const { tx, values } = makeTx({
            feeLines: [],
            existingRfts: [{ id: 'rft-existing' }],
        });
        transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
            callback(tx)
        );

        const result = await updateRftBriefAction.applyResult?.(
            ctx,
            {
                id: 'stakeholder-electrical',
                feeRowsMode: 'append',
                briefServices: '<p><strong>Electrical</strong></p>',
            },
            { expectedRowVersion: 7 }
        );

        expect(values).not.toHaveBeenCalled();
        expect(result).toEqual({
            kind: 'applied',
            output: expect.objectContaining({
                rftId: 'rft-existing',
            }),
        });
        expect(result?.kind === 'applied' ? result.output.createdRftId : undefined).toBeUndefined();
    });
});
