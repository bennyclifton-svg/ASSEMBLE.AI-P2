/**
 * Meeting Generate Sections API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/meetings/[id]/generate-sections - Generate standard/detailed/custom sections
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetings, meetingSections } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { generateSectionsSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import {
    generateMeetingAgendaSections,
    nestGeneratedSections,
    splitParentAndChildSections,
    toMeetingSectionRows,
} from '@/lib/services/section-generation';

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
        const body = await request.json();

        // Validate request body
        const validationResult = generateSectionsSchema.safeParse(body);
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

        const { agendaType } = validationResult.data;

        // Delete existing sections
        await db
            .delete(meetingSections)
            .where(eq(meetingSections.meetingId, id));

        // Generate new sections based on agenda type
        const generatedSections = await generateMeetingAgendaSections(meeting.projectId, agendaType);

        const sectionsToInsert = toMeetingSectionRows(generatedSections, id);

        // Insert sections
        if (sectionsToInsert.length > 0) {
            const { parentSections, childSections } = splitParentAndChildSections(sectionsToInsert);
            if (parentSections.length > 0) {
                await db.insert(meetingSections).values(parentSections);
            }
            if (childSections.length > 0) {
                await db.insert(meetingSections).values(childSections);
            }
        }

        // Update meeting's agendaType and updatedAt
        await db
            .update(meetings)
            .set({
                agendaType,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(meetings.id, id));

        return NextResponse.json({
            success: true,
            agendaType,
            sections: nestGeneratedSections(generatedSections),
            total: generatedSections.length,
        });
    });
}
