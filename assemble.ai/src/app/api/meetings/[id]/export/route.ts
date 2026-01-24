/**
 * Meeting Export API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/meetings/[id]/export?format=pdf|docx
 * Exports meeting to PDF or DOCX format
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import {
    meetings,
    meetingSections,
    meetingAttendees,
    projectStakeholders,
    projects,
    projectDetails,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { exportMeetingToPDF } from '@/lib/export/pdf-enhanced';
import { exportMeetingToDOCX } from '@/lib/export/docx-enhanced';

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

        // Get format from query params
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'pdf';

        if (!['pdf', 'docx'].includes(format)) {
            return NextResponse.json(
                { error: 'Invalid format. Must be "pdf" or "docx"' },
                { status: 400 }
            );
        }

        // Fetch meeting with organization check
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

        // Fetch related data in parallel
        const [sections, attendees, project, details] = await Promise.all([
            // Fetch sections ordered by sortOrder
            db.select()
                .from(meetingSections)
                .where(eq(meetingSections.meetingId, id))
                .orderBy(asc(meetingSections.sortOrder)),
            // Fetch attendees with stakeholder info
            db.select({
                attendee: meetingAttendees,
                stakeholder: projectStakeholders,
            })
                .from(meetingAttendees)
                .leftJoin(projectStakeholders, eq(meetingAttendees.stakeholderId, projectStakeholders.id))
                .where(eq(meetingAttendees.meetingId, id)),
            // Fetch project
            db.select()
                .from(projects)
                .where(eq(projects.id, meeting.projectId))
                .limit(1),
            // Fetch project details
            db.select()
                .from(projectDetails)
                .where(eq(projectDetails.projectId, meeting.projectId))
                .limit(1),
        ]);

        // Build nested section structure
        const topLevelSections = sections.filter(s => !s.parentSectionId);
        const childSections = sections.filter(s => s.parentSectionId);

        const sectionsWithChildren = topLevelSections.map(parent => ({
            id: parent.id,
            sectionLabel: parent.sectionLabel,
            content: parent.content,
            childSections: childSections
                .filter(child => child.parentSectionId === parent.id)
                .map(child => ({
                    sectionLabel: child.sectionLabel,
                    content: child.content,
                })),
        }));

        // Transform attendees
        const transformedAttendees = attendees.map(({ attendee, stakeholder }) => ({
            adhocName: attendee.adhocName,
            adhocFirm: attendee.adhocFirm,
            isAttending: attendee.isAttending ?? true,
            isDistribution: attendee.isDistribution ?? true,
            stakeholder: stakeholder ? {
                name: stakeholder.name,
                organization: stakeholder.organization,
            } : null,
        }));

        // Build export data
        const exportData = {
            id: meeting.id,
            title: meeting.title,
            meetingDate: meeting.meetingDate,
            agendaType: meeting.agendaType || 'standard',
            sections: sectionsWithChildren,
            attendees: transformedAttendees,
            project: project[0] ? {
                name: project[0].name,
                address: details[0]?.address || null,
            } : null,
        };

        // Generate export
        let buffer: ArrayBuffer | Buffer;
        let mimeType: string;
        let fileExtension: string;

        if (format === 'pdf') {
            buffer = await exportMeetingToPDF(exportData);
            mimeType = 'application/pdf';
            fileExtension = 'pdf';
        } else {
            buffer = await exportMeetingToDOCX(exportData);
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            fileExtension = 'docx';
        }

        // Create filename
        const sanitizedTitle = meeting.title
            .replace(/[/\\:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100) || 'Meeting';
        const filename = `${sanitizedTitle}.${fileExtension}`;

        // Return binary response
        return new NextResponse(new Uint8Array(buffer instanceof Buffer ? buffer : buffer), {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': (buffer instanceof Buffer ? buffer.length : buffer.byteLength).toString(),
            },
        });
    });
}
