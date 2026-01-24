/**
 * Copy Project Report API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/project-reports/[id]/copy - Duplicate a report with sections
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db, reports, reportSections, reportAttendees } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, asc } from 'drizzle-orm';

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

        // Fetch the original report
        const [original] = await db
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

        if (!original) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Create new report with "copy" suffix
        const newReportId = uuidv4();
        const now = new Date().toISOString();

        await db.insert(reports).values({
            id: newReportId,
            projectId: original.projectId,
            organizationId: original.organizationId,
            title: `${original.title} copy`,
            reportDate: original.reportDate,
            preparedFor: original.preparedFor,
            preparedBy: original.preparedBy,
            contentsType: original.contentsType,
            reportingPeriodStart: original.reportingPeriodStart,
            reportingPeriodEnd: original.reportingPeriodEnd,
            createdAt: now,
            updatedAt: now,
        });

        // Fetch original sections
        const originalSections = await db
            .select()
            .from(reportSections)
            .where(eq(reportSections.reportId, id))
            .orderBy(asc(reportSections.sortOrder));

        // Create a map of old IDs to new IDs for parent section references
        const sectionIdMap = new Map<string, string>();

        // First pass: generate new IDs for all sections
        for (const section of originalSections) {
            sectionIdMap.set(section.id, uuidv4());
        }

        // Second pass: create sections with correct parent references
        const sectionsToCreate = originalSections.map((section) => ({
            id: sectionIdMap.get(section.id)!,
            reportId: newReportId,
            sectionKey: section.sectionKey,
            sectionLabel: section.sectionLabel,
            content: section.content,
            sortOrder: section.sortOrder,
            parentSectionId: section.parentSectionId ? sectionIdMap.get(section.parentSectionId) || null : null,
            stakeholderId: section.stakeholderId,
            createdAt: now,
            updatedAt: now,
        }));

        if (sectionsToCreate.length > 0) {
            await db.insert(reportSections).values(sectionsToCreate);
        }

        // Fetch original attendees and copy them
        const originalAttendees = await db
            .select()
            .from(reportAttendees)
            .where(eq(reportAttendees.reportId, id));

        const attendeesToCreate = originalAttendees.map((attendee) => ({
            id: uuidv4(),
            reportId: newReportId,
            stakeholderId: attendee.stakeholderId,
            adhocName: attendee.adhocName,
            adhocFirm: attendee.adhocFirm,
            adhocGroup: attendee.adhocGroup,
            isDistribution: attendee.isDistribution,
            createdAt: now,
        }));

        if (attendeesToCreate.length > 0) {
            await db.insert(reportAttendees).values(attendeesToCreate);
        }

        // Fetch and return the copied report
        const [copied] = await db
            .select()
            .from(reports)
            .where(eq(reports.id, newReportId))
            .limit(1);

        return NextResponse.json({
            ...copied,
            sectionCount: sectionsToCreate.length,
            transmittalCount: 0,
        }, { status: 201 });
    });
}
