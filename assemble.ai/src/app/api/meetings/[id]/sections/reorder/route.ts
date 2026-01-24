/**
 * Meeting Sections Reorder API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/meetings/[id]/sections/reorder - Reorder sections by sectionIds array
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetings, meetingSections } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { reorderSectionsSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

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
        const validationResult = reorderSectionsSchema.safeParse(body);
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

        const { sectionIds } = validationResult.data;

        // Verify all sections belong to this meeting
        const existingSections = await db
            .select()
            .from(meetingSections)
            .where(eq(meetingSections.meetingId, id));

        const existingIds = new Set(existingSections.map(s => s.id));
        const invalidIds = sectionIds.filter(sid => !existingIds.has(sid));

        if (invalidIds.length > 0) {
            return NextResponse.json(
                { error: 'Some section IDs do not belong to this meeting', invalidIds },
                { status: 400 }
            );
        }

        // Update sort orders
        const now = new Date().toISOString();
        await Promise.all(
            sectionIds.map((sectionId, index) =>
                db
                    .update(meetingSections)
                    .set({
                        sortOrder: index,
                        updatedAt: now,
                    })
                    .where(eq(meetingSections.id, sectionId))
            )
        );

        // Update meeting's updatedAt
        await db
            .update(meetings)
            .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(meetings.id, id));

        return NextResponse.json({
            success: true,
            message: 'Sections reordered',
            order: sectionIds,
        });
    });
}
