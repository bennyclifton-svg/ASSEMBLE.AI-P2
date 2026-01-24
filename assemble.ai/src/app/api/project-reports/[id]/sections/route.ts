/**
 * Report Sections API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/project-reports/[id]/sections - Get report sections ordered by sortOrder
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { reports, reportSections, projectStakeholders } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and, isNull, asc } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id } = await params;

        // Get authenticated user
        const authResult = await getCurrentUser();
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

        // Fetch sections with stakeholder info
        const sections = await db
            .select({
                id: reportSections.id,
                reportId: reportSections.reportId,
                sectionKey: reportSections.sectionKey,
                sectionLabel: reportSections.sectionLabel,
                content: reportSections.content,
                sortOrder: reportSections.sortOrder,
                parentSectionId: reportSections.parentSectionId,
                stakeholderId: reportSections.stakeholderId,
                createdAt: reportSections.createdAt,
                updatedAt: reportSections.updatedAt,
                stakeholderName: projectStakeholders.name,
                stakeholderGroup: projectStakeholders.stakeholderGroup,
            })
            .from(reportSections)
            .leftJoin(projectStakeholders, eq(reportSections.stakeholderId, projectStakeholders.id))
            .where(eq(reportSections.reportId, id))
            .orderBy(asc(reportSections.sortOrder));

        // Build hierarchical structure
        const sectionMap = new Map<string, typeof sections[0] & { childSections: typeof sections }>();
        const topLevelSections: Array<typeof sections[0] & { childSections: typeof sections }> = [];

        // First pass: create map
        for (const section of sections) {
            sectionMap.set(section.id, { ...section, childSections: [] });
        }

        // Second pass: build hierarchy
        for (const section of sections) {
            const sectionWithChildren = sectionMap.get(section.id)!;
            if (section.parentSectionId) {
                const parent = sectionMap.get(section.parentSectionId);
                if (parent) {
                    parent.childSections.push(sectionWithChildren);
                }
            } else {
                topLevelSections.push(sectionWithChildren);
            }
        }

        return NextResponse.json({
            reportId: id,
            sections: topLevelSections,
            total: sections.length,
        });
    });
}
