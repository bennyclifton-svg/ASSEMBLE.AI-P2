jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/rag/retrieval', () => ({ retrieve: jest.fn(), retrieveFromDomains: jest.fn() }));
jest.mock('@/lib/agents/events', () => ({ emitChatEvent: jest.fn() }));
jest.mock('../../project-events', () => ({ emitProjectEvent: jest.fn() }));
jest.mock('uuid', () => ({ v4: () => 'test-id' }));

import { getTool, specsFor } from '../index';
import { listInvoicesTool } from '../list-invoices';
import { listNotesTool } from '../list-notes';
import { listRisksTool } from '../list-risks';
import { listVariationsTool } from '../list-variations';
import { listStakeholdersTool } from '../list-stakeholders';
import { listMeetingsTool } from '../list-meetings';
import { listReportsTool } from '../list-reports';
import { listAddendaTool } from '../list-addenda';
import { createMeetingTool } from '../create-meeting';
import { createRiskTool } from '../create-risk';
import { updateRiskTool } from '../update-risk';
import { createVariationTool } from '../create-variation';
import { updateVariationTool } from '../update-variation';
import { updateProgramActivityTool } from '../update-program-activity';
import { updateStakeholderTool } from '../update-stakeholder';
import { startIssueVariationWorkflowTool } from '../start-issue-variation-workflow';

const createProgramMilestoneTool = getTool('create_program_milestone')!;
const updateProgramMilestoneTool = getTool('update_program_milestone')!;
const createNoteTool = getTool('create_note')!;
const createReportTool = getTool('create_report')!;
const updateNoteTool = getTool('update_note')!;
const attachDocumentsToNoteTool = getTool('attach_documents_to_note')!;
const createAddendumTool = getTool('create_addendum')!;
const addTenderFirmsTool = getTool('add_tender_firms')!;

describe('Phase 3X read tools', () => {
    it('registers the new tools in the catalog', () => {
        const specs = specsFor([
            'search_knowledge_library',
            'list_notes',
            'list_invoices',
            'list_risks',
            'list_variations',
            'list_stakeholders',
            'list_meetings',
            'list_reports',
            'list_addenda',
            'create_meeting',
            'create_report',
            'create_addendum',
            'add_tender_firms',
            'create_note',
            'update_note',
            'attach_documents_to_note',
            'create_risk',
            'update_risk',
            'create_variation',
            'update_variation',
            'create_program_activity',
            'update_program_activity',
            'create_program_milestone',
            'update_program_milestone',
            'update_stakeholder',
            'start_issue_variation_workflow',
        ]);
        expect(specs.map((spec) => spec.name)).toContain('search_knowledge_library');
        expect(specs.map((spec) => spec.name)).toContain('list_invoices');
        expect(specs.map((spec) => spec.name)).toContain('update_stakeholder');
        expect(specs.map((spec) => spec.name)).toContain('create_meeting');
        expect(specs.map((spec) => spec.name)).toContain('create_report');
        expect(specs.map((spec) => spec.name)).toContain('create_addendum');
        expect(specs.map((spec) => spec.name)).toContain('add_tender_firms');
        expect(specs.map((spec) => spec.name)).toContain('attach_documents_to_note');
        expect(specs.map((spec) => spec.name)).toContain('create_program_activity');
        expect(specs.map((spec) => spec.name)).toContain('start_issue_variation_workflow');
    });

    it('accepts empty input and clamps limits', () => {
        expect(listNotesTool.validate(undefined)).toEqual({});
        expect(listInvoicesTool.validate({ periodYear: 2026, periodMonth: 4 })).toEqual({
            periodYear: 2026,
            periodMonth: 4,
        });
        expect(listRisksTool.validate({ limit: 9999 }).limit).toBeLessThanOrEqual(200);
        expect(listVariationsTool.validate({ status: 'Forecast' })).toEqual({ status: 'Forecast' });
        expect(listStakeholdersTool.validate({ stakeholderGroup: 'consultant' })).toEqual({
            stakeholderGroup: 'consultant',
        });
        expect(listMeetingsTool.validate({ includeSections: false })).toEqual({
            includeSections: false,
        });
        expect(listReportsTool.validate({ query: 'PCG', includeSections: false })).toEqual({
            query: 'PCG',
            includeSections: false,
        });
        expect(listAddendaTool.validate({ stakeholderId: 'stk-1', includeDocuments: true })).toEqual({
            stakeholderId: 'stk-1',
            includeDocuments: true,
        });
    });

    it('marks read tools as non-mutating', () => {
        for (const tool of [
            listNotesTool,
            listInvoicesTool,
            listRisksTool,
            listVariationsTool,
            listStakeholdersTool,
            listMeetingsTool,
            listReportsTool,
            listAddendaTool,
        ]) {
            expect(tool.mutating).toBe(false);
        }
    });
});

describe('Phase 3X write tool validation', () => {
    it('validates note creates and updates', () => {
        expect(createNoteTool.validate({
            title: 'Weekly finance note',
            color: 'blue',
            documentIds: ['doc-1', 'doc-1', 'doc-2'],
        })).toEqual({
            title: 'Weekly finance note',
            color: 'blue',
            documentIds: ['doc-1', 'doc-2'],
        });
        expect((updateNoteTool.validate({ id: 'note-1', isStarred: true }) as { isStarred?: boolean }).isStarred).toBe(true);
        expect(
            (updateNoteTool.validate({ id: 'note-1', attachDocumentIds: ['doc-3'] }) as {
                attachDocumentIds?: string[];
            }).attachDocumentIds
        ).toEqual(['doc-3']);
        expect(() => updateNoteTool.validate({ id: 'note-1' })).toThrow(/at least one/i);
        expect(() => createNoteTool.validate({ title: 'Bad', documentIds: [''] })).toThrow();
        expect(() =>
            createNoteTool.validate({
                title: 'Mech Spec Review 2',
                content: 'Attached all mechanical documents for review.',
            })
        ).toThrow(/documentIds or a document filter/);
        expect(() =>
            createNoteTool.validate({
                title: 'Elec Spec Review 2',
                content: 'All relevant electrical documents have been attached for review.',
            })
        ).toThrow(/documentIds or a document filter/);
        expect(
            createNoteTool.validate({
                title: 'Elec Spec Review 2',
                content: 'All relevant electrical documents have been attached for review.',
                type: 'review',
                disciplineOrTrade: 'Electrical',
            })
        ).toEqual({
            title: 'Elec Spec Review 2',
            content: 'All relevant electrical documents have been attached for review.',
            type: 'review',
            disciplineOrTrade: 'Electrical',
        });
        expect(() =>
            updateNoteTool.validate({
                id: 'note-1',
                content: 'Attached all mechanical documents for review.',
            })
        ).toThrow(/attachDocumentIds are required/);
        expect(() =>
            updateNoteTool.validate({
                id: 'note-1',
                content: 'All relevant electrical documents have been attached for review.',
            })
        ).toThrow(/attachDocumentIds are required/);
    });

    it('validates note document attachment shortcuts', () => {
        expect(
            attachDocumentsToNoteTool.validate({
                noteTitle: 'Mech Spec Review 2',
                disciplineOrTrade: 'Mechanical',
            })
        ).toEqual({
            noteTitle: 'Mech Spec Review 2',
            disciplineOrTrade: 'Mechanical',
        });
        expect(
            attachDocumentsToNoteTool.validate({
                noteId: 'note-1',
                documentIds: ['doc-1', 'doc-1', 'doc-2'],
                limit: 9999,
            })
        ).toEqual({
            noteId: 'note-1',
            documentIds: ['doc-1', 'doc-2'],
            limit: 500,
        });
        expect(() =>
            attachDocumentsToNoteTool.validate({ disciplineOrTrade: 'Mechanical' })
        ).toThrow(/noteId or noteTitle/);
        expect(() =>
            attachDocumentsToNoteTool.validate({ noteTitle: 'Mech Spec Review 2' })
        ).toThrow(/documentIds, a document filter/);
    });

    it('validates risks', () => {
        expect(createRiskTool.validate({ title: 'Late authority approval', impact: 'high' }).impact).toBe('high');
        expect(updateRiskTool.validate({ id: 'risk-1', status: 'mitigated' }).status).toBe('mitigated');
        expect(() => createRiskTool.validate({ title: 'Bad', impact: 'extreme' })).toThrow();
    });

    it('validates variations with money and dates', () => {
        expect(
            createVariationTool.validate({
                category: 'Principal',
                description: 'Client scope change',
                amountForecastCents: 500000,
                dateSubmitted: '2026-04-30',
            }).amountForecastCents
        ).toBe(500000);
        expect(
            createVariationTool.validate({
                category: 'Principal',
                description: 'Aborted Basement Ventilation',
                status: 'Approved',
                disciplineOrTrade: 'Mechanical',
                costLineReference: 'Detail Design',
                amountApprovedCents: 777700,
            })
        ).toEqual(
            expect.objectContaining({
                disciplineOrTrade: 'Mechanical',
                costLineReference: 'Detail Design',
                amountApprovedCents: 777700,
            })
        );
        expect(() =>
            createVariationTool.validate({
                category: 'Principal',
                description: 'Bad blank cost line',
                costLineId: '',
            })
        ).toThrow(/costLineReference/);
        expect(() =>
            createVariationTool.validate({
                category: 'Principal',
                description: 'Invalid submitted status',
                status: 'Submitted',
            })
        ).toThrow(/status/);
        expect(updateVariationTool.validate({ id: 'var-1', amountApprovedCents: 250000 }).amountApprovedCents).toBe(250000);
        expect(() =>
            updateVariationTool.validate({ id: 'var-1', status: 'Submitted' })
        ).toThrow(/status/);
        expect(() =>
            updateVariationTool.validate({ id: 'var-1', dateApproved: '2026-13-99' })
        ).toThrow();
    });

    it('accepts sparse issue-variation workflow inputs from PM-style prompts', () => {
        const input = startIssueVariationWorkflowTool.validate({
            variation: {
                description: 'Extra acoustic treatment to meeting rooms',
                amountForecastCents: 1875000,
            },
            programActivityUpdate: {
                name: 'Meeting room fitout',
            },
            note: {
                content: 'Client requested extra acoustic treatment to meeting rooms.',
            },
        });

        expect(input.variation).toEqual(
            expect.objectContaining({
                category: 'Principal',
                status: 'Forecast',
                description: 'Extra acoustic treatment to meeting rooms',
                amountForecastCents: 1875000,
            })
        );
        expect(input.programActivityUpdate?.id).toBeUndefined();
        expect(input.note?.title).toBeUndefined();
    });

    it('validates programme tools', () => {
        expect(updateProgramActivityTool.validate({ id: 'act-1', startDate: '2026-05-01' }).startDate).toBe('2026-05-01');
        expect(
            createProgramMilestoneTool.validate({
                activityId: 'act-1',
                name: 'DA lodgement',
                date: '2026-06-01',
            })
        ).toEqual(expect.objectContaining({ date: '2026-06-01' }));
        expect(updateProgramMilestoneTool.validate({ id: 'ms-1', sortOrder: 3 })).toEqual(
            expect.objectContaining({ sortOrder: 3 })
        );
        expect(() =>
            updateProgramActivityTool.validate({
                id: 'act-1',
                startDate: '2026-06-01',
                endDate: '2026-05-01',
            })
        ).toThrow();
    });

    it('validates stakeholder updates', () => {
        expect(
            (updateStakeholderTool.validate({ id: 'stk-1', briefServices: 'DA coordination' }) as {
                briefServices?: string;
            }).briefServices
        ).toBe('DA coordination');
        expect((updateStakeholderTool.validate({ id: 'stk-1', isEnabled: false }) as { isEnabled?: boolean }).isEnabled).toBe(false);
        expect(() => updateStakeholderTool.validate({ id: 'stk-1', name: 'New name' })).toThrow(/user-managed/i);
        expect(() => updateStakeholderTool.validate({ id: 'stk-1' })).toThrow(/at least one/i);
    });

    it('validates meeting creates', () => {
        expect(createMeetingTool.validate({ title: 'Pre-DA Meeting' })).toEqual({
            title: 'Pre-DA Meeting',
        });
        expect(
            createMeetingTool.validate({
                title: 'Pre-DA Meeting',
                meetingDate: '2026-05-01',
                agendaType: 'standard',
            }).meetingDate
        ).toBe('2026-05-01');
        expect(() => createMeetingTool.validate({ title: 'Bad', meetingDate: '01/05/2026' })).toThrow();
    });

    it('validates addendum creates', () => {
        expect(
            createAddendumTool.validate({
                stakeholderId: 'stk-mech',
                content: 'General update to the mechanical design documents.',
                documentIds: ['doc-1', 'doc-1', 'doc-2'],
                addendumDate: '2026-05-02',
            })
        ).toEqual({
            stakeholderId: 'stk-mech',
            content: 'General update to the mechanical design documents.',
            documentIds: ['doc-1', 'doc-2'],
            addendumDate: '2026-05-02',
        });
        expect(() => createAddendumTool.validate({ content: 'Missing stakeholder' })).toThrow(/stakeholderId/);
        expect(() =>
            createAddendumTool.validate({ stakeholderId: 'stk-1', content: 'Bad date', addendumDate: '02/05/2026' })
        ).toThrow(/addendumDate/);
    });

    it('validates report creates', () => {
        expect(
            createReportTool.validate({
                title: 'Monthly PCG Report - May 2026',
                reportDate: '2026-05-06',
                contentsType: 'standard',
            })
        ).toEqual(
            expect.objectContaining({
                title: 'Monthly PCG Report - May 2026',
                reportDate: '2026-05-06',
                contentsType: 'standard',
            })
        );
        expect(() =>
            createReportTool.validate({
                title: 'Bad date',
                reportDate: '06/05/2026',
            })
        ).toThrow(/reportDate/);
    });

    it('validates tender firm additions', () => {
        expect(
            addTenderFirmsTool.validate({
                firmType: 'contractor',
                disciplineOrTrade: 'Mechanical',
                firms: [
                    {
                        companyName: 'Harbour Mechanical Services',
                        address: 'Level 3, 18 Kent Street, Sydney NSW 2000',
                        phone: '02 9188 4720',
                        email: 'tenders@harbourmechanical.com.au',
                    },
                ],
            })
        ).toEqual({
            firmType: 'contractor',
            disciplineOrTrade: 'Mechanical',
            firms: [
                {
                    companyName: 'Harbour Mechanical Services',
                    address: 'Level 3, 18 Kent Street, Sydney NSW 2000',
                    phone: '02 9188 4720',
                    email: 'tenders@harbourmechanical.com.au',
                },
            ],
        });
        expect(() =>
            addTenderFirmsTool.validate({
                firmType: 'supplier',
                disciplineOrTrade: 'Mechanical',
                firms: [{ companyName: 'Bad Firm' }],
            })
        ).toThrow(/firmType/);
        expect(() =>
            addTenderFirmsTool.validate({
                firmType: 'contractor',
                disciplineOrTrade: 'Mechanical',
                firms: [],
            })
        ).toThrow(/firms/);
    });

    it('marks write tools as mutating', () => {
        for (const tool of [
            createNoteTool,
            updateNoteTool,
            attachDocumentsToNoteTool,
            createMeetingTool,
            createReportTool,
            createAddendumTool,
            addTenderFirmsTool,
            createRiskTool,
            updateRiskTool,
            createVariationTool,
            updateVariationTool,
            updateProgramActivityTool,
            createProgramMilestoneTool,
            updateProgramMilestoneTool,
            updateStakeholderTool,
        ]) {
            expect(tool.mutating).toBe(true);
        }
    });
});
