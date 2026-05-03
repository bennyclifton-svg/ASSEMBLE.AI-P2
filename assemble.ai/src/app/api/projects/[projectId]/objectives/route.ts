/**
 * Objectives API
 * GET/POST row-oriented objectives for a project
 * Feature: 019-profiler (row model)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc, desc, max } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  projectObjectives,
  objectiveGenerationSessions,
  type ObjectiveType,
  VALID_OBJECTIVE_TYPES,
} from '@/lib/db/objectives-schema';
import { projectProfiles, profilerObjectives, objectivesTransmittals } from '@/lib/db/pg-schema';
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

    // Pull the latest generation snapshot per section so the frontend can
    // detect manual edits before showing the destructive-regenerate confirmation.
    const sessions = await db
      .select()
      .from(objectiveGenerationSessions)
      .where(eq(objectiveGenerationSessions.projectId, projectId))
      .orderBy(desc(objectiveGenerationSessions.createdAt));

    const snapshots: Record<ObjectiveType, string[] | null> = {
      planning: null,
      functional: null,
      quality: null,
      compliance: null,
    };

    for (const session of sessions) {
      const sec = session.objectiveType as ObjectiveType;
      if (snapshots[sec] !== null) continue;
      const items =
        (session.generatedItems as { explicit?: string[]; ai_added?: string[] } | null) || {};
      snapshots[sec] = [...(items.explicit ?? []), ...(items.ai_added ?? [])];
    }

    // Surface projectType and hasAttachedDocuments so the UI can render
    // per-project-type section labels and the advisory draft-mode banner
    // without needing a separate profile fetch.
    const [profileRow] = await db
      .select({ projectType: projectProfiles.projectType })
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    const [objectivesAnchor] = await db
      .select({ id: profilerObjectives.id })
      .from(profilerObjectives)
      .where(eq(profilerObjectives.projectId, projectId))
      .limit(1);

    let hasAttachedDocuments = false;
    if (objectivesAnchor) {
      const [transmittal] = await db
        .select({ id: objectivesTransmittals.documentId })
        .from(objectivesTransmittals)
        .where(eq(objectivesTransmittals.objectivesId, objectivesAnchor.id))
        .limit(1);
      hasAttachedDocuments = Boolean(transmittal);
    }

    return NextResponse.json({
      success: true,
      data: grouped,
      snapshots,
      projectType: profileRow?.projectType ?? null,
      hasAttachedDocuments,
    });
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
