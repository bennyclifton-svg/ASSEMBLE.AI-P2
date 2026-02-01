import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectStakeholders } from '@/lib/db';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { getAllCategories, type ActiveCategory, type Subcategory } from '@/lib/constants/categories';

/**
 * Helper function to extract unique subcategories from stakeholders
 * Handles deduplication, empty values, and alphabetical sorting
 */
function getUniqueSubcategories(
    stakeholders: (typeof projectStakeholders.$inferSelect)[],
    parentCategoryId: string
): Subcategory[] {
    const uniqueMap = new Map<string, { id: string; name: string }>();

    for (const s of stakeholders) {
        const disciplineOrTrade = s.disciplineOrTrade?.trim();
        if (disciplineOrTrade) {
            const key = disciplineOrTrade.toLowerCase();
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, {
                    id: s.id,
                    name: disciplineOrTrade,
                });
            }
        }
    }

    return Array.from(uniqueMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(item => ({
            id: item.id,
            name: item.name,
            parentCategoryId,
        }));
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Get all categories
        const categories = getAllCategories();

        // Fetch active consultant stakeholders (for Scheme Design, Detail Design, Consultants)
        const consultantStakeholders = await db
            .select()
            .from(projectStakeholders)
            .where(
                and(
                    eq(projectStakeholders.projectId, projectId),
                    eq(projectStakeholders.stakeholderGroup, 'consultant'),
                    eq(projectStakeholders.isEnabled, true),
                    isNull(projectStakeholders.deletedAt)
                )
            )
            .orderBy(asc(projectStakeholders.disciplineOrTrade));

        // Fetch active contractor stakeholders (for Contractors category)
        const contractorStakeholders = await db
            .select()
            .from(projectStakeholders)
            .where(
                and(
                    eq(projectStakeholders.projectId, projectId),
                    eq(projectStakeholders.stakeholderGroup, 'contractor'),
                    eq(projectStakeholders.isEnabled, true),
                    isNull(projectStakeholders.deletedAt)
                )
            )
            .orderBy(asc(projectStakeholders.disciplineOrTrade));

        // Build active categories with their subcategories
        const activeCategories: ActiveCategory[] = categories.map(category => {
            if (!category.hasSubcategories) {
                return category;
            }

            let subcategories: Subcategory[] = [];

            if (category.subcategorySource === 'consultants') {
                // Get unique disciplines from consultant stakeholders
                subcategories = getUniqueSubcategories(consultantStakeholders, category.id);
            } else if (category.subcategorySource === 'contractors') {
                // Get unique trades from contractor stakeholders
                subcategories = getUniqueSubcategories(contractorStakeholders, category.id);
            }

            return {
                ...category,
                subcategories,
            };
        });

        return NextResponse.json(activeCategories);
    } catch (error) {
        console.error('Error fetching active categories:', error);
        return NextResponse.json({ error: 'Failed to fetch active categories' }, { status: 500 });
    }
}
