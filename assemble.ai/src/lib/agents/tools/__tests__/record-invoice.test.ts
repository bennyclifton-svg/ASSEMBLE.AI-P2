/**
 * record_invoice — input validation tests.
 *
 * Same pattern as create-cost-line.test.ts. End-to-end propose+apply is
 * exercised through the approval response API tests.
 */

const mockWhere = jest.fn();
const mockLeftJoin = jest.fn(() => ({ where: mockWhere }));
const mockFrom = jest.fn(() => ({ leftJoin: mockLeftJoin }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockProposeApproval = jest.fn();
const mockAssertProjectOrg = jest.fn();

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
    },
}));
jest.mock('@/lib/agents/events', () => ({ emitChatEvent: jest.fn() }));
jest.mock('../_context', () => ({
    assertProjectOrg: (...args: unknown[]) => mockAssertProjectOrg(...args),
    CrossTenantAccessError: class CrossTenantAccessError extends Error {},
}));
jest.mock('../../approvals', () => ({
    proposeApproval: (...args: unknown[]) => mockProposeApproval(...args),
    moneyDiffLabel: (before: number, after: number) => {
        const format = (cents: number) =>
            new Intl.NumberFormat('en-AU', {
                style: 'currency',
                currency: 'AUD',
                maximumFractionDigits: 0,
            }).format(cents / 100);
        return `${format(before)} -> ${format(after)}`;
    },
}));

import { recordInvoiceTool } from '../record-invoice';

describe('record_invoice.validate', () => {
    it('requires invoiceNumber', () => {
        expect(() =>
            recordInvoiceTool.validate({ invoiceDate: '2025-11-28', amountCents: 100 })
        ).toThrow();
    });

    it('requires invoiceDate', () => {
        expect(() =>
            recordInvoiceTool.validate({ invoiceNumber: 'X-1', amountCents: 100 })
        ).toThrow();
    });

    it('requires amountCents', () => {
        expect(() =>
            recordInvoiceTool.validate({ invoiceNumber: 'X-1', invoiceDate: '2025-11-28' })
        ).toThrow();
    });

    it('rejects empty/whitespace invoiceNumber', () => {
        expect(() =>
            recordInvoiceTool.validate({
                invoiceNumber: '   ',
                invoiceDate: '2025-11-28',
                amountCents: 100,
            })
        ).toThrow();
    });

    it('rejects invoiceDate that is not YYYY-MM-DD', () => {
        expect(() =>
            recordInvoiceTool.validate({
                invoiceNumber: 'X-1',
                invoiceDate: '28/11/2025',
                amountCents: 100,
            })
        ).toThrow();
    });

    it('rejects negative amountCents', () => {
        expect(() =>
            recordInvoiceTool.validate({
                invoiceNumber: 'X-1',
                invoiceDate: '2025-11-28',
                amountCents: -100,
            })
        ).toThrow();
    });

    it('rejects non-integer amountCents', () => {
        expect(() =>
            recordInvoiceTool.validate({
                invoiceNumber: 'X-1',
                invoiceDate: '2025-11-28',
                amountCents: 100.5,
            })
        ).toThrow();
    });

    it('rejects negative gstCents', () => {
        expect(() =>
            recordInvoiceTool.validate({
                invoiceNumber: 'X-1',
                invoiceDate: '2025-11-28',
                amountCents: 100,
                gstCents: -10,
            })
        ).toThrow();
    });

    it('rejects unknown paidStatus', () => {
        expect(() =>
            recordInvoiceTool.validate({
                invoiceNumber: 'X-1',
                invoiceDate: '2025-11-28',
                amountCents: 100,
                paidStatus: 'maybe',
            })
        ).toThrow();
    });

    it('accepts a minimal valid input', () => {
        const out = recordInvoiceTool.validate({
            invoiceNumber: 'ADCO-PC-001',
            invoiceDate: '2025-11-28',
            amountCents: 180000000,
        });
        expect(out.invoiceNumber).toBe('ADCO-PC-001');
        expect(out.invoiceDate).toBe('2025-11-28');
        expect(out.amountCents).toBe(180000000);
    });

    it('derives periodYear and periodMonth from invoiceDate', () => {
        const out = recordInvoiceTool.validate({
            invoiceNumber: 'ADCO-PC-001',
            invoiceDate: '2025-11-28',
            amountCents: 180000000,
        });
        expect(out.periodYear).toBe(2025);
        expect(out.periodMonth).toBe(11);
    });

    it('normalises natural-language invoice dates', () => {
        const out = recordInvoiceTool.validate({
            invoiceNumber: 'ADCO-PC-001',
            invoiceDate: '11 July 2025',
            amountCents: 180000000,
        });
        expect(out.invoiceDate).toBe('2025-07-11');
        expect(out.periodYear).toBe(2025);
        expect(out.periodMonth).toBe(7);
    });

    it('trims whitespace on invoiceNumber and description', () => {
        const out = recordInvoiceTool.validate({
            invoiceNumber: '  ADCO-PC-001  ',
            invoiceDate: '2025-11-28',
            amountCents: 180000000,
            description: '  Progress Claim #1  ',
        });
        expect(out.invoiceNumber).toBe('ADCO-PC-001');
        expect(out.description).toBe('Progress Claim #1');
    });

    it('accepts optional fields', () => {
        const out = recordInvoiceTool.validate({
            invoiceNumber: 'ADCO-PC-001',
            invoiceDate: '2025-11-28',
            amountCents: 180000000,
            description: 'Progress Claim #1',
            gstCents: 18000000,
            costLineId: 'cl-abc',
            costCategory: 'Developer Expenses',
            costLineReference: 'Long Service Levy',
            paidStatus: 'paid',
            paidDate: '2025-11-30',
        });
        expect(out.description).toBe('Progress Claim #1');
        expect(out.gstCents).toBe(18000000);
        expect(out.costLineId).toBe('cl-abc');
        expect(out.costCategory).toBe('Developer Expenses');
        expect(out.costLineReference).toBe('Long Service Levy');
        expect(out.paidStatus).toBe('paid');
        expect(out.paidDate).toBe('2025-11-30');
    });

    it('normalises natural-language paid dates', () => {
        const out = recordInvoiceTool.validate({
            invoiceNumber: 'ADCO-PC-001',
            invoiceDate: '2025-11-28',
            amountCents: 180000000,
            paidDate: '30 Nov 2025',
        });
        expect(out.paidDate).toBe('2025-11-30');
    });

    it('marks itself as mutating', () => {
        expect(recordInvoiceTool.mutating).toBe(true);
    });
});

describe('record_invoice execute', () => {
    beforeEach(() => {
        mockWhere.mockReset();
        mockLeftJoin.mockClear();
        mockFrom.mockClear();
        mockSelect.mockClear();
        mockProposeApproval.mockReset();
        mockAssertProjectOrg.mockReset();
        mockProposeApproval.mockResolvedValue({
            toolResult: {
                status: 'awaiting_approval',
                approvalId: 'approval-1',
                toolName: 'record_invoice',
                summary: 'Record invoice 123 - $30,000',
            },
        });
    });

    it('resolves developer expense plus long service levy labels to a cost line before proposing', async () => {
        mockWhere.mockResolvedValueOnce([
            {
                id: 'cl-lsl',
                section: 'FEES',
                costCode: '1.04',
                activity: 'Long Service Levy',
                reference: null,
                stakeholderName: null,
                disciplineOrTrade: null,
            },
            {
                id: 'cl-da',
                section: 'FEES',
                costCode: '1.01',
                activity: 'DA application fees',
                reference: null,
                stakeholderName: null,
                disciplineOrTrade: null,
            },
        ]);

        const input = recordInvoiceTool.validate({
            invoiceNumber: '123',
            invoiceDate: '2026-05-03',
            amountCents: 3000000,
            costCategory: 'Developer Expenses',
            costLineReference: 'Long Service Levy',
            paidStatus: 'paid',
        });

        await recordInvoiceTool.execute(
            {
                userId: 'user-1',
                organizationId: 'org-1',
                projectId: 'project-1',
                threadId: 'thread-1',
                runId: 'run-1',
            },
            input
        );

        expect(mockProposeApproval).toHaveBeenCalledWith(
            expect.objectContaining({
                input: expect.objectContaining({
                    costLineId: 'cl-lsl',
                    costCategory: 'Developer Expenses',
                    costLineReference: 'Long Service Levy',
                    paidStatus: 'paid',
                }),
                proposedDiff: expect.objectContaining({
                    entity: 'invoice',
                    changes: expect.arrayContaining([
                        expect.objectContaining({
                            label: 'Cost line',
                            after: 'Developer - 1.04 - Long Service Levy',
                        }),
                        expect.objectContaining({
                            label: 'Paid status',
                            after: 'paid',
                        }),
                    ]),
                }),
            })
        );
    });
});
