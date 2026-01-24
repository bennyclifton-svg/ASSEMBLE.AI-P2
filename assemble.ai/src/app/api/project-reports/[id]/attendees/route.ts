/**
 * Report Attendees API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/project-reports/[id]/attendees - List report attendees (distribution list)
 * POST /api/project-reports/[id]/attendees - Add attendee (stakeholder or ad-hoc)
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db, reports, reportAttendees, projectStakeholders } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { addAttendeeSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id } = await params;
        console.log('[DEBUG] GET /api/project-reports/[id]/attendees - Report ID:', id);

        // Get authenticated user
        const authResult = await getCurrentUser();
        console.log('[DEBUG] Auth result:', authResult.user ? 'User authenticated' : authResult.error);
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        // Check if report exists and belongs to user's org
        const [report] = await db
            .select()
            .from(reports)
            .where(
                and(
                    eq(reports.id, id),
                    eq(reports.organizationId, authResult.user.organizationId),
                    isNull(reports.deletedAt)
                )
            )
            .limit(1);

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Fetch attendees with stakeholder info
        const rawAttendees = await db
            .select({
                id: reportAttendees.id,
                reportId: reportAttendees.reportId,
                stakeholderId: reportAttendees.stakeholderId,
                adhocName: reportAttendees.adhocName,
                adhocFirm: reportAttendees.adhocFirm,
                adhocGroup: reportAttendees.adhocGroup,
                adhocSubGroup: reportAttendees.adhocSubGroup,
                isDistribution: reportAttendees.isDistribution,
                createdAt: reportAttendees.createdAt,
                stakeholderName: projectStakeholders.name,
                stakeholderGroup: projectStakeholders.stakeholderGroup,
                stakeholderOrganization: projectStakeholders.organization,
                stakeholderContactName: projectStakeholders.contactName,
                stakeholderContactEmail: projectStakeholders.contactEmail,
                stakeholderRole: projectStakeholders.role,
                stakeholderDisciplineOrTrade: projectStakeholders.disciplineOrTrade,
            })
            .from(reportAttendees)
            .leftJoin(projectStakeholders, eq(reportAttendees.stakeholderId, projectStakeholders.id))
            .where(eq(reportAttendees.reportId, id));

        // Transform to nested stakeholder structure expected by MeetingStakeholderTable
        const attendees = rawAttendees.map(a => ({
            id: a.id,
            reportId: a.reportId,
            stakeholderId: a.stakeholderId,
            adhocName: a.adhocName,
            adhocFirm: a.adhocFirm,
            adhocGroup: a.adhocGroup,
            adhocSubGroup: a.adhocSubGroup,
            isDistribution: a.isDistribution,
            isAttending: true, // Reports use isDistribution but we need this for the table
            createdAt: a.createdAt,
            stakeholder: a.stakeholderId ? {
                id: a.stakeholderId,
                name: a.stakeholderName,
                stakeholderGroup: a.stakeholderGroup,
                organization: a.stakeholderOrganization,
                contactName: a.stakeholderContactName,
                contactEmail: a.stakeholderContactEmail,
                role: a.stakeholderRole,
                disciplineOrTrade: a.stakeholderDisciplineOrTrade,
            } : null,
        }));

        return NextResponse.json({
            reportId: id,
            attendees,
            total: attendees.length,
        });
    });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id } = await params;
        console.log('[DEBUG] POST /api/project-reports/[id]/attendees - Report ID:', id);

        // Get authenticated user
        const authResult = await getCurrentUser();
        console.log('[DEBUG] Auth result:', authResult.user ? 'User authenticated' : authResult.error);
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        // Check if report exists and belongs to user's org
        const [report] = await db
            .select()
            .from(reports)
            .where(
                and(
                    eq(reports.id, id),
                    eq(reports.organizationId, authResult.user.organizationId),
                    isNull(reports.deletedAt)
                )
            )
            .limit(1);

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const body = await request.json();

        // Validate request body
        const validationResult = addAttendeeSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const { stakeholderId, adhocName, adhocFirm, adhocGroup } = validationResult.data;
        const now = new Date().toISOString();

        // If stakeholderId provided, verify it exists
        if (stakeholderId) {
            const [stakeholder] = await db
                .select()
                .from(projectStakeholders)
                .where(
                    and(
                        eq(projectStakeholders.id, stakeholderId),
                        eq(projectStakeholders.projectId, report.projectId),
                        isNull(projectStakeholders.deletedAt)
                    )
                )
                .limit(1);

            if (!stakeholder) {
                return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
            }

            // Check if stakeholder already added
            const [existing] = await db
                .select()
                .from(reportAttendees)
                .where(
                    and(
                        eq(reportAttendees.reportId, id),
                        eq(reportAttendees.stakeholderId, stakeholderId)
                    )
                )
                .limit(1);

            if (existing) {
                return NextResponse.json({ error: 'Stakeholder already added to report' }, { status: 409 });
            }
        }

        // Create attendee
        const attendeeId = uuidv4();
        const { adhocSubGroup } = validationResult.data;

        await db.insert(reportAttendees).values({
            id: attendeeId,
            reportId: id,
            stakeholderId: stakeholderId || null,
            adhocName: adhocName || null,
            adhocFirm: adhocFirm || null,
            adhocGroup: adhocGroup || null,
            adhocSubGroup: adhocSubGroup || null,
            isDistribution: true,
            createdAt: now,
        });

        // Fetch and return the created attendee with stakeholder info
        const [rawCreated] = await db
            .select({
                id: reportAttendees.id,
                reportId: reportAttendees.reportId,
                stakeholderId: reportAttendees.stakeholderId,
                adhocName: reportAttendees.adhocName,
                adhocFirm: reportAttendees.adhocFirm,
                adhocGroup: reportAttendees.adhocGroup,
                adhocSubGroup: reportAttendees.adhocSubGroup,
                isDistribution: reportAttendees.isDistribution,
                createdAt: reportAttendees.createdAt,
                stakeholderName: projectStakeholders.name,
                stakeholderGroup: projectStakeholders.stakeholderGroup,
                stakeholderOrganization: projectStakeholders.organization,
                stakeholderContactName: projectStakeholders.contactName,
                stakeholderContactEmail: projectStakeholders.contactEmail,
                stakeholderRole: projectStakeholders.role,
                stakeholderDisciplineOrTrade: projectStakeholders.disciplineOrTrade,
            })
            .from(reportAttendees)
            .leftJoin(projectStakeholders, eq(reportAttendees.stakeholderId, projectStakeholders.id))
            .where(eq(reportAttendees.id, attendeeId))
            .limit(1);

        // Transform to nested stakeholder structure
        const created = {
            id: rawCreated.id,
            reportId: rawCreated.reportId,
            stakeholderId: rawCreated.stakeholderId,
            adhocName: rawCreated.adhocName,
            adhocFirm: rawCreated.adhocFirm,
            adhocGroup: rawCreated.adhocGroup,
            adhocSubGroup: rawCreated.adhocSubGroup,
            isDistribution: rawCreated.isDistribution,
            isAttending: true,
            createdAt: rawCreated.createdAt,
            stakeholder: rawCreated.stakeholderId ? {
                id: rawCreated.stakeholderId,
                name: rawCreated.stakeholderName,
                stakeholderGroup: rawCreated.stakeholderGroup,
                organization: rawCreated.stakeholderOrganization,
                contactName: rawCreated.stakeholderContactName,
                contactEmail: rawCreated.stakeholderContactEmail,
                role: rawCreated.stakeholderRole,
                disciplineOrTrade: rawCreated.stakeholderDisciplineOrTrade,
            } : null,
        };

        return NextResponse.json(created, { status: 201 });
    });
}
