/**
 * @jest-environment node
 */

const returning = jest.fn();
const values = jest.fn((rows?: unknown) => {
    void rows;
    return { returning };
});
const insert = jest.fn((target?: unknown) => {
    void target;
    return { values };
});

jest.mock('@/lib/db', () => ({
    db: {
        insert: (target: unknown) => insert(target),
    },
}));

import { consultants, contractors } from '@/lib/db/pg-schema';
import { addTenderFirmsAction } from '../add-tender-firms';

const ctx = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    actorKind: 'agent' as const,
    actorId: 'run-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

describe('addTenderFirmsAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        returning.mockResolvedValue([]);
    });

    it('uses the friendly tracer tool name and validates tender firm inputs', () => {
        expect(addTenderFirmsAction.toolName).toBe('add_tender_firms');
        expect(
            addTenderFirmsAction.inputSchema.safeParse({
                firmType: 'contractor',
                disciplineOrTrade: 'Mechanical',
                firms: [
                    {
                        companyName: 'Harbour Mechanical Services',
                        address: 'Level 3, 18 Kent Street, Sydney NSW 2000',
                        phone: '02 9188 4720',
                        email: 'tenders@harbourmechanical.com.au',
                    },
                ],
            }).data
        ).toEqual({
            firmType: 'contractor',
            disciplineOrTrade: 'Mechanical',
            firms: [
                {
                    companyName: 'Harbour Mechanical Services',
                    address: 'Level 3, 18 Kent Street, Sydney NSW 2000',
                    phone: '02 9188 4720',
                    email: 'tenders@harbourmechanical.com.au',
                },
            ],
        });
    });

    it('rejects duplicate firm names in one proposal', () => {
        expect(
            addTenderFirmsAction.inputSchema.safeParse({
                firmType: 'consultant',
                disciplineOrTrade: 'Mechanical',
                firms: [
                    { companyName: 'Harbour Mechanical Services' },
                    { companyName: 'harbour mechanical services' },
                ],
            }).success
        ).toBe(false);
    });

    it('prepares a readable approval diff', async () => {
        const prepared = await addTenderFirmsAction.prepareProposal?.(ctx, {
            firmType: 'contractor',
            disciplineOrTrade: 'Mechanical',
            firms: [
                {
                    companyName: 'Harbour Mechanical Services',
                    email: 'tenders@harbourmechanical.com.au',
                },
                {
                    companyName: 'Northline HVAC Contractors',
                    email: 'estimating@northlinehvac.com.au',
                },
            ],
        });

        expect(prepared?.proposedDiff.summary).toBe(
            'Add 2 tender firms - Mechanical contractor tender panel'
        );
        expect(prepared?.proposedDiff.changes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'panel',
                    after: 'Mechanical contractor tender panel',
                }),
                expect.objectContaining({
                    field: 'firms',
                    after: expect.stringContaining('Northline HVAC Contractors'),
                }),
            ])
        );
    });

    it('applies contractor firms to the contractor tender table', async () => {
        returning.mockResolvedValue([
            {
                id: 'firm-id',
                projectId: 'project-1',
                companyName: 'Harbour Mechanical Services',
                contactPerson: null,
                trade: 'Mechanical',
                email: 'tenders@harbourmechanical.com.au',
                phone: '02 9188 4720',
                address: 'Level 3, 18 Kent Street, Sydney NSW 2000',
                abn: null,
                notes: null,
                shortlisted: true,
                awarded: false,
                companyId: null,
            },
        ]);

        const output = await addTenderFirmsAction.apply?.(ctx, {
            firmType: 'contractor',
            disciplineOrTrade: 'Mechanical',
            firms: [
                {
                    companyName: 'Harbour Mechanical Services',
                    address: 'Level 3, 18 Kent Street, Sydney NSW 2000',
                    phone: '02 9188 4720',
                    email: 'tenders@harbourmechanical.com.au',
                },
            ],
        });

        expect(insert).toHaveBeenCalledWith(contractors);
        expect(values).toHaveBeenCalledWith([
            expect.objectContaining({
                projectId: 'project-1',
                companyName: 'Harbour Mechanical Services',
                trade: 'Mechanical',
                email: 'tenders@harbourmechanical.com.au',
            }),
        ]);
        expect(output).toEqual(
            expect.objectContaining({
                firmType: 'contractor',
                disciplineOrTrade: 'Mechanical',
                firmIds: ['firm-id'],
            })
        );
    });

    it('applies consultant firms to the consultant tender table', async () => {
        returning.mockResolvedValue([
            {
                id: 'firm-id',
                projectId: 'project-1',
                companyName: 'Northline HVAC Contractors',
                contactPerson: null,
                discipline: 'Mechanical',
                email: 'estimating@northlinehvac.com.au',
                phone: '02 9725 3144',
                mobile: null,
                address: null,
                abn: null,
                notes: null,
                shortlisted: true,
                awarded: false,
                companyId: null,
            },
        ]);

        await addTenderFirmsAction.apply?.(ctx, {
            firmType: 'consultant',
            disciplineOrTrade: 'Mechanical',
            firms: [
                {
                    companyName: 'Northline HVAC Contractors',
                    phone: '02 9725 3144',
                    email: 'estimating@northlinehvac.com.au',
                },
            ],
        });

        expect(insert).toHaveBeenCalledWith(consultants);
        expect(values).toHaveBeenCalledWith([
            expect.objectContaining({
                projectId: 'project-1',
                companyName: 'Northline HVAC Contractors',
                discipline: 'Mechanical',
                email: 'estimating@northlinehvac.com.au',
            }),
        ]);
    });
});
