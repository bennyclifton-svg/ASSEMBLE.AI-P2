/**
 * Meeting Sync Sections API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/meetings/[id]/sync-sections - Sync sections based on user selection
 * Non-destructive: preserves content for kept sections, adds new ones, removes unchecked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetings, meetingSections } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import {
    generateDetailedAgendaSections,
    type GeneratedSection,
} from '@/lib/services/section-generation';

const syncSectionsSchema = z.object({
    selectedSectionKeys: z.array(z.string().min(1)),
});

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;
        const body = await request.json();

        const validationResult = syncSectionsSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

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

        const { selectedSectionKeys } = validationResult.data;
        const selectedSet = new Set(selectedSectionKeys);

        // 1. Get existing sections and preserve their content
        const existingSections = await db
            .select()
            .from(meetingSections)
            .where(eq(meetingSections.meetingId, id));

        const contentByKey = new Map<string, string | null>();
        for (const s of existingSections) {
            if (s.content) {
                contentByKey.set(s.sectionKey, s.content);
            }
        }

        // 2. Generate full detailed template (includes all stakeholder sub-sections)
        const template = await generateDetailedAgendaSections(meeting.projectId);

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
            .delete(meetingSections)
            .where(eq(meetingSections.meetingId, id));

        // 6. Insert selected sections with preserved content
        const now = new Date().toISOString();

        if (finalSections.length > 0) {
            // Insert parents first
            const parents = finalSections.filter(s => !s.parentSectionId);
            const children = finalSections.filter(s => s.parentSectionId);

            if (parents.length > 0) {
                await db.insert(meetingSections).values(
                    parents.map(s => ({
                        id: s.id,
                        meetingId: id,
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
                await db.insert(meetingSections).values(
                    children.map(s => ({
                        id: s.id,
                        meetingId: id,
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
