/**
 * Variance Calculation Functions
 * Feature 006 - Cost Planning Module (Task T059)
 *
 * Functions for comparing current cost plan state against baselines/snapshots.
 * All amounts are in cents (integers) to avoid floating-point precision issues.
 */

import type { CostPlanTotals, SectionTotals, CostLineSection } from '@/types/cost-plan';
import { formatCurrency } from './cost-plan-formulas';

// ============================================================================
// SNAPSHOT TYPES (for comparison)
// ============================================================================

export interface SnapshotTotals {
  budgetCents: number;
  approvedContractCents: number;
  forecastVariationsCents: number;
  approvedVariationsCents: number;
  finalForecastCents: number;
  varianceCents: number;
  claimedCents: number;
  currentMonthCents: number;
  etcCents: number;
}

export interface CostLineSnapshot {
  id: string;
  costCode: string | null;
  description: string;
  budgetCents: number;
  approvedContractCents: number;
  finalForecastCents: number;
  varianceToBudgetCents: number;
  claimedToDateCents: number;
}

export interface Snapshot {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  data: {
    totals: SnapshotTotals;
    sectionTotals: SectionTotals[];
    costLines: CostLineSnapshot[];
  };
}

// ============================================================================
// VARIANCE COMPARISON TYPES
// ============================================================================

export interface VarianceResult {
  field: string;
  baselineCents: number;
  currentCents: number;
  differenceCents: number;
  percentChange: number;
  direction: 'increase' | 'decrease' | 'unchanged';
}

export interface CostLineVariance {
  costLineId: string;
  costCode: string | null;
  description: string;
  budgetVariance: VarianceResult;
  forecastVariance: VarianceResult;
  claimedVariance: VarianceResult;
  overallChange: 'better' | 'worse' | 'unchanged';
}

export interface SnapshotComparison {
  snapshotName: string;
  snapshotDate: string;
  totalVariances: {
    budget: VarianceResult;
    forecast: VarianceResult;
    variance: VarianceResult;
    claimed: VarianceResult;
    etc: VarianceResult;
  };
  sectionVariances: Map<CostLineSection, {
    budget: VarianceResult;
    forecast: VarianceResult;
    variance: VarianceResult;
  }>;
  costLineVariances: CostLineVariance[];
  summary: {
    improved: number;
    worsened: number;
    unchanged: number;
  };
}

// ============================================================================
// CORE VARIANCE FUNCTIONS
// ============================================================================

/**
 * Calculate variance between baseline and current values
 */
export function calculateVariance(
  field: string,
  baselineCents: number,
  currentCents: number
): VarianceResult {
  const differenceCents = currentCents - baselineCents;
  const percentChange = baselineCents !== 0
    ? (differenceCents / Math.abs(baselineCents)) * 100
    : currentCents !== 0 ? 100 : 0;

  let direction: VarianceResult['direction'] = 'unchanged';
  if (differenceCents > 0) {
    direction = 'increase';
  } else if (differenceCents < 0) {
    direction = 'decrease';
  }

  return {
    field,
    baselineCents,
    currentCents,
    differenceCents,
    percentChange: Math.round(percentChange * 100) / 100, // 2 decimal places
    direction,
  };
}

/**
 * Calculate variance to baseline (alias for snapshot comparison)
 * Positive variance = over baseline (typically bad for costs)
 * Negative variance = under baseline (typically good for costs)
 */
export function calculateVarianceToBaseline(
  currentCents: number,
  baselineCents: number
): number {
  return currentCents - baselineCents;
}

/**
 * Format variance for display with sign and optional percentage
 */
export function formatVarianceDisplay(
  differenceCents: number,
  options: {
    showSign?: boolean;
    showPercent?: boolean;
    baselineCents?: number;
    currencyCode?: string;
  } = {}
): string {
  const {
    showSign = true,
    showPercent = false,
    baselineCents,
    currencyCode = 'AUD',
  } = options;

  const formatted = formatCurrency(Math.abs(differenceCents), currencyCode);
  let result = '';

  if (showSign) {
    if (differenceCents > 0) {
      result = `+${formatted}`;
    } else if (differenceCents < 0) {
      result = `-${formatted}`;
    } else {
      result = formatted;
    }
  } else {
    result = formatted;
  }

  if (showPercent && baselineCents !== undefined && baselineCents !== 0) {
    const percent = (differenceCents / Math.abs(baselineCents)) * 100;
    const percentStr = Math.abs(percent).toFixed(1);
    result += ` (${percent >= 0 ? '+' : '-'}${percentStr}%)`;
  }

  return result;
}

// ============================================================================
// SNAPSHOT COMPARISON FUNCTIONS
// ============================================================================

/**
 * Compare current totals against a snapshot baseline
 */
export function compareToSnapshot(
  current: CostPlanTotals,
  snapshot: Snapshot
): SnapshotComparison {
  const baselineTotals = snapshot.data.totals;

  // Calculate total variances
  const totalVariances = {
    budget: calculateVariance('budget', baselineTotals.budgetCents, current.budgetCents),
    forecast: calculateVariance('forecast', baselineTotals.finalForecastCents, current.finalForecastCents),
    variance: calculateVariance('variance', baselineTotals.varianceCents, current.varianceCents),
    claimed: calculateVariance('claimed', baselineTotals.claimedCents, current.claimedCents),
    etc: calculateVariance('etc', baselineTotals.etcCents, current.etcCents),
  };

  // Calculate section variances
  const sectionVariances = new Map<CostLineSection, {
    budget: VarianceResult;
    forecast: VarianceResult;
    variance: VarianceResult;
  }>();

  const sections: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];
  sections.forEach((section) => {
    const currentSection = current.sectionTotals.find((s) => s.section === section);
    const baselineSection = snapshot.data.sectionTotals.find((s) => s.section === section);

    if (currentSection && baselineSection) {
      sectionVariances.set(section, {
        budget: calculateVariance('budget', baselineSection.budgetCents, currentSection.budgetCents),
        forecast: calculateVariance('forecast', baselineSection.finalForecastCents, currentSection.finalForecastCents),
        variance: calculateVariance('variance', baselineSection.varianceCents, currentSection.varianceCents),
      });
    }
  });

  // Calculate cost line variances (simplified - no current cost lines in this function)
  const costLineVariances: CostLineVariance[] = [];

  // Calculate summary
  let improved = 0;
  let worsened = 0;
  let unchanged = 0;

  // Budget variance: negative difference (under baseline) is better
  if (totalVariances.forecast.differenceCents < 0) {
    improved++;
  } else if (totalVariances.forecast.differenceCents > 0) {
    worsened++;
  } else {
    unchanged++;
  }

  return {
    snapshotName: snapshot.name,
    snapshotDate: snapshot.createdAt,
    totalVariances,
    sectionVariances,
    costLineVariances,
    summary: { improved, worsened, unchanged },
  };
}

// ============================================================================
// VARIANCE HIGHLIGHTING HELPERS
// ============================================================================

/**
 * Determine variance severity for styling
 */
export function getVarianceSeverity(
  varianceCents: number,
  thresholds: { warning: number; critical: number } = { warning: 10000, critical: 50000 }
): 'normal' | 'warning' | 'critical' {
  const absVariance = Math.abs(varianceCents);
  if (absVariance >= thresholds.critical) return 'critical';
  if (absVariance >= thresholds.warning) return 'warning';
  return 'normal';
}

/**
 * Determine if variance is favorable (under budget) or unfavorable (over budget)
 */
export function isVarianceFavorable(varianceToBudgetCents: number): boolean {
  // Positive variance = under budget = favorable
  return varianceToBudgetCents >= 0;
}

/**
 * Get variance color for display
 */
export function getVarianceColor(
  varianceToBudgetCents: number
): 'green' | 'red' | 'neutral' {
  if (varianceToBudgetCents > 0) return 'green';
  if (varianceToBudgetCents < 0) return 'red';
  return 'neutral';
}

/**
 * Get CSS class for variance display
 */
export function getVarianceClassName(varianceToBudgetCents: number): string {
  if (varianceToBudgetCents > 0) return 'text-green-500';
  if (varianceToBudgetCents < 0) return 'text-red-500';
  return 'text-gray-500';
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

export interface TrendPoint {
  date: string;
  budgetCents: number;
  forecastCents: number;
  varianceCents: number;
  claimedCents: number;
}

/**
 * Analyze trend from multiple snapshots
 */
export function analyzeTrend(
  snapshots: Snapshot[]
): {
  points: TrendPoint[];
  forecastTrend: 'increasing' | 'decreasing' | 'stable';
  varianceTrend: 'improving' | 'worsening' | 'stable';
} {
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const points: TrendPoint[] = sortedSnapshots.map((s) => ({
    date: s.createdAt,
    budgetCents: s.data.totals.budgetCents,
    forecastCents: s.data.totals.finalForecastCents,
    varianceCents: s.data.totals.varianceCents,
    claimedCents: s.data.totals.claimedCents,
  }));

  // Analyze forecast trend
  let forecastTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (points.length >= 2) {
    const first = points[0].forecastCents;
    const last = points[points.length - 1].forecastCents;
    const threshold = Math.abs(first) * 0.05; // 5% threshold

    if (last - first > threshold) {
      forecastTrend = 'increasing';
    } else if (first - last > threshold) {
      forecastTrend = 'decreasing';
    }
  }

  // Analyze variance trend (positive variance = under budget = good)
  let varianceTrend: 'improving' | 'worsening' | 'stable' = 'stable';
  if (points.length >= 2) {
    const first = points[0].varianceCents;
    const last = points[points.length - 1].varianceCents;
    const threshold = Math.abs(first) * 0.05; // 5% threshold

    if (last - first > threshold) {
      varianceTrend = 'improving'; // Variance becoming more positive = better
    } else if (first - last > threshold) {
      varianceTrend = 'worsening'; // Variance becoming more negative = worse
    }
  }

  return { points, forecastTrend, varianceTrend };
}
