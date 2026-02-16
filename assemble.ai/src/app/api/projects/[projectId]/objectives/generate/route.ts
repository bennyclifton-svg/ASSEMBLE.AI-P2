/**
 * Objectives Generate API
 * Generate AI objectives based on project profile
 * Feature: 019-profiler
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectProfiles, profilerObjectives, objectivesTransmittals } from '@/lib/db/pg-schema';
import Anthropic from '@anthropic-ai/sdk';
import profileTemplates from '@/lib/data/profile-templates.json';
import { evaluateRules, formatRulesForPrompt, type ProjectData } from '@/lib/services/inference-engine';
import { retrieve } from '@/lib/rag/retrieval';

const anthropic = new Anthropic({ maxRetries: 4 });

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

    // Check for attached documents
    const [objectives] = await db
      .select({ id: profilerObjectives.id })
      .from(profilerObjectives)
      .where(eq(profilerObjectives.projectId, projectId))
      .limit(1);

    let attachedDocumentIds: string[] = [];
    if (objectives) {
      const transmittals = await db
        .select({ documentId: objectivesTransmittals.documentId })
        .from(objectivesTransmittals)
        .where(eq(objectivesTransmittals.objectivesId, objectives.id));
      attachedDocumentIds = transmittals.map(t => t.documentId);
    }

    const hasAttachedDocuments = attachedDocumentIds.length > 0;

    let response;

    if (hasAttachedDocuments) {
      // === DOCUMENT EXTRACTION PATH ===
      console.log(`[objectives-generate] Extracting from ${attachedDocumentIds.length} attached documents`);

      // RAG retrieval — broad queries to cover both sections
      const functionalQuery = 'project objectives, functional requirements, quality standards, design features, performance criteria, operational requirements, spatial requirements, material specifications';
      const planningQuery = 'planning approvals, compliance requirements, building codes, authority requirements, certifications, statutory requirements, environmental compliance, regulatory framework';

      const [functionalResults, planningResults] = await Promise.all([
        retrieve(functionalQuery, {
          documentIds: attachedDocumentIds,
          topK: 30,
          rerankTopK: 15,
          includeParentContext: true,
          minRelevanceScore: 0.2,
        }),
        retrieve(planningQuery, {
          documentIds: attachedDocumentIds,
          topK: 30,
          rerankTopK: 15,
          includeParentContext: true,
          minRelevanceScore: 0.2,
        }),
      ]);

      // Build context from retrieved chunks
      const formatChunks = (results: { content: string; sectionTitle: string | null }[]) => results
        .map((r, i) => `[Source ${i + 1}${r.sectionTitle ? `: ${r.sectionTitle}` : ''}]\n${r.content}`)
        .join('\n\n');

      const functionalContext = formatChunks(functionalResults);
      const planningContext = formatChunks(planningResults);

      const extractionPrompt = `You are an expert construction project manager in Australia.

You have been given excerpts from project documents (briefs, Statements of Environmental Effects, client design objectives, etc.). Extract project objectives from these documents and sort them into two categories.

## Retrieved Content — Functional & Quality Related
${functionalContext || '(No relevant content found)'}

## Retrieved Content — Planning & Compliance Related
${planningContext || '(No relevant content found)'}

## Section Definitions — CRITICAL:

FUNCTIONAL & QUALITY — What the building provides and how well:
- Physical attributes (bedrooms, floors, spaces, areas)
- Design features (open plan, layout, configuration)
- Operational requirements (storage, parking, amenities)
- Quality/finish standards (premium finishes, materials, fixtures)
- Performance requirements (acoustic, thermal, structural)
- User experience (accessibility features, natural light)
Headers to use: Design Requirements, Quality Standards, Operational Requirements

PLANNING & COMPLIANCE — Approvals, regulations, and certifications needed:
- Building codes (NCC, BCA classification)
- Regulatory approvals (DA, CDC, permits)
- Australian Standards (AS 2419.1, AS 3959, etc.)
- Certifications required (BASIX, NatHERS, fire engineering)
- Authority requirements (council, fire brigade, utilities)
- Environmental compliance (contamination, stormwater)
Headers to use: Regulatory Compliance, Certification Requirements, Authority Approvals

## Instructions:
1. Extract ONLY objectives/requirements that are explicitly stated or clearly implied in the source documents
2. DO NOT invent or hallucinate any objectives not supported by the documents
3. Sort each item into the correct section (functional vs planning)
4. Format as SHORT bullet points (2-5 words each)
5. Group by category using bold headers
6. Output 8-15 bullets per section where the documents support it
7. DO NOT duplicate items between sections
8. OUTPUT FORMAT: HTML tags — <p><strong>Header</strong></p> for headers, <ul><li>item</li></ul> for bullets

Respond in JSON format:
{
  "functionalQuality": "objectives as HTML with <strong>Headers</strong> and <ul><li> bullet points",
  "planningCompliance": "objectives as HTML with <strong>Headers</strong> and <ul><li> bullet points"
}`;

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: extractionPrompt }],
      });
    } else {
      // === INFERENCE RULES PATH (existing behaviour) ===

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
      const isWorkScopeApplicable = projectType === 'refurb' || projectType === 'remediation';
      const workScopeLabels = isWorkScopeApplicable ? resolveWorkScopeLabels(workScope, projectType) : [];
      const hasSpecificScope = workScopeLabels.length > 0;

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

      const functionalRulesFormatted = formatRulesForPrompt(functionalRules, { includeConfidence: true, groupBySource: false });
      const planningRulesFormatted = formatRulesForPrompt(planningRules, { includeConfidence: true, groupBySource: false });

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

      const workScopeConstraint = hasSpecificScope
        ? `
CRITICAL SCOPE CONSTRAINT:
The client has specifically selected: ${workScopeLabels.join(', ')}.
Your objectives MUST focus EXCLUSIVELY on these selected items.
`
        : '';

      const suggestedItemsSection = [];
      if (generateFunctional && functionalRulesFormatted) {
        suggestedItemsSection.push(`## Functional & Quality\n${functionalRulesFormatted}`);
      }
      if (generatePlanning && planningRulesFormatted) {
        suggestedItemsSection.push(`## Planning & Compliance\n${planningRulesFormatted}`);
      }

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

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });
    }

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
      generated = {
        functionalQuality: '',
        planningCompliance: '',
      };
    }

    // Determine source label
    const sourceLabel = hasAttachedDocuments ? 'ai_extracted' : 'ai_generated';

    // Create profile context snapshot (use profile if available)
    const profileContext = profile ? {
      buildingClass: profile.buildingClass,
      projectType: profile.projectType,
      subclass: JSON.parse(profile.subclass || '[]'),
      scale: JSON.parse(profile.scaleData || '{}'),
      complexity: JSON.parse(profile.complexity || '{}'),
      workScope: JSON.parse(profile.workScope || '[]'),
    } : null;

    // Check if objectives exist
    const existing = await db
      .select()
      .from(profilerObjectives)
      .where(eq(profilerObjectives.projectId, projectId))
      .limit(1);

    // Build update data based on what was generated
    const objectivesData: Record<string, any> = {
      profileContext: profileContext ? JSON.stringify(profileContext) : null,
      updatedAt: new Date(),
    };

    if (generated.functionalQuality) {
      objectivesData.functionalQuality = JSON.stringify({
        content: generated.functionalQuality,
        source: sourceLabel,
        originalAi: generated.functionalQuality,
        editHistory: null,
      });
      objectivesData.generatedAt = new Date();
    }

    if (generated.planningCompliance) {
      objectivesData.planningCompliance = JSON.stringify({
        content: generated.planningCompliance,
        source: sourceLabel,
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
  } catch (error: any) {
    console.error('Failed to generate objectives:', error);

    if (error?.status === 529) {
      return NextResponse.json(
        { success: false, error: { code: 'AI_OVERLOADED', message: 'AI service is temporarily busy. Please try again in a moment.' } },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'GENERATION_ERROR', message: 'Failed to generate objectives' } },
      { status: 500 }
    );
  }
}
