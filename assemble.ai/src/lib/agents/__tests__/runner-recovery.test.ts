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
    shouldRecoverEvidenceMismatchNonAnswer,
    shouldRecoverMissingApproval,
    shouldRecoverMissingDocumentSelection,
    shouldRecoverMissingEvidenceSearch,
    shouldRecoverMissingInvoiceApproval,
    shouldRecoverWriteRefusal,
    guardToolAgainstLatestIntent,
    guardToolAgainstViewContextIntent,
    writeRefusalRecoveryPrompt,
} from '../runner';
import { guardProjectObjectivesAgainstLatestRequest } from '../objective-intent-guard';

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
        ).toBe(
            "I've put the proposed change in the approval card above. Use Approve & apply to create it, or Edit/Reject if it needs changing."
        );
    });

    it('uses plural wording when multiple approval cards were created', () => {
        expect(
            compactApprovalGatedFinalText({
                approvalToolNames: ['record_invoice', 'record_invoice'],
                finalText: 'Two invoices are awaiting your approval.',
            })
        ).toBe(
            "I've put the proposed changes in the approval cards above. Use the buttons on those cards to approve, edit, or reject them."
        );
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

    it('recovers PCG report requests that claim approval without create_report', () => {
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage: 'a new monthly PCG report',
                finalText: 'PCG report proposed and awaiting your approval.',
                usedToolNames: ['list_reports'],
            })
        ).toBe(true);
        expect(
            shouldRecoverMissingApproval({
                latestUserMessage: 'a new monthly PCG report',
                finalText: 'PCG report proposed and awaiting your approval.',
                usedToolNames: ['create_report'],
            })
        ).toBe(false);
    });

    it('recovers topic document selection "found no documents" answers before a selection tool call', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage: 'select all documents about stairs',
                finalText:
                    'I found no documents matching stairs currently in the repository.',
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

    it('recovers tender-panel firm handoffs when add_tender_firms is available', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage: 'add 3 firms to the Mechanical consultant tender.',
                finalText:
                    'Adding new firms to a Mechanical consultant tender list is generally a task for the Procurement or Delivery Agent.',
                usedToolNames: ['list_stakeholders'],
                allowedToolNames: ['list_stakeholders', 'add_tender_firms'],
            })
        ).toBe(true);
    });

    it('recovers follow-up firm contact lists for tender panels', () => {
        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage: `1. Harbour Mechanical Services
Address: Level 3, 18 Kent Street, Sydney NSW 2000
Phone: 02 9188 4720
Email: tenders@harbourmechanical.com.au`,
                finalText:
                    'Please forward this request to the Procurement Agent to update the tender list.',
                usedToolNames: [],
                allowedToolNames: ['add_tender_firms'],
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

    it('recovers PCG report handoffs when create_report is available', () => {
        const latestUserMessage = 'a new monthly PCG report';

        expect(
            shouldRecoverWriteRefusal({
                latestUserMessage,
                finalText:
                    'I cannot create a PCG report here; please ask Finance or Document Control.',
                usedToolNames: ['list_reports'],
                allowedToolNames: ['list_reports', 'create_report'],
            })
        ).toBe(true);
        expect(writeRefusalRecoveryPrompt(latestUserMessage)).toContain('Project Control Group');
    });
});

describe('shouldRecoverMissingEvidenceSearch', () => {
    it('recovers technical services answers that did not search project evidence', () => {
        expect(
            shouldRecoverMissingEvidenceSearch({
                latestUserMessage: 'what mechanical systems are specified in the appartments',
                finalText:
                    'From the cost plan, the mechanical services specified for the apartments include HVAC budget allowances.',
                usedToolNames: [],
                allowedToolNames: ['search_rag', 'list_notes'],
            })
        ).toBe(true);
    });

    it('does not recover once project evidence has been searched', () => {
        expect(
            shouldRecoverMissingEvidenceSearch({
                latestUserMessage: 'Is CO monitoring required in the carpark?',
                finalText: 'The mechanical specification says CO monitoring is required.',
                usedToolNames: ['search_rag'],
                allowedToolNames: ['search_rag', 'list_notes'],
            })
        ).toBe(false);
    });
});

describe('shouldRecoverEvidenceMismatchNonAnswer', () => {
    it('recovers when relevant spec evidence is treated as a stop sign because of a project mismatch', () => {
        expect(
            shouldRecoverEvidenceMismatchNonAnswer({
                latestUserMessage: 'what mechanical systems are specified in the apartments',
                finalText:
                    'I found a relevant mechanical specification document, but it appears to be for a different project at 74-76 Kitchener Parade, Bankstown, not Lighthouse Residences. There is no direct extract in the Lighthouse Residences project documents specifying the mechanical systems installed in the apartments. To answer your question precisely, the Mechanical consultant should provide details.',
                usedToolNames: ['search_rag'],
            })
        ).toBe(true);
    });

    it('does not recover when the answer gives the caveated evidence summary', () => {
        expect(
            shouldRecoverEvidenceMismatchNonAnswer({
                latestUserMessage: 'what mechanical systems are specified in the apartments',
                finalText:
                    'The source appears to be for another project, so treat this as reference evidence. It specifies split-unit air conditioning systems for apartment cooling/heating and toilet/laundry exhaust systems. The Mechanical consultant should confirm whether this applies to Lighthouse.',
                usedToolNames: ['search_rag'],
            })
        ).toBe(false);
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
    it('requires the AI ingestion filter for ingested document inventory questions', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage: 'can you list all ingested documents',
                toolName: 'list_project_documents',
                input: { includeDocuments: true, limit: 30 },
            })
        ).toThrow(/ai\/rag knowledge/i);

        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage: 'can you list all ingested documents',
                toolName: 'list_project_documents',
                input: { includeDocuments: true, aiIngestionStatus: 'synced', limit: 500 },
            })
        ).not.toThrow();
    });

    it('blocks stale objective text that does not appear in the latest explicit objectives request', () => {
        expect(() =>
            guardProjectObjectivesAgainstLatestRequest({
                latestUserMessage:
                    'Specify induction cooktops, engineered timber flooring, full height tiles to wet areas, and curtains to the objectives.',
                toolName: 'set_project_objectives',
                input: {
                    mode: 'append',
                    functional: [
                        'Incorporate air conditioning systems to ensure thermal comfort and energy efficiency in accordance with NCC requirements.',
                    ],
                },
            })
        ).toThrow(/earlier chat turns/);
    });

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

    it('blocks stale invoice tool calls when the latest request is a variation', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'The Orchestrator routed this request to you as the Finance Agent.\nOriginal user request:\nAdd a Principal variation for upgraded lobby finishes with forecast amount $5,000.',
                toolName: 'record_invoice',
                input: {
                    invoiceNumber: 'INV-123',
                    amountCents: 3000000,
                    costLineReference: 'Long Service Levy',
                },
            })
        ).toThrow(/Do not reuse invoice details from earlier chat turns/);
    });

    it('blocks the exact paid-invoice payload from being reused for a terse variation request', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage:
                    'The Orchestrator routed this request to you as the Finance Agent.\nOriginal user request:\nadd variation of $1111 to architecture, detail design, approved.',
                toolName: 'record_invoice',
                input: {
                    invoiceNumber: 'INV-ACOUSTIC-042826',
                    invoiceDate: '2026-04-28',
                    description: 'Consultant Acoustic Design Invoice',
                    amountCents: 88800,
                    costLineReference: 'Acoustic design + site testing',
                    paidStatus: 'paid',
                },
            })
        ).toThrow(/Do not reuse invoice details from earlier chat turns/);
    });

    it('blocks invoice creation for invoice register read requests', () => {
        expect(() =>
            guardToolAgainstLatestIntent({
                latestUserMessage: 'I just want a log or record of all invoices for April 2026',
                toolName: 'record_invoice',
                input: {
                    invoiceNumber: 'April 2026 invoice log',
                    amountCents: 0,
                },
            })
        ).toThrow(/not an invoice\/progress-claim entry/);
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

    it('blocks stale addendum content for a new selected-set recipient request', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage:
                    'Create an addendum to the general contractor, and attach the selected documents.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-structural',
                    content: 'Structural Update',
                    documentIds: ['hyd-2', 'hyd-1'],
                },
                viewContext,
            })
        ).toThrow(/discipline-based names/);
    });

    it('blocks stale filters for notes created from the current selection', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Create a note with the selected documents called Structural Review.',
                toolName: 'create_note',
                input: {
                    title: 'Structural Review',
                    disciplineOrTrade: 'Electrical',
                },
                viewContext,
            })
        ).toThrow(/hyd-1, hyd-2/);
    });

    it('allows exact selected document ids for notes created from the current selection', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Create a note with the selected documents called Structural Review.',
                toolName: 'create_note',
                input: {
                    title: 'Structural Review',
                    documentIds: ['hyd-2', 'hyd-1'],
                },
                viewContext,
            })
        ).not.toThrow();
    });

    it('blocks stale filters for note attachments from the current selection', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Attach the selected set to the Structural Review note.',
                toolName: 'attach_documents_to_note',
                input: {
                    noteTitle: 'Structural Review',
                    disciplineOrTrade: 'Electrical',
                },
                viewContext,
            })
        ).toThrow(/Call attach_documents_to_note/);
    });

    it('allows exact selected document ids for note attachments', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Attach the selected set to the Structural Review note.',
                toolName: 'attach_documents_to_note',
                input: {
                    noteTitle: 'Structural Review',
                    documentIds: ['hyd-1', 'hyd-2'],
                },
                viewContext,
            })
        ).not.toThrow();
    });

    it('blocks stale update_note attachment ids for the current selection', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Update the note and attach the selected documents.',
                toolName: 'update_note',
                input: {
                    id: 'note-1',
                    attachDocumentIds: ['elec-1', 'elec-2'],
                },
                viewContext,
            })
        ).toThrow(/Call update_note/);
    });

    it('allows exact selected document ids for update_note attachments', () => {
        expect(() =>
            guardToolAgainstViewContextIntent({
                latestUserMessage: 'Update the note and attach the selected documents.',
                toolName: 'update_note',
                input: {
                    id: 'note-1',
                    attachDocumentIds: ['hyd-2', 'hyd-1'],
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
