/**
 * Profiler Objectives API
 * GET/PUT objectives data for project profiler (Functional Quality + Planning Compliance)
 * Feature: 019-profiler
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { profilerObjectives, projectProfiles } from '@/lib/db/pg-schema';
import { objectivesInputSchema } from '@/lib/validation/profile';
import { analyzeManualObjectives } from '@/lib/services/pattern-learning';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const objectives = await db
      .select()
      .from(profilerObjectives)
      .where(eq(profilerObjectives.projectId, projectId))
      .limit(1);

    if (objectives.length === 0) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    const objective = objectives[0];

    // Parse JSON fields
    const data = {
      id: objective.id,
      projectId: objective.projectId,
      functionalQuality: objective.functionalQuality ? JSON.parse(objective.functionalQuality) : null,
      planningCompliance: objective.planningCompliance ? JSON.parse(objective.planningCompliance) : null,
      profileContext: objective.profileContext ? JSON.parse(objective.profileContext) : null,
      generatedAt: objective.generatedAt,
      polishedAt: objective.polishedAt,
      createdAt: objective.createdAt,
      updatedAt: objective.updatedAt,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch objectives:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch objectives' } },
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

    // Validate input (loose validation for manual edits)
    const { functionalQuality, planningCompliance } = body;

    // Check if objectives exist
    const existing = await db
      .select()
      .from(profilerObjectives)
      .where(eq(profilerObjectives.projectId, projectId))
      .limit(1);

    const objectivesData = {
      functionalQuality: functionalQuality ? JSON.stringify(functionalQuality) : JSON.stringify({ content: '', source: 'manual', originalAi: null, editHistory: null }),
      planningCompliance: planningCompliance ? JSON.stringify(planningCompliance) : JSON.stringify({ content: '', source: 'manual', originalAi: null, editHistory: null }),
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      // Update existing
      await db
        .update(profilerObjectives)
        .set(objectivesData)
        .where(eq(profilerObjectives.projectId, projectId));
    } else {
      // Create new
      await db.insert(profilerObjectives).values({
        id: crypto.randomUUID(),
        projectId,
        ...objectivesData,
      });
    }

    // Fetch updated record
    const [updated] = await db
      .select()
      .from(profilerObjectives)
      .where(eq(profilerObjectives.projectId, projectId));

    const data = {
      id: updated.id,
      projectId: updated.projectId,
      functionalQuality: updated.functionalQuality ? JSON.parse(updated.functionalQuality) : null,
      planningCompliance: updated.planningCompliance ? JSON.parse(updated.planningCompliance) : null,
      profileContext: updated.profileContext ? JSON.parse(updated.profileContext) : null,
      generatedAt: updated.generatedAt,
      polishedAt: updated.polishedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    // Pattern Learning (T057): Analyze manual objectives for common themes
    // Fetch profile for context - non-blocking
    db.select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1)
      .then(profiles => {
        if (profiles.length > 0) {
          const profile = profiles[0];
          const buildingClass = profile.buildingClass || '';
          const projectType = profile.projectType || '';

          // Analyze functional quality content
          if (functionalQuality?.content && typeof functionalQuality.content === 'string') {
            analyzeManualObjectives(buildingClass, projectType, functionalQuality.content)
              .catch(err => console.error('[pattern-learning] objectives error:', err));
          }

          // Analyze planning compliance content
          if (planningCompliance?.content && typeof planningCompliance.content === 'string') {
            analyzeManualObjectives(buildingClass, projectType, planningCompliance.content)
              .catch(err => console.error('[pattern-learning] objectives error:', err));
          }
        }
      })
      .catch(err => console.error('[pattern-learning] profile fetch error:', err));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to update objectives:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update objectives' } },
      { status: 500 }
    );
  }
}
