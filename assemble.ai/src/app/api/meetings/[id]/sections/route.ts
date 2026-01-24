/**
 * Meeting Sections API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/meetings/[id]/sections - Get all sections for a meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetings, meetingSections, projectStakeholders } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and, isNull, asc } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
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

        // Fetch sections with stakeholder data
        const sections = await db
            .select({
                section: meetingSections,
                stakeholder: projectStakeholders,
            })
            .from(meetingSections)
            .leftJoin(projectStakeholders, eq(meetingSections.stakeholderId, projectStakeholders.id))
            .where(eq(meetingSections.meetingId, id))
            .orderBy(asc(meetingSections.sortOrder));

        // Transform to include stakeholder data
        const transformedSections = sections.map(({ section, stakeholder }) => ({
            ...section,
            stakeholder: stakeholder || null,
        }));

        // Build nested structure
        const topLevelSections = transformedSections.filter(s => !s.parentSectionId);
        const childSections = transformedSections.filter(s => s.parentSectionId);

        const sectionsWithChildren = topLevelSections.map(parent => ({
            ...parent,
            childSections: childSections.filter(child => child.parentSectionId === parent.id),
        }));

        return NextResponse.json({
            meetingId: id,
            sections: sectionsWithChildren,
            total: sections.length,
        });
    });
}
