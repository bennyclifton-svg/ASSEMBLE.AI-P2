/**
 * Project Objectives API (legacy)
 *
 * The legacy four-blob objectives (functional/quality/budget/program) have
 * been replaced by the row-model ObjectivesWorkspace and its CRUD API at
 * /api/projects/[projectId]/objectives. This route is preserved only for
 * the question-answers payload that the project initiator wizard and the
 * cost-plan generator rely on. Blob fields are returned/ignored as empty.
 *
 * Feature: 018-project-initiator (Streamlined Workflow)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectQuestionAnswers } from '@/lib/db/pg-schema';
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

    const [qa] = await db
      .select({ answers: projectQuestionAnswers.answers })
      .from(projectQuestionAnswers)
      .where(eq(projectQuestionAnswers.projectId, projectId))
      .limit(1);

    let questionAnswers: unknown = null;
    if (qa?.answers) {
      try {
        questionAnswers = JSON.parse(qa.answers);
      } catch (e) {
        console.error('Failed to parse questionAnswers:', e);
      }
    }

    return NextResponse.json({
      functional: null,
      quality: null,
      budget: null,
      program: null,
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

    // The blob fields are accepted to preserve the legacy contract, but only
    // questionAnswers is persisted. Objective text is now owned by the
    // row-model ObjectivesWorkspace.
    const validated = objectivesSchema.parse(body);

    if (validated.questionAnswers !== undefined) {
      const answersJson = JSON.stringify(validated.questionAnswers);
      await db
        .insert(projectQuestionAnswers)
        .values({ projectId, answers: answersJson, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: projectQuestionAnswers.projectId,
          set: { answers: answersJson, updatedAt: sql`now()` },
        });
    }

    return NextResponse.json({
      functional: null,
      quality: null,
      budget: null,
      program: null,
    });
  } catch (error) {
    console.error('Failed to update objectives:', error);
    return NextResponse.json(
      { error: 'Failed to update objectives' },
      { status: 500 }
    );
  }
}
