/**
 * Meeting Attendee API Route - Individual Attendee
 * Feature 021 - Notes, Meetings & Reports
 *
 * PATCH /api/meetings/[id]/attendees/[attendeeId] - Update attendance/distribution flags
 * DELETE /api/meetings/[id]/attendees/[attendeeId] - Remove an attendee
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetings, meetingAttendees } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { updateAttendeeSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string; attendeeId: string }>;
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

        const { id, attendeeId } = await context.params;
        const body = await request.json();

        // Validate request body
        const validationResult = updateAttendeeSchema.safeParse(body);
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

        // Verify attendee exists and belongs to this meeting
        const [existingAttendee] = await db
            .select()
            .from(meetingAttendees)
            .where(
                and(
                    eq(meetingAttendees.id, attendeeId),
                    eq(meetingAttendees.meetingId, id)
                )
            )
            .limit(1);

        if (!existingAttendee) {
            return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {};
        const { isAttending, isDistribution } = validationResult.data;

        if (isAttending !== undefined) {
            updateData.isAttending = isAttending;
        }
        if (isDistribution !== undefined) {
            updateData.isDistribution = isDistribution;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        // Update the attendee
        await db
            .update(meetingAttendees)
            .set(updateData)
            .where(eq(meetingAttendees.id, attendeeId));

        // Update meeting's updatedAt
        await db
            .update(meetings)
            .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(meetings.id, id));

        // Fetch and return the updated attendee
        const [updated] = await db
            .select()
            .from(meetingAttendees)
            .where(eq(meetingAttendees.id, attendeeId))
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

        const { id, attendeeId } = await context.params;

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

        // Verify attendee exists and belongs to this meeting
        const [existingAttendee] = await db
            .select()
            .from(meetingAttendees)
            .where(
                and(
                    eq(meetingAttendees.id, attendeeId),
                    eq(meetingAttendees.meetingId, id)
                )
            )
            .limit(1);

        if (!existingAttendee) {
            return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
        }

        // Delete the attendee
        await db
            .delete(meetingAttendees)
            .where(eq(meetingAttendees.id, attendeeId));

        // Update meeting's updatedAt
        await db
            .update(meetings)
            .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(meetings.id, id));

        return NextResponse.json({ success: true, message: 'Attendee removed' });
    });
}
