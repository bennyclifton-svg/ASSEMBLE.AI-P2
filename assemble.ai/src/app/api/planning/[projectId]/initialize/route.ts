/**
 * Project Initialization API
 * Orchestrates initialization with PostgreSQL transaction rollback support
 * Feature: 018-project-initiator (Manual Consultant Control)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, projectQuestionAnswers } from '@/lib/db/pg-schema';
import type { InitializationRequest } from '@/lib/types/project-initiator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body: InitializationRequest = await request.json();

    const { projectType, objectives, answers } = body;

    // Validate request
    if (!projectType || !objectives) {
      return NextResponse.json(
        { error: 'Missing required fields: projectType and objectives' },
        { status: 400 }
      );
    }

    // Serialize answers for storage
    const answersJson = answers ? JSON.stringify(answers) : null;

    // Execute initialization in a transaction. The legacy `objectives` blobs
    // (functional/quality/budget/program) are no longer persisted — the
    // row-model ObjectivesWorkspace owns objective creation now. Only the
    // questionnaire answers, used by the cost-plan generator, are saved here.
    const result = await db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({ projectType, updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      if (answersJson !== null) {
        await tx
          .insert(projectQuestionAnswers)
          .values({ projectId, answers: answersJson, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: projectQuestionAnswers.projectId,
            set: { answers: answersJson, updatedAt: sql`now()` },
          });
      }

      return {
        objectivesCreated: true,
        disciplinesEnabled: 0, // Manual control via bulk operations endpoint
        programActivitiesCreated: 0, // Will be implemented in program generation (Phase 11)
        costLinesCreated: 0, // Will be implemented in cost plan generation (Phase 12)
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Initialization failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
      },
      { status: 500 }
    );
  }
}
