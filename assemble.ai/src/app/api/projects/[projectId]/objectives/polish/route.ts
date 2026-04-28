/**
 * Objectives Polish API
 * Polish individual objective rows by ID using AI
 * Feature: 019-profiler
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectObjectives } from '@/lib/db/objectives-schema';
import { projectProfiles } from '@/lib/db/pg-schema';
import { aiComplete } from '@/lib/ai/client';
import { getCurrentUser } from '@/lib/auth/get-user';
import { retrieveFromDomains, type DomainRetrievalResult } from '@/lib/rag/retrieval';
import { resolveProfileDomainTags, buildProfileSearchQuery } from '@/lib/constants/knowledge-domains';

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

    const { ids } = body as { ids?: unknown };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ids must be a non-empty array of objective row IDs' } },
        { status: 400 }
      );
    }

    const idStrings = ids.filter((id): id is string => typeof id === 'string');
    if (idStrings.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ids must contain string values' } },
        { status: 400 }
      );
    }

    // Fetch the rows to polish — only rows belonging to this project
    const rows = await db
      .select()
      .from(projectObjectives)
      .where(
        inArray(projectObjectives.id, idStrings)
      );

    // Filter to only rows belonging to this project and not deleted
    const validRows = rows.filter(r => r.projectId === projectId && !r.isDeleted);

    if (validRows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No valid objectives found for the provided IDs' } },
        { status: 404 }
      );
    }

    // Fetch profile for context
    const [profile] = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    let profileContext = '';
    let domainContextSection = '';

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

    // Build the list of bullets to polish (use existing textPolished if available, else text)
    const bulletList = validRows
      .map((r, i) => `${i + 1}. ${r.textPolished || r.text}`)
      .join('\n');

    const prompt = `You are an expert construction project manager and technical writer in Australia.

${profileContext}
${domainContextSection ? `${domainContextSection}\n` : ''}OBJECTIVES TO EXPAND:

${bulletList}

INSTRUCTIONS - ITERATION 2:
Expand each bullet point to 10-15 words while preserving meaning.
1. Use the KNOWLEDGE DOMAIN CONTEXT above to add accurate Australian standards references (NCC 2022, BCA, AS standards) — cite only references found in the domain context, do not invent standards
2. Make objectives measurable where possible (quantities, percentages, ratings, timeframes)
3. Keep language professional, formal, and concise - suitable for tender documentation
4. Do NOT add new objectives not present in the input
5. Do NOT remove any items - every input bullet must have a corresponding expanded output
6. Maintain the same numbered order as the input

Return a JSON array of expanded strings (same count and order as input):
["expanded bullet 1", "expanded bullet 2", ...]`;

    const { text: aiText } = await aiComplete({
      featureGroup: 'content_polishing',
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

    // Update each row with its polished text
    const updatedRows = [];
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const polishedText = polishedTexts[i] ?? row.text;

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
