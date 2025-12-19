import { NextRequest, NextResponse } from 'next/server';
import { db, programActivities } from '@/lib/db';
import { eq, max } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getTemplateByKey } from '@/lib/constants/program-templates';
import { PROGRAM_COLORS } from '@/types/program';

// POST /api/projects/[projectId]/program/template - Insert template activities
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await request.json();
        const { templateKey } = body;

        if (!templateKey) {
            return NextResponse.json(
                { error: 'templateKey is required' },
                { status: 400 }
            );
        }

        const template = getTemplateByKey(templateKey);
        if (!template) {
            return NextResponse.json(
                { error: `Template "${templateKey}" not found` },
                { status: 404 }
            );
        }

        // Get the max sort order for this project
        const result = await db
            .select({ maxOrder: max(programActivities.sortOrder) })
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId));

        let sortOrder = (result[0]?.maxOrder ?? -1) + 1;

        // Count existing top-level activities to determine color
        const existing = await db
            .select()
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId));
        const topLevelCount = existing.filter((a) => !a.parentId).length;

        const createdActivities: Array<typeof programActivities.$inferSelect> = [];

        // Insert parent and children from template
        for (const templateActivity of template.activities) {
            const parentId = uuidv4();
            const color = PROGRAM_COLORS[(topLevelCount + createdActivities.filter(a => !a.parentId).length) % PROGRAM_COLORS.length];

            // Create parent activity
            await db.insert(programActivities).values({
                id: parentId,
                projectId,
                parentId: null,
                name: templateActivity.name,
                startDate: null,
                endDate: null,
                collapsed: false,
                color,
                sortOrder: sortOrder++,
            });

            // Fetch the created activity to get DB-generated timestamps
            const [created] = await db.select().from(programActivities).where(eq(programActivities.id, parentId));
            if (created) createdActivities.push(created);

            // Create children if any
            if (templateActivity.children) {
                for (const childName of templateActivity.children) {
                    const childId = uuidv4();

                    await db.insert(programActivities).values({
                        id: childId,
                        projectId,
                        parentId,
                        name: childName,
                        startDate: null,
                        endDate: null,
                        collapsed: false,
                        color, // Inherit parent's color
                        sortOrder: sortOrder++,
                    });

                    const [createdChild] = await db.select().from(programActivities).where(eq(programActivities.id, childId));
                    if (createdChild) createdActivities.push(createdChild);
                }
            }
        }

        return NextResponse.json({
            success: true,
            template: template.name,
            created: createdActivities,
        }, { status: 201 });
    } catch (error) {
        console.error('Error inserting template:', error);
        return NextResponse.json(
            { error: 'Failed to insert template' },
            { status: 500 }
        );
    }
}
