/**
 * Budget Estimate Allocation Logic
 * Distributes a total budget estimate across cost plan line items
 * using predefined allocation profiles per building class.
 */

import type { CostLineSection, CostLineWithCalculations } from '@/types/cost-plan';
import allocationProfiles from '@/lib/data/allocation-profiles.json';

// ============================================================================
// TYPES
// ============================================================================

export interface AllocationItem {
  activity: string;
  percent: number;
}

export interface AllocationSection {
  section: CostLineSection;
  items: AllocationItem[];
}

export interface AllocationProfile {
  id: string;
  projectType: string;
  buildingClass: string;
  label: string;
  sections: AllocationSection[];
}

export type MatchStatus = 'matched' | 'new' | 'unallocated';

export interface AllocationPreviewLine {
  /** Existing cost line ID, or null for new lines */
  costLineId: string | null;
  section: CostLineSection;
  activity: string;
  percent: number;
  amountCents: number;
  matchStatus: MatchStatus;
  /** Whether user has locked this line's % */
  locked: boolean;
  /** Current budget (for existing lines) */
  currentBudgetCents: number;
}

// ============================================================================
// NCC CLASS → PROFILE MAPPING
// ============================================================================

/**
 * Maps NCC class strings (e.g. "Class 2") to allocation profile IDs.
 * Handles compound classes like "Class 1a/2" by picking the first match.
 */
const NCC_TO_PROFILE: Record<string, string> = {
  'Class 1a': 'class_1a',
  'Class 1a/2': 'class_2',
  'Class 1a/2/3': 'class_2',
  'Class 2': 'class_2',
  'Class 3': 'class_3',
  'Class 5': 'class_5',
  'Class 5/9a': 'class_9a',
  'Class 5/9b': 'class_9b',
  'Class 6': 'class_6',
  'Class 7': 'class_7',
  'Class 7a': 'class_7',
  'Class 7b': 'class_7',
  'Class 8': 'class_8',
  'Class 9a': 'class_9a',
  'Class 9b': 'class_9b',
  'Class 9c': 'class_9a',
};

// ============================================================================
// PROFILE LOOKUP
// ============================================================================

export function getAllocationProfiles(): AllocationProfile[] {
  return allocationProfiles as AllocationProfile[];
}

export function getProfileForBuildingClass(nccClass: string): AllocationProfile | null {
  const profileId = NCC_TO_PROFILE[nccClass];
  if (!profileId) return null;
  return (allocationProfiles as AllocationProfile[]).find(p => p.id === profileId) || null;
}

// ============================================================================
// ACTIVITY MATCHING
// ============================================================================

function normalizeActivity(activity: string): string {
  return activity
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match a profile activity to an existing cost line.
 * Returns the matched cost line or null.
 */
function findMatchingCostLine(
  profileActivity: string,
  section: CostLineSection,
  costLines: CostLineWithCalculations[]
): CostLineWithCalculations | null {
  const normalizedProfile = normalizeActivity(profileActivity);
  const sectionLines = costLines.filter(cl => cl.section === section && !cl.deletedAt);

  // Exact match first
  for (const cl of sectionLines) {
    if (normalizeActivity(cl.activity) === normalizedProfile) {
      return cl;
    }
  }

  // Fuzzy match: check if one contains the other
  for (const cl of sectionLines) {
    const normalizedLine = normalizeActivity(cl.activity);
    if (normalizedLine.includes(normalizedProfile) || normalizedProfile.includes(normalizedLine)) {
      return cl;
    }
  }

  // Word overlap match (at least 60% overlap)
  const profileWords = new Set(normalizedProfile.split(' '));
  for (const cl of sectionLines) {
    const lineWords = new Set(normalizeActivity(cl.activity).split(' '));
    const intersection = [...profileWords].filter(w => lineWords.has(w));
    const overlapRatio = intersection.length / Math.max(profileWords.size, lineWords.size);
    if (overlapRatio >= 0.6) {
      return cl;
    }
  }

  return null;
}

// ============================================================================
// ALLOCATION CALCULATION
// ============================================================================

/**
 * Build the preview allocation, matching profile items to existing cost lines.
 */
export function buildAllocationPreview(
  profile: AllocationProfile,
  costLines: CostLineWithCalculations[],
  totalBudgetCents: number
): AllocationPreviewLine[] {
  const preview: AllocationPreviewLine[] = [];
  const matchedCostLineIds = new Set<string>();

  // Match profile items to existing cost lines
  for (const section of profile.sections) {
    for (const item of section.items) {
      const amountCents = Math.round(totalBudgetCents * item.percent / 100);
      const matchedLine = findMatchingCostLine(item.activity, section.section, costLines);

      if (matchedLine && !matchedCostLineIds.has(matchedLine.id)) {
        matchedCostLineIds.add(matchedLine.id);
        preview.push({
          costLineId: matchedLine.id,
          section: section.section,
          activity: matchedLine.activity,
          percent: item.percent,
          amountCents,
          matchStatus: 'matched',
          locked: false,
          currentBudgetCents: matchedLine.budgetCents,
        });
      } else {
        preview.push({
          costLineId: null,
          section: section.section,
          activity: item.activity,
          percent: item.percent,
          amountCents,
          matchStatus: 'new',
          locked: false,
          currentBudgetCents: 0,
        });
      }
    }
  }

  // Add unallocated existing cost lines
  const activeCostLines = costLines.filter(cl => !cl.deletedAt);
  for (const cl of activeCostLines) {
    if (!matchedCostLineIds.has(cl.id)) {
      preview.push({
        costLineId: cl.id,
        section: cl.section,
        activity: cl.activity,
        percent: 0,
        amountCents: 0,
        matchStatus: 'unallocated',
        locked: false,
        currentBudgetCents: cl.budgetCents,
      });
    }
  }

  return preview;
}

/**
 * Recalculate amounts after the total budget changes.
 * Preserves locked line percentages, scales unlocked ones.
 */
export function recalculateAmounts(
  lines: AllocationPreviewLine[],
  totalBudgetCents: number
): AllocationPreviewLine[] {
  return lines.map(line => ({
    ...line,
    amountCents: Math.round(totalBudgetCents * line.percent / 100),
  }));
}

/**
 * Adjust a single line's percentage and redistribute among unlocked lines in the same section.
 */
export function adjustLinePercent(
  lines: AllocationPreviewLine[],
  index: number,
  newPercent: number,
  totalBudgetCents: number
): AllocationPreviewLine[] {
  const updated = [...lines];
  const targetLine = updated[index];
  const oldPercent = targetLine.percent;
  const delta = newPercent - oldPercent;

  // Update the target line
  updated[index] = {
    ...targetLine,
    percent: newPercent,
    amountCents: Math.round(totalBudgetCents * newPercent / 100),
  };

  // Find unlocked lines in the same section (excluding the adjusted line)
  const sameSection = updated
    .map((l, i) => ({ line: l, idx: i }))
    .filter(({ line, idx }) =>
      idx !== index &&
      line.section === targetLine.section &&
      !line.locked &&
      line.percent > 0
    );

  if (sameSection.length > 0 && delta !== 0) {
    const totalUnlockedPercent = sameSection.reduce((sum, { line }) => sum + line.percent, 0);
    if (totalUnlockedPercent > 0) {
      // Distribute the delta proportionally across unlocked lines
      for (const { line, idx } of sameSection) {
        const ratio = line.percent / totalUnlockedPercent;
        const adjustedPercent = Math.max(0, line.percent - delta * ratio);
        const roundedPercent = Math.round(adjustedPercent * 10) / 10;
        updated[idx] = {
          ...line,
          percent: roundedPercent,
          amountCents: Math.round(totalBudgetCents * roundedPercent / 100),
        };
      }
    }
  }

  return updated;
}

/**
 * Calculate section totals from preview lines.
 */
export function getSectionTotals(
  lines: AllocationPreviewLine[]
): Record<CostLineSection, { percent: number; amountCents: number }> {
  const totals: Record<CostLineSection, { percent: number; amountCents: number }> = {
    FEES: { percent: 0, amountCents: 0 },
    CONSULTANTS: { percent: 0, amountCents: 0 },
    CONSTRUCTION: { percent: 0, amountCents: 0 },
    CONTINGENCY: { percent: 0, amountCents: 0 },
  };

  for (const line of lines) {
    totals[line.section].percent += line.percent;
    totals[line.section].amountCents += line.amountCents;
  }

  // Round percentages
  for (const key of Object.keys(totals) as CostLineSection[]) {
    totals[key].percent = Math.round(totals[key].percent * 10) / 10;
  }

  return totals;
}

/**
 * Remove a line and redistribute its percentage among remaining unlocked lines
 * in the same section. Returns updated lines with the removed line zeroed out.
 */
export function removeLineAndRedistribute(
  lines: AllocationPreviewLine[],
  removeIndex: number,
  removedIndices: Set<number>,
  totalBudgetCents: number
): AllocationPreviewLine[] {
  const updated = [...lines];
  const removed = updated[removeIndex];
  const freedPercent = removed.percent;

  // Zero out the removed line
  updated[removeIndex] = { ...removed, percent: 0, amountCents: 0 };

  if (freedPercent <= 0) return updated;

  // Find eligible lines in the same section to absorb the freed percent
  const eligible = updated
    .map((l, i) => ({ line: l, idx: i }))
    .filter(({ line, idx }) =>
      idx !== removeIndex &&
      !removedIndices.has(idx) &&
      line.section === removed.section &&
      !line.locked &&
      line.percent > 0
    );

  if (eligible.length === 0) return updated;

  const totalEligiblePercent = eligible.reduce((sum, { line }) => sum + line.percent, 0);

  for (const { line, idx } of eligible) {
    const ratio = line.percent / totalEligiblePercent;
    const newPercent = Math.round((line.percent + freedPercent * ratio) * 10) / 10;
    updated[idx] = {
      ...line,
      percent: newPercent,
      amountCents: Math.round(totalBudgetCents * newPercent / 100),
    };
  }

  return updated;
}

/**
 * Get grand total of all percentages.
 */
export function getGrandTotalPercent(lines: AllocationPreviewLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.percent, 0) * 10) / 10;
}

// ============================================================================
// COST ESTIMATE RANGE CALCULATION
// ============================================================================

/**
 * Replicates the ContextChips cost estimate calculation.
 * Returns the range in cents.
 */
export function calculateEstimateRange(
  costRange: { low: number; mid: number; high: number },
  gfaSqm: number
): { lowCents: number; midCents: number; highCents: number } {
  return {
    lowCents: Math.round(gfaSqm * costRange.low * 100),
    midCents: Math.round((gfaSqm * (costRange.low + costRange.high) / 2) * 100),
    highCents: Math.round(gfaSqm * costRange.high * 100),
  };
}
