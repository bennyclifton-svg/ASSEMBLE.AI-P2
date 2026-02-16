/**
 * Cost Plan Calculation Formulas
 * Feature 006 - Cost Planning Module
 *
 * All amounts are in cents (integers) to avoid floating-point precision issues.
 */

import type {
  CostLine,
  CostLineAllocation,
  CostPlanTotals,
  SectionTotals,
  CostLineWithCalculations,
  CostLineSection,
  SECTION_ORDER,
} from '@/types/cost-plan';
import type { Variation } from '@/types/variation';
import type { Invoice } from '@/types/invoice';

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Final Forecast for a cost line:
 * Final Forecast = Approved Contract + Forecast Variations + Approved Variations
 */
export function calculateFinalForecast(
  approvedContractCents: number,
  forecastVariationsCents: number,
  approvedVariationsCents: number
): number {
  return approvedContractCents + forecastVariationsCents + approvedVariationsCents;
}

/**
 * Calculate Variance to Budget:
 * Variance = Budget - Final Forecast
 * Positive = Under budget (good)
 * Negative = Over budget (bad)
 */
export function calculateVarianceToBudget(
  budgetCents: number,
  finalForecastCents: number
): number {
  return budgetCents - finalForecastCents;
}

/**
 * Calculate Estimate to Complete (ETC):
 * ETC = Final Forecast - Claimed to Date
 */
export function calculateETC(
  finalForecastCents: number,
  claimedToDateCents: number
): number {
  return finalForecastCents - claimedToDateCents;
}

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Sum variations by type for a cost line
 */
export function sumVariationsForCostLine(
  variations: Variation[],
  costLineId: string
): { forecastCents: number; approvedCents: number } {
  return variations
    .filter((v) => v.costLineId === costLineId && !v.deletedAt)
    .reduce(
      (acc, v) => {
        if (v.status === 'Forecast') {
          acc.forecastCents += v.amountForecastCents;
        } else if (v.status === 'Approved') {
          acc.approvedCents += v.amountApprovedCents;
        }
        return acc;
      },
      { forecastCents: 0, approvedCents: 0 }
    );
}

/**
 * Sum invoices for a cost line
 *
 * When currentPeriod is provided:
 * - claimedToDateCents: Sum of all invoices up to and including the selected period
 * - currentMonthCents: Sum of invoices for the exact selected period
 *
 * When currentPeriod is not provided:
 * - claimedToDateCents: Sum of all invoices (no filtering)
 * - currentMonthCents: 0 (no specific month selected)
 */
export function sumInvoicesForCostLine(
  invoices: Invoice[],
  costLineId: string,
  currentPeriod?: { year: number; month: number }
): { claimedToDateCents: number; currentMonthCents: number } {
  return invoices
    .filter((inv) => inv.costLineId === costLineId && !inv.deletedAt)
    .reduce(
      (acc, inv) => {
        // Filter invoices up to and including the selected period
        const isUpToSelectedPeriod = currentPeriod
          ? inv.periodYear < currentPeriod.year ||
            (inv.periodYear === currentPeriod.year && inv.periodMonth <= currentPeriod.month)
          : true; // No filtering if no period specified

        if (isUpToSelectedPeriod) {
          acc.claimedToDateCents += inv.amountCents;
        }

        // Current month calculation (exact match)
        if (
          currentPeriod &&
          inv.periodYear === currentPeriod.year &&
          inv.periodMonth === currentPeriod.month
        ) {
          acc.currentMonthCents += inv.amountCents;
        }

        return acc;
      },
      { claimedToDateCents: 0, currentMonthCents: 0 }
    );
}

/**
 * Sum contract-only invoices for a cost line (excludes variation-tagged invoices).
 * Used by Payment Schedule to show only base contract amounts in contract rows.
 */
export function sumContractOnlyInvoicesForCostLine(
  invoices: Invoice[],
  costLineId: string,
  currentPeriod?: { year: number; month: number }
): { claimedToDateCents: number; currentMonthCents: number } {
  return invoices
    .filter((inv) => inv.costLineId === costLineId && !inv.deletedAt && !inv.variationId)
    .reduce(
      (acc, inv) => {
        const isUpToSelectedPeriod = currentPeriod
          ? inv.periodYear < currentPeriod.year ||
            (inv.periodYear === currentPeriod.year && inv.periodMonth <= currentPeriod.month)
          : true;

        if (isUpToSelectedPeriod) {
          acc.claimedToDateCents += inv.amountCents;
        }

        if (
          currentPeriod &&
          inv.periodYear === currentPeriod.year &&
          inv.periodMonth === currentPeriod.month
        ) {
          acc.currentMonthCents += inv.amountCents;
        }

        return acc;
      },
      { claimedToDateCents: 0, currentMonthCents: 0 }
    );
}

/**
 * Sum invoices for a specific variation.
 * Used by Payment Schedule to show claimed amounts on variation rows.
 */
export function sumInvoicesForVariation(
  invoices: Invoice[],
  variationId: string,
  currentPeriod?: { year: number; month: number }
): { claimedToDateCents: number; currentMonthCents: number } {
  return invoices
    .filter((inv) => inv.variationId === variationId && !inv.deletedAt)
    .reduce(
      (acc, inv) => {
        const isUpToSelectedPeriod = currentPeriod
          ? inv.periodYear < currentPeriod.year ||
            (inv.periodYear === currentPeriod.year && inv.periodMonth <= currentPeriod.month)
          : true;

        if (isUpToSelectedPeriod) {
          acc.claimedToDateCents += inv.amountCents;
        }

        if (
          currentPeriod &&
          inv.periodYear === currentPeriod.year &&
          inv.periodMonth === currentPeriod.month
        ) {
          acc.currentMonthCents += inv.amountCents;
        }

        return acc;
      },
      { claimedToDateCents: 0, currentMonthCents: 0 }
    );
}

// ============================================================================
// COST LINE CALCULATIONS
// ============================================================================

/**
 * Calculate all derived fields for a single cost line
 */
export function calculateCostLineFields(
  costLine: CostLine,
  allocations: CostLineAllocation[],
  variations: Variation[],
  invoices: Invoice[],
  currentPeriod?: { year: number; month: number }
): CostLineWithCalculations['calculated'] {
  const variationSums = sumVariationsForCostLine(variations, costLine.id);
  const invoiceSums = sumInvoicesForCostLine(invoices, costLine.id, currentPeriod);

  const finalForecastCents = calculateFinalForecast(
    costLine.approvedContractCents,
    variationSums.forecastCents,
    variationSums.approvedCents
  );

  const varianceToBudgetCents = calculateVarianceToBudget(
    costLine.budgetCents,
    finalForecastCents
  );

  const etcCents = calculateETC(finalForecastCents, invoiceSums.claimedToDateCents);

  return {
    forecastVariationsCents: variationSums.forecastCents,
    approvedVariationsCents: variationSums.approvedCents,
    finalForecastCents,
    varianceToBudgetCents,
    claimedToDateCents: invoiceSums.claimedToDateCents,
    currentMonthCents: invoiceSums.currentMonthCents,
    etcCents,
  };
}

// ============================================================================
// SECTION & TOTAL AGGREGATIONS
// ============================================================================

/**
 * Calculate totals for a section
 */
export function calculateSectionTotals(
  section: CostLineSection,
  costLines: CostLineWithCalculations[]
): SectionTotals {
  const sectionLines = costLines.filter((cl) => cl.section === section && !cl.deletedAt);

  return sectionLines.reduce(
    (acc, cl) => ({
      section,
      budgetCents: acc.budgetCents + cl.budgetCents,
      approvedContractCents: acc.approvedContractCents + cl.approvedContractCents,
      forecastVariationsCents: acc.forecastVariationsCents + cl.calculated.forecastVariationsCents,
      approvedVariationsCents: acc.approvedVariationsCents + cl.calculated.approvedVariationsCents,
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
 * Calculate grand totals for entire cost plan
 */
export function calculateCostPlanTotals(
  costLines: CostLineWithCalculations[]
): CostPlanTotals {
  const sections: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];
  const sectionTotals = sections.map((section) =>
    calculateSectionTotals(section, costLines)
  );

  const grandTotal = sectionTotals.reduce(
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

  return {
    ...grandTotal,
    sectionTotals,
  };
}

// ============================================================================
// CURRENCY HELPERS
// ============================================================================

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Format cents as currency string (AUD)
 */
export function formatCurrency(cents: number, currencyCode = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Format cents as compact currency string for large numbers
 */
export function formatCurrencyCompact(cents: number, currencyCode = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currencyCode,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

// ============================================================================
// PERIOD HELPERS
// ============================================================================

/**
 * Get current period (year and month)
 */
export function getCurrentPeriod(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // 1-indexed
  };
}

/**
 * Format period as display string (e.g., "Dec 2024")
 */
export function formatPeriod(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleString('default', {
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// VARIATION NUMBER GENERATOR
// ============================================================================

/**
 * Generate next variation number for a project and category
 */
export function generateVariationNumber(
  existingVariations: Variation[],
  category: Variation['category']
): string {
  const prefix =
    category === 'Principal' ? 'PV' : category === 'Contractor' ? 'CV' : 'LV';

  const categoryVariations = existingVariations.filter(
    (v) => v.category === category && !v.deletedAt
  );

  const maxNumber = categoryVariations.reduce((max, v) => {
    const match = v.variationNumber.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      return Math.max(max, parseInt(match[1], 10));
    }
    return max;
  }, 0);

  return `${prefix}-${String(maxNumber + 1).padStart(3, '0')}`;
}
