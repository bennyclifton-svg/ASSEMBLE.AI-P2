/**
 * Meeting Attendees API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/meetings/[id]/attendees - List all attendees for a meeting
 * POST /api/meetings/[id]/attendees - Add an attendee (stakeholder or ad-hoc)
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetings, meetingAttendees, projectStakeholders } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { addAttendeeSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, sql, asc } from 'drizzle-orm';

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

        // Verify meeting exists and belongs to organization
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

        // Fetch attendees with stakeholder data, ordered by master stakeholder sortOrder
        const attendees = await db
            .select({
                attendee: meetingAttendees,
                stakeholder: projectStakeholders,
            })
            .from(meetingAttendees)
            .leftJoin(projectStakeholders, eq(meetingAttendees.stakeholderId, projectStakeholders.id))
            .where(eq(meetingAttendees.meetingId, id))
            .orderBy(asc(projectStakeholders.sortOrder));

        // Transform to include stakeholder data
        const transformedAttendees = attendees.map(({ attendee, stakeholder }) => ({
            ...attendee,
            stakeholder: stakeholder || null,
        }));

        return NextResponse.json({
            meetingId: id,
            attendees: transformedAttendees,
            total: attendees.length,
        });
    });
}

export async function POST(
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
        const validationResult = addAttendeeSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        // Verify meeting exists and belongs to organization
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

        const { stakeholderId, adhocName, adhocFirm, adhocGroup, adhocSubGroup } = validationResult.data;

        // If stakeholderId provided, verify it exists
        if (stakeholderId) {
            const [stakeholder] = await db
                .select()
                .from(projectStakeholders)
                .where(
                    and(
                        eq(projectStakeholders.id, stakeholderId),
                        eq(projectStakeholders.projectId, meeting.projectId)
                    )
                )
                .limit(1);

            if (!stakeholder) {
                return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
            }

            // Check if stakeholder is already added
            const existing = await db
                .select()
                .from(meetingAttendees)
                .where(
                    and(
                        eq(meetingAttendees.meetingId, id),
                        eq(meetingAttendees.stakeholderId, stakeholderId)
                    )
                )
                .limit(1);

            if (existing.length > 0) {
                return NextResponse.json({ error: 'Stakeholder already added to this meeting' }, { status: 400 });
            }
        }

        // Create the attendee
        const attendeeId = uuidv4();
        const now = new Date().toISOString();

        await db.insert(meetingAttendees).values({
            id: attendeeId,
            meetingId: id,
            stakeholderId: stakeholderId || null,
            adhocName: adhocName || null,
            adhocFirm: adhocFirm || null,
            adhocGroup: adhocGroup || null,
            adhocSubGroup: adhocSubGroup || null,
            isAttending: true,
            isDistribution: true,
            createdAt: now,
        });

        // Update meeting's updatedAt
        await db
            .update(meetings)
            .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(meetings.id, id));

        // Fetch the created attendee with stakeholder data
        const [created] = await db
            .select({
                attendee: meetingAttendees,
                stakeholder: projectStakeholders,
            })
            .from(meetingAttendees)
            .leftJoin(projectStakeholders, eq(meetingAttendees.stakeholderId, projectStakeholders.id))
            .where(eq(meetingAttendees.id, attendeeId))
            .limit(1);

        return NextResponse.json({
            ...created.attendee,
            stakeholder: created.stakeholder || null,
        }, { status: 201 });
    });
}
