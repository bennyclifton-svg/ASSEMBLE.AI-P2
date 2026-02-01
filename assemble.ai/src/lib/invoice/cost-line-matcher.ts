/**
 * Invoice-to-Cost-Line Matcher Service
 * Feature 006 - Cost Planning Module
 *
 * Intelligently matches uploaded invoices to cost lines using:
 * 1. Stakeholder-based matching (when stakeholder has single cost line)
 * 2. AI description matching (when stakeholder has multiple cost lines)
 * 3. Fuzzy fallback (when no stakeholder match)
 */

import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { costLines, projectStakeholders } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface CostLineInfo {
  id: string;
  activity: string;
  costCode: string | null;
  section: string;
  stakeholderName: string | null;
}

export interface InvoiceCostLineMatchResult {
  found: boolean;
  costLineId: string | null;
  costLine: CostLineInfo | null;
  matchConfidence: number; // 0-1
  matchType: 'stakeholder_single' | 'ai_description' | 'fuzzy_fallback' | 'no_match';
  matchReason: string;
  alternatives?: Array<{
    costLineId: string;
    activity: string;
    confidence: number;
  }>;
}

export interface InvoiceMatchInput {
  companyName: string | null;
  description: string | null;
  poNumber: string | null;
  stakeholderId: string | null;
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
// CONSTANTS
// ============================================================================

const MATCH_THRESHOLDS = {
  AUTO_ASSIGN: 0.80,
  SUGGEST: 0.50,
  MIN_DISPLAY: 0.30,
};

const SINGLE_COSTLINE_CONFIDENCE = 0.95;

// ============================================================================
// AI MATCHING PROMPT
// ============================================================================

const AI_MATCHING_PROMPT = `You are an expert at matching construction/consulting invoice descriptions to cost line items.

Given an invoice description and a list of cost line activities, identify which cost line best matches the invoice.

IMPORTANT:
- Consider semantic similarity, not just keyword matching
- Construction invoices often use different terminology than budget items
- Look for service types, trade names, and scope descriptions
- Consider partial matches if the invoice covers part of a cost line's scope
- If no good match exists, return null for bestMatchId with low confidence

Invoice Description: "{{INVOICE_DESCRIPTION}}"
{{PO_NUMBER_SECTION}}

Cost Lines (format: ID | Activity | Section):
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

// ============================================================================
// FUZZY MATCHING UTILITIES (from variation/cost-line-matcher.ts)
// ============================================================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (normA === normB) return 1.0;

  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.9;
  }

  const wordsA = normA.split(' ').filter(w => w.length > 2);
  const wordsB = normB.split(' ').filter(w => w.length > 2);
  const commonWords = wordsA.filter(w => wordsB.includes(w));
  if (commonWords.length > 0) {
    const overlapScore = commonWords.length / Math.max(wordsA.length, wordsB.length);
    if (overlapScore >= 0.5) return 0.7 + overlapScore * 0.2;
  }

  const maxLength = Math.max(normA.length, normB.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  const similarity = 1 - distance / maxLength;

  return Math.max(0, similarity);
}

// ============================================================================
// ANTHROPIC CLIENT
// ============================================================================

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  return new Anthropic();
}

// ============================================================================
// AI MATCHING FUNCTION
// ============================================================================

async function aiMatchInvoiceToCostLine(
  invoiceDescription: string,
  poNumber: string | null,
  costLinesList: Array<{ id: string; activity: string; section: string }>
): Promise<AIMatchResult> {
  const anthropic = getAnthropicClient();

  // Build cost lines list for prompt
  const costLinesText = costLinesList
    .map((cl, idx) => `${idx + 1}. [ID: ${cl.id}] ${cl.activity} (${cl.section})`)
    .join('\n');

  // Build PO number section if available
  const poNumberSection = poNumber
    ? `PO Number: "${poNumber}"`
    : '';

  // Build final prompt
  const prompt = AI_MATCHING_PROMPT
    .replace('{{INVOICE_DESCRIPTION}}', invoiceDescription)
    .replace('{{PO_NUMBER_SECTION}}', poNumberSection)
    .replace('{{COST_LINES}}', costLinesText);

  console.log(`[invoice-cost-matcher] Calling AI to match among ${costLinesList.length} cost lines`);

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
    console.log(`[invoice-cost-matcher] AI match result: ${result.bestMatchId || 'no match'} (confidence: ${result.confidence})`);

    return result;
  } catch (error) {
    console.error('[invoice-cost-matcher] AI matching failed:', error);
    return {
      bestMatchId: null,
      confidence: 0,
      reason: 'AI matching failed',
      alternatives: [],
    };
  }
}

// ============================================================================
// FUZZY FALLBACK MATCHING
// ============================================================================

async function fuzzyMatchToCostLines(
  searchText: string,
  projectId: string
): Promise<InvoiceCostLineMatchResult> {
  console.log(`[invoice-cost-matcher] Fuzzy matching: "${searchText}" in project ${projectId}`);

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
    return {
      found: false,
      costLineId: null,
      costLine: null,
      matchConfidence: 0,
      matchType: 'no_match',
      matchReason: 'No cost lines in project',
    };
  }

  let bestMatch: { costLine: typeof projectCostLines[0]; score: number } | null = null;
  const alternatives: Array<{ costLineId: string; activity: string; confidence: number }> = [];

  for (const line of projectCostLines) {
    const activityScore = calculateSimilarity(searchText, line.activity);
    const stakeholderScore = line.stakeholder?.name
      ? calculateSimilarity(searchText, line.stakeholder.name)
      : 0;

    const bestScore = Math.max(activityScore, stakeholderScore);

    if (bestScore >= MATCH_THRESHOLDS.MIN_DISPLAY) {
      alternatives.push({
        costLineId: line.id,
        activity: line.activity,
        confidence: bestScore,
      });

      if (!bestMatch || bestScore > bestMatch.score) {
        bestMatch = { costLine: line, score: bestScore };
      }
    }
  }

  // Sort alternatives by confidence
  alternatives.sort((a, b) => b.confidence - a.confidence);

  if (bestMatch && bestMatch.score >= MATCH_THRESHOLDS.SUGGEST) {
    return {
      found: true,
      costLineId: bestMatch.costLine.id,
      costLine: {
        id: bestMatch.costLine.id,
        activity: bestMatch.costLine.activity,
        costCode: bestMatch.costLine.costCode,
        section: bestMatch.costLine.section,
        stakeholderName: bestMatch.costLine.stakeholder?.name || null,
      },
      matchConfidence: bestMatch.score,
      matchType: 'fuzzy_fallback',
      matchReason: `Fuzzy matched to "${bestMatch.costLine.activity}" based on description similarity`,
      alternatives: alternatives.slice(1, 4), // Return up to 3 alternatives
    };
  }

  return {
    found: false,
    costLineId: null,
    costLine: null,
    matchConfidence: bestMatch?.score || 0,
    matchType: 'no_match',
    matchReason: 'No sufficiently similar cost lines found',
    alternatives: alternatives.slice(0, 3),
  };
}

// ============================================================================
// MAIN MATCHING FUNCTION
// ============================================================================

/**
 * Match an invoice to a cost line using intelligent multi-stage matching
 */
export async function matchInvoiceToCostLine(
  input: InvoiceMatchInput,
  projectId: string
): Promise<InvoiceCostLineMatchResult> {
  console.log(`[invoice-cost-matcher] Starting match for project ${projectId}`);
  console.log(`[invoice-cost-matcher] Input: stakeholderId=${input.stakeholderId}, description="${input.description?.substring(0, 50)}..."`);

  // Stage 1: If we have a stakeholder ID, find their cost lines
  if (input.stakeholderId) {
    const stakeholderCostLines = await db.query.costLines.findMany({
      where: and(
        eq(costLines.projectId, projectId),
        eq(costLines.stakeholderId, input.stakeholderId),
        isNull(costLines.deletedAt)
      ),
      with: {
        stakeholder: true,
      },
    });

    console.log(`[invoice-cost-matcher] Found ${stakeholderCostLines.length} cost lines for stakeholder ${input.stakeholderId}`);

    // Stage 1a: Single cost line for stakeholder - high confidence auto-assign
    if (stakeholderCostLines.length === 1) {
      const line = stakeholderCostLines[0];
      console.log(`[invoice-cost-matcher] Single cost line match: ${line.activity}`);

      return {
        found: true,
        costLineId: line.id,
        costLine: {
          id: line.id,
          activity: line.activity,
          costCode: line.costCode,
          section: line.section,
          stakeholderName: line.stakeholder?.name || null,
        },
        matchConfidence: SINGLE_COSTLINE_CONFIDENCE,
        matchType: 'stakeholder_single',
        matchReason: `Only cost line for ${line.stakeholder?.name || 'this stakeholder'}`,
      };
    }

    // Stage 1b: Multiple cost lines - use AI to disambiguate if we have description
    if (stakeholderCostLines.length > 1 && input.description) {
      console.log(`[invoice-cost-matcher] Multiple cost lines (${stakeholderCostLines.length}) - using AI matching`);

      const aiResult = await aiMatchInvoiceToCostLine(
        input.description,
        input.poNumber,
        stakeholderCostLines.map(cl => ({
          id: cl.id,
          activity: cl.activity,
          section: cl.section,
        }))
      );

      if (aiResult.bestMatchId && aiResult.confidence >= MATCH_THRESHOLDS.MIN_DISPLAY) {
        const matchedLine = stakeholderCostLines.find(cl => cl.id === aiResult.bestMatchId);

        if (matchedLine) {
          // Build alternatives from AI response
          const alternatives = aiResult.alternatives
            .filter(alt => alt.id !== aiResult.bestMatchId)
            .map(alt => {
              const line = stakeholderCostLines.find(cl => cl.id === alt.id);
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

      // AI couldn't decide - return no match but list alternatives
      return {
        found: false,
        costLineId: null,
        costLine: null,
        matchConfidence: aiResult.confidence,
        matchType: 'no_match',
        matchReason: 'Could not determine best match among multiple cost lines',
        alternatives: stakeholderCostLines.slice(0, 3).map(cl => ({
          costLineId: cl.id,
          activity: cl.activity,
          confidence: 0.5, // Equal probability when undecided
        })),
      };
    }

    // Stage 1c: Multiple cost lines but no description - pick first with lower confidence
    if (stakeholderCostLines.length > 1) {
      const line = stakeholderCostLines[0];
      console.log(`[invoice-cost-matcher] Multiple cost lines, no description - returning first: ${line.activity}`);

      return {
        found: true,
        costLineId: line.id,
        costLine: {
          id: line.id,
          activity: line.activity,
          costCode: line.costCode,
          section: line.section,
          stakeholderName: line.stakeholder?.name || null,
        },
        matchConfidence: 0.60, // Lower confidence since we're guessing
        matchType: 'stakeholder_single', // Technically not single, but no AI was used
        matchReason: `First cost line for ${line.stakeholder?.name || 'this stakeholder'} (multiple lines exist)`,
        alternatives: stakeholderCostLines.slice(1, 4).map(cl => ({
          costLineId: cl.id,
          activity: cl.activity,
          confidence: 0.60,
        })),
      };
    }
  }

  // Stage 2: No stakeholder match - try fuzzy matching on description
  if (input.description) {
    return fuzzyMatchToCostLines(input.description, projectId);
  }

  // Stage 3: No stakeholder and no description - cannot match
  console.log('[invoice-cost-matcher] No stakeholder or description to match against');
  return {
    found: false,
    costLineId: null,
    costLine: null,
    matchConfidence: 0,
    matchType: 'no_match',
    matchReason: 'No stakeholder match and no description for fuzzy matching',
  };
}
