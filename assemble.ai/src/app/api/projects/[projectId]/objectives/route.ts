/**
 * Objectives API
 * GET/POST row-oriented objectives for a project
 * Feature: 019-profiler (row model)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc, max } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectObjectives, type ObjectiveType, VALID_OBJECTIVE_TYPES } from '@/lib/db/objectives-schema';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { projectId } = await params;

    const rows = await db
      .select()
      .from(projectObjectives)
      .where(
        and(
          eq(projectObjectives.projectId, projectId),
          eq(projectObjectives.isDeleted, false)
        )
      )
      .orderBy(asc(projectObjectives.objectiveType), asc(projectObjectives.sortOrder));

    const grouped: Record<ObjectiveType, typeof rows> = {
      planning: [],
      functional: [],
      quality: [],
      compliance: [],
    };

    for (const row of rows) {
      const t = row.objectiveType as ObjectiveType;
      if (grouped[t]) {
        grouped[t].push(row);
      }
    }

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Failed to fetch objectives:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch objectives' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { projectId } = await params;
    const body = await request.json();

    const { type, text, sortOrder } = body as {
      type?: unknown;
      text?: unknown;
      sortOrder?: unknown;
    };

    // Validate type
    if (!type || !VALID_OBJECTIVE_TYPES.includes(type as ObjectiveType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `type must be one of: ${VALID_OBJECTIVE_TYPES.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'text is required' } },
        { status: 400 }
      );
    }

    // Resolve sortOrder
    let resolvedSortOrder: number;
    if (typeof sortOrder === 'number') {
      resolvedSortOrder = sortOrder;
    } else {
      // Compute MAX(sort_order) + 1 for this project+type, or 0 if no rows
      const [result] = await db
        .select({ maxOrder: max(projectObjectives.sortOrder) })
        .from(projectObjectives)
        .where(
          and(
            eq(projectObjectives.projectId, projectId),
            eq(projectObjectives.objectiveType, type as ObjectiveType),
            eq(projectObjectives.isDeleted, false)
          )
        );
      resolvedSortOrder = result?.maxOrder != null ? result.maxOrder + 1 : 0;
    }

    const [newRow] = await db
      .insert(projectObjectives)
      .values({
        projectId,
        objectiveType: type as ObjectiveType,
        text: text.trim(),
        source: 'user_added',
        status: 'draft',
        sortOrder: resolvedSortOrder,
      })
      .returning();

    return NextResponse.json({ success: true, data: newRow }, { status: 201 });
  } catch (error) {
    console.error('Failed to create objective:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create objective' } },
      { status: 500 }
    );
  }
}
