import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { reportGroups, reports } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';

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
            .from(reportGroups)
            .where(eq(reportGroups.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Report group not found' }, { status: 404 });
        }

        await db
            .update(reportGroups)
            .set({
                title: title || existing.title,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(reportGroups.id, id));

        const [updated] = await db
            .select()
            .from(reportGroups)
            .where(eq(reportGroups.id, id))
            .limit(1);

        return NextResponse.json(updated);
    });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;

        const [existing] = await db
            .select()
            .from(reportGroups)
            .where(eq(reportGroups.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Report group not found' }, { status: 404 });
        }

        // Soft-delete all reports in this group
        await db
            .update(reports)
            .set({ deletedAt: new Date().toISOString() })
            .where(
                and(
                    eq(reports.groupId, id),
                    isNull(reports.deletedAt)
                )
            );

        // Delete the group
        await db.delete(reportGroups).where(eq(reportGroups.id, id));

        return NextResponse.json({ success: true, id });
    });
}
