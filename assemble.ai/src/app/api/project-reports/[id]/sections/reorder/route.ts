/**
 * Reorder Report Sections API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/project-reports/[id]/sections/reorder - Reorder sections by sectionIds array
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { reports, reportSections } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { reorderSectionsSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

        const body = await request.json();

        // Validate request body
        const validationResult = reorderSectionsSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const { sectionIds } = validationResult.data;
        const now = new Date().toISOString();

        // Update sort order for each section
        await Promise.all(
            sectionIds.map((sectionId, index) =>
                db
                    .update(reportSections)
                    .set({
                        sortOrder: index,
                        updatedAt: now,
                    })
                    .where(
                        and(
                            eq(reportSections.id, sectionId),
                            eq(reportSections.reportId, id)
                        )
                    )
            )
        );

        // Update the report's updatedAt
        await db
            .update(reports)
            .set({ updatedAt: now })
            .where(eq(reports.id, id));

        return NextResponse.json({ success: true, reorderedCount: sectionIds.length });
    });
}
