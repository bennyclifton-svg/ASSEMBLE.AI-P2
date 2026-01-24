/**
 * Single Report Attendee API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * PATCH /api/project-reports/[id]/attendees/[attendeeId] - Update attendee flags
 * DELETE /api/project-reports/[id]/attendees/[attendeeId] - Remove attendee
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { reports, reportAttendees } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

interface RouteParams {
    params: Promise<{ id: string; attendeeId: string }>;
}

const updateAttendeeSchema = z.object({
    isDistribution: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id, attendeeId } = await params;

        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        // Check if report exists and belongs to user's org
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

        // Check if attendee exists
        const [existingAttendee] = await db
            .select()
            .from(reportAttendees)
            .where(
                and(
                    eq(reportAttendees.id, attendeeId),
                    eq(reportAttendees.reportId, id)
                )
            )
            .limit(1);

        if (!existingAttendee) {
            return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
        }

        const body = await request.json();

        // Validate request body
        const validationResult = updateAttendeeSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {};

        // Only include fields that were provided
        const data = validationResult.data;
        if (data.isDistribution !== undefined) updateData.isDistribution = data.isDistribution;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Update the attendee
        await db
            .update(reportAttendees)
            .set(updateData)
            .where(eq(reportAttendees.id, attendeeId));

        // Fetch and return the updated attendee
        const [updated] = await db
            .select()
            .from(reportAttendees)
            .where(eq(reportAttendees.id, attendeeId))
            .limit(1);

        return NextResponse.json(updated);
    });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id, attendeeId } = await params;

        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        // Check if report exists and belongs to user's org
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

        // Check if attendee exists
        const [existingAttendee] = await db
            .select()
            .from(reportAttendees)
            .where(
                and(
                    eq(reportAttendees.id, attendeeId),
                    eq(reportAttendees.reportId, id)
                )
            )
            .limit(1);

        if (!existingAttendee) {
            return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
        }

        // Delete the attendee
        await db
            .delete(reportAttendees)
            .where(eq(reportAttendees.id, attendeeId));

        return NextResponse.json({ success: true });
    });
}
