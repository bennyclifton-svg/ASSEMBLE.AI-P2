/**
 * applyApproval(record_invoice) — applicator unit test.
 *
 * Verifies the invoice insert payload is built correctly from the agent's
 * proposed input. Schema-level coverage (the route + auth) lives in the
 * approvals respond route test; this test pins the applicator's translation
 * of input → DB row.
 */

const mockInsertValues = jest.fn().mockResolvedValue(undefined);
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

// Stub uuid (ESM-only module that breaks jest's CJS transform).
jest.mock('uuid', () => ({ v4: () => 'uuid-fixed' }));

jest.mock('@/lib/db', () => ({
    db: {
        insert: () => mockInsert(),
    },
}));

import { applyApproval } from '../applicators';

describe('applyApproval — record_invoice', () => {
    beforeEach(() => {
        mockInsert.mockClear();
        mockInsertValues.mockClear();
    });

    it('inserts an invoice row with required fields', async () => {
        const result = await applyApproval({
            toolName: 'record_invoice',
            input: {
                invoiceNumber: 'ADCO-PC-001',
                invoiceDate: '2025-11-28',
                amountCents: 180000000,
                periodYear: 2025,
                periodMonth: 11,
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-A', projectId: 'proj-1' },
        });

        expect(result.kind).toBe('applied');
        expect(mockInsertValues).toHaveBeenCalledTimes(1);
        const values = mockInsertValues.mock.calls[0][0];
        expect(values.invoiceNumber).toBe('ADCO-PC-001');
        expect(values.invoiceDate).toBe('2025-11-28');
        expect(values.amountCents).toBe(180000000);
        expect(values.projectId).toBe('proj-1');
        expect(values.periodYear).toBe(2025);
        expect(values.periodMonth).toBe(11);
        expect(values.id).toBeDefined();
    });

    it('passes optional fields through (description, gst, costLineId, paid)', async () => {
        await applyApproval({
            toolName: 'record_invoice',
            input: {
                invoiceNumber: 'ADCO-PC-001',
                invoiceDate: '2025-11-28',
                amountCents: 180000000,
                periodYear: 2025,
                periodMonth: 11,
                description: 'Progress Claim #1',
                gstCents: 18000000,
                costLineId: 'cl-abc',
                paidStatus: 'paid',
                paidDate: '2025-11-30',
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-A', projectId: 'proj-1' },
        });

        const values = mockInsertValues.mock.calls[0][0];
        expect(values.description).toBe('Progress Claim #1');
        expect(values.gstCents).toBe(18000000);
        expect(values.costLineId).toBe('cl-abc');
        expect(values.paidStatus).toBe('paid');
        expect(values.paidDate).toBe('2025-11-30');
    });

    it('defaults gstCents to 0 and paidStatus to "unpaid" when omitted', async () => {
        await applyApproval({
            toolName: 'record_invoice',
            input: {
                invoiceNumber: 'X-1',
                invoiceDate: '2025-11-28',
                amountCents: 100,
                periodYear: 2025,
                periodMonth: 11,
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-A', projectId: 'proj-1' },
        });

        const values = mockInsertValues.mock.calls[0][0];
        expect(values.gstCents).toBe(0);
        expect(values.paidStatus).toBe('unpaid');
        expect(values.costLineId).toBeNull();
    });

    it('returns gone when required fields are missing', async () => {
        const result = await applyApproval({
            toolName: 'record_invoice',
            input: { invoiceDate: '2025-11-28', amountCents: 100 },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-A', projectId: 'proj-1' },
        });
        expect(result.kind).toBe('gone');
        expect(mockInsertValues).not.toHaveBeenCalled();
    });
});
