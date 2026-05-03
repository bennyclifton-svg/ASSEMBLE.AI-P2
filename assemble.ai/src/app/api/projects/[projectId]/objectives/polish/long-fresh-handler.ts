/**
 * "Long-fresh" handler for the polish route — invoked when ↻ on Long
 * is clicked on a section that currently has no rows.
 *
 * Runs a single AI call that emits both terse ("short") and polished forms
 * for each generated objective, writes new rows with both `text` and
 * `textPolished` populated, and records an audit row in
 * `objectiveGenerationSessions` (iteration: 2).
 */

import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectProfiles } from '@/lib/db/pg-schema';
import {
  projectObjectives,
  objectiveGenerationSessions,
  type ObjectiveType,
} from '@/lib/db/objectives-schema';
import { aiComplete } from '@/lib/ai/client';
import { retrieveFromDomains, type DomainRetrievalResult } from '@/lib/rag/retrieval';
import { resolveProfileDomainTags, buildProfileSearchQuery } from '@/lib/constants/knowledge-domains';
import { evaluateRules, formatRulesForPrompt, type ProjectData, type ContentType } from '@/lib/services/inference-engine';
import { buildPolishFreshPrompt } from './polish-fresh-prompt-builder';

function rulesetForSection(section: ObjectiveType): ContentType {
  return section === 'functional' || section === 'quality'
    ? 'objectives_functional_quality'
    : 'objectives_planning_compliance';
}

export async function handleLongFresh(args: { projectId: string; section: ObjectiveType }) {
  const { projectId, section } = args;

  // 1. Load profile
  const [profile] = await db
    .select()
    .from(projectProfiles)
    .where(eq(projectProfiles.projectId, projectId))
    .limit(1);

  if (!profile) {
    return NextResponse.json(
      { success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Project profile not found.' } },
      { status: 404 }
    );
  }

  const buildingClass = profile.buildingClass;
  const projectType = profile.projectType;
  const subclass = JSON.parse(profile.subclass || '[]');
  const scaleData = JSON.parse(profile.scaleData || '{}');
  const complexity = JSON.parse(profile.complexity || '{}');
  const workScope = JSON.parse(profile.workScope || '[]');
  const region = profile.region ?? 'AU';

  const profileContext = `Project Context:
- Building Class: ${buildingClass}
- Project Type: ${projectType}
- Subclass: ${subclass.join(', ')}
- Scale: ${JSON.stringify(scaleData)}
`;

  // 2. Domain knowledge retrieval
  let domainContextSection = '';
  try {
    const domainTags = resolveProfileDomainTags({
      buildingClass,
      projectType,
      subclass,
      complexity,
    });

    const searchQuery = buildProfileSearchQuery({
      buildingClass,
      projectType,
      subclass,
      scaleData,
      complexity,
      region,
    });

    const domainResults = await retrieveFromDomains(searchQuery, {
      domainTags,
      projectType,
      topK: 15,
      rerankTopK: 5,
      minRelevanceScore: 0.2,
    });

    if (domainResults.length > 0) {
      const lines: string[] = [
        '## KNOWLEDGE DOMAIN CONTEXT',
        'Use the following best-practice and regulatory guidance to ground objectives in accurate references:',
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
    }
  } catch (error) {
    console.warn('[objectives-polish/long-fresh] Domain retrieval failed:', error);
  }

  // 3. Inference rules for the section
  const projectData: ProjectData = {
    projectDetails: { projectName: 'Project', jurisdiction: undefined },
    profiler: { buildingClass, subclass, projectType, scaleData, complexity, workScope },
  };
  const rules = evaluateRules(rulesetForSection(section), projectData);
  const inferenceRulesFormatted = formatRulesForPrompt(rules, { includeConfidence: true, groupBySource: false });

  // 4. Build prompt and call AI
  const prompt = buildPolishFreshPrompt({
    section,
    profileContext,
    domainContextSection,
    inferenceRulesFormatted,
  });

  const { text: aiText } = await aiComplete({
    featureGroup: 'generation',
    maxTokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  // 5. Parse JSON
  let items: { short: string; polished: string }[] = [];
  try {
    let jsonText = aiText;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1];
    jsonText = jsonText.trim().replace(/,\s*\n?\s*}/g, '\n}');
    const parsed = JSON.parse(jsonText) as { items?: { short: string; polished: string }[] };
    items = Array.isArray(parsed.items) ? parsed.items : [];
  } catch (e) {
    console.error('[objectives-polish/long-fresh] Failed to parse AI response:', e);
    return NextResponse.json(
      { success: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse AI response' } },
      { status: 502 }
    );
  }

  if (items.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'EMPTY_RESPONSE', message: 'AI returned no objectives' } },
      { status: 502 }
    );
  }

  // 6. Defensively soft-delete any existing rows for this project+section
  await db
    .update(projectObjectives)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(
      and(
        eq(projectObjectives.projectId, projectId),
        eq(projectObjectives.objectiveType, section),
        eq(projectObjectives.isDeleted, false),
      )
    );

  // 7. Insert new rows with both text + textPolished
  const toInsert = items.map((item, idx) => ({
    projectId,
    objectiveType: section,
    text: String(item.short ?? '').trim(),
    textPolished: String(item.polished ?? '').trim() || null,
    source: 'ai_added' as const,
    status: 'polished' as const,
    sortOrder: idx,
  }));

  const inserted = await db.insert(projectObjectives).values(toInsert).returning();

  // 8. Audit row
  await db.insert(objectiveGenerationSessions).values({
    projectId,
    objectiveType: section,
    iteration: 2,
    profilerSnapshot: {
      buildingClass,
      projectType,
      subclass,
      scale: scaleData,
      complexity,
      workScope,
    } as unknown as Record<string, unknown>,
    generatedItems: {
      explicit: [],
      inferred: [],
      ai_added: items.map((i) => i.short),
    },
  });

  return NextResponse.json({
    success: true,
    data: { polished: inserted },
  });
}
