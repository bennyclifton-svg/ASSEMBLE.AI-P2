const mockLimit = jest.fn();
const queryBuilder = {
    from: jest.fn(() => queryBuilder),
    leftJoin: jest.fn(() => queryBuilder),
    where: jest.fn(() => queryBuilder),
    orderBy: jest.fn(() => queryBuilder),
    limit: mockLimit,
};
const mockSelect = jest.fn(() => queryBuilder);
const mockAssertProjectOrg = jest.fn();

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
    },
}));

jest.mock('../_context', () => ({
    assertProjectOrg: (...args: unknown[]) => mockAssertProjectOrg(...args),
    CrossTenantAccessError: class CrossTenantAccessError extends Error {},
}));

import { listInvoicesTool } from '../list-invoices';

describe('list_invoices execute', () => {
    beforeEach(() => {
        mockLimit.mockReset();
        mockSelect.mockClear();
        mockAssertProjectOrg.mockReset();
        queryBuilder.from.mockClear();
        queryBuilder.leftJoin.mockClear();
        queryBuilder.where.mockClear();
        queryBuilder.orderBy.mockClear();
    });

    it('returns invoice rows with period totals and related labels', async () => {
        mockLimit.mockResolvedValueOnce([
            {
                id: 'inv-1',
                costLineId: 'cl-1',
                variationId: 'var-1',
                companyId: 'co-1',
                invoiceDate: '2026-04-15',
                poNumber: 'PO-7',
                invoiceNumber: 'INV-001',
                description: 'April claim',
                amountCents: 100000,
                gstCents: 10000,
                periodYear: 2026,
                periodMonth: 4,
                paidStatus: 'paid',
                paidDate: '2026-04-20',
                costLineCostCode: '1.01',
                costLineActivity: 'Architect fees',
                costLineSection: 'FEES',
                variationNumber: 'V-001',
                variationDescription: 'Design change',
                companyName: 'Acme Architects',
            },
            {
                id: 'inv-2',
                costLineId: null,
                variationId: null,
                companyId: null,
                invoiceDate: '2026-04-05',
                poNumber: null,
                invoiceNumber: 'INV-002',
                description: 'April disbursement',
                amountCents: 50000,
                gstCents: 5000,
                periodYear: 2026,
                periodMonth: 4,
                paidStatus: 'unpaid',
                paidDate: null,
                costLineCostCode: null,
                costLineActivity: null,
                costLineSection: null,
                variationNumber: null,
                variationDescription: null,
                companyName: null,
            },
        ]);

        const result = await listInvoicesTool.execute(
            {
                userId: 'user-1',
                organizationId: 'org-1',
                projectId: 'project-1',
                threadId: 'thread-1',
                runId: 'run-1',
            },
            { periodYear: 2026, periodMonth: 4 }
        );

        expect(result.rowCount).toBe(2);
        expect(result.totals).toEqual({
            amountCents: 150000,
            gstCents: 15000,
            grossCents: 165000,
            paidCount: 1,
            unpaidCount: 1,
            partialCount: 0,
        });
        expect(result.rows[0]).toEqual(
            expect.objectContaining({
                invoiceNumber: 'INV-001',
                grossCents: 110000,
                costLine: expect.objectContaining({
                    label: 'FEES - 1.01 - Architect fees',
                }),
                company: { id: 'co-1', name: 'Acme Architects' },
            })
        );
    });
});
