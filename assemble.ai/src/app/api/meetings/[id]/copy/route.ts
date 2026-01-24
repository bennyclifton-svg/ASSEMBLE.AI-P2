/**
 * Meeting Copy API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/meetings/[id]/copy - Duplicate a meeting with sections and attendees
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetings, meetingSections, meetingAttendees } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
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

        // Fetch the original meeting
        const [original] = await db
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

        if (!original) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        // Fetch original sections
        const originalSections = await db
            .select()
            .from(meetingSections)
            .where(eq(meetingSections.meetingId, id));

        // Fetch original attendees
        const originalAttendees = await db
            .select()
            .from(meetingAttendees)
            .where(eq(meetingAttendees.meetingId, id));

        // Create new meeting
        const newMeetingId = uuidv4();
        const now = new Date().toISOString();

        await db.insert(meetings).values({
            id: newMeetingId,
            projectId: original.projectId,
            organizationId: original.organizationId,
            title: `${original.title} copy`,
            meetingDate: original.meetingDate,
            agendaType: original.agendaType,
            reportingPeriodStart: original.reportingPeriodStart,
            reportingPeriodEnd: original.reportingPeriodEnd,
            createdAt: now,
            updatedAt: now,
        });

        // Create a mapping of old section IDs to new section IDs for parent references
        const sectionIdMap = new Map<string, string>();

        // First pass: create all sections and build the ID mapping
        const sectionsToCreate = originalSections.map((section) => {
            const newId = uuidv4();
            sectionIdMap.set(section.id, newId);
            return {
                id: newId,
                meetingId: newMeetingId,
                sectionKey: section.sectionKey,
                sectionLabel: section.sectionLabel,
                content: section.content,
                sortOrder: section.sortOrder,
                parentSectionId: section.parentSectionId, // Will be updated in second pass
                stakeholderId: section.stakeholderId,
                createdAt: now,
                updatedAt: now,
            };
        });

        // Second pass: update parent references
        sectionsToCreate.forEach((section) => {
            if (section.parentSectionId) {
                section.parentSectionId = sectionIdMap.get(section.parentSectionId) || null;
            }
        });

        if (sectionsToCreate.length > 0) {
            await db.insert(meetingSections).values(sectionsToCreate);
        }

        // Copy attendees
        const attendeesToCreate = originalAttendees.map((attendee) => ({
            id: uuidv4(),
            meetingId: newMeetingId,
            stakeholderId: attendee.stakeholderId,
            adhocName: attendee.adhocName,
            adhocFirm: attendee.adhocFirm,
            adhocGroup: attendee.adhocGroup,
            adhocSubGroup: attendee.adhocSubGroup,
            isAttending: attendee.isAttending,
            isDistribution: attendee.isDistribution,
            createdAt: now,
        }));

        if (attendeesToCreate.length > 0) {
            await db.insert(meetingAttendees).values(attendeesToCreate);
        }

        // Fetch and return the created meeting
        const [created] = await db
            .select()
            .from(meetings)
            .where(eq(meetings.id, newMeetingId))
            .limit(1);

        return NextResponse.json({
            ...created,
            sectionCount: sectionsToCreate.length,
            attendeeCount: attendeesToCreate.length,
            transmittalCount: 0,
        }, { status: 201 });
    });
}
