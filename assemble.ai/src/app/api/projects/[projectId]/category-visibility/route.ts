import { NextRequest, NextResponse } from 'next/server';
import { db, categoryVisibility } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET — returns visibility map for this project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(categoryVisibility)
      .where(eq(categoryVisibility.projectId, projectId));

    const visibilityMap: Record<string, boolean> = {};
    for (const row of rows) {
      visibilityMap[row.categoryId] = row.isVisible;
    }

    return NextResponse.json(visibilityMap);
  } catch (error) {
    console.error('[GET category-visibility] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch visibility' }, { status: 500 });
  }
}

// PATCH — toggle visibility for a specific category
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { categoryId, isVisible } = body;

    if (!projectId || !categoryId || typeof isVisible !== 'boolean') {
      return NextResponse.json(
        { error: 'projectId, categoryId, and isVisible (boolean) are required' },
        { status: 400 }
      );
    }

    // Upsert
    const existing = await db
      .select()
      .from(categoryVisibility)
      .where(
        and(
          eq(categoryVisibility.projectId, projectId),
          eq(categoryVisibility.categoryId, categoryId)
        )
      );

    if (existing.length > 0) {
      await db
        .update(categoryVisibility)
        .set({ isVisible })
        .where(
          and(
            eq(categoryVisibility.projectId, projectId),
            eq(categoryVisibility.categoryId, categoryId)
          )
        );
    } else {
      await db.insert(categoryVisibility).values({ projectId, categoryId, isVisible });
    }

    return NextResponse.json({ categoryId, isVisible });
  } catch (error) {
    console.error('[PATCH category-visibility] Error:', error);
    return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 });
  }
}
