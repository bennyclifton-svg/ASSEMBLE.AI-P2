import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { documentIds, categoryId, subcategoryId } = body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json({ error: 'documentIds array is required' }, { status: 400 });
        }

        if (!categoryId) {
            return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
        }

        // For now, we'll store categoryId and subcategoryId as strings
        // The foreign key constraints reference the old categories/subcategories tables
        // which we're not using for this feature. We'll store the IDs directly.
        // TODO: Either remove FK constraints or populate categories/subcategories tables

        // Update all selected documents with the new category/subcategory
        await db.update(documents)
            .set({
                categoryId: categoryId,
                subcategoryId: subcategoryId || null,
                updatedAt: new Date().toISOString(),
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
