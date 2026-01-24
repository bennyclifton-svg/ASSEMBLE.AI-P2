import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultantDisciplines, contractorTrades } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { getAllCategories, type ActiveCategory, type Subcategory } from '@/lib/constants/categories';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Get all categories
        const categories = getAllCategories();

        // Fetch active consultant disciplines (ordered alphabetically)
        const activeDisciplines = await db.query.consultantDisciplines.findMany({
            where: eq(consultantDisciplines.projectId, projectId),
            orderBy: asc(consultantDisciplines.disciplineName),
        });

        // Fetch active contractor trades (ordered alphabetically)
        const activeTrades = await db.query.contractorTrades.findMany({
            where: eq(contractorTrades.projectId, projectId),
            orderBy: asc(contractorTrades.tradeName),
        });

        // Build active categories with their subcategories
        const activeCategories: ActiveCategory[] = categories.map(category => {
            if (!category.hasSubcategories) {
                return category;
            }

            let subcategories: Subcategory[] = [];

            if (category.subcategorySource === 'consultants') {
                // Filter to only enabled disciplines
                subcategories = activeDisciplines
                    .filter(d => d.isEnabled)
                    .map(d => ({
                        id: d.id,
                        name: d.disciplineName,
                        parentCategoryId: category.id,
                    }));
            } else if (category.subcategorySource === 'contractors') {
                // Filter to only enabled trades
                subcategories = activeTrades
                    .filter(t => t.isEnabled)
                    .map(t => ({
                        id: t.id,
                        name: t.tradeName,
                        parentCategoryId: category.id,
                    }));
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
