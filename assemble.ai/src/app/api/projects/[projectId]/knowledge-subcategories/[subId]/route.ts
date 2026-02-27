/**
 * Knowledge Subcategory Individual Route
 *
 * PATCH /api/projects/[projectId]/knowledge-subcategories/[subId] - Update name
 * DELETE /api/projects/[projectId]/knowledge-subcategories/[subId] - Delete one
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, subcategories, documents } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ projectId: string; subId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, subId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const result = await db
      .update(subcategories)
      .set({ name: name.trim() })
      .where(
        and(
          eq(subcategories.id, subId),
          eq(subcategories.projectId, projectId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('[PATCH /api/.../knowledge-subcategories/[subId]] Error:', error);
    return NextResponse.json({ error: 'Failed to update subcategory' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, subId } = await params;

    // Null out subcategoryId on any documents referencing this subcategory
    await db
      .update(documents)
      .set({ subcategoryId: null })
      .where(eq(documents.subcategoryId, subId));

    const result = await db
      .delete(subcategories)
      .where(
        and(
          eq(subcategories.id, subId),
          eq(subcategories.projectId, projectId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/.../knowledge-subcategories/[subId]] Error:', error);
    return NextResponse.json({ error: 'Failed to delete subcategory' }, { status: 500 });
  }
}
