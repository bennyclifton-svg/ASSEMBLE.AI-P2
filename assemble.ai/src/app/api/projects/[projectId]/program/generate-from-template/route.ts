/**
 * Generate Program from Template API
 * Feature: 018-project-initiator / Phase 11
 *
 * POST /api/projects/[projectId]/program/generate-from-template
 * Generates program activities from project type template.
 * Called when user clicks "Generate from Project Type" in Program module.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, projects } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { generateProgramPhases } from '@/lib/utils/program-generation';

interface GenerateRequest {
  answers?: Record<string, string | string[]>;
  startDate?: string; // ISO date string
}

// POST /api/projects/[projectId]/program/generate-from-template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body: GenerateRequest = await request.json();

    // Load project to get project type
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectType = project[0].projectType;

    if (!projectType) {
      return NextResponse.json(
        { error: 'Project type not set. Please complete the Project Initiator first.' },
        { status: 400 }
      );
    }

    // Generate program phases
    const answers = body.answers || {};
    const startDate = body.startDate ? new Date(body.startDate) : new Date();

    let activities;
    try {
      activities = generateProgramPhases(
        projectType as any,
        answers,
        startDate
      );
    } catch (error) {
      console.error('Error generating program phases:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate program phases',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Call batch endpoint to create all activities
    const batchResponse = await fetch(
      `${request.nextUrl.origin}/api/projects/${projectId}/program/activities/batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activities }),
      }
    );

    if (!batchResponse.ok) {
      const errorData = await batchResponse.json();
      return NextResponse.json(
        {
          error: 'Failed to create program activities',
          details: errorData.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    const result = await batchResponse.json();

    return NextResponse.json(
      {
        success: true,
        projectType,
        count: result.count,
        message: `Generated ${result.count} program activities from ${projectType} template`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in generate-from-template:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate program from template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
