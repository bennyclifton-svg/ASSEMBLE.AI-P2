import { NextRequest, NextResponse } from 'next/server';
import { db, projectStakeholders, subcategories } from '@/lib/db';
import { eq, and, asc, isNull, max } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DESIGN_CATEGORY_IDS = ['scheme-design', 'detail-design', 'ifc-design'];

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { categoryId } = body;

    if (!projectId || !categoryId) {
      return NextResponse.json({ error: 'projectId and categoryId are required' }, { status: 400 });
    }

    if (!DESIGN_CATEGORY_IDS.includes(categoryId)) {
      return NextResponse.json(
        { error: `categoryId must be one of: ${DESIGN_CATEGORY_IDS.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch enabled consultant stakeholders
    const consultants = await db
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

    // Extract unique disciplines
    const uniqueDisciplines = new Map<string, string>();
    for (const c of consultants) {
      const discipline = c.disciplineOrTrade?.trim();
      if (discipline) {
        const key = discipline.toLowerCase();
        if (!uniqueDisciplines.has(key)) {
          uniqueDisciplines.set(key, discipline);
        }
      }
    }

    if (uniqueDisciplines.size === 0) {
      return NextResponse.json(
        { error: 'No consultant disciplines found. Generate stakeholders first.' },
        { status: 400 }
      );
    }

    // Get current max sortOrder
    const maxResult = await db
      .select({ maxSort: max(subcategories.sortOrder) })
      .from(subcategories)
      .where(
        and(
          eq(subcategories.projectId, projectId),
          eq(subcategories.categoryId, categoryId)
        )
      );

    let nextSort = (maxResult[0]?.maxSort ?? -1) + 1;

    // Get existing names to avoid duplicates
    const existingRows = await db
      .select({ name: subcategories.name })
      .from(subcategories)
      .where(
        and(
          eq(subcategories.projectId, projectId),
          eq(subcategories.categoryId, categoryId)
        )
      );

    const existingNames = new Set(existingRows.map(r => r.name.toLowerCase()));

    // Create subcategories for new disciplines only
    const newRows: { id: string; categoryId: string; projectId: string; name: string; isSystem: boolean; sortOrder: number }[] = [];

    for (const discipline of uniqueDisciplines.values()) {
      if (!existingNames.has(discipline.toLowerCase())) {
        newRows.push({
          id: nanoid(),
          categoryId,
          projectId,
          name: discipline,
          isSystem: false,
          sortOrder: nextSort++,
        });
      }
    }

    if (newRows.length > 0) {
      await db.insert(subcategories).values(newRows);
    }

    return NextResponse.json({
      added: newRows.length,
      skipped: uniqueDisciplines.size - newRows.length,
      subcategories: newRows,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST adopt-consultants] Error:', error);
    return NextResponse.json({ error: 'Failed to adopt consultant list' }, { status: 500 });
  }
}
