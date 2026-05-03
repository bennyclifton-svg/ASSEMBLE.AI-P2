/**
 * View-mode toggle — flips every row's `status` for a section between
 * 'draft' (Short) and 'polished' (Long) in a single PATCH. Pure display
 * switch; no AI cost.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  projectObjectives,
  VALID_OBJECTIVE_TYPES,
  type ObjectiveType,
} from '@/lib/db/objectives-schema';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const { section, viewMode } = body as { section?: unknown; viewMode?: unknown };

    if (typeof section !== 'string' || !VALID_OBJECTIVE_TYPES.includes(section as ObjectiveType)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'invalid section' } },
        { status: 400 }
      );
    }
    if (viewMode !== 'short' && viewMode !== 'long') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'viewMode must be short or long' } },
        { status: 400 }
      );
    }

    const newStatus = viewMode === 'long' ? 'polished' : 'draft';

    await db
      .update(projectObjectives)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(
        and(
          eq(projectObjectives.projectId, projectId),
          eq(projectObjectives.objectiveType, section as ObjectiveType),
          eq(projectObjectives.isDeleted, false),
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to toggle view mode:', error);
    return NextResponse.json(
      { success: false, error: { code: 'VIEW_MODE_ERROR', message: 'Failed to toggle view mode' } },
      { status: 500 }
    );
  }
}
