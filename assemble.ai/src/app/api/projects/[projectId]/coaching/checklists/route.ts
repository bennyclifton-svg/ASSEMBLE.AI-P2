import { NextRequest, NextResponse } from 'next/server';
import { db, coachingChecklists, projectProfiles } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
    ALL_CHECKLIST_TEMPLATES,
    getCoachingCategory,
    getChecklistsForProject,
    type CoachingCategory,
    type LifecycleStage,
} from '@/lib/constants/coaching-checklists';

/**
 * GET /api/projects/[projectId]/coaching/checklists
 * Returns checklists for a project, filtered by module.
 * Lazy-initializes from templates if none exist yet.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const { searchParams } = new URL(request.url);
        const module = searchParams.get('module');

        // Check if checklists exist for this project
        let checklists = await db
            .select()
            .from(coachingChecklists)
            .where(eq(coachingChecklists.projectId, projectId));

        // Lazy initialization: create from templates if none exist
        if (checklists.length === 0) {
            checklists = await initializeChecklists(projectId);
        }

        // Filter by module if specified
        if (module) {
            checklists = checklists.filter((c) => c.module === module);
        }

        // Parse items JSON for each checklist
        const result = checklists.map((c) => ({
            ...c,
            items: typeof c.items === 'string' ? JSON.parse(c.items) : c.items,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching coaching checklists:', error);
        return NextResponse.json(
            { error: 'Failed to fetch coaching checklists' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/projects/[projectId]/coaching/checklists
 * Update a checklist item's check state.
 * Body: { checklistId, itemId, isChecked }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await request.json();
        const { checklistId, itemId, isChecked } = body;

        if (!checklistId || !itemId || typeof isChecked !== 'boolean') {
            return NextResponse.json(
                { error: 'checklistId, itemId, and isChecked are required' },
                { status: 400 }
            );
        }

        // Fetch the checklist
        const [checklist] = await db
            .select()
            .from(coachingChecklists)
            .where(
                and(
                    eq(coachingChecklists.id, checklistId),
                    eq(coachingChecklists.projectId, projectId)
                )
            );

        if (!checklist) {
            return NextResponse.json(
                { error: 'Checklist not found' },
                { status: 404 }
            );
        }

        // Parse and update items
        const items = typeof checklist.items === 'string'
            ? JSON.parse(checklist.items)
            : checklist.items;

        const updatedItems = items.map((item: any) => {
            if (item.id === itemId) {
                return {
                    ...item,
                    isChecked,
                    checkedAt: isChecked ? new Date().toISOString() : null,
                };
            }
            return item;
        });

        // Save updated items
        await db
            .update(coachingChecklists)
            .set({
                items: JSON.stringify(updatedItems),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(coachingChecklists.id, checklistId));

        // Return updated checklist
        const [updated] = await db
            .select()
            .from(coachingChecklists)
            .where(eq(coachingChecklists.id, checklistId));

        return NextResponse.json({
            ...updated,
            items: typeof updated.items === 'string' ? JSON.parse(updated.items) : updated.items,
        });
    } catch (error) {
        console.error('Error updating checklist item:', error);
        return NextResponse.json(
            { error: 'Failed to update checklist item' },
            { status: 500 }
        );
    }
}

/**
 * Initialize checklists for a project from templates.
 * Determines coaching category from project profile.
 */
async function initializeChecklists(projectId: string) {
    // Get project profile to determine coaching category
    const [profile] = await db
        .select()
        .from(projectProfiles)
        .where(eq(projectProfiles.projectId, projectId));

    const category = getCoachingCategory(profile?.projectType);
    // Default to 'initiation' stage — checklists for all applicable stages are created
    const currentStage: LifecycleStage = 'initiation';

    // Get all applicable templates (not just current stage — create all for the category)
    const templates = ALL_CHECKLIST_TEMPLATES.filter((t) => {
        return t.categories === 'ALL' || t.categories.includes(category);
    });

    const now = new Date().toISOString();
    const checklists = templates.map((template) => ({
        id: uuidv4(),
        projectId,
        templateId: template.templateId,
        module: template.module,
        title: template.title,
        coachingCategory: category,
        lifecycleStages: template.stages,
        items: JSON.stringify(
            template.items.map((item) => ({
                id: item.id,
                label: item.label,
                description: item.description,
                isChecked: false,
                checkedAt: null,
                checkedBy: null,
            }))
        ),
        source: 'prebuilt' as const,
        domainId: null,
        sortOrder: template.sortOrder,
        isDismissed: false,
        createdAt: now,
        updatedAt: now,
    }));

    if (checklists.length > 0) {
        await db.insert(coachingChecklists).values(checklists);
    }

    // Return the created checklists
    return await db
        .select()
        .from(coachingChecklists)
        .where(eq(coachingChecklists.projectId, projectId));
}
