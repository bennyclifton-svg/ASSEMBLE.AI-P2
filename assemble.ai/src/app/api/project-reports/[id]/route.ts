/**
 * Single Project Report API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/project-reports/[id] - Get a single report with relations
 * PATCH /api/project-reports/[id] - Update a report
 * DELETE /api/project-reports/[id] - Soft delete a report
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { reports, reportSections, reportAttendees, reportTransmittals, projects, projectStakeholders } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { updateReportSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull, asc } from 'drizzle-orm';

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
        const [sections, attendees, transmittals, project] = await Promise.all([
            // Sections ordered by sortOrder
            db
                .select()
                .from(reportSections)
                .where(eq(reportSections.reportId, id))
                .orderBy(asc(reportSections.sortOrder)),

            // Attendees with stakeholder info
            db
                .select({
                    id: reportAttendees.id,
                    reportId: reportAttendees.reportId,
                    stakeholderId: reportAttendees.stakeholderId,
                    adhocName: reportAttendees.adhocName,
                    adhocFirm: reportAttendees.adhocFirm,
                    adhocGroup: reportAttendees.adhocGroup,
                    isDistribution: reportAttendees.isDistribution,
                    createdAt: reportAttendees.createdAt,
                    stakeholderName: projectStakeholders.name,
                    stakeholderGroup: projectStakeholders.stakeholderGroup,
                    stakeholderOrganization: projectStakeholders.organization,
                })
                .from(reportAttendees)
                .leftJoin(projectStakeholders, eq(reportAttendees.stakeholderId, projectStakeholders.id))
                .where(eq(reportAttendees.reportId, id)),

            // Transmittals
            db
                .select()
                .from(reportTransmittals)
                .where(eq(reportTransmittals.reportId, id)),

            // Project info
            db
                .select({
                    id: projects.id,
                    name: projects.name,
                })
                .from(projects)
                .where(eq(projects.id, report.projectId))
                .limit(1),
        ]);

        // Build hierarchical sections structure
        const sectionMap = new Map<string, typeof sections[0] & { childSections: typeof sections }>();
        const topLevelSections: Array<typeof sections[0] & { childSections: typeof sections }> = [];

        // First pass: create map
        for (const section of sections) {
            sectionMap.set(section.id, { ...section, childSections: [] });
        }

        // Second pass: build hierarchy
        for (const section of sections) {
            const sectionWithChildren = sectionMap.get(section.id)!;
            if (section.parentSectionId) {
                const parent = sectionMap.get(section.parentSectionId);
                if (parent) {
                    parent.childSections.push(sectionWithChildren);
                }
            } else {
                topLevelSections.push(sectionWithChildren);
            }
        }

        return NextResponse.json({
            ...report,
            sections: topLevelSections,
            attendees,
            transmittals,
            project: project[0] || null,
        });
    });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

        // Check if report exists and belongs to user's org
        const [existing] = await db
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

        if (!existing) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const body = await request.json();

        // Validate request body
        const validationResult = updateReportSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        // Only include fields that were provided
        const data = validationResult.data;
        if (data.title !== undefined) updateData.title = data.title;
        if (data.reportDate !== undefined) updateData.reportDate = data.reportDate;
        if (data.preparedFor !== undefined) updateData.preparedFor = data.preparedFor;
        if (data.preparedBy !== undefined) updateData.preparedBy = data.preparedBy;
        if (data.contentsType !== undefined) updateData.contentsType = data.contentsType;
        if (data.reportingPeriodStart !== undefined) updateData.reportingPeriodStart = data.reportingPeriodStart;
        if (data.reportingPeriodEnd !== undefined) updateData.reportingPeriodEnd = data.reportingPeriodEnd;

        // Update the report
        await db
            .update(reports)
            .set(updateData)
            .where(eq(reports.id, id));

        // Fetch and return the updated report
        const [updated] = await db
            .select()
            .from(reports)
            .where(eq(reports.id, id))
            .limit(1);

        return NextResponse.json(updated);
    });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

        // Check if report exists and belongs to user's org
        const [existing] = await db
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

        if (!existing) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Soft delete the report
        await db
            .update(reports)
            .set({
                deletedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(reports.id, id));

        return NextResponse.json({ success: true });
    });
}
