/**
 * Single Report Section API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * PATCH /api/project-reports/[id]/sections/[sectionId] - Update section content/label
 * DELETE /api/project-reports/[id]/sections/[sectionId] - Delete a section
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { reports, reportSections } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { updateSectionSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string; sectionId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id, sectionId } = await params;

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

        // Check if section exists
        const [existingSection] = await db
            .select()
            .from(reportSections)
            .where(
                and(
                    eq(reportSections.id, sectionId),
                    eq(reportSections.reportId, id)
                )
            )
            .limit(1);

        if (!existingSection) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 });
        }

        const body = await request.json();

        // Validate request body
        const validationResult = updateSectionSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        // Only include fields that were provided
        const data = validationResult.data;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.sectionLabel !== undefined) updateData.sectionLabel = data.sectionLabel;

        // Update the section
        await db
            .update(reportSections)
            .set(updateData)
            .where(eq(reportSections.id, sectionId));

        // Also update the report's updatedAt
        await db
            .update(reports)
            .set({ updatedAt: new Date().toISOString() })
            .where(eq(reports.id, id));

        // Fetch and return the updated section
        const [updated] = await db
            .select()
            .from(reportSections)
            .where(eq(reportSections.id, sectionId))
            .limit(1);

        return NextResponse.json(updated);
    });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id, sectionId } = await params;

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

        // Check if section exists
        const [existingSection] = await db
            .select()
            .from(reportSections)
            .where(
                and(
                    eq(reportSections.id, sectionId),
                    eq(reportSections.reportId, id)
                )
            )
            .limit(1);

        if (!existingSection) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 });
        }

        // Delete child sections first (cascade)
        await db
            .delete(reportSections)
            .where(eq(reportSections.parentSectionId, sectionId));

        // Delete the section
        await db
            .delete(reportSections)
            .where(eq(reportSections.id, sectionId));

        // Update the report's updatedAt
        await db
            .update(reports)
            .set({ updatedAt: new Date().toISOString() })
            .where(eq(reports.id, id));

        return NextResponse.json({ success: true });
    });
}
