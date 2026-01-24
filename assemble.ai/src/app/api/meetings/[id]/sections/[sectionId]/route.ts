/**
 * Meeting Section API Route - Individual Section
 * Feature 021 - Notes, Meetings & Reports
 *
 * PATCH /api/meetings/[id]/sections/[sectionId] - Update a section's content or label
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetings, meetingSections } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { updateSectionSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string; sectionId: string }>;
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

        const { id, sectionId } = await context.params;
        const body = await request.json();

        // Validate request body
        const validationResult = updateSectionSchema.safeParse(body);
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

        // Verify section exists and belongs to this meeting
        const [existingSection] = await db
            .select()
            .from(meetingSections)
            .where(
                and(
                    eq(meetingSections.id, sectionId),
                    eq(meetingSections.meetingId, id)
                )
            )
            .limit(1);

        if (!existingSection) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            updatedAt: sql`CURRENT_TIMESTAMP`,
        };

        const { content, sectionLabel } = validationResult.data;

        if (content !== undefined) {
            updateData.content = content;
        }
        if (sectionLabel !== undefined) {
            updateData.sectionLabel = sectionLabel;
        }

        // Update the section
        await db
            .update(meetingSections)
            .set(updateData)
            .where(eq(meetingSections.id, sectionId));

        // Also update the parent meeting's updatedAt
        await db
            .update(meetings)
            .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(meetings.id, id));

        // Fetch and return the updated section
        const [updated] = await db
            .select()
            .from(meetingSections)
            .where(eq(meetingSections.id, sectionId))
            .limit(1);

        return NextResponse.json(updated);
    });
}
