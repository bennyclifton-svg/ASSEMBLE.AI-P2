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
import { isAdvisory } from '@/lib/constants/objective-section-config';
import { buildInferencePrompt, buildExtractionPrompt } from './prompt-builders';
import type { ProjectType } from '@/types/profiler';

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

        // Work scope flows for ALL project types — including advisory and new builds.
        // The previous filter (refurb/remediation only) silently dropped scope from
        // the prompt, breaking profile→prompt propagation for new and advisory work.
        const wsLabels = resolveWorkScopeLabels(profWorkScope, profProjectType);

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

      const extractionPrompt = buildExtractionPrompt({
        projectType: (profile?.projectType ?? 'new') as ProjectType,
        buildingClass: profile?.buildingClass ?? 'residential',
        domainContextSection,
        retrievedFunctional: functionalContext,
        retrievedPlanning: planningContext,
        section,
      });

      const result = await aiComplete({
        featureGroup: 'generation',
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
      const projectType = profile.projectType as ProjectType;
      const subclass = JSON.parse(profile.subclass || '[]');
      const scaleData = JSON.parse(profile.scaleData || '{}');
      const complexity = JSON.parse(profile.complexity || '{}');
      const workScope = JSON.parse(profile.workScope || '[]');

      // Resolve work scope IDs to human-readable labels for ALL project types.
      // The previous filter (refurb/remediation only) silently dropped scope from
      // the prompt for new and advisory work, breaking profile→prompt propagation.
      const workScopeLabels = resolveWorkScopeLabels(workScope, projectType);

      // Skip the inference rule corpus for advisory engagements.
      // The existing 175 rules are all build-shaped (no project_type conditions),
      // so running them for advisory contaminates output with build-flavoured
      // suggestions. Advisory generation in the no-documents path relies on the
      // profile + workScope (Scope of Advice) selections instead.
      let functionalRulesFormatted = '';
      let planningRulesFormatted = '';

      if (isAdvisory(projectType)) {
        console.log('[objectives-generate] Skipping inference rules for advisory project');
      } else {
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

        const functionalRules = evaluateRules('objectives_functional_quality', projectData);
        const planningRules = evaluateRules('objectives_planning_compliance', projectData);

        functionalRulesFormatted = formatRulesForPrompt(functionalRules, { includeConfidence: true, groupBySource: false });
        planningRulesFormatted = formatRulesForPrompt(planningRules, { includeConfidence: true, groupBySource: false });

        console.log(`[objectives-generate] Matched ${functionalRules.length} functional rules, ${planningRules.length} planning rules`);
      }

      // Drop suggested-items blocks for sections we're not generating.
      const generateFunctional = !section || section === 'functional';
      const generateQuality = !section || section === 'quality';
      const generatePlanning = !section || section === 'planning';
      const generateCompliance = !section || section === 'compliance';

      if (!generateFunctional && !generateQuality) functionalRulesFormatted = '';
      if (!generatePlanning && !generateCompliance) planningRulesFormatted = '';

      const prompt = buildInferencePrompt({
        projectType,
        buildingClass,
        subclass,
        scaleData,
        complexity,
        workScopeLabels,
        functionalRulesFormatted,
        planningRulesFormatted,
        domainContextSection,
        section,
      });

      const result = await aiComplete({
        featureGroup: 'generation',
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
