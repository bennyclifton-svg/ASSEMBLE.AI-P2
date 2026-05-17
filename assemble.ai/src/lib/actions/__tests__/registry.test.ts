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
    applyCreateAddendum: jest.fn(),
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
        expect(getAction('procurement.tender_firms.add')?.toolName).toBe('add_tender_firms');
        expect(getAction('correspondence.note.create')?.toolName).toBe('create_note');
        expect(getAction('correspondence.meeting.create')?.toolName).toBe('create_meeting');
        expect(getAction('correspondence.report.create')?.toolName).toBe('create_report');
        expect(getAction('correspondence.weekly_report.create_draft')?.toolName).toBe(
            'create_weekly_report_draft'
        );
        expect(getAction('correspondence.rfi.create')?.toolName).toBe('create_rfi');
        expect(getAction('correspondence.rfi.record_response')?.toolName).toBe(
            'record_rfi_response'
        );
        expect(getAction('correspondence.rfi.attach_evidence')?.toolName).toBe(
            'attach_rfi_evidence'
        );
        expect(getAction('documents.ai.sync_project_documents')?.toolName).toBe(
            'sync_project_documents_to_ai'
        );
        expect(getAction('project.ai_memory.create')?.toolName).toBe('create_ai_memory');
        expect(getAction('project.ai_memory.update')?.toolName).toBe('update_ai_memory');
        expect(getAction('project.ai_memory.delete')?.toolName).toBe('delete_ai_memory');
        expect(getAction('correspondence.note.update')?.toolName).toBe('update_note');
        expect(getAction('correspondence.note.attach_documents')?.toolName).toBe(
            'attach_documents_to_note'
        );
        expect(getAction('correspondence.addendum.create')?.toolName).toBe('create_addendum');
        expect(getAction('correspondence.transmittal.create')?.toolName).toBe(
            'create_transmittal'
        );
        expect(getAction('planning.objectives.set')?.toolName).toBe('set_project_objectives');
        expect(getAction('finance.cost_plan.create_line')?.toolName).toBe('create_cost_line');
        expect(getAction('finance.cost_plan.update_line')?.toolName).toBe('update_cost_line');
        expect(getAction('finance.invoices.record')?.toolName).toBe('record_invoice');
        expect(getAction('finance.variations.create')?.toolName).toBe('create_variation');
        expect(getAction('finance.variations.update')?.toolName).toBe('update_variation');
        expect(getAction('risk.create')?.toolName).toBe('create_risk');
        expect(getAction('risk.update')?.toolName).toBe('update_risk');
        expect(getAction('program.activity.create')?.toolName).toBe('create_program_activity');
        expect(getAction('program.activity.update')?.toolName).toBe('update_program_activity');
        expect(getAction('program.replace')?.toolName).toBe('replace_program');
        expect(getAction('program.milestone.create')?.toolName).toBe('create_program_milestone');
        expect(getAction('program.milestone.update')?.toolName).toBe('update_program_milestone');
        expect(getAction('procurement.rft_brief.update')?.toolName).toBe('update_rft_brief');
        expect(getAction('procurement.stakeholder.update')?.toolName).toBe('update_stakeholder');
    });

    test('filters actions by agent access', () => {
        const financeActionIds = listActions({ agentName: 'finance' }).map((action) => action.id);
        const designActionIds = listActions({ agentName: 'design' }).map((action) => action.id);

        expect(financeActionIds).toEqual(
            expect.arrayContaining([
                'correspondence.note.create',
                'correspondence.note.update',
                'correspondence.note.attach_documents',
                'finance.cost_plan.create_line',
                'finance.cost_plan.update_line',
                'finance.invoices.record',
                'finance.variations.create',
                'finance.variations.update',
                'risk.create',
                'risk.update',
            ])
        );
        expect(financeActionIds).not.toContain('program.activity.update');
        expect(financeActionIds).not.toContain('program.milestone.create');
        expect(financeActionIds).not.toContain('procurement.tender_firms.add');
        expect(financeActionIds).not.toContain('procurement.stakeholder.update');
        expect(financeActionIds).not.toContain('correspondence.meeting.create');
        expect(designActionIds).toContain('procurement.stakeholder.update');
        expect(designActionIds).toContain('correspondence.meeting.create');
        expect(designActionIds).toContain('correspondence.report.create');
        expect(designActionIds).toContain('correspondence.weekly_report.create_draft');
        expect(designActionIds).toContain('correspondence.rfi.create');
        expect(designActionIds).toContain('correspondence.rfi.record_response');
        expect(designActionIds).toContain('correspondence.rfi.attach_evidence');
        expect(designActionIds).toContain('documents.ai.sync_project_documents');
        expect(designActionIds).toContain('procurement.rft_brief.update');
        expect(financeActionIds).not.toContain('correspondence.report.create');
        expect(financeActionIds).not.toContain('correspondence.weekly_report.create_draft');
        expect(financeActionIds).not.toContain('correspondence.rfi.create');
        expect(financeActionIds).not.toContain('correspondence.rfi.record_response');
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

    test('requires fee rows when an RFT fee instruction asks for stages', () => {
        const action = getAction('procurement.rft_brief.update');
        const feeRows = [
            'Stage 1 - Design criteria and calculations',
            'Stage 2 - Foundations and basement retention',
            'Stage 3 - Superstructure and lateral stability',
            'Stage 4 - Specifications, certification and inspections',
        ].map((description) => ({ description }));

        expect(
            action?.inputSchema.safeParse({
                id: 'stakeholder-1',
                briefFee: 'Request fee in 4 stages.',
            }).success
        ).toBe(false);

        expect(
            action?.inputSchema.safeParse({
                id: 'stakeholder-1',
                briefFee: 'Request fee in 4 stages.',
                feeStageCount: 4,
                feeRows,
            }).success
        ).toBe(true);
    });
});
