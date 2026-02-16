/**
 * Meetings API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/meetings?projectId=X - List all meetings for a project
 * POST /api/meetings - Create a new meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import {
    meetings,
    meetingSections,
    meetingAttendees,
    meetingTransmittals,
    projectDetails,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { createMeetingSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { STANDARD_AGENDA_SECTIONS } from '@/lib/constants/sections';

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
        const groupId = searchParams.get('groupId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Build conditions
        const conditions = [
            eq(meetings.projectId, projectId),
            eq(meetings.organizationId, authResult.user.organizationId),
            isNull(meetings.deletedAt),
        ];

        // Filter by groupId if provided
        if (groupId) {
            conditions.push(eq(meetings.groupId, groupId));
        }

        // Fetch meetings for the project (excluding soft-deleted)
        const meetingsList = await db
            .select()
            .from(meetings)
            .where(and(...conditions))
            .orderBy(desc(meetings.updatedAt));

        // Get counts for each meeting
        const meetingsWithCounts = await Promise.all(
            meetingsList.map(async (meeting) => {
                const [sectionCount, attendeeCount, transmittalCount] = await Promise.all([
                    db.select({ count: sql<number>`count(*)` })
                        .from(meetingSections)
                        .where(eq(meetingSections.meetingId, meeting.id)),
                    db.select({ count: sql<number>`count(*)` })
                        .from(meetingAttendees)
                        .where(eq(meetingAttendees.meetingId, meeting.id)),
                    db.select({ count: sql<number>`count(*)` })
                        .from(meetingTransmittals)
                        .where(eq(meetingTransmittals.meetingId, meeting.id)),
                ]);

                return {
                    ...meeting,
                    sectionCount: sectionCount[0]?.count ?? 0,
                    attendeeCount: attendeeCount[0]?.count ?? 0,
                    transmittalCount: transmittalCount[0]?.count ?? 0,
                };
            })
        );

        return NextResponse.json({
            meetings: meetingsWithCounts,
            total: meetingsWithCounts.length,
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
        const validationResult = createMeetingSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const { projectId, groupId, title, meetingDate, agendaType } = validationResult.data;

        // Create new meeting
        const id = uuidv4();
        const now = new Date().toISOString();

        await db.insert(meetings).values({
            id,
            projectId,
            organizationId: authResult.user.organizationId,
            groupId: groupId || null,
            title: title || 'New Meeting',
            meetingDate: meetingDate || null,
            agendaType: agendaType || 'standard',
            createdAt: now,
            updatedAt: now,
        });

        // Create default standard agenda sections
        const sectionsToCreate = STANDARD_AGENDA_SECTIONS.map((section) => ({
            id: uuidv4(),
            meetingId: id,
            sectionKey: section.key,
            sectionLabel: section.label,
            content: null,
            sortOrder: section.sortOrder,
            parentSectionId: null,
            stakeholderId: null,
            createdAt: now,
            updatedAt: now,
        }));

        if (sectionsToCreate.length > 0) {
            await db.insert(meetingSections).values(sectionsToCreate);
        }

        // Fetch and return the created meeting with counts
        const [created] = await db
            .select()
            .from(meetings)
            .where(eq(meetings.id, id))
            .limit(1);

        return NextResponse.json({
            ...created,
            sectionCount: sectionsToCreate.length,
            attendeeCount: 0,
            transmittalCount: 0,
        }, { status: 201 });
    });
}
