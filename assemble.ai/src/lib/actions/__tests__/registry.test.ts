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
    applyCreateTransmittal: jest.fn(),
    applyCreateVariation: jest.fn(),
    applySetProjectObjectives: jest.fn(),
    applyUpdateCostLine: jest.fn(),
    applyUpdateNote: jest.fn(),
    applyUpdateProgramActivity: jest.fn(),
}));

jest.mock('@/lib/agents/project-events', () => ({
    emitProjectEvent: jest.fn(),
}));

import { getAction, listActions } from '../index';

describe('action registry', () => {
    test('registers the stage-three breadth actions', () => {
        expect(getAction('correspondence.note.create')?.toolName).toBe('create_note');
        expect(getAction('correspondence.note.update')?.toolName).toBe('update_note');
        expect(getAction('correspondence.note.attach_documents')?.toolName).toBe(
            'attach_documents_to_note'
        );
        expect(getAction('correspondence.transmittal.create')?.toolName).toBe(
            'create_transmittal'
        );
        expect(getAction('planning.objectives.set')?.toolName).toBe('set_project_objectives');
        expect(getAction('finance.cost_plan.update_line')?.toolName).toBe('update_cost_line');
        expect(getAction('finance.variations.create')?.toolName).toBe('create_variation');
        expect(getAction('program.activity.create')?.toolName).toBe('create_program_activity');
        expect(getAction('program.activity.update')?.toolName).toBe('update_program_activity');
        expect(getAction('program.milestone.create')?.toolName).toBe('create_program_milestone');
        expect(getAction('program.milestone.update')?.toolName).toBe('update_program_milestone');
    });

    test('filters actions by agent access', () => {
        const financeActionIds = listActions({ agentName: 'finance' }).map((action) => action.id);

        expect(financeActionIds).toEqual(
            expect.arrayContaining([
                'correspondence.note.create',
                'correspondence.note.update',
                'correspondence.note.attach_documents',
                'finance.cost_plan.update_line',
                'finance.variations.create',
            ])
        );
        expect(financeActionIds).not.toContain('program.activity.update');
        expect(financeActionIds).not.toContain('program.milestone.create');
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
        expect(
            action?.inputSchema.safeParse({
                title: 'Elec Spec Review 2',
                content: 'All relevant electrical documents have been attached for review.',
                disciplineOrTrade: 'Electrical',
            }).success
        ).toBe(true);
    });
});
