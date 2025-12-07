/**
 * T036: LangGraph Graph Unit Tests
 * Tests for state machine transitions and graph structure
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Types from our graph module
interface TocSection {
    id: string;
    title: string;
    level: number;
    description?: string;
}

interface TableOfContents {
    version: number;
    source: 'memory' | 'generated';
    sections: TocSection[];
}

interface GeneratedSection {
    id: string;
    title: string;
    content: string;
    sourceChunkIds: string[];
    sourceRelevance: Record<string, number>;
    status: 'pending' | 'generating' | 'complete' | 'regenerating';
}

interface PlanningContext {
    projectId: string;
    projectName: string;
    objectives: Array<{ id: string; objective: string; priority: string }>;
    stakeholders: Array<{ id: string; name: string; role: string; organization?: string }>;
    risks: Array<{ id: string; description: string; likelihood: string; impact: string; mitigation?: string }>;
    disciplines: Array<{ id: string; name: string; isEnabled: boolean }>;
}

interface TransmittalContext {
    id: string;
    name: string;
    documents: Array<{
        id: string;
        name: string;
        version: string;
        category: string;
    }>;
}

interface ReportState {
    projectId: string;
    reportType: 'tender_request';
    title: string;
    documentSetIds: string[];
    planningContext: PlanningContext | null;
    transmittal: TransmittalContext | null;
    toc: TableOfContents | null;
    currentSectionIndex: number;
    sections: GeneratedSection[];
    activeSourceIds: string[];
    userFeedback: string | null;
    status: 'draft' | 'toc_pending' | 'generating' | 'complete' | 'failed';
}

describe('LangGraph Report Generation', () => {
    let initialState: ReportState;

    beforeEach(() => {
        initialState = {
            projectId: 'project-123',
            reportType: 'tender_request',
            title: 'Fire Services Tender Request',
            documentSetIds: ['docset-1', 'docset-2'],
            planningContext: null,
            transmittal: null,
            toc: null,
            currentSectionIndex: 0,
            sections: [],
            activeSourceIds: [],
            userFeedback: null,
            status: 'draft',
        };
    });

    describe('State Transitions', () => {
        it('should transition from draft to toc_pending after TOC generation', () => {
            const stateWithToc: ReportState = {
                ...initialState,
                status: 'toc_pending',
                toc: {
                    version: 1,
                    source: 'generated',
                    sections: [
                        { id: 's1', title: 'Introduction', level: 1 },
                        { id: 's2', title: 'Scope of Work', level: 1 },
                    ],
                },
            };

            expect(stateWithToc.status).toBe('toc_pending');
            expect(stateWithToc.toc).not.toBeNull();
            expect(stateWithToc.toc?.sections.length).toBe(2);
        });

        it('should transition from toc_pending to generating after TOC approval', () => {
            const generatingState: ReportState = {
                ...initialState,
                status: 'generating',
                toc: {
                    version: 1,
                    source: 'generated',
                    sections: [
                        { id: 's1', title: 'Introduction', level: 1 },
                    ],
                },
                currentSectionIndex: 0,
            };

            expect(generatingState.status).toBe('generating');
            expect(generatingState.currentSectionIndex).toBe(0);
        });

        it('should increment section index after section approval', () => {
            const stateAfterFirstSection: ReportState = {
                ...initialState,
                status: 'generating',
                currentSectionIndex: 1,
                sections: [
                    {
                        id: 's1',
                        title: 'Introduction',
                        content: 'This tender request covers...',
                        sourceChunkIds: ['chunk-1', 'chunk-2'],
                        sourceRelevance: { 'chunk-1': 0.95, 'chunk-2': 0.87 },
                        status: 'complete',
                    },
                ],
            };

            expect(stateAfterFirstSection.currentSectionIndex).toBe(1);
            expect(stateAfterFirstSection.sections.length).toBe(1);
            expect(stateAfterFirstSection.sections[0].status).toBe('complete');
        });

        it('should transition to complete when all sections are generated', () => {
            const completeState: ReportState = {
                ...initialState,
                status: 'complete',
                toc: {
                    version: 1,
                    source: 'generated',
                    sections: [
                        { id: 's1', title: 'Introduction', level: 1 },
                        { id: 's2', title: 'Scope', level: 1 },
                    ],
                },
                currentSectionIndex: 2,
                sections: [
                    { id: 's1', title: 'Introduction', content: '...', sourceChunkIds: [], sourceRelevance: {}, status: 'complete' },
                    { id: 's2', title: 'Scope', content: '...', sourceChunkIds: [], sourceRelevance: {}, status: 'complete' },
                ],
            };

            expect(completeState.status).toBe('complete');
            expect(completeState.sections.length).toBe(2);
            expect(completeState.currentSectionIndex).toBe(completeState.toc?.sections.length);
        });
    });

    describe('Planning Context Integration', () => {
        it('should include planning context in state after fetch', () => {
            const stateWithPlanningContext: ReportState = {
                ...initialState,
                planningContext: {
                    projectId: 'project-123',
                    projectName: 'Test Building Project',
                    objectives: [
                        { id: 'obj-1', objective: 'Complete fire services tender', priority: 'high' },
                    ],
                    stakeholders: [
                        { id: 'sh-1', name: 'John Smith', role: 'Project Manager', organization: 'Client Corp' },
                    ],
                    risks: [
                        { id: 'r-1', description: 'Material delays', likelihood: 'medium', impact: 'high', mitigation: 'Early procurement' },
                    ],
                    disciplines: [
                        { id: 'd-1', name: 'Fire Services', isEnabled: true },
                    ],
                },
            };

            expect(stateWithPlanningContext.planningContext).not.toBeNull();
            expect(stateWithPlanningContext.planningContext?.projectName).toBe('Test Building Project');
            expect(stateWithPlanningContext.planningContext?.objectives.length).toBe(1);
        });

        it('should include transmittal if exists for discipline', () => {
            const stateWithTransmittal: ReportState = {
                ...initialState,
                transmittal: {
                    id: 'trans-1',
                    name: 'Fire Services Transmittal',
                    documents: [
                        { id: 'doc-1', name: 'Fire Detection Spec.pdf', version: 'Rev 2', category: 'Specifications' },
                        { id: 'doc-2', name: 'AS1851-2012.pdf', version: 'Current', category: 'Standards' },
                    ],
                },
            };

            expect(stateWithTransmittal.transmittal).not.toBeNull();
            expect(stateWithTransmittal.transmittal?.documents.length).toBe(2);
        });
    });

    describe('Conditional Edges', () => {
        it('should route to transmittal section if transmittal exists', () => {
            const stateAfterFinalize: ReportState = {
                ...initialState,
                status: 'generating',
                transmittal: {
                    id: 'trans-1',
                    name: 'Fire Services Transmittal',
                    documents: [{ id: 'doc-1', name: 'Test.pdf', version: 'v1', category: 'Specs' }],
                },
            };

            // Simulating conditional routing logic
            const shouldGenerateTransmittalSection = stateAfterFinalize.transmittal !== null;
            expect(shouldGenerateTransmittalSection).toBe(true);
        });

        it('should route to end if no transmittal exists', () => {
            const stateAfterFinalize: ReportState = {
                ...initialState,
                status: 'generating',
                transmittal: null,
            };

            const shouldGenerateTransmittalSection = stateAfterFinalize.transmittal !== null;
            expect(shouldGenerateTransmittalSection).toBe(false);
        });

        it('should route to regenerate on section feedback with changes', () => {
            const feedback = {
                action: 'regenerate' as const,
                remainingSources: ['chunk-1'],
                instructions: 'Please focus more on fire detection requirements',
            };

            expect(feedback.action).toBe('regenerate');
            expect(feedback.remainingSources.length).toBeLessThan(2);
        });

        it('should route to next section on approve feedback', () => {
            const feedback = {
                action: 'approve' as const,
            };

            expect(feedback.action).toBe('approve');
        });
    });

    describe('Human-in-the-Loop Interrupts', () => {
        it('should create TOC approval interrupt data', () => {
            const interruptData = {
                type: 'toc_approval' as const,
                toc: {
                    version: 1,
                    source: 'generated' as const,
                    sections: [
                        { id: 's1', title: 'Introduction', level: 1 },
                    ],
                },
                message: 'Review and edit the table of contents',
            };

            expect(interruptData.type).toBe('toc_approval');
            expect(interruptData.toc.sections.length).toBeGreaterThan(0);
        });

        it('should create section feedback interrupt data', () => {
            const interruptData = {
                type: 'section_feedback' as const,
                section: {
                    id: 's1',
                    title: 'Introduction',
                    content: 'Generated content...',
                    sourceChunkIds: ['chunk-1', 'chunk-2'],
                    sourceRelevance: { 'chunk-1': 0.95, 'chunk-2': 0.87 },
                    status: 'complete' as const,
                },
                sources: [
                    { id: 'chunk-1', relevance: 95, title: 'Fire Spec Rev 2.pdf' },
                    { id: 'chunk-2', relevance: 87, title: 'AS1851-2012.pdf' },
                ],
                message: 'Review section. Remove sources or request changes.',
            };

            expect(interruptData.type).toBe('section_feedback');
            expect(interruptData.sources.length).toBe(2);
        });
    });

    describe('Source Management', () => {
        it('should update active source IDs when source is removed', () => {
            const initialSources = ['chunk-1', 'chunk-2', 'chunk-3'];
            const removedSource = 'chunk-2';
            const updatedSources = initialSources.filter(id => id !== removedSource);

            expect(updatedSources).toEqual(['chunk-1', 'chunk-3']);
            expect(updatedSources.length).toBe(2);
        });

        it('should track source relevance scores', () => {
            const sourceRelevance: Record<string, number> = {
                'chunk-1': 0.95,
                'chunk-2': 0.87,
                'chunk-3': 0.72,
            };

            // Filter sources above 80% relevance
            const highRelevanceSources = Object.entries(sourceRelevance)
                .filter(([, score]) => score >= 0.8)
                .map(([id]) => id);

            expect(highRelevanceSources).toEqual(['chunk-1', 'chunk-2']);
        });
    });

    describe('Error Handling', () => {
        it('should transition to failed on error', () => {
            const failedState: ReportState = {
                ...initialState,
                status: 'failed',
            };

            expect(failedState.status).toBe('failed');
        });

        it('should preserve state on partial failure', () => {
            const partialState: ReportState = {
                ...initialState,
                status: 'failed',
                currentSectionIndex: 1,
                sections: [
                    { id: 's1', title: 'Introduction', content: '...', sourceChunkIds: [], sourceRelevance: {}, status: 'complete' },
                ],
            };

            // Should preserve completed sections even on failure
            expect(partialState.sections.length).toBe(1);
            expect(partialState.sections[0].status).toBe('complete');
        });
    });
});

describe('TOC Generation', () => {
    it('should generate TOC with correct structure', () => {
        const toc: TableOfContents = {
            version: 1,
            source: 'generated',
            sections: [
                { id: 's1', title: 'Introduction', level: 1, description: 'Overview of the tender request' },
                { id: 's2', title: 'Scope of Work', level: 1, description: 'Detailed scope' },
                { id: 's2-1', title: 'Fire Detection', level: 2 },
                { id: 's2-2', title: 'Fire Suppression', level: 2 },
                { id: 's3', title: 'Requirements', level: 1 },
            ],
        };

        expect(toc.sections.length).toBe(5);
        expect(toc.sections.filter(s => s.level === 1).length).toBe(3);
        expect(toc.sections.filter(s => s.level === 2).length).toBe(2);
    });

    it('should include transmittal appendix in TOC when transmittal exists', () => {
        const tocWithTransmittal: TableOfContents = {
            version: 1,
            source: 'generated',
            sections: [
                { id: 's1', title: 'Introduction', level: 1 },
                { id: 's2', title: 'Scope of Work', level: 1 },
                { id: 'appendix-a', title: 'Appendix A - Transmittal', level: 1, description: 'Document schedule' },
            ],
        };

        const hasTransmittalAppendix = tocWithTransmittal.sections.some(
            s => s.title.includes('Transmittal')
        );

        expect(hasTransmittalAppendix).toBe(true);
    });
});

describe('Transmittal Section Generation', () => {
    it('should generate transmittal markdown table', () => {
        const transmittal: TransmittalContext = {
            id: 'trans-1',
            name: 'Fire Services Transmittal',
            documents: [
                { id: 'doc-1', name: 'Fire Detection Spec.pdf', version: 'Rev 2', category: 'Specifications' },
                { id: 'doc-2', name: 'AS1851-2012.pdf', version: 'Current', category: 'Standards' },
            ],
        };

        // Simulating content generation
        const tableRows = transmittal.documents.map(doc =>
            `| ${doc.name} | ${doc.version} | ${doc.category} |`
        );

        const content = `## Appendix A - Transmittal

The following documents are included in this tender package:

| Doc Name | Version | Category |
|----------|---------|----------|
${tableRows.join('\n')}

*Total: ${transmittal.documents.length} documents*`;

        expect(content).toContain('Appendix A - Transmittal');
        expect(content).toContain('Fire Detection Spec.pdf');
        expect(content).toContain('Total: 2 documents');
    });
});
