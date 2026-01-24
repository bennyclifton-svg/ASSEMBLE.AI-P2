/**
 * Project Reports API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/project-reports?projectId=X - List all reports for a project
 * POST /api/project-reports - Create a new report
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db, reports, reportSections, reportTransmittals } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { createReportSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { STANDARD_CONTENTS_SECTIONS } from '@/lib/constants/sections';

export async function GET(request: NextRequest) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Fetch reports for the project (excluding soft-deleted)
        const reportsList = await db
            .select()
            .from(reports)
            .where(
                and(
                    eq(reports.projectId, projectId),
                    eq(reports.organizationId, authResult.user.organizationId),
                    isNull(reports.deletedAt)
                )
            )
            .orderBy(desc(reports.updatedAt));

        // Get section and transmittal counts for each report
        const reportsWithCounts = await Promise.all(
            reportsList.map(async (report) => {
                const [sectionCount, transmittalCount] = await Promise.all([
                    db
                        .select({ count: sql<number>`count(*)` })
                        .from(reportSections)
                        .where(eq(reportSections.reportId, report.id)),
                    db
                        .select({ count: sql<number>`count(*)` })
                        .from(reportTransmittals)
                        .where(eq(reportTransmittals.reportId, report.id)),
                ]);

                return {
                    ...report,
                    sectionCount: sectionCount[0]?.count ?? 0,
                    transmittalCount: transmittalCount[0]?.count ?? 0,
                };
            })
        );

        return NextResponse.json({
            reports: reportsWithCounts,
            total: reportsWithCounts.length,
        });
    });
}

export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const body = await request.json();

        // Validate request body
        const validationResult = createReportSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const { projectId, title, reportDate, preparedFor, preparedBy, contentsType } = validationResult.data;

        // Create new report
        const id = uuidv4();
        const now = new Date().toISOString();

        await db.insert(reports).values({
            id,
            projectId,
            organizationId: authResult.user.organizationId,
            title: title || 'New Report',
            reportDate: reportDate || null,
            preparedFor: preparedFor || null,
            preparedBy: preparedBy || null,
            contentsType: contentsType || 'standard',
            createdAt: now,
            updatedAt: now,
        });

        // Create default standard contents sections
        const sectionsToCreate = STANDARD_CONTENTS_SECTIONS.map((section) => ({
            id: uuidv4(),
            reportId: id,
            sectionKey: section.key,
            sectionLabel: section.label,
            sortOrder: section.sortOrder,
            createdAt: now,
            updatedAt: now,
        }));

        let actualSectionCount = 0;
        if (sectionsToCreate.length > 0) {
            try {
                await db.insert(reportSections).values(sectionsToCreate);
                actualSectionCount = sectionsToCreate.length;
            } catch (sectionError: any) {
                console.error('Failed to create report sections:', {
                    message: sectionError.message,
                    code: sectionError.code,
                    detail: sectionError.detail,
                    constraint: sectionError.constraint,
                });
                // Report was created, sections failed - we can continue
                // Sections can be regenerated later via the Contents type buttons
            }
        }

        // Fetch and return the created report with counts
        const [created] = await db
            .select()
            .from(reports)
            .where(eq(reports.id, id))
            .limit(1);

        return NextResponse.json({
            ...created,
            sectionCount: actualSectionCount,
            transmittalCount: 0,
        }, { status: 201 });
    });
}
