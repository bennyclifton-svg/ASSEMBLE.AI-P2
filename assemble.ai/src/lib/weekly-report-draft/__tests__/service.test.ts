/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
    db: { transaction: jest.fn() },
    reports: {},
    reportSections: {},
}));

jest.mock('@/lib/ai/client', () => ({
    aiComplete: jest.fn(),
}));

jest.mock('@/lib/context/orchestrator', () => ({
    assembleContext: jest.fn(),
}));

jest.mock('@/lib/rfi/service', () => ({
    rfiService: { list: jest.fn() },
}));

import type { AssembledContext } from '@/lib/context/types';
import type { RfiRecord } from '@/types/rfi';
import { generateWeeklyReportDraft } from '../service';

function assembledContext(overrides: Partial<AssembledContext> = {}): AssembledContext {
    return {
        projectSummary: 'Demo project is in delivery.',
        moduleContext: 'Cost plan forecast is $10m. Programme shows practical completion on 2026-09-30. Risk register includes authority delay.',
        knowledgeContext: '',
        ragContext: 'Acoustic Report Rev 02 says rooftop plant noise treatment remains under review.',
        aiMemoryContext: 'Reporting preference: keep weekly reports concise.',
        crossModuleInsights: 'Open RFIs with overdue dates may affect programme certainty.',
        rawModules: new Map(),
        metadata: {
            modulesRequested: [],
            modulesFetched: [],
            modulesFailed: [],
            totalEstimatedTokens: 0,
            formattingTier: 'summary',
            assemblyTimeMs: 1,
            cacheHits: 0,
            cacheMisses: 0,
        },
        ...overrides,
    };
}

function rfi(overrides: Partial<RfiRecord> = {}): RfiRecord {
    return {
        id: 'rfi-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        rfiNumber: 1,
        reference: 'RFI-001',
        title: 'Rooftop plant noise',
        question: 'Please confirm acoustic treatment.',
        status: 'open',
        priority: 'high',
        responsibleStakeholderId: null,
        responsibleParty: null,
        responsiblePartyLabel: 'Acoustic Consultant',
        dueDate: '2026-05-20',
        responseText: null,
        responseDate: null,
        sourceNoteId: null,
        sourceNote: null,
        evidenceLinks: [
            {
                id: 'evidence-1',
                rfiId: 'rfi-1',
                projectId: 'project-1',
                organizationId: 'org-1',
                targetType: 'document',
                targetId: 'document-1',
                label: 'Acoustic Report Rev 02',
                createdAt: '2026-05-14T00:00:00.000Z',
            },
        ],
        auditTrail: [],
        displayState: 'upcoming',
        isOverdue: false,
        rowVersion: 1,
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        deletedAt: null,
        ...overrides,
    };
}

describe('generateWeeklyReportDraft', () => {
    it('builds a grounded draft from seeded records, RFIs, and document excerpts', async () => {
        let prompt = '';
        const modelClient = {
            generate: jest.fn(async (value: string) => {
                prompt = value;
                return {
                    sections: [
                        {
                            sectionKey: 'status_summary' as const,
                            facts: [
                                {
                                    text: 'The project is in delivery.',
                                    citationRefs: ['record:project-summary'],
                                },
                                {
                                    text: 'Rooftop plant noise treatment remains under review.',
                                    citationRefs: ['document:rag-excerpts'],
                                },
                            ],
                            assumptions: ['No approved change to completion date has been recorded.'],
                            recommendations: ['Keep acoustic close-out visible in the next PM meeting.'],
                            openQuestions: [],
                        },
                        {
                            sectionKey: 'current_rfis' as const,
                            facts: [
                                {
                                    text: 'RFI-001 is open with the acoustic consultant.',
                                    citationRefs: ['rfi:RFI-001'],
                                },
                            ],
                            assumptions: [],
                            recommendations: ['Follow up RFI-001 before the due date.'],
                            openQuestions: ['Has the consultant committed to a response date?'],
                        },
                    ],
                };
            }),
        };

        const draft = await generateWeeklyReportDraft(
            {
                projectId: 'project-1',
                organizationId: 'org-1',
                reportingPeriodStart: '2026-05-08',
                reportingPeriodEnd: '2026-05-14',
            },
            {
                assembleContextFn: jest.fn(async () => assembledContext()),
                listRfis: jest.fn(async () => ({ rfis: [rfi()], total: 1, filter: 'all' as const })),
                modelClient,
            }
        );

        expect(prompt).toContain('record:project-summary');
        expect(prompt).toContain('document:rag-excerpts');
        expect(prompt).toContain('rfi:RFI-001');
        expect(prompt).toContain('memory:approved-context');
        expect(prompt).toContain('advisory only');

        expect(draft.rfiCount).toBe(1);
        expect(draft.title).toBe('Weekly Project Report - 2026-05-08 to 2026-05-14');
        expect(draft.sections.find((section) => section.sectionKey === 'status_summary')?.content)
            .toContain('Rooftop plant noise treatment remains under review. [document:rag-excerpts]');
        expect(draft.sections.find((section) => section.sectionKey === 'current_rfis')?.content)
            .toContain('RFI-001 is open with the acoustic consultant. [rfi:RFI-001]');
    });

    it('moves memory-only factual claims into assumptions so memory cannot become project truth', async () => {
        const draft = await generateWeeklyReportDraft(
            {
                projectId: 'project-1',
                organizationId: 'org-1',
                reportingPeriodStart: '2026-05-08',
                reportingPeriodEnd: '2026-05-14',
            },
            {
                assembleContextFn: jest.fn(async () => assembledContext()),
                listRfis: jest.fn(async () => ({ rfis: [], total: 0, filter: 'all' as const })),
                modelClient: {
                    generate: jest.fn(async () => ({
                        sections: [
                            {
                                sectionKey: 'status_summary' as const,
                                facts: [
                                    {
                                        text: 'The project is ahead of programme because memory says so.',
                                        citationRefs: ['memory:approved-context'],
                                    },
                                ],
                                assumptions: [],
                                recommendations: [],
                                openQuestions: [],
                            },
                        ],
                    })),
                },
            }
        );

        const content = draft.sections.find((section) => section.sectionKey === 'status_summary')?.content ?? '';

        expect(content).toContain('No current record-backed facts were drafted');
        expect(content).toContain(
            'The project is ahead of programme because memory says so. (from advisory memory only; verify against project records before treating as fact)'
        );
    });
});
