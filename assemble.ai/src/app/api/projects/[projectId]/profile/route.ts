/**
 * Project Profile API
 * GET/PUT profile data for project profiler (Class/Type/Subclass/Scale/Complexity)
 * Feature: 019-profiler
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectProfiles } from '@/lib/db/pg-schema';
import { z } from 'zod/v4';

// Inline schema for Zod v4 compatibility
const profileSchema = z.object({
  buildingClass: z.enum(['residential', 'commercial', 'industrial', 'institution', 'mixed', 'infrastructure']),
  projectType: z.enum(['refurb', 'extend', 'new', 'remediation', 'advisory']),
  subclass: z.array(z.string()).default([]),
  subclassOther: z.array(z.string()).nullable().optional(),
  scaleData: z.record(z.string(), z.number()).default({}),
  complexity: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
  workScope: z.array(z.string()).nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const profiles = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    if (profiles.length === 0) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    const profile = profiles[0];

    // Parse JSON fields
    const data = {
      id: profile.id,
      projectId: profile.projectId,
      buildingClass: profile.buildingClass,
      projectType: profile.projectType,
      subclass: JSON.parse(profile.subclass || '[]'),
      subclassOther: profile.subclassOther ? JSON.parse(profile.subclassOther) : null,
      scaleData: JSON.parse(profile.scaleData || '{}'),
      complexity: JSON.parse(profile.complexity || '{}'),
      workScope: profile.workScope ? JSON.parse(profile.workScope) : [],
      complexityScore: profile.complexityScore,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch profile' } },
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

    // Debug logging
    console.log('[Profile API] PUT request for project:', projectId);
    console.log('[Profile API] Request body:', JSON.stringify(body, null, 2));

    // Validate input
    const validation = profileSchema.safeParse(body);
    if (!validation.success) {
      console.log('[Profile API] Validation failed:', JSON.stringify(validation.error.errors, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid profile data',
            details: validation.error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const validated = validation.data;

    // Calculate complexity score (simplified algorithm)
    const complexityScore = calculateComplexityScore(validated.complexity);

    // Check if profile exists
    const existing = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    const profileData = {
      buildingClass: validated.buildingClass,
      projectType: validated.projectType,
      subclass: JSON.stringify(validated.subclass),
      subclassOther: validated.subclassOther ? JSON.stringify(validated.subclassOther) : null,
      scaleData: JSON.stringify(validated.scaleData),
      complexity: JSON.stringify(validated.complexity),
      workScope: validated.workScope ? JSON.stringify(validated.workScope) : null,
      complexityScore,
      updatedAt: new Date(),
    };

    let profileId: string;

    if (existing.length > 0) {
      // Update existing
      profileId = existing[0].id;
      await db
        .update(projectProfiles)
        .set(profileData)
        .where(eq(projectProfiles.projectId, projectId));
    } else {
      // Create new
      profileId = crypto.randomUUID();
      await db.insert(projectProfiles).values({
        id: profileId,
        projectId,
        ...profileData,
      });
    }

    // Fetch updated record
    const [updated] = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId));

    const data = {
      id: updated.id,
      projectId: updated.projectId,
      buildingClass: updated.buildingClass,
      projectType: updated.projectType,
      subclass: JSON.parse(updated.subclass || '[]'),
      subclassOther: updated.subclassOther ? JSON.parse(updated.subclassOther) : null,
      scaleData: JSON.parse(updated.scaleData || '{}'),
      complexity: JSON.parse(updated.complexity || '{}'),
      workScope: updated.workScope ? JSON.parse(updated.workScope) : [],
      complexityScore: updated.complexityScore,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    // Pattern Learning temporarily disabled for debugging
    // TODO: Re-enable once db.query.profilePatterns is working
    // if (validated.buildingClass && validated.projectType) {
    //   if (validated.subclassOther) {
    //     const otherValues = Object.values(validated.subclassOther).filter(Boolean);
    //     for (const otherValue of otherValues) {
    //       recordOtherSubclass(validated.buildingClass, validated.projectType, otherValue as string)
    //         .catch(err => console.error('[pattern-learning] subclass error:', err));
    //     }
    //   }
    //   if (validated.complexity) {
    //     for (const [dimension, value] of Object.entries(validated.complexity)) {
    //       if (value === 'other' && validated.complexity[`${dimension}_other`]) {
    //         recordOtherComplexity(validated.buildingClass, validated.projectType, dimension, validated.complexity[`${dimension}_other`])
    //           .catch(err => console.error('[pattern-learning] complexity error:', err));
    //       }
    //     }
    //   }
    // }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to update profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', errorMessage, errorStack);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_ERROR', message: `Failed to update profile: ${errorMessage}` } },
      { status: 500 }
    );
  }
}

/**
 * Calculate a simplified complexity score (1-10) based on complexity selections
 */
function calculateComplexityScore(complexity: Record<string, string | string[]>): number {
  const complexityWeights: Record<string, Record<string, number>> = {
    quality_tier: { project_home: 1, standard: 2, premium: 3, luxury: 4, ultra_premium: 5 },
    grade: { b_grade: 1, a_grade: 2, premium: 3, trophy: 4 },
    specification: { basic_shell: 1, enhanced: 2, high_spec: 3, turn_key: 4 },
    height_class: { standard: 1, high_bay: 2, super_high: 3, multi_level: 4 },
    uptime_tier: { tier_1: 1, tier_2: 2, tier_3: 3, tier_4: 4 },
    care_level: { low_care: 1, mixed: 2, high_care: 3, specialist_dementia: 4 },
    service_level: { primary: 1, secondary: 2, tertiary: 3, quaternary: 4 },
    integration_level: { separate: 1, shared_podium: 2, fully_integrated: 3 },
    significance: { local: 1, regional: 2, state_significant: 3, critical: 4 },
    heritage: { none: 0, overlay: 1, conservation: 2, listed: 3 },
    approval_pathway: { cdc_exempt: 1, low_rise_code: 2, standard_da: 3, complex_da: 4, state_significant: 5 },
    // Site conditions: each condition adds complexity
    site_conditions: { greenfield: 0, infill: 1, sloping: 2, bushfire: 3, flood: 3, coastal: 2 },
  };

  let totalWeight = 0;
  let totalScore = 0;

  for (const [dimension, value] of Object.entries(complexity)) {
    const weights = complexityWeights[dimension];
    if (!weights) continue;

    // Handle array values (site_conditions) - sum all selected conditions
    if (Array.isArray(value)) {
      for (const v of value) {
        if (weights[v] !== undefined) {
          totalScore += weights[v];
          totalWeight += 3; // Weight per condition
        }
      }
    } else if (weights[value] !== undefined) {
      totalScore += weights[value];
      totalWeight += Object.keys(weights).length > 3 ? 4 : 3;
    }
  }

  if (totalWeight === 0) return 1;

  // Normalize to 1-10 scale
  const normalized = Math.round((totalScore / totalWeight) * 10);
  return Math.max(1, Math.min(10, normalized));
}
