/**
 * update_cost_line — input validation tests.
 *
 * The execute() path requires DB and SSE state, so end-to-end is exercised
 * in approval-flow.test.ts. Here we lock the schema-level behaviour the
 * model is most likely to abuse.
 */

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/agents/events', () => ({ emitChatEvent: jest.fn() }));

import { updateCostLineTool } from '../update-cost-line';

describe('update_cost_line.validate', () => {
    it('requires id', () => {
        expect(() => updateCostLineTool.validate({ budgetCents: 100 })).toThrow();
    });

    it('rejects empty proposals (id only)', () => {
        expect(() => updateCostLineTool.validate({ id: 'cl-1' })).toThrow(
            /at least one field/i
        );
    });

    it('accepts a valid update', () => {
        const out = updateCostLineTool.validate({
            id: 'cl-1',
            budgetCents: 500000,
        });
        expect(out.id).toBe('cl-1');
        expect(out.budgetCents).toBe(500000);
    });

    it('passes _toolUseId through if provided', () => {
        const out = updateCostLineTool.validate({
            id: 'cl-1',
            budgetCents: 500000,
            _toolUseId: 'toolu_abc',
        });
        expect(out._toolUseId).toBe('toolu_abc');
    });

    it('rejects negative money', () => {
        expect(() =>
            updateCostLineTool.validate({ id: 'cl-1', budgetCents: -100 })
        ).toThrow();
    });

    it('rejects non-integer money', () => {
        expect(() =>
            updateCostLineTool.validate({ id: 'cl-1', budgetCents: 1.5 })
        ).toThrow();
    });

    it('rejects unknown master stage', () => {
        expect(() =>
            updateCostLineTool.validate({ id: 'cl-1', masterStage: 'not-a-stage' })
        ).toThrow();
    });

    it('accepts known master stage', () => {
        expect(
            updateCostLineTool.validate({ id: 'cl-1', masterStage: 'delivery' }).masterStage
        ).toBe('delivery');
    });

    it('marks itself as mutating', () => {
        expect(updateCostLineTool.mutating).toBe(true);
    });
});
