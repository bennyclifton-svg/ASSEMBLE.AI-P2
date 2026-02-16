import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetingGroups } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, max } from 'drizzle-orm';

/**
 * GET /api/meeting-groups?projectId=X
 * Returns all meeting groups for the project, ordered by groupNumber.
 */
export async function GET(request: NextRequest) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        const list = await db
            .select()
            .from(meetingGroups)
            .where(
                and(
                    eq(meetingGroups.projectId, projectId),
                    eq(meetingGroups.organizationId, authResult.user.organizationId)
                )
            )
            .orderBy(meetingGroups.groupNumber);

        return NextResponse.json(list);
    });
}

/**
 * POST /api/meeting-groups - Create a new meeting group
 */
export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const body = await request.json();
        const { projectId, title } = body;

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Determine next group number
        const [existing] = await db
            .select({ maxNum: max(meetingGroups.groupNumber) })
            .from(meetingGroups)
            .where(
                and(
                    eq(meetingGroups.projectId, projectId),
                    eq(meetingGroups.organizationId, authResult.user.organizationId)
                )
            )
            .limit(1);

        const nextNumber = (existing?.maxNum || 0) + 1;

        const id = uuidv4();
        const now = new Date();

        await db.insert(meetingGroups).values({
            id,
            projectId,
            organizationId: authResult.user.organizationId,
            groupNumber: nextNumber,
            title: title || 'New Meeting',
            createdAt: now,
            updatedAt: now,
        });

        const [created] = await db
            .select()
            .from(meetingGroups)
            .where(eq(meetingGroups.id, id))
            .limit(1);

        return NextResponse.json(created, { status: 201 });
    });
}
