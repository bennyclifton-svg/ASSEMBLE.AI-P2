/**
 * Objectives Generate API
 * Generate AI objectives based on project profile
 * Feature: 019-profiler
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectProfiles, profilerObjectives } from '@/lib/db/pg-schema';
import Anthropic from '@anthropic-ai/sdk';
import objectiveTemplates from '@/lib/data/objective-templates.json';
import profileTemplates from '@/lib/data/profile-templates.json';

const anthropic = new Anthropic();

type ObjectiveSection = 'functionalQuality' | 'planningCompliance';

/**
 * Resolve work scope value IDs to human-readable labels
 * e.g., "hydrant_system" -> "Hydrant System Upgrade"
 */
function resolveWorkScopeLabels(values: string[], projectType: string): string[] {
  if (!values || values.length === 0) return [];

  const workScopeOptions = (profileTemplates as any).workScopeOptions?.[projectType];
  if (!workScopeOptions) return values;

  const labels: string[] = [];
  for (const categoryKey of Object.keys(workScopeOptions)) {
    // Skip metadata keys
    if (categoryKey === 'description' || categoryKey === 'applicableProjectTypes') continue;
    const category = workScopeOptions[categoryKey];
    if (category?.items) {
      for (const item of category.items) {
        if (values.includes(item.value)) {
          labels.push(item.label);
        }
      }
    }
  }
  return labels.length > 0 ? labels : values;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const section = body.section as ObjectiveSection | undefined;

    // Fetch profile
    const [profile] = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Project profile not found. Please complete the profile first.' } },
        { status: 404 }
      );
    }

    // Parse profile data
    const buildingClass = profile.buildingClass;
    const projectType = profile.projectType;
    const subclass = JSON.parse(profile.subclass || '[]');
    const scaleData = JSON.parse(profile.scaleData || '{}');
    const complexity = JSON.parse(profile.complexity || '{}');
    const workScope = JSON.parse(profile.workScope || '[]');

    // Resolve work scope IDs to human-readable labels
    const workScopeLabels = resolveWorkScopeLabels(workScope, projectType);
    const hasSpecificScope = workScopeLabels.length > 0;

    // Get templates
    const profilerTemplates = (objectiveTemplates as any).profiler;
    const functionalTemplate = profilerTemplates?.functionalQuality?.[buildingClass]?.[projectType]
      || profilerTemplates?.functionalQuality?.[buildingClass]?.new
      || 'Deliver a high-quality {{subclass}} project meeting all functional and quality requirements.';
    const planningTemplate = profilerTemplates?.planningCompliance?.[buildingClass]?.[projectType]
      || profilerTemplates?.planningCompliance?.[buildingClass]?.new
      || 'Obtain all necessary approvals and ensure compliance with relevant planning controls and building codes.';

    // Substitute template variables
    const substituteVars = (template: string): string => {
      let result = template;
      // Replace subclass
      result = result.replace(/\{\{subclass\}\}/g, subclass[0] || buildingClass);
      // Replace scale values
      for (const [key, value] of Object.entries(scaleData)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }
      // Replace complexity values
      for (const [key, value] of Object.entries(complexity)) {
        result = result.replace(new RegExp(`\\{\\{complexity\\.${key}\\}\\}`, 'g'), String(value));
      }
      // Clean up any remaining placeholders
      result = result.replace(/\{\{[^}]+\}\}/g, '');
      return result.trim();
    };

    const baseFunctional = substituteVars(functionalTemplate);
    const basePlanning = substituteVars(planningTemplate);

    // Build prompt based on section (or both if not specified)
    const generateBoth = !section;
    const generateFunctional = generateBoth || section === 'functionalQuality';
    const generatePlanning = generateBoth || section === 'planningCompliance';

    const sectionPrompt = generateBoth
      ? `Functional & Quality:\n${baseFunctional}\n\nPlanning & Compliance:\n${basePlanning}`
      : section === 'functionalQuality'
      ? `Functional & Quality:\n${baseFunctional}`
      : `Planning & Compliance:\n${basePlanning}`;

    const responseFormat = generateBoth
      ? `{
  "functionalQuality": "expanded functional and quality objectives text",
  "planningCompliance": "expanded planning and compliance objectives text"
}`
      : section === 'functionalQuality'
      ? `{
  "functionalQuality": "expanded functional and quality objectives text"
}`
      : `{
  "planningCompliance": "expanded planning and compliance objectives text"
}`;

    // Build work scope constraint for the AI prompt
    const workScopeConstraint = hasSpecificScope
      ? `
CRITICAL SCOPE CONSTRAINT:
The client has specifically selected the following work scope items: ${workScopeLabels.join(', ')}.
Your objectives MUST focus EXCLUSIVELY on these selected items. Do NOT include objectives for:
- General refurbishment/project items not in the selected scope
- Building systems or elements not explicitly selected
- Speculative or "nice to have" improvements outside the scope

If only one work scope item is selected, ALL objectives should relate directly to that specific scope.
`
      : `
NOTE: No specific work scope items have been selected. Generate comprehensive objectives appropriate for a general ${projectType} project.
`;

    // Use AI to expand and improve the objectives
    const prompt = `You are an expert construction project manager in Australia. Based on the following project profile, generate comprehensive project objectives.

PROJECT PROFILE:
- Building Class: ${buildingClass}
- Project Type: ${projectType}
- Subclass: ${subclass.join(', ')}
- Scale Data: ${JSON.stringify(scaleData)}
- Complexity Factors: ${JSON.stringify(complexity)}
${hasSpecificScope ? `- Selected Work Scope Items: ${workScopeLabels.join(', ')}` : '- Selected Work Scope Items: None (general project)'}
${workScopeConstraint}
BASE OBJECTIVES (expand and improve these):

${sectionPrompt}

INSTRUCTIONS:
1. Structure each section with clear headings and concise bullet points
2. Use short, direct sentences - avoid lengthy prose
3. Include relevant Australian standards and regulations (NCC/BCA, relevant State planning) as specific bullet items
4. Reference specific metrics from the scale data where relevant
5. Address complexity factors as separate bullet points
6. Keep objectives measurable and achievable
7. Format example:
   **Design Requirements**
   - Deliver compliant design documentation to NCC 2022 BCA standards
   - Achieve [quality tier] specification level

   **Key Deliverables**
   - Functional layouts optimised for [use type]
   - Efficient construction methodology

Respond in JSON format:
${responseFormat}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON from response
    let generated: { functionalQuality?: string; planningCompliance?: string };
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = textContent.text;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      generated = JSON.parse(jsonText.trim());
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback to base templates
      generated = {};
      if (generateFunctional) generated.functionalQuality = baseFunctional;
      if (generatePlanning) generated.planningCompliance = basePlanning;
    }

    // Create profile context snapshot
    const profileContext = {
      buildingClass,
      projectType,
      subclass,
      scale: scaleData,
      complexity,
      workScope: workScopeLabels,
    };

    // Check if objectives exist
    const existing = await db
      .select()
      .from(profilerObjectives)
      .where(eq(profilerObjectives.projectId, projectId))
      .limit(1);

    // Build update data based on what was generated
    const objectivesData: Record<string, any> = {
      profileContext: JSON.stringify(profileContext),
      updatedAt: new Date(),
    };

    if (generated.functionalQuality) {
      objectivesData.functionalQuality = JSON.stringify({
        content: generated.functionalQuality,
        source: 'ai_generated',
        originalAi: generated.functionalQuality,
        editHistory: null,
      });
      objectivesData.generatedAt = new Date();
    }

    if (generated.planningCompliance) {
      objectivesData.planningCompliance = JSON.stringify({
        content: generated.planningCompliance,
        source: 'ai_generated',
        originalAi: generated.planningCompliance,
        editHistory: null,
      });
      objectivesData.generatedAt = new Date();
    }

    if (existing.length > 0) {
      await db
        .update(profilerObjectives)
        .set(objectivesData)
        .where(eq(profilerObjectives.projectId, projectId));
    } else {
      // For new records, both fields are required (NOT NULL)
      // Provide empty defaults for any missing fields
      const emptyObjective = JSON.stringify({
        content: '',
        source: 'pending',
        originalAi: null,
        editHistory: null,
      });

      await db.insert(profilerObjectives).values({
        id: crypto.randomUUID(),
        projectId,
        functionalQuality: objectivesData.functionalQuality || emptyObjective,
        planningCompliance: objectivesData.planningCompliance || emptyObjective,
        profileContext: objectivesData.profileContext,
        generatedAt: objectivesData.generatedAt,
        updatedAt: objectivesData.updatedAt,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        functionalQuality: generated.functionalQuality,
        planningCompliance: generated.planningCompliance,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to generate objectives:', error);
    return NextResponse.json(
      { success: false, error: { code: 'GENERATION_ERROR', message: 'Failed to generate objectives' } },
      { status: 500 }
    );
  }
}
