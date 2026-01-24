/**
 * Generate Report Sections API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/project-reports/[id]/generate-sections - Generate contents sections based on type
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { reports, reportSections } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { generateReportSectionsSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull } from 'drizzle-orm';
import {
    generateReportContentsSections,
    addTimestampsToSections,
} from '@/lib/services/section-generation';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

        const body = await request.json();

        // Validate request body
        const validationResult = generateReportSectionsSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const { contentsType } = validationResult.data;

        // Delete existing sections
        await db
            .delete(reportSections)
            .where(eq(reportSections.reportId, id));

        // Generate new sections based on contents type
        const generatedSections = await generateReportContentsSections(report.projectId, contentsType);

        // Add timestamps and report ID to sections
        const sectionsToCreate = addTimestampsToSections(generatedSections, id, 'report');

        // Insert new sections
        if (sectionsToCreate.length > 0) {
            await db.insert(reportSections).values(
                sectionsToCreate.map(s => ({
                    id: s.id,
                    reportId: s.reportId!,
                    sectionKey: s.sectionKey,
                    sectionLabel: s.sectionLabel,
                    content: s.content,
                    sortOrder: s.sortOrder,
                    parentSectionId: s.parentSectionId,
                    stakeholderId: s.stakeholderId,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt,
                }))
            );
        }

        // Update report's contentsType and updatedAt
        await db
            .update(reports)
            .set({
                contentsType,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(reports.id, id));

        return NextResponse.json({
            success: true,
            contentsType,
            sectionsCreated: sectionsToCreate.length,
        });
    });
}
