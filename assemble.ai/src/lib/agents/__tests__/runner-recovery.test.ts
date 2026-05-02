/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('../tools', () => ({}));
jest.mock('../events', () => ({ emitChatEvent: jest.fn() }));

import {
    approvalCardCount,
    compactApprovalGatedFinalText,
    formatMissingWorkflowApprovalText,
    shouldRecoverMissingApproval,
    shouldRecoverMissingDocumentSelection,
    shouldRecoverMissingInvoiceApproval,
    shouldRecoverWriteRefusal,
    guardToolAgainstLatestIntent,
} from '../runner';

describe('approvalCardCount', () => {
    it('does not count workflow plans without real approval ids as cards', () => {
        expect(
            approvalCardCount({
                status: 'workflow_plan_ready',
                steps: [
                    {
                        title: 'Create variation',
                        state: 'failed',
                        approvalId: null,
                        summary: 'Invalid input',
                    },
                ],
            })
        ).toBe(0);
    });

    it('counts only workflow steps with real approval ids', () => {
        expect(
            approvalCardCount({
                status: 'workflow_plan_ready',
                steps: [
                    { title: 'Create variation', state: 'awaiting_approval', approvalId: 'a1' },
                    { title: 'Create note', state: 'awaiting_approval', approvalId: 'a2' },
                    { title: 'Update programme', state: 'failed', approvalId: null },
                ],
            })
        ).toBe(2);
    });
});

describe('compactApprovalGatedFinalText', () => {
    it('replaces duplicate approval detail prose with a compact card reference', () => {
        expect(
            compactApprovalGatedFinalText({
                approvalToolNames: ['create_variation'],
                finalText:
                    '**Finance Agent:**\nThe variation has been successfully added:\n\n**Variation Details:**\n- **Discipline**: Mechanical\n- **Approved Amount**: $7,777\n\nThis variation is now awaiting your approval.',
            })
        ).toBe("I've put the proposed change in the approval card above.");
    });

    it('uses plural wording when multiple approval cards were created', () => {
        expect(
            compactApprovalGatedFinalText({
                approvalToolNames: ['record_invoice', 'record_invoice'],
                finalText: 'Two invoices are awaiting your approval.',
            })
        ).toBe("I've put the proposed changes in the approval cards above.");
    });

    it('leaves ordinary non-approval answers unchanged', () => {
        expect(
            compactApprovalGatedFinalText({
                approvalToolNames: [],
                finalText: 'There are two open variations.',
            })
        ).toBe('There are two open variations.');
    });
});

describe('shouldRecoverMissingInvoiceApproval', () => {
    it('recovers when an invoice request claims approval but record_invoice was never called', () => {
        expect(
            shouldRecoverMissingInvoiceApproval({
                latestUserMessage: 'please add a new invoice allocated to DA fees for 15000',
                finalText: 'Invoice proposed and awaiting your approval. Please action the approval card.',
                usedToolNames: ['list_cost_lines'],
            })
        ).toBe(true);
    });

    it('does not recover once record_invoice was called', () => {
        expect(
            shouldRecoverMissingInvoiceApproval({
                latestUserMessage: 'please add a new invoice allocated to DA fees for 15000',
                finalText: 'Invoice proposed and awaiting your approval.',
                usedToolNames: ['list_cost_lines', 'record_invoice'],
            })
        ).toBe(false);
    });

    it('does not recover unrelated approval prose', () => {
        expect(
            shouldRecoverMissingInvoiceApproval({
                latestUserMessage: 'update the DA fee budget',
                finalText: 'Awaiting your approval.',
                usedToolNames: ['list_cost_lines'],
            })
        ).toBe(false);
    });
});

describe('shouldRecoverMissingApproval', () => {
    it('recovers when a variation request claims approval but no mutating tool was called', () => {
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage:
                    'Add a Principal variation for upgraded lobby finishes with forecast amount $5,000',
                finalText: 'New variation proposed and awaiting your approval.',
                usedToolNames: ['list_variations'],
            })
        ).toBe(true);
    });

    it('does not recover when any approval-gated mutating tool was called', () => {
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage:
                    'Add a Principal variation for upgraded lobby finishes with forecast amount $5,000',
                finalText: 'New variation proposed and awaiting your approval.',
                usedToolNames: ['list_variations', 'create_variation'],
            })
        ).toBe(false);
    });

    it('does not recover note attachments once the dedicated attachment tool was called', () => {
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage:
                    'Update the note Mech Spec Review 2 and attach all mechanical documents.',
                finalText: 'The note attachment proposal is awaiting your approval.',
                usedToolNames: ['attach_documents_to_note'],
            })
        ).toBe(false);
    });

    it('does not recover ordinary read-only answers', () => {
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage: 'What variations are open?',
                finalText: 'There are two open variations.',
                usedToolNames: ['list_variations'],
            })
        ).toBe(false);
    });

    it('recovers meeting requests that claim approval without create_meeting', () => {
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage: 'create a new meeting called Pre-DA Meeting',
                finalText: 'Meeting proposed and awaiting your approval.',
                usedToolNames: ['list_meetings'],
            })
        ).toBe(true);
    });

    it('recovers addendum requests that claim approval without create_addendum', () => {
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage:
                    'create a new addendum for the Mechanical Consultant and attach all mechanical documents',
                finalText: 'Addendum proposed and awaiting your approval.',
                usedToolNames: ['list_addenda'],
            })
        ).toBe(true);
    });

    it('recovers objective requests that claim approval without set_project_objectives', () => {
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage: 'populate the objectives',
                finalText: 'Project objectives proposed and awaiting your approval.',
                usedToolNames: ['list_project_objectives'],
            })
        ).toBe(true);
    });

    it('recovers issue variation requests phrased without add/create verbs', () => {
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage:
                    'Please issue a variation for about $18,750 and link it to the right cost line/programme activity.',
                finalText: 'Variation workflow proposed and awaiting approval.',
                usedToolNames: ['list_cost_lines', 'list_program'],
            })
        ).toBe(true);
    });
});

describe('formatMissingWorkflowApprovalText', () => {
    it('does not expose raw database query text in the visible assistant reply', () => {
        const text = formatMissingWorkflowApprovalText([
            'Create variation register item: Failed query: insert into "action_invocations" ("id") values ($1) params: sensitive-values',
        ]);

        expect(text).toContain('approval audit log is not ready');
        expect(text).not.toContain('insert into');
        expect(text).not.toContain('params:');
    });
});

describe('shouldRecoverWriteRefusal', () => {
    it('recovers addendum handoffs when create_addendum is available', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage:
                    'create a new addendum for the Mechanical Consultant, attach all mechanical documents',
                finalText:
                    'I cannot create an addendum as this falls outside my domain. Dependency: Document Controller / Admin Agent.',
                usedToolNames: ['list_stakeholders'],
                allowedToolNames: ['list_stakeholders', 'list_project_documents', 'create_addendum'],
            })
        ).toBe(true);
    });

    it('does not recover addendum handoffs when the tool is not available', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage:
                    'create a new addendum for the Mechanical Consultant, attach all mechanical documents',
                finalText: 'I cannot create an addendum as this falls outside my domain.',
                usedToolNames: ['list_stakeholders'],
                allowedToolNames: ['list_stakeholders', 'list_project_documents'],
            })
        ).toBe(false);
    });

    it('does not recover after a mutating tool was already called', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage:
                    'create a new addendum for the Mechanical Consultant, attach all mechanical documents',
                finalText: 'I cannot create an addendum as this falls outside my domain.',
                usedToolNames: ['create_addendum'],
                allowedToolNames: ['create_addendum'],
            })
        ).toBe(false);
    });

    it('recovers document-selection refusals when the selection tool is available', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage: 'select all mech documents',
                finalText: 'I am unable to select mechanical documents directly.',
                usedToolNames: [],
                allowedToolNames: ['list_project_documents', 'select_project_documents'],
            })
        ).toBe(true);
    });

    it('does not recover document-selection refusals after the selection tool was called', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage: 'select all mech documents',
                finalText: 'I am unable to select mechanical documents directly.',
                usedToolNames: ['select_project_documents'],
                allowedToolNames: ['select_project_documents'],
            })
        ).toBe(false);
    });

    it('recovers RFT brief refusals when stakeholder updates are available', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage: 'Create the Architectural Services Brief within the Architectural RFT.',
                finalText: 'I cannot update the RFT directly from here.',
                usedToolNames: ['list_stakeholders'],
                allowedToolNames: ['list_stakeholders', 'update_stakeholder'],
            })
        ).toBe(true);
    });
});

describe('shouldRecoverMissingDocumentSelection', () => {
    it('recovers when a document selection request claims success without selecting', () => {
        expect(
            shouldRecoverMissingDocumentSelection({
                latestUserMessage: 'select all mech documents',
                finalText:
                    'All mechanical documents have been successfully selected. There are 17 mechanical documents now selected.',
                usedToolNames: ['list_project_documents'],
                allowedToolNames: ['list_project_documents', 'select_project_documents'],
            })
        ).toBe(true);
    });

    it('does not recover once select_project_documents was called', () => {
        expect(
            shouldRecoverMissingDocumentSelection({
                latestUserMessage: 'select all mech documents',
                finalText: 'All mechanical documents have been successfully selected.',
                usedToolNames: ['list_project_documents', 'select_project_documents'],
                allowedToolNames: ['select_project_documents'],
            })
        ).toBe(false);
    });

    it('does not recover ordinary document inventory answers', () => {
        expect(
            shouldRecoverMissingDocumentSelection({
                latestUserMessage: 'how many mech documents are there?',
                finalText: 'There are 17 mechanical documents.',
                usedToolNames: ['list_project_documents'],
                allowedToolNames: ['list_project_documents', 'select_project_documents'],
            })
        ).toBe(false);
    });
});

describe('guardToolAgainstLatestIntent', () => {
    it('blocks addendum creation for note attachment requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage: 'Update the note Mech Spec Review 2 and attach all mechanical documents.',
                toolName: 'create_addendum',
            })
        ).toThrow(/note request/);
    });

    it('allows addendum creation for real addendum requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'Create an addendum for the Mechanical Consultant and attach all mechanical documents.',
                toolName: 'create_addendum',
            })
        ).not.toThrow();
    });

    it('blocks note creation for RFT content requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage: 'Create the Architectural Services Brief within the Architectural RFT.',
                toolName: 'create_note',
            })
        ).toThrow(/RFT content request/);
    });

    it('blocks addendum creation for RFT content requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage: 'Create the Architectural Services Brief within the Architectural RFT.',
                toolName: 'create_addendum',
            })
        ).toThrow(/RFT content request/);
    });

    it('allows explicit note requests that mention an RFT', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage: 'Create a note about the Architectural RFT.',
                toolName: 'create_note',
            })
        ).not.toThrow();
    });

    it('blocks direct note creation for issue-variation workflow requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'Client asked for extra acoustic treatment. Please issue a variation for about $18,750, link it to the right cost line/programme activity, and add a short project note.',
                toolName: 'create_note',
            })
        ).toThrow(/issue-variation workflow/);
    });

    it('blocks direct programme updates for issue-variation workflow requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'Client asked for extra acoustic treatment. Please issue a variation for about $18,750, link it to the right cost line/programme activity, and add a short project note.',
                toolName: 'update_program_activity',
            })
        ).toThrow(/issue-variation workflow/);
    });

    it('allows the issue-variation workflow tool for workflow requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'Client asked for extra acoustic treatment. Please issue a variation for about $18,750, link it to the right cost line/programme activity, and add a short project note.',
                toolName: 'start_issue_variation_workflow',
            })
        ).not.toThrow();
    });
});
