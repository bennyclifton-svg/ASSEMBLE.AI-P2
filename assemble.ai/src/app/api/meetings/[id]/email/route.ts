/**
 * Meeting Email API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/meetings/[id]/email
 * Generates email content for meeting distribution list
 *
 * Returns email data (subject, body, recipients, mailto URL) that can be used
 * to open a mailto: link or integrate with an email service.
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
import {
    generateMeetingEmail,
    generateMailtoUrl,
    generateMeetingEmailHtml,
} from '@/lib/services/email-generation';

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

        // Parse optional request body
        let includeAttachments = false;
        let customSubject: string | undefined;

        try {
            const body = await request.json();
            includeAttachments = body.includeAttachments ?? false;
            customSubject = body.subject;
        } catch {
            // No body provided, use defaults
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
            // Fetch attendees with stakeholder info (including email)
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
            isDistribution: attendee.isDistribution ?? true,
            stakeholder: stakeholder ? {
                name: stakeholder.name,
                email: stakeholder.email,
                organization: stakeholder.organization,
            } : null,
        }));

        // Build email data
        const emailData = {
            title: meeting.title,
            meetingDate: meeting.meetingDate,
            sections: sectionsWithChildren,
            attendees: transformedAttendees,
            project: project[0] ? {
                name: project[0].name,
                address: details[0]?.address || null,
            } : null,
        };

        // Generate email content
        const emailResult = generateMeetingEmail(emailData);
        const htmlBody = generateMeetingEmailHtml(emailData);
        const mailtoUrl = generateMailtoUrl(emailResult);

        // Apply custom subject if provided
        if (customSubject) {
            emailResult.subject = customSubject;
        }

        // Get distribution count
        const distributionCount = transformedAttendees.filter(a => a.isDistribution).length;

        return NextResponse.json({
            success: true,
            email: {
                subject: emailResult.subject,
                body: emailResult.body,
                htmlBody,
                recipients: emailResult.recipients,
                mailtoUrl,
            },
            meta: {
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                distributionCount,
                recipientCount: emailResult.recipients.length,
            },
        });
    });
}
