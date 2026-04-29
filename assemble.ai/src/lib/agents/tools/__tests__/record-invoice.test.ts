/**
 * record_invoice — input validation tests.
 *
 * Same pattern as create-cost-line.test.ts. End-to-end propose+apply is
 * exercised through the approval response API tests.
 */

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/agents/events', () => ({ emitChatEvent: jest.fn() }));

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
            paidStatus: 'paid',
            paidDate: '2025-11-30',
        });
        expect(out.description).toBe('Progress Claim #1');
        expect(out.gstCents).toBe(18000000);
        expect(out.costLineId).toBe('cl-abc');
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
