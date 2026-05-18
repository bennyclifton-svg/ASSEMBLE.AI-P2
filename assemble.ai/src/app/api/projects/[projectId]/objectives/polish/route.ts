/**
 * Objectives Polish API
 * Polish individual objective rows by ID using AI
 * Feature: 019-profiler
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  projectObjectives,
  objectiveGenerationSessions,
  VALID_OBJECTIVE_TYPES,
  type ObjectiveType,
} from '@/lib/db/objectives-schema';
import { projectProfiles, briefAttachments } from '@/lib/db/pg-schema';
import { aiComplete } from '@/lib/ai/client';
import { getCurrentUser } from '@/lib/auth/get-user';
import { retrieveFromDomains, type DomainRetrievalResult } from '@/lib/rag/retrieval';
import { resolveProfileDomainTags, buildProfileSearchQuery } from '@/lib/constants/knowledge-domains';
import { buildAttachedObjectiveDocumentContext } from '@/lib/services/objective-document-context';
import { buildPolishPrompt } from './prompt-builder';
import { handleLongFresh } from './long-fresh-handler';

async function getAttachedObjectiveDocumentIds(projectId: string): Promise<string[]> {
  const briefAttached = await db
    .select({ documentId: briefAttachments.documentId })
    .from(briefAttachments)
    .where(eq(briefAttachments.projectId, projectId));

  return [...new Set(briefAttached.map((attachment) => attachment.documentId))];
}

function sourceDetailKey(section: ObjectiveType, text: string): string {
  return `${section}:${text.trim().toLowerCase()}`;
}

function readSourceDetailsFromGeneratedItems(value: unknown): Array<{ text: string; sourceDetail: string }> {
  if (!value || typeof value !== 'object') return [];
  const sourceDetails = (value as { source_details?: unknown }).source_details;
  if (!Array.isArray(sourceDetails)) return [];

  return sourceDetails.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const text = String((item as { text?: unknown }).text ?? '').trim();
    const sourceDetail = String((item as { sourceDetail?: unknown }).sourceDetail ?? '').trim();
    return text && sourceDetail ? [{ text, sourceDetail }] : [];
  });
}

async function getLatestObjectiveSourceDetailMap(
  projectId: string,
  sections: ObjectiveType[],
): Promise<Map<string, string>> {
  const detailMap = new Map<string, string>();

  await Promise.all(sections.map(async (section) => {
    const [session] = await db
      .select({ generatedItems: objectiveGenerationSessions.generatedItems })
      .from(objectiveGenerationSessions)
      .where(
        and(
          eq(objectiveGenerationSessions.projectId, projectId),
          eq(objectiveGenerationSessions.objectiveType, section),
        )
      )
      .orderBy(desc(objectiveGenerationSessions.createdAt))
      .limit(1);

    for (const item of readSourceDetailsFromGeneratedItems(session?.generatedItems)) {
      detailMap.set(sourceDetailKey(section, item.text), item.sourceDetail);
    }
  }));

  return detailMap;
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
    const body = await request.json();

    const { ids, section } = body as { ids?: unknown; section?: unknown };

    const hasIds = Array.isArray(ids) && ids.length > 0;
    const hasSection = typeof section === 'string'
      && VALID_OBJECTIVE_TYPES.includes(section as ObjectiveType);

    if (!hasIds && !hasSection) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide either ids[] or a valid section' } },
        { status: 400 }
      );
    }

    // Resolve the rows to polish — either explicit IDs or all rows in a section.
    let validRows: typeof projectObjectives.$inferSelect[];

    if (hasSection) {
      validRows = await db
        .select()
        .from(projectObjectives)
        .where(
          and(
            eq(projectObjectives.projectId, projectId),
            eq(projectObjectives.objectiveType, section as ObjectiveType),
            eq(projectObjectives.isDeleted, false),
          )
        );

      // Empty section → branch to "Long fresh" path (single AI call producing both forms).
      if (validRows.length === 0) {
        return await handleLongFresh({ projectId, section: section as ObjectiveType });
      }
    } else {
      const idStrings = (ids as unknown[]).filter((id): id is string => typeof id === 'string');
      if (idStrings.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'ids must contain string values' } },
          { status: 400 }
        );
      }

      const rows = await db
        .select()
        .from(projectObjectives)
        .where(inArray(projectObjectives.id, idStrings));

      // Filter to only rows belonging to this project and not deleted
      validRows = rows.filter(r => r.projectId === projectId && !r.isDeleted);

      if (validRows.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'No valid objectives found for the provided IDs' } },
          { status: 404 }
        );
      }
    }

    // Fetch profile for context
    const [profile] = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    let profileContext = '';
    let domainContextSection = '';
    let attachedDocumentContext = '';

    if (profile) {
      const buildingClass = profile.buildingClass;
      const projectType = profile.projectType;
      const subclass = JSON.parse(profile.subclass || '[]');
      const scaleData = JSON.parse(profile.scaleData || '{}');
      const complexity = JSON.parse(profile.complexity || '{}');
      const region = profile.region ?? 'AU';

      profileContext = `Project Context:
- Building Class: ${buildingClass}
- Project Type: ${projectType}
- Subclass: ${subclass.join(', ')}
- Scale: ${JSON.stringify(scaleData)}
`;

      // Domain knowledge retrieval
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

        console.log(`[objectives-polish] Domain retrieval: ${domainTags.length} tags, query="${searchQuery.substring(0, 80)}..."`);

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
            'Use the following best-practice and regulatory guidance to expand objectives with accurate references:',
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
          console.log(`[objectives-polish] Domain context: ${domainResults.length} chunks from ${byDomain.size} domain(s)`);
        } else {
          console.log('[objectives-polish] Domain retrieval returned no results');
        }
      } catch (error) {
        console.warn('[objectives-polish] Domain retrieval failed, continuing without:', error);
      }
    }

    try {
      const attachedDocumentIds = await getAttachedObjectiveDocumentIds(projectId);
      if (attachedDocumentIds.length > 0) {
        const context = await buildAttachedObjectiveDocumentContext(attachedDocumentIds);
        attachedDocumentContext = context.context;
        console.log(
          `[objectives-polish] Indexed document context: ${context.documentChunkCount} chunks, ` +
          `${context.estimatedDocumentTokens} estimated tokens, ` +
          `stagedSummary=${context.usedStagedSummary}`
        );
      }
    } catch (error) {
      console.warn('[objectives-polish] Attached document context failed, continuing without:', error);
    }

    // Build the polish prompt. CRITICAL: always send the row's `text` (the
    // canonical short form). Sending `textPolished` would mean the AI re-polishes
    // its own output and the user's recent edits to Short would be invisible.
    let sourceDetailMap = new Map<string, string>();
    try {
      sourceDetailMap = await getLatestObjectiveSourceDetailMap(
        projectId,
        Array.from(new Set(validRows.map((row) => row.objectiveType as ObjectiveType))),
      );
    } catch (error) {
      console.warn('[objectives-polish] Source evidence lookup failed, continuing without:', error);
    }

    const prompt = buildPolishPrompt({
      profileContext,
      domainContextSection,
      attachedDocumentContext,
      bullets: validRows.map((r) => ({
        text: r.text,
        sourceDetail: sourceDetailMap.get(sourceDetailKey(r.objectiveType as ObjectiveType, r.text)),
      })),
    });

    const { text: aiText } = await aiComplete({
      featureGroup: 'objectives_generation',
      maxTokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse JSON array from response
    let polishedTexts: string[];
    try {
      let jsonText = aiText;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      polishedTexts = JSON.parse(jsonText.trim());
      if (!Array.isArray(polishedTexts)) {
        throw new Error('Response is not an array');
      }
    } catch (e) {
      console.error('[objectives-polish] Failed to parse AI response:', e);
      // Fallback: return original texts unchanged
      polishedTexts = validRows.map(r => r.textPolished || r.text);
    }

    // Update each row with its polished text. Polish is NON-DESTRUCTIVE:
    //   - Missing or empty AI response for a row → leave the row unchanged.
    //     The AI is fallible; we never silently destroy user data on its say-so.
    //   - Use the trash icon for actual deletion.
    const updatedRows = [];
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const polishedText = polishedTexts[i];

      if (typeof polishedText !== 'string' || polishedText.trim() === '') {
        // No usable polished text for this row — preserve the row as-is.
        updatedRows.push(row);
        continue;
      }

      const [updated] = await db
        .update(projectObjectives)
        .set({
          textPolished: polishedText,
          status: 'polished',
          updatedAt: new Date(),
        })
        .where(eq(projectObjectives.id, row.id))
        .returning();

      if (updated) {
        updatedRows.push(updated);
      }
    }

    return NextResponse.json({
      success: true,
      data: { polished: updatedRows },
    });
  } catch (error) {
    console.error('Failed to polish objectives:', error);
    return NextResponse.json(
      { success: false, error: { code: 'POLISH_ERROR', message: 'Failed to polish objectives' } },
      { status: 500 }
    );
  }
}
