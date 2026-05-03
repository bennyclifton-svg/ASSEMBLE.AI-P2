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
    guardToolAgainstViewContextIntent,
    writeRefusalRecoveryPrompt,
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

    it('does not treat invoice log requests as new invoice approvals', () => {
        expect(
            shouldRecoverMissingInvoiceApproval({
                latestUserMessage: 'I just want a log or record of all invoices for April 2026',
                finalText: 'Invoice proposed and awaiting your approval.',
                usedToolNames: ['list_invoices'],
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

    it('recovers selected-set addendum typo handoffs when create_addendum is available', () => {
        const latestUserMessage =
            'create an adenumd with the selected set, call it Structural Update';

        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage,
                finalText:
                    'I am unable to create a document like an addendum, as this falls under a documentation specialist.',
                usedToolNames: [],
                allowedToolNames: ['list_stakeholders', 'create_addendum'],
            })
        ).toBe(true);
        expect(writeRefusalRecoveryPrompt(latestUserMessage)).toContain(
            'use the Current selected document ids'
        );
    });

    it('recovers transmittal handoffs after document selection succeeds', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage: 'select all basement drawings and create a transmittal',
                finalText:
                    'I have successfully selected all 19 basement drawings. For the transmittal, please coordinate with document control as it is outside my design management scope.',
                usedToolNames: ['select_project_documents'],
                allowedToolNames: ['select_project_documents', 'create_transmittal'],
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

    it('recovers drawing selection "not available" answers before a selection tool call', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage: 'select drawing CC-20 in the repo',
                finalText:
                    'It appears that drawing CC-20 is not available in the document repository.',
                usedToolNames: ['list_project_documents'],
                allowedToolNames: ['list_project_documents', 'select_project_documents'],
            })
        ).toBe(true);
    });

    it('recovers section drawing selection "not available" answers before a selection tool call', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage: 'select all the section drawings in the repo',
                finalText:
                    'It appears that there are no section drawings available in the document repository.',
                usedToolNames: ['list_project_documents'],
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

    it('recovers invoice log refusals through the invoice read tool', () => {
        const latestUserMessage = 'I just want a log or record of all invoices for April 2026';

        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage,
                finalText:
                    'I cannot generate an invoice log directly. Please refer to the finance team.',
                usedToolNames: [],
                allowedToolNames: ['list_invoices', 'record_invoice'],
            })
        ).toBe(true);
        expect(writeRefusalRecoveryPrompt(latestUserMessage)).toContain('Call list_invoices now');
        expect(writeRefusalRecoveryPrompt(latestUserMessage)).toContain('Do not call record_invoice');
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

    it('allows addendum creation for common addendum typos', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'Create an adenumd with the selected set, call it Structural Update.',
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

    it('blocks note creation for invoice-only requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'add invoice number 123, for a sum of 30,000 allocated to developer/ long service levy, todays date, and status paid.',
                toolName: 'create_note',
            })
        ).toThrow(/invoice/);
    });

    it('blocks programme milestone creation for invoice-only requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'add invoice number 123, for a sum of 30,000 allocated to developer/ long service levy, todays date, and status paid.',
                toolName: 'create_program_milestone',
            })
        ).toThrow(/invoice/);
    });

    it('blocks programme activity creation for invoice-only requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'add invoice number 123, for a sum of 30,000 allocated to developer/ long service levy, todays date, and status paid.',
                toolName: 'create_program_activity',
            })
        ).toThrow(/invoice/);
    });

    it('allows invoice-only requests to use the invoice tool', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'add invoice number 123, for a sum of 30,000 allocated to developer/ long service levy, todays date, and status paid.',
                toolName: 'record_invoice',
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

    it('blocks direct programme activity creation for issue-variation workflow requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'Client asked for extra acoustic treatment. Please issue a variation for about $18,750, link it to the right cost line/programme activity, and add a short project note.',
                toolName: 'create_program_activity',
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

describe('guardToolAgainstViewContextIntent', () => {
    const viewContext = {
        projectId: 'project-1',
        route: '/projects/project-1?tab=notes',
        pendingApprovalIds: [],
        recentlyViewedIds: [],
        selectedEntityIds: {
            document: ['hyd-1', 'hyd-2'],
        },
    };

    it('blocks stale transmittal document ids when the latest request uses the current selection', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Create a transmittal with the selection.',
                toolName: 'create_transmittal',
                input: {
                    name: 'Electrical Documents',
                    destination: 'note',
                    documentIds: ['elec-1', 'elec-2'],
                },
                viewContext,
            })
        ).toThrow(/hyd-1, hyd-2/);
    });

    it('blocks stale filters for current-selection transmittals', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Create a transmittal from the selected documents.',
                toolName: 'create_transmittal',
                input: {
                    destination: 'note',
                    disciplineOrTrade: 'Electrical',
                },
                viewContext,
            })
        ).toThrow(/current document selection/);
    });

    it('blocks inferred discipline names that were not in the latest selection request', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Create a transmittal with the selection.',
                toolName: 'create_transmittal',
                input: {
                    name: 'Electrical Documents',
                    destination: 'note',
                    documentIds: ['hyd-1', 'hyd-2'],
                },
                viewContext,
            })
        ).toThrow(/Do not reuse document IDs, filters, or discipline-based names/);
    });

    it('allows exact selected document ids for current-selection transmittals', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Create a transmittal with the selection.',
                toolName: 'create_transmittal',
                input: {
                    name: 'Selected Documents Transmittal',
                    destination: 'note',
                    documentIds: ['hyd-2', 'hyd-1'],
                },
                viewContext,
            })
        ).not.toThrow();
    });

    it('blocks missing document ids for selected-set addenda', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage:
                    'Create an adenumd with the selected set, call it Structural Update.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-structural',
                    content: 'Structural Update',
                },
                viewContext,
            })
        ).toThrow(/hyd-1, hyd-2/);
    });

    it('blocks selected-set addenda when no current selection is available', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage:
                    'Create an addendum with the selected set, call it Structural Update.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-structural',
                    content: 'Structural Update',
                    documentIds: ['doc-1'],
                },
                viewContext: {
                    projectId: 'project-1',
                    route: '/projects/project-1?tab=notes',
                    pendingApprovalIds: [],
                    recentlyViewedIds: [],
                },
            })
        ).toThrow(/no selected document ids/);
    });

    it('allows exact selected document ids for selected-set addenda', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage:
                    'Create an addendum with the selected set, call it Structural Update.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-structural',
                    content: 'Structural Update',
                    documentIds: ['hyd-2', 'hyd-1'],
                },
                viewContext,
            })
        ).not.toThrow();
    });

    it('does not affect explicit filtered transmittal requests', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Create a transmittal for the electrical documents.',
                toolName: 'create_transmittal',
                input: {
                    destination: 'note',
                    disciplineOrTrade: 'Electrical',
                },
                viewContext,
            })
        ).not.toThrow();
    });
});
