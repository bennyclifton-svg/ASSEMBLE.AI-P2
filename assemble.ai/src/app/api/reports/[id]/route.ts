/**
 * T049: GET, DELETE /api/reports/[id]
 * Get full report with sections or delete report
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections } from '@/lib/db/rag-schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Fetch report
        const report = await ragDb.query.reportTemplates.findFirst({
            where: eq(reportTemplates.id, id),
        });

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        // Fetch sections
        const sections = await ragDb.query.reportSections.findMany({
            where: eq(reportSections.reportId, id),
            orderBy: (sections, { asc }) => [asc(sections.sectionIndex)],
        });

        // Format response
        const response = {
            id: report.id,
            projectId: report.projectId,
            documentSetIds: report.documentSetIds,
            reportType: report.reportType,
            title: report.title,
            discipline: report.discipline,
            tableOfContents: report.tableOfContents,
            status: report.status,
            lockedBy: report.lockedBy,
            lockedByName: report.lockedByName,
            lockedAt: report.lockedAt?.toISOString(),
            currentSectionIndex: report.currentSectionIndex,
            createdAt: report.createdAt?.toISOString(),
            updatedAt: report.updatedAt?.toISOString(),
            // T138: Phase 11 - Unified Report Editor fields
            viewMode: report.viewMode,
            editedContent: report.editedContent,
            isEdited: report.isEdited,
            reportChain: report.reportChain,
            parentReportId: report.parentReportId,
            detailLevel: report.detailLevel,
            sections: sections.map(s => ({
                id: s.id,
                reportId: s.reportId,
                sectionIndex: s.sectionIndex,
                title: s.title,
                content: s.content,
                sourceChunkIds: s.sourceChunkIds,
                sources: s.sourceRelevance, // Format as SmartContextSource in client
                status: s.status,
                generatedAt: s.generatedAt?.toISOString(),
                regenerationCount: s.regenerationCount,
            })),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('[api/reports/[id]] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get report' },
            { status: 500 }
        );
    }
}

/**
 * T138: PATCH /api/reports/[id]
 * Update report with edited content and metadata
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Check if report exists
        const report = await ragDb.query.reportTemplates.findFirst({
            where: eq(reportTemplates.id, id),
        });

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateData: any = {
            updatedAt: new Date(),
        };

        // Add Phase 11 fields if provided
        if (body.editedContent !== undefined) {
            updateData.editedContent = body.editedContent;
            updateData.lastEditedAt = new Date();
        }

        if (body.isEdited !== undefined) {
            updateData.isEdited = body.isEdited;
        }

        if (body.viewMode !== undefined) {
            updateData.viewMode = body.viewMode;
        }

        if (body.reportChain !== undefined) {
            updateData.reportChain = body.reportChain;
        }

        if (body.parentReportId !== undefined) {
            updateData.parentReportId = body.parentReportId;
        }

        if (body.detailLevel !== undefined) {
            updateData.detailLevel = body.detailLevel;
        }

        // TOC auto-save support
        if (body.tableOfContents !== undefined) {
            updateData.tableOfContents = body.tableOfContents;
        }

        // Update report
        await ragDb.update(reportTemplates)
            .set(updateData)
            .where(eq(reportTemplates.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[api/reports/[id]] PATCH Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update report' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check if report exists
        const report = await ragDb.query.reportTemplates.findFirst({
            where: eq(reportTemplates.id, id),
        });

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        // Delete report (cascades to sections)
        await ragDb.delete(reportTemplates).where(eq(reportTemplates.id, id));

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('[api/reports/[id]] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete report' },
            { status: 500 }
        );
    }
}
