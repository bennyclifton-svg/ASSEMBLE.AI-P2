/**
 * Generate Cost Plan from Template API
 * Feature: 018-project-initiator Phase 12
 * Generates cost plan line items based on project type and question answers
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, projectObjectives, costLines, consultantDisciplines } from '@/lib/db/pg-schema';
import { generateCostPlan } from '@/lib/utils/cost-plan-generation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Fetch project type
    const [project] = await db
      .select({ projectType: projects.projectType })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || !project.projectType) {
      return NextResponse.json(
        { error: 'Project type not set. Please complete the project initiator first.' },
        { status: 400 }
      );
    }

    // Fetch question answers
    const [objectives] = await db
      .select({ questionAnswers: projectObjectives.questionAnswers })
      .from(projectObjectives)
      .where(eq(projectObjectives.projectId, projectId))
      .limit(1);

    if (!objectives || !objectives.questionAnswers) {
      return NextResponse.json(
        { error: 'Question answers not found. Please complete the project initiator first.' },
        { status: 400 }
      );
    }

    // Parse question answers
    let answers: Record<string, string | string[]> = {};
    try {
      answers = JSON.parse(objectives.questionAnswers);
    } catch (e) {
      console.error('Failed to parse question answers:', e);
      return NextResponse.json(
        { error: 'Invalid question answers format' },
        { status: 500 }
      );
    }

    // Fetch enabled consultant disciplines for auto-mapping
    const enabledDisciplines = await db
      .select({
        id: consultantDisciplines.id,
        disciplineName: consultantDisciplines.disciplineName,
      })
      .from(consultantDisciplines)
      .where(
        and(
          eq(consultantDisciplines.projectId, projectId),
          eq(consultantDisciplines.isEnabled, true)
        )
      );

    // Build a map of discipline names to IDs for auto-mapping
    const disciplinesMap = new Map(
      enabledDisciplines.map(d => [d.disciplineName.toLowerCase().trim(), d.id])
    );

    // Log for debugging
    console.log('Generating cost plan for:', {
      projectType: project.projectType,
      answers: answers,
      enabledDisciplines: enabledDisciplines.length,
    });

    // Generate cost plan lines
    const generatedLines = generateCostPlan({
      projectType: project.projectType,
      answers,
    });

    console.log('Generated lines:', generatedLines.length);

    if (generatedLines.length === 0) {
      return NextResponse.json(
        {
          error: `No cost plan lines generated. Project type: "${project.projectType}". Please ensure the project type questionnaire was completed with GFA/building scale information.`,
          debug: {
            projectType: project.projectType,
            answersKeys: Object.keys(answers),
            answersValues: answers,
          }
        },
        { status: 400 }
      );
    }

    // Execute in a transaction
    const result = await db.transaction(async (tx) => {
      // Get the current max sort order (only non-deleted lines)
      const existingLines = await tx
        .select({ sortOrder: costLines.sortOrder })
        .from(costLines)
        .where(
          and(
            eq(costLines.projectId, projectId),
            isNull(costLines.deletedAt)
          )
        );

      let maxSortOrder = 0;
      if (existingLines.length > 0) {
        maxSortOrder = Math.max(...existingLines.map(l => l.sortOrder));
      }

      // Prepare batch insert values with truly unique IDs using crypto.randomUUID()
      const insertValues = generatedLines.map((line, index) => {
        // Use crypto.randomUUID() for guaranteed unique IDs
        const uniqueId = crypto.randomUUID();

        // Auto-map consultants section items to disciplines
        let disciplineId: string | null = null;
        if (line.section === 'CONSULTANTS') {
          // Extract discipline name from description: "Architect - Initiation" → "architect"
          const match = line.description.match(/^(.+?)\s*-\s*/);
          if (match) {
            const disciplineName = match[1].toLowerCase().trim();
            disciplineId = disciplinesMap.get(disciplineName) || null;
          }
        }

        return {
          id: `cl-${projectId}-${uniqueId}`,
          projectId,
          section: line.section,
          activity: line.description,
          costCode: line.categoryId || null,
          reference: null,
          budgetCents: Math.round(line.budgetedCost * 100), // Convert to cents
          approvedContractCents: 0,
          masterStage: line.masterStage || null,  // NEW: Link to master stage
          sortOrder: maxSortOrder + index + 1,
          disciplineId: disciplineId,  // NEW: Auto-mapped from description
          tradeId: null,
        };
      });

      // Bulk insert
      const inserted = await tx.insert(costLines).values(insertValues).returning();

      return {
        linesCreated: inserted.length,
        projectType: project.projectType,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Cost plan generation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cost plan generation failed',
      },
      { status: 500 }
    );
  }
}
