/**
 * Objectives Reorder API
 * POST /api/projects/[projectId]/objectives/reorder
 * Bulk-update objective_type and sort_order in a single transaction
 * Feature: 019-profiler (row model)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectObjectives, type ObjectiveType, VALID_OBJECTIVE_TYPES } from '@/lib/db/objectives-schema';
import { getCurrentUser } from '@/lib/auth/get-user';

interface ReorderEntry {
  id: string;
  objectiveType: ObjectiveType;
  sortOrder: number;
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

    const { updates } = body as { updates?: unknown };

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'updates must be a non-empty array' } },
        { status: 400 }
      );
    }

    // Validate each entry shape
    for (const entry of updates) {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof (entry as any).id !== 'string' ||
        !VALID_OBJECTIVE_TYPES.includes((entry as any).objectiveType) ||
        typeof (entry as any).sortOrder !== 'number'
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Each update must have id (string), objectiveType (valid type), and sortOrder (number)',
            },
          },
          { status: 400 }
        );
      }
    }

    const typedUpdates = updates as ReorderEntry[];
    const ids = typedUpdates.map((u) => u.id);

    await db.transaction(async (tx) => {
      // Validate all ids belong to this project and are not soft-deleted
      const existing = await tx
        .select({ id: projectObjectives.id })
        .from(projectObjectives)
        .where(
          and(
            eq(projectObjectives.projectId, projectId),
            inArray(projectObjectives.id, ids),
            eq(projectObjectives.isDeleted, false)
          )
        );

      const existingIds = new Set(existing.map((r) => r.id));
      const missingIds = ids.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        throw new Error(`Objectives not found or do not belong to project: ${missingIds.join(', ')}`);
      }

      // Bulk update each entry
      const now = new Date();
      await Promise.all(
        typedUpdates.map(({ id, objectiveType, sortOrder }) =>
          tx
            .update(projectObjectives)
            .set({ objectiveType, sortOrder, updatedAt: now })
            .where(
              and(
                eq(projectObjectives.id, id),
                eq(projectObjectives.projectId, projectId)
              )
            )
        )
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder objectives:', error);
    return NextResponse.json(
      { success: false, error: { code: 'REORDER_ERROR', message: 'Failed to reorder objectives' } },
      { status: 500 }
    );
  }
}
