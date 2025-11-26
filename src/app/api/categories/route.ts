import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { categories, subcategories } from '@/lib/db/schema';

export async function GET() {
    return handleApiError(async () => {
        const allCategories = await db.select().from(categories);
        const allSubcategories = await db.select().from(subcategories);

        // Nest subcategories under categories
        const result = allCategories.map(cat => ({
            ...cat,
            subcategories: allSubcategories.filter(sub => sub.categoryId === cat.id),
        }));

        return NextResponse.json(result);
    });
}
