import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetingGroups, meetings } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * PUT /api/meeting-groups/[id] - Update meeting group (rename title)
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        const body = await request.json();
        const { title } = body;

        const [existing] = await db
            .select()
            .from(meetingGroups)
            .where(eq(meetingGroups.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Meeting group not found' }, { status: 404 });
        }

        await db
            .update(meetingGroups)
            .set({
                title: title || existing.title,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(meetingGroups.id, id));

        const [updated] = await db
            .select()
            .from(meetingGroups)
            .where(eq(meetingGroups.id, id))
            .limit(1);

        return NextResponse.json(updated);
    });
}

/**
 * DELETE /api/meeting-groups/[id] - Delete meeting group (cascades to meetings)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;

        const [existing] = await db
            .select()
            .from(meetingGroups)
            .where(eq(meetingGroups.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Meeting group not found' }, { status: 404 });
        }

        // Soft-delete all meetings in this group
        await db
            .update(meetings)
            .set({ deletedAt: new Date().toISOString() })
            .where(
                and(
                    eq(meetings.groupId, id),
                    isNull(meetings.deletedAt)
                )
            );

        // Delete the group
        await db.delete(meetingGroups).where(eq(meetingGroups.id, id));

        return NextResponse.json({ success: true, id });
    });
}
