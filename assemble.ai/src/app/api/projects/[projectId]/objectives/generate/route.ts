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
import profileTemplates from '@/lib/data/profile-templates.json';
import { evaluateRules, formatRulesForPrompt, type ProjectData } from '@/lib/services/inference-engine';

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
    // Work scope only applies to refurb/remediation projects, not new builds
    const isWorkScopeApplicable = projectType === 'refurb' || projectType === 'remediation';
    const workScopeLabels = isWorkScopeApplicable ? resolveWorkScopeLabels(workScope, projectType) : [];
    const hasSpecificScope = workScopeLabels.length > 0;

    // Log if work scope was ignored due to project type mismatch
    if (workScope.length > 0 && !isWorkScopeApplicable) {
      console.log(`[objectives-generate] Ignoring work scope for ${projectType} project (work scope only applies to refurb/remediation)`);
    }

    // Build ProjectData for inference engine
    const projectData: ProjectData = {
      projectDetails: {
        projectName: 'Project',
        jurisdiction: undefined,
      },
      profiler: {
        buildingClass,
        subclass,
        projectType,
        scaleData,
        complexity,
        workScope,
      }
    };

    // Evaluate inference rules for each section
    const functionalRules = evaluateRules('objectives_functional_quality', projectData);
    const planningRules = evaluateRules('objectives_planning_compliance', projectData);

    // Format rules for prompt
    const functionalRulesFormatted = formatRulesForPrompt(functionalRules, { includeConfidence: true, groupBySource: false });
    const planningRulesFormatted = formatRulesForPrompt(planningRules, { includeConfidence: true, groupBySource: false });

    // Log matched rules for debugging
    console.log(`[objectives-generate] Matched ${functionalRules.length} functional rules, ${planningRules.length} planning rules`);

    // Build prompt based on section (or both if not specified)
    const generateBoth = !section;
    const generateFunctional = generateBoth || section === 'functionalQuality';
    const generatePlanning = generateBoth || section === 'planningCompliance';

    const responseFormat = generateBoth
      ? `{
  "functionalQuality": "objectives as HTML with <strong>Headers</strong> and <ul><li> bullet points",
  "planningCompliance": "objectives as HTML with <strong>Headers</strong> and <ul><li> bullet points"
}`
      : section === 'functionalQuality'
      ? `{
  "functionalQuality": "objectives as HTML with <strong>Headers</strong> and <ul><li> bullet points"
}`
      : `{
  "planningCompliance": "objectives as HTML with <strong>Headers</strong> and <ul><li> bullet points"
}`;

    // Build work scope constraint for the AI prompt
    const workScopeConstraint = hasSpecificScope
      ? `
CRITICAL SCOPE CONSTRAINT:
The client has specifically selected: ${workScopeLabels.join(', ')}.
Your objectives MUST focus EXCLUSIVELY on these selected items.
`
      : '';

    // Build suggested items section from inference rules
    const suggestedItemsSection = [];
    if (generateFunctional && functionalRulesFormatted) {
      suggestedItemsSection.push(`## Functional & Quality\n${functionalRulesFormatted}`);
    }
    if (generatePlanning && planningRulesFormatted) {
      suggestedItemsSection.push(`## Planning & Compliance\n${planningRulesFormatted}`);
    }

    // ITERATION 1: Generate SHORT bullet points (2-5 words each)
    const prompt = `You are an expert construction project manager in Australia.

PROJECT PROFILE:
- Building Class: ${buildingClass}
- Project Type: ${projectType}
- Subclass: ${subclass.join(', ') || 'Not specified'}
- Scale: ${Object.entries(scaleData).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Not specified'}
- Complexity: ${Object.entries(complexity).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Not specified'}
${hasSpecificScope ? `- Work Scope: ${workScopeLabels.join(', ')}` : ''}
${workScopeConstraint}
SECTION DEFINITIONS - CRITICAL:
The two sections have DIFFERENT purposes. DO NOT mix content between them:

FUNCTIONAL & QUALITY - What the building provides and how well:
- Physical attributes (bedrooms, floors, spaces, areas)
- Design features (open plan, layout, configuration)
- Operational requirements (storage, parking, amenities)
- Quality/finish standards (premium finishes, materials, fixtures)
- Performance requirements (acoustic, thermal, structural)
- User experience (accessibility features, natural light)
Headers to use: Design Requirements, Quality Standards, Operational Requirements

PLANNING & COMPLIANCE - Approvals, regulations, and certifications needed:
- Building codes (NCC, BCA classification)
- Regulatory approvals (DA, CDC, permits)
- Australian Standards (AS 2419.1, AS 3959, etc.)
- Certifications required (BASIX, NatHERS, fire engineering)
- Authority requirements (council, fire brigade, utilities)
- Environmental compliance (contamination, stormwater)
Headers to use: Regulatory Compliance, Certification Requirements, Authority Approvals

SUGGESTED ITEMS FROM PROJECT ANALYSIS:
${suggestedItemsSection.length > 0 ? suggestedItemsSection.join('\n\n') : '(No specific rules matched - generate based on project profile)'}

INSTRUCTIONS - ITERATION 1:
Generate SHORT bullet points only (2-5 words each).
1. Include suggested items ONLY in their correct section (functional items in functionalQuality, compliance items in planningCompliance)
2. Add other relevant objectives for this ${buildingClass} ${projectType} project
3. Group by category using bold headers on their own line, followed by a bullet list
4. Each bullet: 2-5 words MAXIMUM (e.g., "Premium material selection", "NCC 2022 compliance")
5. NO prose, NO sentences, NO detailed explanations
6. Output 8-15 bullets per section
7. DO NOT duplicate items between sections - each item belongs in only ONE section
8. OUTPUT FORMAT: Use HTML tags - <p><strong>Header</strong></p> for headers on separate lines, <ul><li>item</li></ul> for bullets

Example FUNCTIONAL & QUALITY output (use this exact HTML structure):
<p><strong>Design Requirements</strong></p><ul><li>Multi-bedroom accommodation</li><li>Double garage provision</li><li>Open plan living</li></ul><p><strong>Quality Standards</strong></p><ul><li>Premium specification level</li><li>Acoustic separation</li></ul>

Example PLANNING & COMPLIANCE output (use this exact HTML structure):
<p><strong>Regulatory Compliance</strong></p><ul><li>NCC 2022 compliance</li><li>Fire safety provisions</li><li>DDA accessibility</li></ul><p><strong>Certification Requirements</strong></p><ul><li>BASIX certification</li><li>Energy efficiency (NatHERS)</li></ul>

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
      // Fallback to empty content
      generated = {};
      if (generateFunctional) generated.functionalQuality = '';
      if (generatePlanning) generated.planningCompliance = '';
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
