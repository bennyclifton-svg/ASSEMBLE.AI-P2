/**
 * Knowledge Subcategories Bulk Delete Route
 *
 * DELETE /api/projects/[projectId]/knowledge-subcategories/bulk - Bulk delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, subcategories, documents } from '@/lib/db';
import { and, eq, inArray } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    // Null out subcategoryId on any documents referencing these subcategories
    await db
      .update(documents)
      .set({ subcategoryId: null })
      .where(inArray(documents.subcategoryId, ids));

    // Delete the subcategories
    const result = await db
      .delete(subcategories)
      .where(
        and(
          inArray(subcategories.id, ids),
          eq(subcategories.projectId, projectId)
        )
      )
      .returning();

    return NextResponse.json({ success: true, deleted: result.length });
  } catch (error) {
    console.error('[DELETE /api/.../knowledge-subcategories/bulk] Error:', error);
    return NextResponse.json({ error: 'Failed to bulk delete subcategories' }, { status: 500 });
  }
}
