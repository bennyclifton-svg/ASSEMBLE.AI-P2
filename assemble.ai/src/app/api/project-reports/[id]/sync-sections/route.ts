/**
 * Report Sync Sections API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/project-reports/[id]/sync-sections - Sync sections based on user selection
 * Non-destructive: preserves content for kept sections, adds new ones, removes unchecked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db, reports, reportSections } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import {
    generateDetailedContentsSections,
    type GeneratedSection,
} from '@/lib/services/section-generation';

const syncSectionsSchema = z.object({
    selectedSectionKeys: z.array(z.string().min(1)),
});

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    return handleApiError(async () => {
        const { id } = await params;

        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const body = await request.json();

        const validationResult = syncSectionsSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        // Verify report exists and belongs to organization
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

        const { selectedSectionKeys } = validationResult.data;
        const selectedSet = new Set(selectedSectionKeys);

        // 1. Get existing sections and preserve their content
        const existingSections = await db
            .select()
            .from(reportSections)
            .where(eq(reportSections.reportId, id));

        const contentByKey = new Map<string, string | null>();
        for (const s of existingSections) {
            if (s.content) {
                contentByKey.set(s.sectionKey, s.content);
            }
        }

        // 2. Generate full detailed template (includes all stakeholder sub-sections)
        const template = await generateDetailedContentsSections(report.projectId);

        // 3. Auto-include parents of selected children
        for (const section of template) {
            if (section.parentSectionId && selectedSet.has(section.sectionKey)) {
                const parent = template.find(t => t.id === section.parentSectionId);
                if (parent) {
                    selectedSet.add(parent.sectionKey);
                }
            }
        }

        // 4. Filter template to selected keys
        const finalSections = template.filter(s => selectedSet.has(s.sectionKey));

        // 5. Delete all existing sections
        await db
            .delete(reportSections)
            .where(eq(reportSections.reportId, id));

        // 6. Insert selected sections with preserved content
        const now = new Date().toISOString();

        if (finalSections.length > 0) {
            // Insert parents first
            const parents = finalSections.filter(s => !s.parentSectionId);
            const children = finalSections.filter(s => s.parentSectionId);

            if (parents.length > 0) {
                await db.insert(reportSections).values(
                    parents.map(s => ({
                        id: s.id,
                        reportId: id,
                        sectionKey: s.sectionKey,
                        sectionLabel: s.sectionLabel,
                        content: contentByKey.get(s.sectionKey) || null,
                        sortOrder: s.sortOrder,
                        parentSectionId: null,
                        stakeholderId: s.stakeholderId || null,
                        createdAt: now,
                        updatedAt: now,
                    }))
                );
            }

            if (children.length > 0) {
                await db.insert(reportSections).values(
                    children.map(s => ({
                        id: s.id,
                        reportId: id,
                        sectionKey: s.sectionKey,
                        sectionLabel: s.sectionLabel,
                        content: contentByKey.get(s.sectionKey) || null,
                        sortOrder: s.sortOrder,
                        parentSectionId: s.parentSectionId,
                        stakeholderId: s.stakeholderId || null,
                        createdAt: now,
                        updatedAt: now,
                    }))
                );
            }
        }

        // 7. Build nested response
        const topLevel = finalSections.filter(s => !s.parentSectionId);
        const childSections = finalSections.filter(s => s.parentSectionId);

        const sectionsWithChildren = topLevel.map(parent => ({
            ...parent,
            content: contentByKey.get(parent.sectionKey) || null,
            childSections: childSections
                .filter(child => child.parentSectionId === parent.id)
                .map(child => ({
                    ...child,
                    content: contentByKey.get(child.sectionKey) || null,
                })),
        }));

        return NextResponse.json({
            success: true,
            sections: sectionsWithChildren,
            total: finalSections.length,
        });
    });
}
