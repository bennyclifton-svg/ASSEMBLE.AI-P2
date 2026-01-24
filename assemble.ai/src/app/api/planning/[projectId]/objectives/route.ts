/**
 * Project Objectives API
 * Fetch and update objectives and question answers for answer recall
 * Feature: 018-project-initiator (Streamlined Workflow)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectObjectives } from '@/lib/db/pg-schema';
import { z } from 'zod';

const objectivesSchema = z.object({
  functional: z.string().optional(),
  quality: z.string().optional(),
  budget: z.string().optional(),
  program: z.string().optional(),
  questionAnswers: z.any().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const objectives = await db
      .select()
      .from(projectObjectives)
      .where(eq(projectObjectives.projectId, projectId))
      .limit(1);

    if (objectives.length === 0) {
      return NextResponse.json(
        { error: 'Objectives not found' },
        { status: 404 }
      );
    }

    const objective = objectives[0];

    // Parse questionAnswers from JSON string
    let questionAnswers = null;
    if (objective.questionAnswers) {
      try {
        questionAnswers = JSON.parse(objective.questionAnswers);
      } catch (e) {
        console.error('Failed to parse questionAnswers:', e);
      }
    }

    return NextResponse.json({
      functional: objective.functional,
      quality: objective.quality,
      budget: objective.budget,
      program: objective.program,
      questionAnswers,
    });
  } catch (error) {
    console.error('Failed to fetch objectives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch objectives' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    // Validate input
    const validated = objectivesSchema.parse(body);

    // Check if objectives exist
    const existing = await db
      .select()
      .from(projectObjectives)
      .where(eq(projectObjectives.projectId, projectId))
      .limit(1);

    // Serialize questionAnswers if provided
    const questionAnswersJson = validated.questionAnswers
      ? JSON.stringify(validated.questionAnswers)
      : undefined;

    if (existing.length > 0) {
      // Update existing
      await db
        .update(projectObjectives)
        .set({
          functional: validated.functional,
          quality: validated.quality,
          budget: validated.budget,
          program: validated.program,
          ...(questionAnswersJson !== undefined && { questionAnswers: questionAnswersJson }),
          updatedAt: new Date(),
        })
        .where(eq(projectObjectives.projectId, projectId));
    } else {
      // Create new
      await db.insert(projectObjectives).values({
        id: crypto.randomUUID(),
        projectId,
        functional: validated.functional || null,
        quality: validated.quality || null,
        budget: validated.budget || null,
        program: validated.program || null,
        questionAnswers: questionAnswersJson || null,
      });
    }

    // Fetch updated record
    const [updated] = await db
      .select()
      .from(projectObjectives)
      .where(eq(projectObjectives.projectId, projectId));

    return NextResponse.json({
      functional: updated.functional,
      quality: updated.quality,
      budget: updated.budget,
      program: updated.program,
    });
  } catch (error) {
    console.error('Failed to update objectives:', error);
    return NextResponse.json(
      { error: 'Failed to update objectives' },
      { status: 500 }
    );
  }
}
