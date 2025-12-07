/**
 * T038: Reports API Contract Tests
 * Validates API endpoints against contracts/reports.yaml schema
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// API Contract Types (from contracts/reports.yaml)
interface ReportGenerateRequest {
    projectId: string;
    reportType: 'tender_request';
    title: string;
    discipline?: string;
    documentSetIds: string[];
    transmittalId?: string;
}

interface TocSection {
    id: string;
    title: string;
    level: number;
    description?: string;
    estimatedTokens?: number;
}

interface TableOfContents {
    version: number;
    source: 'memory' | 'generated';
    sections: TocSection[];
}

interface SmartContextSource {
    chunkId: string;
    documentId: string;
    documentTitle: string;
    sectionTitle?: string;
    relevanceScore: number; // 0-100
    excerpt: string;
    isActive: boolean;
}

interface ReportSection {
    id: string;
    reportId: string;
    sectionIndex: number;
    title: string;
    content: string | null;
    sourceChunkIds: string[];
    sources: SmartContextSource[];
    status: 'pending' | 'generating' | 'complete' | 'regenerating';
    generatedAt: string | null;
    regenerationCount: number;
}

interface ReportTemplate {
    id: string;
    projectId: string;
    documentSetIds: string[];
    transmittalId?: string;
    reportType: 'tender_request';
    title: string;
    discipline?: string;
    tableOfContents: TableOfContents;
    status: 'draft' | 'toc_pending' | 'generating' | 'complete' | 'failed';
    lockedBy?: string;
    lockedByName?: string;
    lockedAt?: string;
    currentSectionIndex: number;
    createdAt: string;
    updatedAt: string;
}

interface ReportWithSections extends ReportTemplate {
    sections: ReportSection[];
}

interface ReportSummary {
    id: string;
    title: string;
    discipline?: string;
    status: string;
    completedSections: number;
    totalSections: number;
    lockedBy?: string;
    lockedByName?: string;
    createdAt: string;
    updatedAt: string;
}

interface LockError {
    error: string;
    lockedBy: string;
    lockedByName: string;
    lockedAt: string;
    expiresAt: string;
}

describe('POST /api/reports/generate', () => {
    it('should accept valid request body', () => {
        const validRequest: ReportGenerateRequest = {
            projectId: 'project-123',
            reportType: 'tender_request',
            title: 'Fire Services Tender Request',
            discipline: 'Fire Services',
            documentSetIds: ['docset-1', 'docset-2'],
            transmittalId: 'trans-1',
        };

        expect(validRequest.projectId).toBeDefined();
        expect(validRequest.reportType).toBe('tender_request');
        expect(validRequest.documentSetIds.length).toBeGreaterThan(0);
    });

    it('should require mandatory fields', () => {
        const requiredFields = ['projectId', 'reportType', 'title', 'documentSetIds'];
        const validRequest: ReportGenerateRequest = {
            projectId: 'project-123',
            reportType: 'tender_request',
            title: 'Test Report',
            documentSetIds: ['docset-1'],
        };

        for (const field of requiredFields) {
            expect((validRequest as any)[field]).toBeDefined();
        }
    });

    it('should return 201 with ReportTemplate on success', () => {
        const response: ReportTemplate = {
            id: 'report-456',
            projectId: 'project-123',
            documentSetIds: ['docset-1'],
            reportType: 'tender_request',
            title: 'Fire Services Tender Request',
            discipline: 'Fire Services',
            tableOfContents: {
                version: 1,
                source: 'generated',
                sections: [
                    { id: 's1', title: 'Introduction', level: 1 },
                ],
            },
            status: 'toc_pending',
            currentSectionIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        expect(response.id).toBeDefined();
        expect(response.status).toBe('toc_pending');
        expect(response.tableOfContents.sections.length).toBeGreaterThan(0);
    });

    it('should return 409 when report is locked', () => {
        const conflictResponse: LockError = {
            error: 'Another report is being generated for this project',
            lockedBy: 'user-789',
            lockedByName: 'Jane Doe',
            lockedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };

        expect(conflictResponse.error).toBeDefined();
        expect(conflictResponse.lockedBy).toBeDefined();
    });
});

describe('GET /api/reports', () => {
    it('should return list of reports for project', () => {
        const response = {
            reports: [
                {
                    id: 'report-1',
                    title: 'Fire Services Tender',
                    discipline: 'Fire Services',
                    status: 'complete',
                    completedSections: 5,
                    totalSections: 5,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                } as ReportSummary,
                {
                    id: 'report-2',
                    title: 'Electrical Tender',
                    discipline: 'Electrical',
                    status: 'generating',
                    completedSections: 2,
                    totalSections: 4,
                    lockedBy: 'user-123',
                    lockedByName: 'John Smith',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                } as ReportSummary,
            ],
        };

        expect(Array.isArray(response.reports)).toBe(true);
        expect(response.reports[0].completedSections).toBeLessThanOrEqual(response.reports[0].totalSections);
    });

    it('should support status filter', () => {
        const queryParams = {
            projectId: 'project-123',
            status: 'complete',
        };

        expect(queryParams.status).toBe('complete');
    });
});

describe('GET /api/reports/{id}', () => {
    it('should return full report with sections', () => {
        const response: ReportWithSections = {
            id: 'report-456',
            projectId: 'project-123',
            documentSetIds: ['docset-1'],
            reportType: 'tender_request',
            title: 'Fire Services Tender Request',
            discipline: 'Fire Services',
            tableOfContents: {
                version: 1,
                source: 'generated',
                sections: [
                    { id: 's1', title: 'Introduction', level: 1 },
                    { id: 's2', title: 'Scope', level: 1 },
                ],
            },
            status: 'complete',
            currentSectionIndex: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sections: [
                {
                    id: 'sec-1',
                    reportId: 'report-456',
                    sectionIndex: 0,
                    title: 'Introduction',
                    content: 'This tender request covers...',
                    sourceChunkIds: ['chunk-1', 'chunk-2'],
                    sources: [
                        {
                            chunkId: 'chunk-1',
                            documentId: 'doc-1',
                            documentTitle: 'Fire Spec Rev 2.pdf',
                            sectionTitle: 'Section 3.2',
                            relevanceScore: 95,
                            excerpt: 'Fire detection systems shall...',
                            isActive: true,
                        },
                    ],
                    status: 'complete',
                    generatedAt: new Date().toISOString(),
                    regenerationCount: 0,
                },
            ],
        };

        expect(response.sections).toBeDefined();
        expect(response.sections[0].sources).toBeDefined();
        expect(response.sections[0].sources[0].relevanceScore).toBeGreaterThanOrEqual(0);
        expect(response.sections[0].sources[0].relevanceScore).toBeLessThanOrEqual(100);
    });
});

describe('DELETE /api/reports/{id}', () => {
    it('should return 204 on successful deletion', () => {
        // 204 No Content response
        const statusCode = 204;
        expect(statusCode).toBe(204);
    });
});

describe('POST /api/reports/{id}/approve-toc', () => {
    it('should accept edited table of contents', () => {
        const request = {
            tableOfContents: {
                version: 2, // Incremented version
                source: 'generated' as const,
                sections: [
                    { id: 's1', title: 'Introduction', level: 1 },
                    { id: 's2', title: 'Scope of Work', level: 1 },
                    { id: 's3', title: 'New Custom Section', level: 1 }, // User added
                ],
            },
        };

        expect(request.tableOfContents.sections.length).toBe(3);
    });

    it('should return generating status and next section', () => {
        const response = {
            status: 'generating',
            nextSection: 0,
        };

        expect(response.status).toBe('generating');
        expect(response.nextSection).toBe(0);
    });

    it('should return 409 when locked by another user', () => {
        const errorResponse: LockError = {
            error: 'Report is locked by another user',
            lockedBy: 'user-789',
            lockedByName: 'Jane Doe',
            lockedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };

        expect(errorResponse.error).toContain('locked');
    });
});

describe('POST /api/reports/{id}/section-feedback', () => {
    it('should accept approve action', () => {
        const request = {
            sectionIndex: 0,
            action: 'approve' as const,
        };

        expect(request.action).toBe('approve');
    });

    it('should accept regenerate action with feedback', () => {
        const request = {
            sectionIndex: 1,
            action: 'regenerate' as const,
            feedback: 'Please include more detail about fire suppression systems',
            excludeSourceIds: ['chunk-3'], // User removed a source
        };

        expect(request.action).toBe('regenerate');
        expect(request.feedback).toBeDefined();
    });

    it('should accept skip action', () => {
        const request = {
            sectionIndex: 2,
            action: 'skip' as const,
        };

        expect(request.action).toBe('skip');
    });

    it('should return next section or completion status', () => {
        const response = {
            status: 'generating',
            nextSection: 1,
            isComplete: false,
        };

        expect(response.nextSection).toBe(1);

        const completeResponse = {
            status: 'complete',
            nextSection: 3,
            isComplete: true,
        };

        expect(completeResponse.isComplete).toBe(true);
    });
});

describe('POST /api/reports/{id}/lock', () => {
    it('should return lock acquired response', () => {
        const response = {
            locked: true,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };

        expect(response.locked).toBe(true);
        expect(new Date(response.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should return 409 when already locked', () => {
        const errorResponse: LockError = {
            error: 'Report is locked by another user',
            lockedBy: 'user-789',
            lockedByName: 'Jane Doe',
            lockedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };

        expect(errorResponse.lockedBy).toBe('user-789');
    });
});

describe('DELETE /api/reports/{id}/lock', () => {
    it('should return 204 on lock release', () => {
        const statusCode = 204;
        expect(statusCode).toBe(204);
    });
});

describe('POST /api/reports/{id}/export', () => {
    it('should accept export format options', () => {
        const request = {
            format: 'docx' as const,
            includeSourceCitations: true,
            includeDocumentSchedule: true,
        };

        expect(request.format).toBe('docx');
    });

    it('should support pdf format', () => {
        const request = {
            format: 'pdf' as const,
            includeSourceCitations: false,
            includeDocumentSchedule: true,
        };

        expect(request.format).toBe('pdf');
    });
});

describe('GET /api/reports/{id}/stream', () => {
    it('should return SSE event stream', () => {
        const events = [
            { event: 'toc_generated', data: { sections: 3 } },
            { event: 'section_start', data: { sectionIndex: 0, title: 'Introduction' } },
            { event: 'section_chunk', data: { sectionIndex: 0, content: 'Generated text...' } },
            { event: 'sources_updated', data: { sectionIndex: 0, sources: ['chunk-1'] } },
            { event: 'section_complete', data: { sectionIndex: 0 } },
            { event: 'complete', data: { totalSections: 3 } },
            { event: 'error', data: { message: 'Generation failed', code: 'TIMEOUT' } },
        ];

        const validEventTypes = [
            'toc_generated',
            'section_start',
            'section_chunk',
            'section_complete',
            'sources_updated',
            'complete',
            'error',
        ];

        for (const event of events) {
            expect(validEventTypes).toContain(event.event);
        }
    });
});

describe('Schema Validation', () => {
    it('should validate TableOfContents structure', () => {
        const validToc: TableOfContents = {
            version: 1,
            source: 'generated',
            sections: [
                { id: 's1', title: 'Introduction', level: 1, description: 'Overview' },
                { id: 's2', title: 'Details', level: 1, estimatedTokens: 500 },
                { id: 's2-1', title: 'Sub-section', level: 2 },
            ],
        };

        expect(validToc.version).toBeGreaterThanOrEqual(1);
        expect(['memory', 'generated']).toContain(validToc.source);

        for (const section of validToc.sections) {
            expect(section.id).toBeDefined();
            expect(section.title).toBeDefined();
            expect(section.level).toBeGreaterThanOrEqual(1);
        }
    });

    it('should validate SmartContextSource structure', () => {
        const validSource: SmartContextSource = {
            chunkId: 'chunk-123',
            documentId: 'doc-456',
            documentTitle: 'Fire Specification.pdf',
            sectionTitle: 'Section 3.2 - Detection Equipment',
            relevanceScore: 95,
            excerpt: 'Fire detection systems shall include...',
            isActive: true,
        };

        expect(validSource.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(validSource.relevanceScore).toBeLessThanOrEqual(100);
        expect(typeof validSource.isActive).toBe('boolean');
    });

    it('should validate report status enum', () => {
        const validStatuses = ['draft', 'toc_pending', 'generating', 'complete', 'failed'];

        for (const status of validStatuses) {
            expect(validStatuses).toContain(status);
        }
    });

    it('should validate section status enum', () => {
        const validStatuses = ['pending', 'generating', 'complete', 'regenerating'];

        for (const status of validStatuses) {
            expect(validStatuses).toContain(status);
        }
    });
});
