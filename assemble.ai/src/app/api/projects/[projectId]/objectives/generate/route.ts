/**
 * Objectives Generate API
 * Generate AI objectives based on project profile — writes individual rows to projectObjectives
 * Feature: 019-profiler
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectProfiles, profilerObjectives, objectivesTransmittals } from '@/lib/db/pg-schema';
import {
  projectObjectives,
  objectiveGenerationSessions,
  type ObjectiveType,
  VALID_OBJECTIVE_TYPES,
} from '@/lib/db/objectives-schema';
import { aiComplete } from '@/lib/ai/client';
import { getCurrentUser } from '@/lib/auth/get-user';
import profileTemplates from '@/lib/data/profile-templates.json';
import { evaluateRules, formatRulesForPrompt, type ProjectData } from '@/lib/services/inference-engine';
import { retrieve, retrieveFromDomains, type DomainRetrievalResult } from '@/lib/rag/retrieval';
import { resolveProfileDomainTags, buildProfileSearchQuery } from '@/lib/constants/knowledge-domains';

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
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const section = body.section as ObjectiveType | undefined;

    // Validate section if provided
    if (section && !VALID_OBJECTIVE_TYPES.includes(section)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `section must be one of: ${VALID_OBJECTIVE_TYPES.join(', ')}` } },
        { status: 400 }
      );
    }

    // Fetch profile
    const [profile] = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    // Check for attached documents (still uses profilerObjectives as anchor for transmittals)
    const [objectivesRecord] = await db
      .select({ id: profilerObjectives.id })
      .from(profilerObjectives)
      .where(eq(profilerObjectives.projectId, projectId))
      .limit(1);

    let attachedDocumentIds: string[] = [];
    if (objectivesRecord) {
      const transmittals = await db
        .select({ documentId: objectivesTransmittals.documentId })
        .from(objectivesTransmittals)
        .where(eq(objectivesTransmittals.objectivesId, objectivesRecord.id));
      attachedDocumentIds = transmittals.map(t => t.documentId);
    }

    const hasAttachedDocuments = attachedDocumentIds.length > 0;

    // === DOMAIN KNOWLEDGE RETRIEVAL ===
    let domainContextSection = '';

    if (profile) {
      try {
        const profBuildingClass = profile.buildingClass;
        const profProjectType = profile.projectType;
        const profSubclass = JSON.parse(profile.subclass || '[]');
        const profScaleData = JSON.parse(profile.scaleData || '{}');
        const profComplexity = JSON.parse(profile.complexity || '{}');
        const profWorkScope = JSON.parse(profile.workScope || '[]');
        const profRegion = profile.region ?? 'AU';

        const isWsApplicable = profProjectType === 'refurb' || profProjectType === 'remediation';
        const wsLabels = isWsApplicable ? resolveWorkScopeLabels(profWorkScope, profProjectType) : [];

        const domainTags = resolveProfileDomainTags({
          buildingClass: profBuildingClass,
          projectType: profProjectType,
          subclass: profSubclass,
          complexity: profComplexity,
        });

        const searchQuery = buildProfileSearchQuery({
          buildingClass: profBuildingClass,
          projectType: profProjectType,
          subclass: profSubclass,
          scaleData: profScaleData,
          complexity: profComplexity,
          workScopeLabels: wsLabels,
          region: profRegion,
        });

        console.log(`[objectives-generate] Domain retrieval: ${domainTags.length} tags, query="${searchQuery.substring(0, 80)}..."`);

        const domainResults = await retrieveFromDomains(searchQuery, {
          domainTags,
          projectType: profProjectType,
          topK: 15,
          rerankTopK: 5,
          minRelevanceScore: 0.2,
        });

        if (domainResults.length > 0) {
          const lines: string[] = [
            '## KNOWLEDGE DOMAIN CONTEXT',
            'The following best-practice and regulatory guidance is relevant to this project type:',
            '',
          ];

          const byDomain = new Map<string, DomainRetrievalResult[]>();
          for (const r of domainResults) {
            const key = r.domainName || 'Unknown Domain';
            const group = byDomain.get(key) || [];
            group.push(r);
            byDomain.set(key, group);
          }

          for (const [domainName, results] of byDomain) {
            for (const r of results) {
              lines.push(`### ${domainName} (relevance: ${r.relevanceScore.toFixed(2)})`);
              lines.push(r.content);
              lines.push('');
            }
          }

          domainContextSection = lines.join('\n');
          console.log(`[objectives-generate] Domain context: ${domainResults.length} chunks from ${byDomain.size} domain(s)`);
        } else {
          console.log('[objectives-generate] Domain retrieval returned no results');
        }
      } catch (error) {
        console.warn('[objectives-generate] Domain retrieval failed, continuing without:', error);
      }
    }

    let aiText: string;

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

You have been given excerpts from project documents (briefs, Statements of Environmental Effects, client design objectives, etc.). Extract project objectives from these documents and sort them into four categories.

${domainContextSection ? `${domainContextSection}\n` : ''}## Retrieved Content — Functional & Quality Related
${functionalContext || '(No relevant content found)'}

## Retrieved Content — Planning & Compliance Related
${planningContext || '(No relevant content found)'}

## Section Definitions — CRITICAL:

FUNCTIONAL — What the building physically provides and how it operates:
- Physical attributes (bedrooms, floors, spaces, areas)
- Design features (open plan, layout, configuration)
- Operational requirements (storage, parking, amenities)
Headers to use: Design Requirements, Operational Requirements

QUALITY — How well the building performs and materials/finish standards:
- Quality/finish standards (premium finishes, materials, fixtures)
- Performance requirements (acoustic, thermal, structural)
- User experience (accessibility features, natural light)
Headers to use: Quality Standards, Performance Requirements

PLANNING — Planning approvals and regulatory compliance:
- Regulatory approvals (DA, CDC, permits)
- Environmental compliance (contamination, stormwater)
- Council and authority requirements
Headers to use: Regulatory Compliance, Authority Approvals

COMPLIANCE — Building codes and certification requirements:
- Building codes (NCC, BCA classification)
- Australian Standards (AS 2419.1, AS 3959, etc.)
- Certifications required (BASIX, NatHERS, fire engineering)
Headers to use: Certification Requirements, Code Compliance

## Instructions:
1. Extract ONLY objectives/requirements that are explicitly stated or clearly implied in the source documents
2. DO NOT invent or hallucinate any objectives not supported by the documents
3. Sort each item into the correct section
4. Format as SHORT bullet points (2-5 words each)
5. Group by category using bold headers
6. Output 4-8 bullets per section where the documents support it
7. DO NOT duplicate items between sections
8. OUTPUT FORMAT: JSON arrays of plain text bullet strings (no HTML)

Respond in JSON format:
{
  "functional": ["bullet 1", "bullet 2"],
  "quality": ["bullet 1", "bullet 2"],
  "planning": ["bullet 1", "bullet 2"],
  "compliance": ["bullet 1", "bullet 2"]
}`;

      const result = await aiComplete({
        featureGroup: 'objectives_generation',
        maxTokens: 2000,
        messages: [{ role: 'user', content: extractionPrompt }],
      });
      aiText = result.text;
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

      // Evaluate inference rules — functional+quality share one rule set, planning+compliance share another
      const functionalRules = evaluateRules('objectives_functional_quality', projectData);
      const planningRules = evaluateRules('objectives_planning_compliance', projectData);

      const functionalRulesFormatted = formatRulesForPrompt(functionalRules, { includeConfidence: true, groupBySource: false });
      const planningRulesFormatted = formatRulesForPrompt(planningRules, { includeConfidence: true, groupBySource: false });

      console.log(`[objectives-generate] Matched ${functionalRules.length} functional rules, ${planningRules.length} planning rules`);

      // Determine which sections to generate
      const generateBoth = !section;
      const generateFunctional = generateBoth || section === 'functional';
      const generateQuality = generateBoth || section === 'quality';
      const generatePlanning = generateBoth || section === 'planning';
      const generateCompliance = generateBoth || section === 'compliance';

      const workScopeConstraint = hasSpecificScope
        ? `
CRITICAL SCOPE CONSTRAINT:
The client has specifically selected: ${workScopeLabels.join(', ')}.
Your objectives MUST focus EXCLUSIVELY on these selected items.
`
        : '';

      const suggestedItemsSection = [];
      if ((generateFunctional || generateQuality) && functionalRulesFormatted) {
        suggestedItemsSection.push(`## Functional & Quality\n${functionalRulesFormatted}`);
      }
      if ((generatePlanning || generateCompliance) && planningRulesFormatted) {
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
${domainContextSection ? `${domainContextSection}\n` : ''}SECTION DEFINITIONS - CRITICAL:
The four sections have DIFFERENT purposes. DO NOT mix content between them:

FUNCTIONAL - What the building physically provides and how it operates:
- Physical attributes (bedrooms, floors, spaces, areas)
- Design features (open plan, layout, configuration)
- Operational requirements (storage, parking, amenities)

QUALITY - How well the building performs and materials/finish standards:
- Quality/finish standards (premium finishes, materials, fixtures)
- Performance requirements (acoustic, thermal, structural)
- User experience (accessibility features, natural light)

PLANNING - Planning approvals and regulatory compliance:
- Regulatory approvals (DA, CDC, permits)
- Environmental compliance (contamination, stormwater)
- Council and authority requirements

COMPLIANCE - Building codes and certification requirements:
- Building codes (NCC, BCA classification)
- Australian Standards (AS 2419.1, AS 3959, etc.)
- Certifications required (BASIX, NatHERS, fire engineering)

SUGGESTED ITEMS FROM PROJECT ANALYSIS:
${suggestedItemsSection.length > 0 ? suggestedItemsSection.join('\n\n') : '(No specific rules matched - generate based on project profile)'}

INSTRUCTIONS:
Generate SHORT bullet points only (2-5 words each).
1. Include suggested items ONLY in their correct section
2. Add other relevant objectives for this ${buildingClass} ${projectType} project
3. Each bullet: 2-5 words MAXIMUM (e.g., "Premium material selection", "NCC 2022 compliance")
4. NO prose, NO sentences, NO detailed explanations
5. Output 4-8 bullets per section
6. DO NOT duplicate items between sections
7. OUTPUT FORMAT: plain text arrays in JSON (no HTML)

Respond in JSON format with only the sections requested:
{
${generateFunctional ? '  "functional": ["bullet 1", "bullet 2"],' : ''}
${generateQuality ? '  "quality": ["bullet 1", "bullet 2"],' : ''}
${generatePlanning ? '  "planning": ["bullet 1", "bullet 2"],' : ''}
${generateCompliance ? '  "compliance": ["bullet 1", "bullet 2"]' : ''}
}`;

      const result = await aiComplete({
        featureGroup: 'objectives_generation',
        maxTokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });
      aiText = result.text;
    }

    // Parse JSON from response
    let generated: Partial<Record<ObjectiveType, string[]>>;
    try {
      let jsonText = aiText;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      // Strip trailing commas before closing brace (common AI output issue)
      jsonText = jsonText.trim().replace(/,\s*\n?\s*}/g, '\n}');
      generated = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      generated = {};
    }

    // Determine source label
    const sourceLabel = hasAttachedDocuments ? 'explicit' : 'ai_added';

    // Create profile context snapshot
    const profileContext = profile ? {
      buildingClass: profile.buildingClass,
      projectType: profile.projectType,
      subclass: JSON.parse(profile.subclass || '[]'),
      scale: JSON.parse(profile.scaleData || '{}'),
      complexity: JSON.parse(profile.complexity || '{}'),
      workScope: JSON.parse(profile.workScope || '[]'),
    } : null;

    // Determine which sections were requested (or all if no section)
    const sectionsToWrite: ObjectiveType[] = section
      ? [section]
      : VALID_OBJECTIVE_TYPES;

    // For each requested section: soft-delete existing rows, then insert new ones
    const insertedBySection: Partial<Record<ObjectiveType, typeof projectObjectives.$inferSelect[]>> = {};

    for (const sec of sectionsToWrite) {
      const bullets = generated[sec];
      if (!bullets || bullets.length === 0) continue;

      // Soft-delete existing rows for this project+type
      await db
        .update(projectObjectives)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(
          and(
            eq(projectObjectives.projectId, projectId),
            eq(projectObjectives.objectiveType, sec),
            eq(projectObjectives.isDeleted, false)
          )
        );

      // Insert one row per bullet
      const toInsert = bullets.map((text, idx) => ({
        projectId,
        objectiveType: sec,
        text: String(text).trim(),
        source: sourceLabel as 'explicit' | 'ai_added',
        status: 'draft' as const,
        sortOrder: idx,
      }));

      const inserted = await db
        .insert(projectObjectives)
        .values(toInsert)
        .returning();

      insertedBySection[sec] = inserted;

      // Write generation session audit record
      await db.insert(objectiveGenerationSessions).values({
        projectId,
        objectiveType: sec,
        iteration: 1,
        profilerSnapshot: profileContext as unknown as Record<string, unknown>,
        generatedItems: {
          explicit: sourceLabel === 'explicit' ? bullets : [],
          inferred: [],
          ai_added: sourceLabel === 'ai_added' ? bullets : [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: insertedBySection,
    });
  } catch (error: unknown) {
    console.error('Failed to generate objectives:', error);

    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === 529) {
      return NextResponse.json(
        { success: false, error: { code: 'AI_OVERLOADED', message: 'AI service is temporarily busy. Please try again in a moment.' } },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'GENERATION_ERROR', message: error instanceof Error ? error.message : 'Failed to generate objectives' } },
      { status: 500 }
    );
  }
}
