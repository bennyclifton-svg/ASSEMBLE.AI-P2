/**
 * Objectives Item API
 * PATCH/DELETE a single objective row
 * Feature: 019-profiler (row model)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  projectObjectives,
  type ObjectiveType,
  type ObjectiveStatus,
  VALID_OBJECTIVE_TYPES,
  VALID_OBJECTIVE_STATUSES,
} from '@/lib/db/objectives-schema';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { projectId, id } = await params;
    const body = await request.json();

    const { text, objectiveType, sortOrder, status, textPolished } = body as {
      text?: unknown;
      objectiveType?: unknown;
      sortOrder?: unknown;
      status?: unknown;
      textPolished?: unknown;
    };

    // Validate ownership — row must belong to this project and not be deleted
    const [existing] = await db
      .select({ id: projectObjectives.id })
      .from(projectObjectives)
      .where(
        and(
          eq(projectObjectives.id, id),
          eq(projectObjectives.projectId, projectId),
          eq(projectObjectives.isDeleted, false)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Objective not found' } },
        { status: 404 }
      );
    }

    // Build partial update — only include fields present in body
    const updates: Partial<typeof projectObjectives.$inferInsert> & { updatedAt: Date } = { updatedAt: new Date() };

    if (text !== undefined) {
      if (typeof text !== 'string' || text.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'text must be a non-empty string' } },
          { status: 400 }
        );
      }
      updates.text = text.trim();
    }

    if (objectiveType !== undefined) {
      if (!VALID_OBJECTIVE_TYPES.includes(objectiveType as ObjectiveType)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `objectiveType must be one of: ${VALID_OBJECTIVE_TYPES.join(', ')}`,
            },
          },
          { status: 400 }
        );
      }
      updates.objectiveType = objectiveType as ObjectiveType;
    }

    if (sortOrder !== undefined) {
      if (typeof sortOrder !== 'number') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'sortOrder must be a number' } },
          { status: 400 }
        );
      }
      updates.sortOrder = sortOrder;
    }

    if (status !== undefined) {
      if (!VALID_OBJECTIVE_STATUSES.includes(status as ObjectiveStatus)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `status must be one of: ${VALID_OBJECTIVE_STATUSES.join(', ')}`,
            },
          },
          { status: 400 }
        );
      }
      updates.status = status as ObjectiveStatus;
    }

    if (textPolished !== undefined) {
      if (typeof textPolished !== 'string') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'textPolished must be a string' } },
          { status: 400 }
        );
      }
      updates.textPolished = textPolished;
    }

    const [updatedRow] = await db
      .update(projectObjectives)
      .set(updates)
      .where(
        and(
          eq(projectObjectives.id, id),
          eq(projectObjectives.projectId, projectId),
          eq(projectObjectives.isDeleted, false)
        )
      )
      .returning();

    return NextResponse.json({ success: true, data: updatedRow });
  } catch (error) {
    console.error('Failed to update objective:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update objective' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { projectId, id } = await params;

    // Validate ownership
    const [existing] = await db
      .select({ id: projectObjectives.id })
      .from(projectObjectives)
      .where(
        and(
          eq(projectObjectives.id, id),
          eq(projectObjectives.projectId, projectId),
          eq(projectObjectives.isDeleted, false)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Objective not found' } },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(projectObjectives)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(projectObjectives.id, id),
          eq(projectObjectives.projectId, projectId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete objective:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete objective' } },
      { status: 500 }
    );
  }
}
