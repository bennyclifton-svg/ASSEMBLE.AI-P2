/**
 * create_cost_line — input validation tests.
 *
 * Same pattern as update-cost-line.test.ts. End-to-end propose+apply is
 * exercised through the approval response API tests.
 */

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/agents/events', () => ({ emitChatEvent: jest.fn() }));

import { createCostLineTool } from '../create-cost-line';

describe('create_cost_line.validate', () => {
    it('requires section', () => {
        expect(() => createCostLineTool.validate({ activity: 'X' })).toThrow();
    });

    it('requires activity', () => {
        expect(() => createCostLineTool.validate({ section: 'FEES' })).toThrow();
    });

    it('rejects empty strings for section/activity', () => {
        expect(() =>
            createCostLineTool.validate({ section: '   ', activity: 'X' })
        ).toThrow();
        expect(() =>
            createCostLineTool.validate({ section: 'FEES', activity: '   ' })
        ).toThrow();
    });

    it('accepts a minimal valid input', () => {
        const out = createCostLineTool.validate({
            section: 'FEES',
            activity: 'Fire NSW referral fees',
        });
        expect(out).toEqual({ section: 'FEES', activity: 'Fire NSW referral fees' });
    });

    it('trims whitespace on section and activity', () => {
        const out = createCostLineTool.validate({
            section: '  FEES  ',
            activity: '  Fire NSW  ',
        });
        expect(out.section).toBe('FEES');
        expect(out.activity).toBe('Fire NSW');
    });

    it('accepts optional fields', () => {
        const out = createCostLineTool.validate({
            section: 'FEES',
            activity: 'Fire NSW referral fees',
            costCode: '1.07',
            budgetCents: 6600000,
            approvedContractCents: 0,
            masterStage: 'initiation',
            reference: 'NSW EP&A Act',
        });
        expect(out.costCode).toBe('1.07');
        expect(out.budgetCents).toBe(6600000);
        expect(out.masterStage).toBe('initiation');
    });

    it('rejects negative money', () => {
        expect(() =>
            createCostLineTool.validate({
                section: 'FEES',
                activity: 'X',
                budgetCents: -100,
            })
        ).toThrow();
    });

    it('rejects unknown master stage', () => {
        expect(() =>
            createCostLineTool.validate({
                section: 'FEES',
                activity: 'X',
                masterStage: 'not-a-stage',
            })
        ).toThrow();
    });

    it('marks itself as mutating', () => {
        expect(createCostLineTool.mutating).toBe(true);
    });
});
