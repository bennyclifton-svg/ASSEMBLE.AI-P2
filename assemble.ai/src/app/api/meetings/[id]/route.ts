/**
 * Meetings API Route - Individual Meeting
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/meetings/[id] - Get a specific meeting with details
 * PATCH /api/meetings/[id] - Update a meeting
 * DELETE /api/meetings/[id] - Soft delete a meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import {
    meetings,
    meetingSections,
    meetingAttendees,
    meetingTransmittals,
    projectStakeholders,
    projectDetails,
    projects,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { updateMeetingSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;

        // Fetch meeting with organization check
        const [meeting] = await db
            .select()
            .from(meetings)
            .where(
                and(
                    eq(meetings.id, id),
                    eq(meetings.organizationId, authResult.user.organizationId),
                    isNull(meetings.deletedAt)
                )
            )
            .limit(1);

        if (!meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        // Fetch related data in parallel
        const [sections, attendees, transmittals, project, details] = await Promise.all([
            // Fetch sections ordered by sortOrder
            db.select()
                .from(meetingSections)
                .where(eq(meetingSections.meetingId, id))
                .orderBy(asc(meetingSections.sortOrder)),
            // Fetch attendees
            db.select({
                attendee: meetingAttendees,
                stakeholder: projectStakeholders,
            })
                .from(meetingAttendees)
                .leftJoin(projectStakeholders, eq(meetingAttendees.stakeholderId, projectStakeholders.id))
                .where(eq(meetingAttendees.meetingId, id)),
            // Fetch transmittals count
            db.select({ count: sql<number>`count(*)` })
                .from(meetingTransmittals)
                .where(eq(meetingTransmittals.meetingId, id)),
            // Fetch project
            db.select()
                .from(projects)
                .where(eq(projects.id, meeting.projectId))
                .limit(1),
            // Fetch project details
            db.select()
                .from(projectDetails)
                .where(eq(projectDetails.projectId, meeting.projectId))
                .limit(1),
        ]);

        // Transform attendees to include stakeholder data
        const transformedAttendees = attendees.map(({ attendee, stakeholder }) => ({
            ...attendee,
            stakeholder: stakeholder || null,
        }));

        // Build nested section structure
        const topLevelSections = sections.filter(s => !s.parentSectionId);
        const childSections = sections.filter(s => s.parentSectionId);

        const sectionsWithChildren = topLevelSections.map(parent => ({
            ...parent,
            childSections: childSections.filter(child => child.parentSectionId === parent.id),
        }));

        return NextResponse.json({
            ...meeting,
            sections: sectionsWithChildren,
            attendees: transformedAttendees,
            transmittalCount: transmittals[0]?.count ?? 0,
            project: project[0] ? {
                id: project[0].id,
                name: project[0].name,
                address: details[0]?.address || null,
            } : null,
        });
    });
}

export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;
        const body = await request.json();

        // Validate request body
        const validationResult = updateMeetingSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        // Verify meeting exists and belongs to organization
        const [existing] = await db
            .select()
            .from(meetings)
            .where(
                and(
                    eq(meetings.id, id),
                    eq(meetings.organizationId, authResult.user.organizationId),
                    isNull(meetings.deletedAt)
                )
            )
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            updatedAt: sql`CURRENT_TIMESTAMP`,
        };

        const { title, meetingDate, agendaType, reportingPeriodStart, reportingPeriodEnd } = validationResult.data;

        if (title !== undefined) {
            updateData.title = title;
        }
        if (meetingDate !== undefined) {
            updateData.meetingDate = meetingDate;
        }
        if (agendaType !== undefined) {
            updateData.agendaType = agendaType;
        }
        if (reportingPeriodStart !== undefined) {
            updateData.reportingPeriodStart = reportingPeriodStart;
        }
        if (reportingPeriodEnd !== undefined) {
            updateData.reportingPeriodEnd = reportingPeriodEnd;
        }

        // Update the meeting
        await db
            .update(meetings)
            .set(updateData)
            .where(eq(meetings.id, id));

        // Fetch and return the updated meeting
        const [updated] = await db
            .select()
            .from(meetings)
            .where(eq(meetings.id, id))
            .limit(1);

        return NextResponse.json(updated);
    });
}

export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;

        // Verify meeting exists and belongs to organization
        const [existing] = await db
            .select()
            .from(meetings)
            .where(
                and(
                    eq(meetings.id, id),
                    eq(meetings.organizationId, authResult.user.organizationId),
                    isNull(meetings.deletedAt)
                )
            )
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        // Soft delete the meeting
        await db
            .update(meetings)
            .set({
                deletedAt: sql`CURRENT_TIMESTAMP`,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(meetings.id, id));

        return NextResponse.json({ success: true, message: 'Meeting deleted' });
    });
}
