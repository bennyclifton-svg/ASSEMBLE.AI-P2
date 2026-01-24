/**
 * Cost Line Matcher Service
 * Feature 006 - Cost Planning Module
 *
 * Matches extracted variation references to existing cost lines
 * in the project using fuzzy matching.
 */

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
    // Check against cost code (exact match preferred)
    if (line.costCode) {
      const codeNorm = normalizeText(line.costCode);
      const searchNorm = normalizeText(searchText);
      if (codeNorm === searchNorm || searchNorm.includes(codeNorm) || codeNorm.includes(searchNorm)) {
        const score = 0.95;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            costLineId: line.id,
            costCode: line.costCode,
            activity: line.activity,
            section: line.section,
            matchScore: score,
            matchType: 'exact',
            disciplineName: line.stakeholder?.name,
            tradeName: undefined,
          };
        }
      }
    }

    // Check against activity description
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
    const codeScore = line.costCode ? calculateSimilarity(searchTerm, line.costCode) : 0;
    const stakeholderScore = line.stakeholder?.name
      ? calculateSimilarity(searchTerm, line.stakeholder.name)
      : 0;

    const bestScore = Math.max(activityScore, codeScore, stakeholderScore);

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
