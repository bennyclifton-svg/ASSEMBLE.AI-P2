/**
 * Cost Line Matcher Service
 * Feature 006 - Cost Planning Module
 *
 * Matches extracted variation references to existing cost lines
 * in the project using fuzzy matching and AI-enhanced matching.
 */

import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { costLines } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface CostLineMatch {
  costLineId: string;
  costCode: string | null;
  activity: string;
  section: string;
  matchScore: number; // 0-1
  matchType: 'exact' | 'partial' | 'fuzzy';
  disciplineName?: string;
  tradeName?: string;
}

export interface CostLineMatchResult {
  found: boolean;
  match: CostLineMatch | null;
}

// Enhanced result type for AI matching
export interface EnhancedCostLineMatchResult {
  found: boolean;
  costLineId: string | null;
  costLine: {
    id: string;
    activity: string;
    costCode: string | null;
    section: string;
    stakeholderName: string | null;
  } | null;
  matchConfidence: number; // 0-1
  matchType: 'exact' | 'ai_description' | 'fuzzy' | 'no_match';
  matchReason: string;
  alternatives?: Array<{
    costLineId: string;
    activity: string;
    confidence: number;
  }>;
}

export interface VariationMatchInput {
  costLineReference: string | null;
  description: string;
  category: string;
}

interface AIMatchResult {
  bestMatchId: string | null;
  confidence: number;
  reason: string;
  alternatives: Array<{
    id: string;
    confidence: number;
  }>;
}

// ============================================================================
// FUZZY MATCHING UTILITIES
// ============================================================================

/**
 * Normalize text for comparison
 * - Lowercase
 * - Remove common prefixes/suffixes
 * - Remove punctuation
 * - Collapse multiple spaces
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  // Exact match after normalization
  if (normA === normB) return 1.0;

  // One contains the other (partial match)
  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.9;
  }

  // Check if any significant words overlap
  const wordsA = normA.split(' ').filter(w => w.length > 2);
  const wordsB = normB.split(' ').filter(w => w.length > 2);
  const commonWords = wordsA.filter(w => wordsB.includes(w));
  if (commonWords.length > 0) {
    const overlapScore = commonWords.length / Math.max(wordsA.length, wordsB.length);
    if (overlapScore >= 0.5) return 0.7 + overlapScore * 0.2;
  }

  // Levenshtein-based similarity
  const maxLength = Math.max(normA.length, normB.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  const similarity = 1 - distance / maxLength;

  return Math.max(0, similarity);
}

// ============================================================================
// MATCHING FUNCTIONS
// ============================================================================

/**
 * Match extracted cost line reference to existing cost lines in the project
 */
export async function matchCostLine(
  reference: string | null,
  projectId: string
): Promise<CostLineMatchResult> {
  if (!reference?.trim()) {
    return {
      found: false,
      match: null,
    };
  }

  const searchText = reference.trim();
  console.log(`[cost-line-matcher] Searching for: "${searchText}" in project ${projectId}`);

  // Fetch all cost lines for this project with stakeholder info
  const projectCostLines = await db.query.costLines.findMany({
    where: and(
      eq(costLines.projectId, projectId),
      isNull(costLines.deletedAt)
    ),
    with: {
      stakeholder: true,
    },
  });

  if (projectCostLines.length === 0) {
    console.log('[cost-line-matcher] No cost lines found for project');
    return { found: false, match: null };
  }

  let bestMatch: CostLineMatch | null = null;
  let bestScore = 0;

  for (const line of projectCostLines) {
    // Check against activity description (primary matching)
    const activityScore = calculateSimilarity(searchText, line.activity);
    if (activityScore > bestScore && activityScore >= 0.6) {
      bestScore = activityScore;
      bestMatch = {
        costLineId: line.id,
        costCode: line.costCode,
        activity: line.activity,
        section: line.section,
        matchScore: activityScore,
        matchType: activityScore >= 0.9 ? 'exact' : activityScore >= 0.7 ? 'partial' : 'fuzzy',
        disciplineName: line.stakeholder?.name,
        tradeName: undefined,
      };
    }

    // Check against stakeholder name (discipline/trade)
    if (line.stakeholder?.name) {
      const stakeholderScore = calculateSimilarity(searchText, line.stakeholder.name);
      if (stakeholderScore > bestScore && stakeholderScore >= 0.7) {
        bestScore = stakeholderScore;
        bestMatch = {
          costLineId: line.id,
          costCode: line.costCode,
          activity: line.activity,
          section: line.section,
          matchScore: stakeholderScore,
          matchType: stakeholderScore >= 0.9 ? 'exact' : 'partial',
          disciplineName: line.stakeholder.name,
          tradeName: undefined,
        };
      }
    }
  }

  if (bestMatch) {
    console.log(`[cost-line-matcher] Found match: ${bestMatch.costCode || bestMatch.activity} (score: ${bestMatch.matchScore.toFixed(2)})`);
    return { found: true, match: bestMatch };
  }

  console.log(`[cost-line-matcher] No match found for: "${searchText}"`);
  return { found: false, match: null };
}

/**
 * Search cost lines by partial text (for autocomplete)
 */
export async function searchCostLines(
  searchTerm: string,
  projectId: string,
  limit = 10
): Promise<CostLineMatch[]> {
  if (!searchTerm?.trim()) return [];

  const projectCostLines = await db.query.costLines.findMany({
    where: and(
      eq(costLines.projectId, projectId),
      isNull(costLines.deletedAt)
    ),
    with: {
      stakeholder: true,
    },
  });

  const matches: CostLineMatch[] = [];

  for (const line of projectCostLines) {
    const activityScore = calculateSimilarity(searchTerm, line.activity);
    const stakeholderScore = line.stakeholder?.name
      ? calculateSimilarity(searchTerm, line.stakeholder.name)
      : 0;

    const bestScore = Math.max(activityScore, stakeholderScore);

    if (bestScore >= 0.3) {
      matches.push({
        costLineId: line.id,
        costCode: line.costCode,
        activity: line.activity,
        section: line.section,
        matchScore: bestScore,
        matchType: bestScore >= 0.9 ? 'exact' : bestScore >= 0.7 ? 'partial' : 'fuzzy',
        disciplineName: line.stakeholder?.name,
        tradeName: undefined,
      });
    }
  }

  // Sort by score descending and limit
  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// ============================================================================
// AI-ENHANCED MATCHING
// ============================================================================

const MATCH_THRESHOLDS = {
  AUTO_ASSIGN: 0.80,
  SUGGEST: 0.50,
  MIN_DISPLAY: 0.30,
  USE_AI_BELOW: 0.75, // Use AI when fuzzy match is below this
};

const AI_MATCHING_PROMPT = `You are an expert at matching construction variation/change order descriptions to cost line items.

Given a variation description and a list of cost line activities, identify which cost line best matches the variation.

IMPORTANT:
- Consider semantic similarity, not just keyword matching
- Construction variations often use different terminology than budget items
- Look for trade names, disciplines, scope descriptions
- Consider which cost line would be financially impacted by this variation
- If no good match exists, return null for bestMatchId with low confidence

Variation Description: "{{DESCRIPTION}}"
{{REFERENCE_SECTION}}
Variation Category: {{CATEGORY}}

Cost Lines (format: ID | Activity | Section | Stakeholder):
{{COST_LINES}}

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "bestMatchId": "string or null (cost line ID from the list)",
  "confidence": number (0-1, your confidence in the match),
  "reason": "string (brief explanation of why this is the best match)",
  "alternatives": [
    { "id": "string (cost line ID)", "confidence": number (0-1) }
  ]
}`;

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  return new Anthropic();
}

async function aiMatchVariationToCostLine(
  description: string,
  costLineReference: string | null,
  category: string,
  costLinesList: Array<{ id: string; activity: string; section: string; stakeholderName: string | null }>
): Promise<AIMatchResult> {
  const anthropic = getAnthropicClient();

  // Build cost lines list for prompt
  const costLinesText = costLinesList
    .map((cl, idx) => `${idx + 1}. [ID: ${cl.id}] ${cl.activity} (${cl.section}) - ${cl.stakeholderName || 'No stakeholder'}`)
    .join('\n');

  // Build reference section if available
  const referenceSection = costLineReference
    ? `Cost Line Reference from document: "${costLineReference}"`
    : '';

  // Build final prompt
  const prompt = AI_MATCHING_PROMPT
    .replace('{{DESCRIPTION}}', description)
    .replace('{{REFERENCE_SECTION}}', referenceSection)
    .replace('{{CATEGORY}}', category)
    .replace('{{COST_LINES}}', costLinesText);

  console.log(`[variation-cost-matcher] Calling AI to match among ${costLinesList.length} cost lines`);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const result: AIMatchResult = JSON.parse(jsonText);
    console.log(`[variation-cost-matcher] AI match result: ${result.bestMatchId || 'no match'} (confidence: ${result.confidence})`);

    return result;
  } catch (error) {
    console.error('[variation-cost-matcher] AI matching failed:', error);
    return {
      bestMatchId: null,
      confidence: 0,
      reason: 'AI matching failed',
      alternatives: [],
    };
  }
}

/**
 * Enhanced variation-to-cost-line matching with AI support
 */
export async function matchVariationToCostLine(
  input: VariationMatchInput,
  projectId: string
): Promise<EnhancedCostLineMatchResult> {
  console.log(`[variation-cost-matcher] Starting enhanced match for project ${projectId}`);
  console.log(`[variation-cost-matcher] Input: reference="${input.costLineReference}", description="${input.description.substring(0, 50)}..."`);

  // Fetch all cost lines for this project
  const projectCostLines = await db.query.costLines.findMany({
    where: and(
      eq(costLines.projectId, projectId),
      isNull(costLines.deletedAt)
    ),
    with: {
      stakeholder: true,
    },
  });

  if (projectCostLines.length === 0) {
    console.log('[variation-cost-matcher] No cost lines found for project');
    return {
      found: false,
      costLineId: null,
      costLine: null,
      matchConfidence: 0,
      matchType: 'no_match',
      matchReason: 'No cost lines in project',
    };
  }

  // Stage 1: Try fuzzy matching first (fast, no API call)
  let bestFuzzyMatch: { line: typeof projectCostLines[0]; score: number } | null = null;
  const fuzzyMatches: Array<{ line: typeof projectCostLines[0]; score: number }> = [];

  // Search text combines reference and description
  const searchTexts = [
    input.costLineReference,
    input.description,
  ].filter(Boolean) as string[];

  for (const line of projectCostLines) {
    let bestScore = 0;

    for (const searchText of searchTexts) {
      const activityScore = calculateSimilarity(searchText, line.activity);
      const stakeholderScore = line.stakeholder?.name
        ? calculateSimilarity(searchText, line.stakeholder.name)
        : 0;

      const score = Math.max(activityScore, stakeholderScore);
      if (score > bestScore) bestScore = score;
    }

    if (bestScore >= MATCH_THRESHOLDS.MIN_DISPLAY) {
      fuzzyMatches.push({ line, score: bestScore });
      if (!bestFuzzyMatch || bestScore > bestFuzzyMatch.score) {
        bestFuzzyMatch = { line, score: bestScore };
      }
    }
  }

  // Sort fuzzy matches by score
  fuzzyMatches.sort((a, b) => b.score - a.score);

  // Stage 2: If fuzzy match is strong (>= 0.9), use it directly
  if (bestFuzzyMatch && bestFuzzyMatch.score >= 0.9) {
    console.log(`[variation-cost-matcher] Strong fuzzy match: ${bestFuzzyMatch.line.activity} (${bestFuzzyMatch.score.toFixed(2)})`);
    return {
      found: true,
      costLineId: bestFuzzyMatch.line.id,
      costLine: {
        id: bestFuzzyMatch.line.id,
        activity: bestFuzzyMatch.line.activity,
        costCode: bestFuzzyMatch.line.costCode,
        section: bestFuzzyMatch.line.section,
        stakeholderName: bestFuzzyMatch.line.stakeholder?.name || null,
      },
      matchConfidence: bestFuzzyMatch.score,
      matchType: 'exact',
      matchReason: `Exact match to "${bestFuzzyMatch.line.activity}"`,
      alternatives: fuzzyMatches.slice(1, 4).map(m => ({
        costLineId: m.line.id,
        activity: m.line.activity,
        confidence: m.score,
      })),
    };
  }

  // Stage 3: Use AI for better semantic matching
  console.log(`[variation-cost-matcher] Fuzzy match weak (${bestFuzzyMatch?.score.toFixed(2) || 0}), using AI matching`);

  const aiResult = await aiMatchVariationToCostLine(
    input.description,
    input.costLineReference,
    input.category,
    projectCostLines.map(cl => ({
      id: cl.id,
      activity: cl.activity,
      section: cl.section,
      stakeholderName: cl.stakeholder?.name || null,
    }))
  );

  if (aiResult.bestMatchId && aiResult.confidence >= MATCH_THRESHOLDS.MIN_DISPLAY) {
    const matchedLine = projectCostLines.find(cl => cl.id === aiResult.bestMatchId);

    if (matchedLine) {
      // Build alternatives from AI response
      const alternatives = aiResult.alternatives
        .filter(alt => alt.id !== aiResult.bestMatchId)
        .map(alt => {
          const line = projectCostLines.find(cl => cl.id === alt.id);
          return {
            costLineId: alt.id,
            activity: line?.activity || 'Unknown',
            confidence: alt.confidence,
          };
        })
        .slice(0, 3);

      return {
        found: true,
        costLineId: matchedLine.id,
        costLine: {
          id: matchedLine.id,
          activity: matchedLine.activity,
          costCode: matchedLine.costCode,
          section: matchedLine.section,
          stakeholderName: matchedLine.stakeholder?.name || null,
        },
        matchConfidence: aiResult.confidence,
        matchType: 'ai_description',
        matchReason: aiResult.reason,
        alternatives,
      };
    }
  }

  // Stage 4: Fall back to best fuzzy match if AI didn't find anything
  if (bestFuzzyMatch && bestFuzzyMatch.score >= MATCH_THRESHOLDS.SUGGEST) {
    console.log(`[variation-cost-matcher] Falling back to fuzzy match: ${bestFuzzyMatch.line.activity}`);
    return {
      found: true,
      costLineId: bestFuzzyMatch.line.id,
      costLine: {
        id: bestFuzzyMatch.line.id,
        activity: bestFuzzyMatch.line.activity,
        costCode: bestFuzzyMatch.line.costCode,
        section: bestFuzzyMatch.line.section,
        stakeholderName: bestFuzzyMatch.line.stakeholder?.name || null,
      },
      matchConfidence: bestFuzzyMatch.score,
      matchType: 'fuzzy',
      matchReason: `Fuzzy matched to "${bestFuzzyMatch.line.activity}"`,
      alternatives: fuzzyMatches.slice(1, 4).map(m => ({
        costLineId: m.line.id,
        activity: m.line.activity,
        confidence: m.score,
      })),
    };
  }

  // No match found
  console.log('[variation-cost-matcher] No match found');
  return {
    found: false,
    costLineId: null,
    costLine: null,
    matchConfidence: bestFuzzyMatch?.score || 0,
    matchType: 'no_match',
    matchReason: 'No sufficiently similar cost lines found',
    alternatives: fuzzyMatches.slice(0, 3).map(m => ({
      costLineId: m.line.id,
      activity: m.line.activity,
      confidence: m.score,
    })),
  };
}
