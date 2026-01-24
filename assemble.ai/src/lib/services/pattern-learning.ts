/**
 * Pattern Learning Service (T056)
 * Feature: 019-profiler Phase 6 - AI Learning
 *
 * Implements aggregate, anonymous learning from user inputs:
 * - "Other" subclass entries (LEARN-001)
 * - Manual objectives analysis (LEARN-002)
 * - Polish edit tracking (LEARN-003)
 * - "Other" complexity inputs (CMPLX-005)
 */

import { db } from '../db';
import { profilePatterns } from '../db/pg-schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Pattern types for classification
export type PatternType =
  | 'subclass_other'      // User-entered "Other" subclass values
  | 'complexity_other'    // User-entered "Other" complexity values
  | 'manual_objective'    // Themes from manually-entered objectives
  | 'polish_edit'         // Common edit patterns from polish operations
  | 'scale_typical';      // Scale values that deviate from defaults

interface PatternInput {
  buildingClass: string;
  projectType: string;
  patternType: PatternType;
  patternValue: string;
}

/**
 * Upsert a pattern - increment count if exists, create if new
 * Patterns are aggregate and anonymous - no project IDs stored
 */
export async function upsertPattern(input: PatternInput): Promise<void> {
  const { buildingClass, projectType, patternType, patternValue } = input;

  // Normalize the value (lowercase, trim)
  const normalizedValue = patternValue.toLowerCase().trim();

  // Skip empty or very short values
  if (normalizedValue.length < 2) return;

  try {
    // Try to find existing pattern
    const existing = await db.query.profilePatterns.findFirst({
      where: and(
        eq(profilePatterns.buildingClass, buildingClass),
        eq(profilePatterns.projectType, projectType),
        eq(profilePatterns.patternType, patternType),
        eq(profilePatterns.patternValue, normalizedValue)
      ),
    });

    if (existing) {
      // Increment count
      await db.update(profilePatterns)
        .set({
          occurrenceCount: sql`${profilePatterns.occurrenceCount} + 1`,
          lastSeen: new Date(),
        })
        .where(eq(profilePatterns.id, existing.id));
    } else {
      // Create new pattern
      await db.insert(profilePatterns).values({
        id: uuidv4(),
        buildingClass,
        projectType,
        patternType,
        patternValue: normalizedValue,
        occurrenceCount: 1,
        lastSeen: new Date(),
      });
    }
  } catch (error) {
    // Pattern learning is non-critical - log but don't throw
    console.error('[pattern-learning] Failed to upsert pattern:', error);
  }
}

/**
 * Record "Other" subclass entry (T055)
 */
export async function recordOtherSubclass(
  buildingClass: string,
  projectType: string,
  otherValue: string
): Promise<void> {
  await upsertPattern({
    buildingClass,
    projectType,
    patternType: 'subclass_other',
    patternValue: otherValue,
  });
}

/**
 * Record "Other" complexity entry (T059)
 */
export async function recordOtherComplexity(
  buildingClass: string,
  projectType: string,
  dimension: string,
  otherValue: string
): Promise<void> {
  await upsertPattern({
    buildingClass,
    projectType,
    patternType: 'complexity_other',
    patternValue: `${dimension}:${otherValue}`,
  });
}

/**
 * Analyze manual objectives for common themes (T057)
 * Extracts keywords and phrases for pattern learning
 */
export async function analyzeManualObjectives(
  buildingClass: string,
  projectType: string,
  objectivesText: string
): Promise<void> {
  // Extract meaningful phrases (simple keyword extraction)
  const keywords = extractKeywords(objectivesText);

  for (const keyword of keywords) {
    await upsertPattern({
      buildingClass,
      projectType,
      patternType: 'manual_objective',
      patternValue: keyword,
    });
  }
}

/**
 * Track polish edits for template improvement (T058)
 * Records the type of edits users make to AI content
 */
export async function trackPolishEdit(
  buildingClass: string,
  projectType: string,
  editType: string,
  editContext: string
): Promise<void> {
  await upsertPattern({
    buildingClass,
    projectType,
    patternType: 'polish_edit',
    patternValue: `${editType}:${editContext}`,
  });
}

/**
 * Get popular patterns for a given context
 * Used to inform template suggestions
 */
export async function getPopularPatterns(
  buildingClass: string,
  projectType: string,
  patternType: PatternType,
  limit: number = 10
): Promise<Array<{ value: string; count: number }>> {
  try {
    const patterns = await db.query.profilePatterns.findMany({
      where: and(
        eq(profilePatterns.buildingClass, buildingClass),
        eq(profilePatterns.projectType, projectType),
        eq(profilePatterns.patternType, patternType)
      ),
      orderBy: (patterns, { desc }) => [desc(patterns.occurrenceCount)],
      limit,
    });

    return patterns.map(p => ({
      value: p.patternValue,
      count: p.occurrenceCount ?? 0,
    }));
  } catch (error) {
    console.error('[pattern-learning] Failed to get patterns:', error);
    return [];
  }
}

/**
 * Extract keywords from text for pattern analysis
 * Simple implementation - could be enhanced with NLP
 */
function extractKeywords(text: string): string[] {
  // Common construction/project-related keywords to look for
  const relevantTerms = [
    'sustainability', 'green', 'energy', 'efficient', 'solar', 'renewable',
    'accessible', 'disability', 'inclusive', 'universal',
    'heritage', 'conservation', 'historic',
    'flexible', 'adaptable', 'future-proof',
    'community', 'stakeholder', 'engagement',
    'cost-effective', 'budget', 'value',
    'timeline', 'schedule', 'milestone',
    'quality', 'standard', 'compliance',
    'safety', 'security', 'resilient',
    'innovative', 'technology', 'smart',
    'aesthetic', 'design', 'appearance',
    'functional', 'operational', 'maintenance',
    'parking', 'traffic', 'access',
    'acoustic', 'noise', 'privacy',
    'daylight', 'ventilation', 'comfort',
    'fire', 'emergency', 'evacuation',
    'storage', 'logistics', 'delivery',
    'landscaping', 'outdoor', 'amenity',
  ];

  const normalizedText = text.toLowerCase();
  const foundTerms: string[] = [];

  for (const term of relevantTerms) {
    if (normalizedText.includes(term) && !foundTerms.includes(term)) {
      foundTerms.push(term);
    }
  }

  return foundTerms.slice(0, 5); // Limit to top 5 per analysis
}

/**
 * Compare original and edited text to identify edit patterns
 * Used for polish tracking
 */
export function identifyEditPatterns(
  original: string,
  edited: string
): Array<{ type: string; context: string }> {
  const patterns: Array<{ type: string; context: string }> = [];

  // Check for length changes
  const lengthDiff = edited.length - original.length;
  if (lengthDiff > 100) {
    patterns.push({ type: 'expanded', context: 'significant_addition' });
  } else if (lengthDiff < -100) {
    patterns.push({ type: 'condensed', context: 'significant_reduction' });
  }

  // Check for structural changes (bullet points, headers)
  if (edited.includes('•') && !original.includes('•')) {
    patterns.push({ type: 'structured', context: 'added_bullets' });
  }
  if (edited.includes('\n\n') && !original.includes('\n\n')) {
    patterns.push({ type: 'structured', context: 'added_paragraphs' });
  }

  // Check for specificity (numbers, measurements)
  const originalNumbers = (original.match(/\d+/g) || []).length;
  const editedNumbers = (edited.match(/\d+/g) || []).length;
  if (editedNumbers > originalNumbers + 2) {
    patterns.push({ type: 'quantified', context: 'added_specifics' });
  }

  return patterns;
}
