/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
    db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        transaction: jest.fn(),
    },
}));

jest.mock('@/lib/agents/applicators', () => ({
    applyCreateVariation: jest.fn(),
    applySetProjectObjectives: jest.fn(),
    applyUpdateCostLine: jest.fn(),
    applyUpdateProgramActivity: jest.fn(),
}));

jest.mock('@/lib/agents/project-events', () => ({
    emitProjectEvent: jest.fn(),
}));

import { getAction, listActions } from '../index';

describe('action registry', () => {
    test('registers the stage-three breadth actions', () => {
        expect(getAction('correspondence.note.create')?.toolName).toBe('create_note');
        expect(getAction('planning.objectives.set')?.toolName).toBe(
            'action_planning_objectives_set'
        );
        expect(getAction('finance.cost_plan.update_line')?.toolName).toBe(
            'action_finance_cost_plan_update_line'
        );
        expect(getAction('finance.variations.create')?.toolName).toBe(
            'action_finance_variations_create'
        );
        expect(getAction('program.activity.update')?.toolName).toBe(
            'action_program_activity_update'
        );
    });

    test('filters actions by agent access', () => {
        const financeActionIds = listActions({ agentName: 'finance' }).map((action) => action.id);

        expect(financeActionIds).toEqual(
            expect.arrayContaining([
                'correspondence.note.create',
                'finance.cost_plan.update_line',
                'finance.variations.create',
            ])
        );
        expect(financeActionIds).not.toContain('program.activity.update');
    });

    test('rejects note inputs that claim attachments without document ids', () => {
        const action = getAction('correspondence.note.create');

        expect(
            action?.inputSchema.safeParse({
                title: 'Mech Spec Review 2',
                content: 'Attached all mechanical documents for review.',
            }).success
        ).toBe(false);
        expect(
            action?.inputSchema.safeParse({
                title: 'Elec Spec Review 2',
                content: 'All relevant electrical documents have been attached for review.',
            }).success
        ).toBe(false);
    });
});
