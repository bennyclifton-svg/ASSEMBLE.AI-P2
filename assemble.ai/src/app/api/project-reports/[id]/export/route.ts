/**
 * Project Report Export API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/project-reports/[id]/export?format=pdf|docx
 * Exports project report to PDF or DOCX format
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db, reports, reportSections, projects, projectDetails } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { exportProjectReportToPDF } from '@/lib/export/pdf-enhanced';
import { exportProjectReportToDOCX } from '@/lib/export/docx-enhanced';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id } = await params;

        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        // Get format from query params
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'pdf';

        if (!['pdf', 'docx'].includes(format)) {
            return NextResponse.json(
                { error: 'Invalid format. Must be "pdf" or "docx"' },
                { status: 400 }
            );
        }

        // Fetch the report
        const [report] = await db
            .select()
            .from(reports)
            .where(
                and(
                    eq(reports.id, id),
                    eq(reports.organizationId, authResult.user.organizationId),
                    isNull(reports.deletedAt)
                )
            )
            .limit(1);

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Fetch related data in parallel
        const [sections, project, details] = await Promise.all([
            // Sections ordered by sortOrder
            db
                .select()
                .from(reportSections)
                .where(eq(reportSections.reportId, id))
                .orderBy(asc(reportSections.sortOrder)),
            // Project info
            db
                .select()
                .from(projects)
                .where(eq(projects.id, report.projectId))
                .limit(1),
            // Project details
            db
                .select()
                .from(projectDetails)
                .where(eq(projectDetails.projectId, report.projectId))
                .limit(1),
        ]);

        // Build hierarchical sections structure
        const topLevelSections = sections.filter(s => !s.parentSectionId);
        const childSections = sections.filter(s => s.parentSectionId);

        const sectionsWithChildren = topLevelSections.map(parent => ({
            id: parent.id,
            sectionLabel: parent.sectionLabel,
            content: parent.content,
            childSections: childSections
                .filter(child => child.parentSectionId === parent.id)
                .map(child => ({
                    sectionLabel: child.sectionLabel,
                    content: child.content,
                })),
        }));

        // Build export data
        const exportData = {
            id: report.id,
            title: report.title,
            reportDate: report.reportDate,
            preparedFor: report.preparedFor,
            preparedBy: report.preparedBy,
            reportingPeriodStart: report.reportingPeriodStart,
            reportingPeriodEnd: report.reportingPeriodEnd,
            contentsType: report.contentsType || 'standard',
            sections: sectionsWithChildren,
            project: project[0] ? {
                name: project[0].name,
                address: details[0]?.address || null,
            } : null,
        };

        // Generate export
        let buffer: ArrayBuffer | Buffer;
        let mimeType: string;
        let fileExtension: string;

        if (format === 'pdf') {
            buffer = await exportProjectReportToPDF(exportData);
            mimeType = 'application/pdf';
            fileExtension = 'pdf';
        } else {
            buffer = await exportProjectReportToDOCX(exportData);
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            fileExtension = 'docx';
        }

        // Create filename
        const sanitizedTitle = report.title
            .replace(/[/\\:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100) || 'Report';
        const filename = `${sanitizedTitle}.${fileExtension}`;

        // Return binary response
        return new NextResponse(new Uint8Array(buffer instanceof Buffer ? buffer : buffer), {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': (buffer instanceof Buffer ? buffer.length : buffer.byteLength).toString(),
            },
        });
    });
}
