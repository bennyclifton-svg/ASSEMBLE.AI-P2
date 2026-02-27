/**
 * Knowledge Subcategories API Route
 *
 * GET /api/projects/[projectId]/knowledge-subcategories - List all, grouped by category
 * POST /api/projects/[projectId]/knowledge-subcategories - Create one
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, subcategories, categories } from '@/lib/db';
import { eq, and, asc, max, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { seedKnowledgeDefaults, KNOWLEDGE_CATEGORY_IDS } from '@/lib/services/knowledge-subcategory-defaults';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Seed defaults on first access
    await seedKnowledgeDefaults(projectId);

    // Fetch subcategories for this project
    const rows = await db
      .select()
      .from(subcategories)
      .where(
        and(
          eq(subcategories.projectId, projectId),
          inArray(subcategories.categoryId, [...KNOWLEDGE_CATEGORY_IDS])
        )
      )
      .orderBy(asc(subcategories.sortOrder));

    // Group by categoryId
    const grouped: Record<string, typeof rows> = {
      planning: [],
      procurement: [],
      delivery: [],
      authorities: [],
      'scheme-design': [],
      'detail-design': [],
      'ifc-design': [],
    };

    for (const row of rows) {
      if (grouped[row.categoryId]) {
        grouped[row.categoryId].push(row);
      }
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('[GET /api/projects/[projectId]/knowledge-subcategories] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge subcategories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { categoryId, name } = body;

    if (!projectId || !categoryId || !name) {
      return NextResponse.json(
        { error: 'projectId, categoryId, and name are required' },
        { status: 400 }
      );
    }

    if (!KNOWLEDGE_CATEGORY_IDS.includes(categoryId)) {
      return NextResponse.json(
        { error: `Invalid categoryId. Must be one of: ${KNOWLEDGE_CATEGORY_IDS.join(', ')}` },
        { status: 400 }
      );
    }

    // Ensure defaults exist (also ensures category rows exist)
    await seedKnowledgeDefaults(projectId);

    // Get max sortOrder for this category+project
    const maxResult = await db
      .select({ maxSort: max(subcategories.sortOrder) })
      .from(subcategories)
      .where(
        and(
          eq(subcategories.projectId, projectId),
          eq(subcategories.categoryId, categoryId)
        )
      );

    const nextSort = (maxResult[0]?.maxSort ?? -1) + 1;

    const newRow = {
      id: nanoid(),
      categoryId,
      projectId,
      name: name.trim(),
      isSystem: false,
      sortOrder: nextSort,
    };

    await db.insert(subcategories).values(newRow);

    return NextResponse.json(newRow, { status: 201 });
  } catch (error) {
    console.error('[POST /api/projects/[projectId]/knowledge-subcategories] Error:', error);
    return NextResponse.json({ error: 'Failed to create subcategory' }, { status: 500 });
  }
}
