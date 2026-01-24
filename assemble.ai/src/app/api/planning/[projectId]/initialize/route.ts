/**
 * Project Initialization API
 * Orchestrates initialization with PostgreSQL transaction rollback support
 * Feature: 018-project-initiator (Manual Consultant Control)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, projectObjectives } from '@/lib/db/pg-schema';
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

    // Execute initialization in a transaction
    const result = await db.transaction(async (tx) => {
      // Step 1: Update project type
      await tx
        .update(projects)
        .set({ projectType, updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      // Step 2: Check if objectives already exist
      const existingObjectives = await tx
        .select()
        .from(projectObjectives)
        .where(eq(projectObjectives.projectId, projectId))
        .limit(1);

      if (existingObjectives.length > 0) {
        // Update existing objectives
        await tx
          .update(projectObjectives)
          .set({
            functional: objectives.functional,
            quality: objectives.quality,
            budget: objectives.budget,
            program: objectives.program,
            questionAnswers: answersJson,
            updatedAt: new Date(),
          })
          .where(eq(projectObjectives.projectId, projectId));
      } else {
        // Create new objectives
        await tx.insert(projectObjectives).values({
          id: `obj-${projectId}-${Date.now()}`,
          projectId,
          functional: objectives.functional,
          quality: objectives.quality,
          budget: objectives.budget,
          program: objectives.program,
          questionAnswers: answersJson,
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
