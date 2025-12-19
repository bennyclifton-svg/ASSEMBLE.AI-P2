import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents, categories, subcategories } from '@/lib/db';
import { inArray } from 'drizzle-orm';
import { getCategoryById } from '@/lib/constants/categories';

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { documentIds, categoryId, subcategoryId, subcategoryName } = body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json({ error: 'documentIds array is required' }, { status: 400 });
        }

        if (!categoryId) {
            return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
        }

        // Ensure category exists in the categories table for proper JOIN in GET queries
        const categoryInfo = getCategoryById(categoryId);
        if (categoryInfo) {
            await db.insert(categories).values({
                id: categoryId,
                name: categoryInfo.name,
                isSystem: true
            }).onConflictDoNothing();
        }

        // Ensure subcategory exists if provided (for legacy subcategories, not consultant/contractor disciplines)
        if (subcategoryId && subcategoryName) {
            await db.insert(subcategories).values({
                id: subcategoryId,
                categoryId: categoryId,
                name: subcategoryName,
                isSystem: false
            }).onConflictDoNothing();
        }

        // Update all selected documents with the new category/subcategory
        await db.update(documents)
            .set({
                categoryId: categoryId,
                subcategoryId: subcategoryId || null,
                updatedAt: new Date(),
            })
            .where(inArray(documents.id, documentIds));

        return NextResponse.json({
            success: true,
            updatedCount: documentIds.length,
        });
    } catch (error) {
        console.error('Error bulk categorizing documents:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
        }
        return NextResponse.json({
            error: 'Failed to categorize documents',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
