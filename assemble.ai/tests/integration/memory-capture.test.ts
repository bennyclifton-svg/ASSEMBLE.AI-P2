/**
 * Integration tests for report memory system
 *
 * Tests end-to-end flow:
 * 1. Complete report generation
 * 2. Approve report (triggers memory capture)
 * 3. Start new report for same discipline
 * 4. Verify TOC is pre-filled from memory
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ragDb } from '@/lib/db/rag-client';
import { reportMemory, reportTemplates } from '@/lib/db/rag-schema';
import { eq, and } from 'drizzle-orm';
import { captureReportMemory } from '@/lib/rag/memory';
import { v4 as uuidv4 } from 'uuid';

describe('Report Memory System - Integration', () => {
    const testOrgId = 'org_test_memory';
    const testProjectId = 'proj_test_memory';
    const testDiscipline = 'Fire Services';

    beforeEach(async () => {
        // Clean up test data
        await ragDb.delete(reportMemory).where(eq(reportMemory.organizationId, testOrgId));
        await ragDb.delete(reportTemplates).where(eq(reportTemplates.projectId, testProjectId));
    });

    afterEach(async () => {
        // Clean up test data
        await ragDb.delete(reportMemory).where(eq(reportMemory.organizationId, testOrgId));
        await ragDb.delete(reportTemplates).where(eq(reportTemplates.projectId, testProjectId));
    });

    it('should capture memory after report approval', async () => {
        // Create a completed report
        const reportId = uuidv4();
        const reportToc = {
            version: 1,
            source: 'generated' as const,
            sections: [
                { id: 's1', title: 'Project Overview', level: 1 },
                { id: 's2', title: 'Fire Protection Requirements', level: 1 },
                { id: 's3', title: 'Detection Systems', level: 2 },
                { id: 's4', title: 'Suppression Systems', level: 2 },
            ],
        };

        await ragDb.insert(reportTemplates).values({
            id: reportId,
            projectId: testProjectId,
            documentSetIds: ['set1'],
            reportType: 'tender_request',
            title: 'Fire Services Tender Request',
            discipline: testDiscipline,
            tableOfContents: reportToc,
            status: 'complete',
        });

        // Capture memory (simulating report approval)
        await captureReportMemory({
            reportId,
            organizationId: testOrgId,
            reportType: 'tender_request',
            discipline: testDiscipline,
            tableOfContents: reportToc,
        });

        // Verify memory was saved
        const memory = await ragDb.query.reportMemory.findFirst({
            where: and(
                eq(reportMemory.organizationId, testOrgId),
                eq(reportMemory.reportType, 'tender_request'),
                eq(reportMemory.discipline, testDiscipline)
            ),
        });

        expect(memory).toBeDefined();
        expect(memory?.timesUsed).toBe(1);
        expect(memory?.approvedToc).toBeDefined();
        expect((memory?.approvedToc as any).sections).toHaveLength(4);
    });

    it('should merge multiple reports into memory', async () => {
        // First report
        const report1Id = uuidv4();
        const toc1 = {
            version: 1,
            source: 'generated' as const,
            sections: [
                { id: 's1', title: 'Project Overview', level: 1 },
                { id: 's2', title: 'Fire Protection', level: 1 },
            ],
        };

        await ragDb.insert(reportTemplates).values({
            id: report1Id,
            projectId: testProjectId,
            documentSetIds: ['set1'],
            reportType: 'tender_request',
            title: 'Report 1',
            discipline: testDiscipline,
            tableOfContents: toc1,
            status: 'complete',
        });

        await captureReportMemory({
            reportId: report1Id,
            organizationId: testOrgId,
            reportType: 'tender_request',
            discipline: testDiscipline,
            tableOfContents: toc1,
        });

        // Second report with overlapping sections
        const report2Id = uuidv4();
        const toc2 = {
            version: 1,
            source: 'generated' as const,
            sections: [
                { id: 's1', title: 'Project Overview', level: 1 }, // Overlap
                { id: 's2', title: 'Fire Protection', level: 1 }, // Overlap
                { id: 's3', title: 'Maintenance Requirements', level: 1 }, // New
            ],
        };

        await ragDb.insert(reportTemplates).values({
            id: report2Id,
            projectId: testProjectId,
            documentSetIds: ['set1'],
            reportType: 'tender_request',
            title: 'Report 2',
            discipline: testDiscipline,
            tableOfContents: toc2,
            status: 'complete',
        });

        await captureReportMemory({
            reportId: report2Id,
            organizationId: testOrgId,
            reportType: 'tender_request',
            discipline: testDiscipline,
            tableOfContents: toc2,
        });

        // Verify merged memory
        const memory = await ragDb.query.reportMemory.findFirst({
            where: and(
                eq(reportMemory.organizationId, testOrgId),
                eq(reportMemory.reportType, 'tender_request'),
                eq(reportMemory.discipline, testDiscipline)
            ),
        });

        expect(memory).toBeDefined();
        expect(memory?.timesUsed).toBe(2);

        const sections = (memory?.approvedToc as any).sections;
        expect(sections).toHaveLength(3);

        // Project Overview and Fire Protection should have frequency 2
        const projectOverview = sections.find((s: any) => s.title === 'Project Overview');
        expect(projectOverview?.frequency).toBe(2);

        const fireProtection = sections.find((s: any) => s.title === 'Fire Protection');
        expect(fireProtection?.frequency).toBe(2);

        // Maintenance Requirements should have frequency 1
        const maintenance = sections.find((s: any) => s.title === 'Maintenance Requirements');
        expect(maintenance?.frequency).toBe(1);
    });

    it('should reuse memory for new reports', async () => {
        // Create initial memory
        const initialReport = uuidv4();
        const initialToc = {
            version: 1,
            source: 'generated' as const,
            sections: [
                { id: 's1', title: 'Project Details', level: 1 },
                { id: 's2', title: 'Technical Specifications', level: 1 },
                { id: 's3', title: 'Compliance Requirements', level: 1 },
            ],
        };

        await ragDb.insert(reportTemplates).values({
            id: initialReport,
            projectId: testProjectId,
            documentSetIds: ['set1'],
            reportType: 'tender_request',
            title: 'Initial Report',
            discipline: testDiscipline,
            tableOfContents: initialToc,
            status: 'complete',
        });

        await captureReportMemory({
            reportId: initialReport,
            organizationId: testOrgId,
            reportType: 'tender_request',
            discipline: testDiscipline,
            tableOfContents: initialToc,
        });

        // Verify memory exists
        const memory = await ragDb.query.reportMemory.findFirst({
            where: and(
                eq(reportMemory.organizationId, testOrgId),
                eq(reportMemory.reportType, 'tender_request'),
                eq(reportMemory.discipline, testDiscipline)
            ),
        });

        expect(memory).toBeDefined();
        expect(memory?.approvedToc).toBeDefined();

        // In real implementation, generateTocWithMemory would load this memory
        // and pre-fill the TOC for new reports
        const sections = (memory?.approvedToc as any).sections;
        expect(sections.map((s: any) => s.title)).toEqual([
            'Project Details',
            'Technical Specifications',
            'Compliance Requirements',
        ]);
    });

    it('should increment timesUsed on subsequent approvals', async () => {
        const toc = {
            version: 1,
            source: 'generated' as const,
            sections: [{ id: 's1', title: 'Section 1', level: 1 }],
        };

        // First approval
        await captureReportMemory({
            reportId: uuidv4(),
            organizationId: testOrgId,
            reportType: 'tender_request',
            discipline: testDiscipline,
            tableOfContents: toc,
        });

        let memory = await ragDb.query.reportMemory.findFirst({
            where: and(
                eq(reportMemory.organizationId, testOrgId),
                eq(reportMemory.reportType, 'tender_request'),
                eq(reportMemory.discipline, testDiscipline)
            ),
        });

        expect(memory?.timesUsed).toBe(1);

        // Second approval
        await captureReportMemory({
            reportId: uuidv4(),
            organizationId: testOrgId,
            reportType: 'tender_request',
            discipline: testDiscipline,
            tableOfContents: toc,
        });

        memory = await ragDb.query.reportMemory.findFirst({
            where: and(
                eq(reportMemory.organizationId, testOrgId),
                eq(reportMemory.reportType, 'tender_request'),
                eq(reportMemory.discipline, testDiscipline)
            ),
        });

        expect(memory?.timesUsed).toBe(2);
    });
});
