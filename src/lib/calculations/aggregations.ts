/**
 * Aggregation Functions for Cost Planning
 * Feature 006 - Cost Planning Module (Task T058)
 *
 * Extended aggregation functions beyond the core formulas.
 * All amounts are in cents (integers) to avoid floating-point precision issues.
 */

import type {
  CostLineWithCalculations,
  CostLineSection,
  SectionTotals,
  CostPlanTotals,
} from '@/types/cost-plan';
import type { Invoice } from '@/types/invoice';
import type { Variation } from '@/types/variation';

// ============================================================================
// SECTION AGGREGATIONS
// ============================================================================

/**
 * Calculate totals for a specific section
 */
export function calculateSectionTotals(
  section: CostLineSection,
  costLines: CostLineWithCalculations[]
): SectionTotals {
  const sectionLines = costLines.filter(
    (cl) => cl.section === section && !cl.deletedAt
  );

  return sectionLines.reduce(
    (acc, cl) => ({
      section,
      budgetCents: acc.budgetCents + cl.budgetCents,
      approvedContractCents: acc.approvedContractCents + cl.approvedContractCents,
      forecastVariationsCents:
        acc.forecastVariationsCents + cl.calculated.forecastVariationsCents,
      approvedVariationsCents:
        acc.approvedVariationsCents + cl.calculated.approvedVariationsCents,
      finalForecastCents: acc.finalForecastCents + cl.calculated.finalForecastCents,
      varianceCents: acc.varianceCents + cl.calculated.varianceToBudgetCents,
      claimedCents: acc.claimedCents + cl.calculated.claimedToDateCents,
      currentMonthCents: acc.currentMonthCents + cl.calculated.currentMonthCents,
      etcCents: acc.etcCents + cl.calculated.etcCents,
    }),
    {
      section,
      budgetCents: 0,
      approvedContractCents: 0,
      forecastVariationsCents: 0,
      approvedVariationsCents: 0,
      finalForecastCents: 0,
      varianceCents: 0,
      claimedCents: 0,
      currentMonthCents: 0,
      etcCents: 0,
    }
  );
}

/**
 * Calculate grand totals across all sections
 */
export function calculateGrandTotals(
  costLines: CostLineWithCalculations[]
): Omit<CostPlanTotals, 'sectionTotals'> {
  const sections: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];
  const sectionTotals = sections.map((section) =>
    calculateSectionTotals(section, costLines)
  );

  return sectionTotals.reduce(
    (acc, st) => ({
      budgetCents: acc.budgetCents + st.budgetCents,
      approvedContractCents: acc.approvedContractCents + st.approvedContractCents,
      forecastVariationsCents: acc.forecastVariationsCents + st.forecastVariationsCents,
      approvedVariationsCents: acc.approvedVariationsCents + st.approvedVariationsCents,
      finalForecastCents: acc.finalForecastCents + st.finalForecastCents,
      varianceCents: acc.varianceCents + st.varianceCents,
      claimedCents: acc.claimedCents + st.claimedCents,
      currentMonthCents: acc.currentMonthCents + st.currentMonthCents,
      etcCents: acc.etcCents + st.etcCents,
    }),
    {
      budgetCents: 0,
      approvedContractCents: 0,
      forecastVariationsCents: 0,
      approvedVariationsCents: 0,
      finalForecastCents: 0,
      varianceCents: 0,
      claimedCents: 0,
      currentMonthCents: 0,
      etcCents: 0,
    }
  );
}

// ============================================================================
// PERIOD-BASED AGGREGATIONS
// ============================================================================

/**
 * Calculate current month totals from invoices for a given report period
 */
export function calculateCurrentMonth(
  invoices: Invoice[],
  reportMonth: { year: number; month: number }
): number {
  return invoices
    .filter(
      (inv) =>
        !inv.deletedAt &&
        inv.periodYear === reportMonth.year &&
        inv.periodMonth === reportMonth.month
    )
    .reduce((sum, inv) => sum + inv.amountCents, 0);
}

/**
 * Calculate current month totals by cost line
 */
export function calculateCurrentMonthByCostLine(
  invoices: Invoice[],
  reportMonth: { year: number; month: number }
): Map<string, number> {
  const result = new Map<string, number>();

  invoices
    .filter(
      (inv) =>
        !inv.deletedAt &&
        inv.periodYear === reportMonth.year &&
        inv.periodMonth === reportMonth.month
    )
    .forEach((inv) => {
      const current = result.get(inv.costLineId) || 0;
      result.set(inv.costLineId, current + inv.amountCents);
    });

  return result;
}

/**
 * Calculate claimed to date totals by cost line
 */
export function calculateClaimedByCostLine(invoices: Invoice[]): Map<string, number> {
  const result = new Map<string, number>();

  invoices
    .filter((inv) => !inv.deletedAt)
    .forEach((inv) => {
      const current = result.get(inv.costLineId) || 0;
      result.set(inv.costLineId, current + inv.amountCents);
    });

  return result;
}

// ============================================================================
// VARIATION AGGREGATIONS
// ============================================================================

/**
 * Calculate forecast variations by cost line
 */
export function calculateForecastVariationsByCostLine(
  variations: Variation[]
): Map<string, number> {
  const result = new Map<string, number>();

  variations
    .filter((v) => !v.deletedAt && v.status === 'Forecast')
    .forEach((v) => {
      const current = result.get(v.costLineId) || 0;
      result.set(v.costLineId, current + v.amountForecastCents);
    });

  return result;
}

/**
 * Calculate approved variations by cost line
 */
export function calculateApprovedVariationsByCostLine(
  variations: Variation[]
): Map<string, number> {
  const result = new Map<string, number>();

  variations
    .filter((v) => !v.deletedAt && v.status === 'Approved')
    .forEach((v) => {
      const current = result.get(v.costLineId) || 0;
      result.set(v.costLineId, current + v.amountApprovedCents);
    });

  return result;
}

/**
 * Calculate total variations (forecast + approved) by cost line
 */
export function calculateTotalVariationsByCostLine(
  variations: Variation[]
): Map<string, { forecastCents: number; approvedCents: number }> {
  const result = new Map<string, { forecastCents: number; approvedCents: number }>();

  variations
    .filter((v) => !v.deletedAt)
    .forEach((v) => {
      const current = result.get(v.costLineId) || { forecastCents: 0, approvedCents: 0 };

      if (v.status === 'Forecast') {
        current.forecastCents += v.amountForecastCents;
      } else if (v.status === 'Approved') {
        current.approvedCents += v.amountApprovedCents;
      }

      result.set(v.costLineId, current);
    });

  return result;
}

// ============================================================================
// SUMMARY AGGREGATIONS
// ============================================================================

/**
 * Calculate summary statistics for a cost plan
 */
export function calculateCostPlanSummary(costLines: CostLineWithCalculations[]): {
  totalLines: number;
  totalBudget: number;
  totalForecast: number;
  totalVariance: number;
  variancePercent: number;
  linesOverBudget: number;
  linesUnderBudget: number;
  linesOnBudget: number;
} {
  const activeCostLines = costLines.filter((cl) => !cl.deletedAt);
  const grandTotals = calculateGrandTotals(activeCostLines);

  const linesOverBudget = activeCostLines.filter(
    (cl) => cl.calculated.varianceToBudgetCents < 0
  ).length;

  const linesUnderBudget = activeCostLines.filter(
    (cl) => cl.calculated.varianceToBudgetCents > 0
  ).length;

  const linesOnBudget = activeCostLines.filter(
    (cl) => cl.calculated.varianceToBudgetCents === 0
  ).length;

  const variancePercent =
    grandTotals.budgetCents !== 0
      ? (grandTotals.varianceCents / grandTotals.budgetCents) * 100
      : 0;

  return {
    totalLines: activeCostLines.length,
    totalBudget: grandTotals.budgetCents,
    totalForecast: grandTotals.finalForecastCents,
    totalVariance: grandTotals.varianceCents,
    variancePercent,
    linesOverBudget,
    linesUnderBudget,
    linesOnBudget,
  };
}

/**
 * Group cost lines by section with totals
 */
export function groupCostLinesBySection(
  costLines: CostLineWithCalculations[]
): Map<CostLineSection, { lines: CostLineWithCalculations[]; totals: SectionTotals }> {
  const sections: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];
  const result = new Map<
    CostLineSection,
    { lines: CostLineWithCalculations[]; totals: SectionTotals }
  >();

  sections.forEach((section) => {
    const sectionLines = costLines
      .filter((cl) => cl.section === section && !cl.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    result.set(section, {
      lines: sectionLines,
      totals: calculateSectionTotals(section, costLines),
    });
  });

  return result;
}
