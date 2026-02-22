// src/lib/context/modules/cost-plan.ts
// Cost plan module fetcher - extracts from costLines, variations, invoices tables

import { db } from '@/lib/db';
import { costLines, variations, invoices } from '@/lib/db/pg-schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { ModuleResult, ReportingPeriod } from '../types';

export interface CostPlanData {
  totalBudgetCents: number;
  totalForecastCents: number;
  totalApprovedContractCents: number;
  totalInvoicedCents: number;
  varianceCents: number;
  variancePercent: number;
  contingency: {
    budgetCents: number;
    usedCents: number;
    remainingCents: number;
    percentRemaining: number;
  };
  linesBySection: Record<string, CostLineData[]>;
  variationsSummary: {
    pendingCount: number;
    pendingValueCents: number;
    approvedCount: number;
    approvedValueCents: number;
  };
  invoicesSummary: {
    totalCount: number;
    totalValueCents: number;
    thisPeriodCount: number;
    thisPeriodValueCents: number;
  };
}

export interface CostLineData {
  id: string;
  section: string;
  activity: string;
  budgetCents: number;
  approvedContractCents: number;
  forecastCents: number;
  varianceCents: number;
}

export interface CostPlanFetchParams {
  reportingPeriod?: ReportingPeriod;
}

export async function fetchCostPlan(
  projectId: string,
  params?: CostPlanFetchParams
): Promise<ModuleResult<CostPlanData>> {
  try {
    // Fetch all active cost lines
    const lines = await db
      .select()
      .from(costLines)
      .where(and(eq(costLines.projectId, projectId), isNull(costLines.deletedAt)));

    // Fetch variations for this project
    const variationsList = await db
      .select()
      .from(variations)
      .where(and(eq(variations.projectId, projectId), isNull(variations.deletedAt)));

    // Build per-costLine variation totals for forecast calculation
    const variationsByCostLine = new Map<string, number>();
    let pendingCount = 0,
      pendingValueCents = 0;
    let approvedCount = 0,
      approvedValueCents = 0;

    for (const v of variationsList) {
      const forecastAmt = v.amountForecastCents ?? 0;
      const approvedAmt = v.amountApprovedCents ?? 0;
      const costLineId = v.costLineId;

      if (costLineId) {
        const current = variationsByCostLine.get(costLineId) ?? 0;
        variationsByCostLine.set(costLineId, current + forecastAmt);
      }

      if (v.status === 'Approved') {
        approvedCount++;
        approvedValueCents += approvedAmt;
      } else {
        pendingCount++;
        pendingValueCents += forecastAmt;
      }
    }

    // Calculate totals and group by section
    let totalBudgetCents = 0;
    let totalApprovedCents = 0;
    let contingencyBudgetCents = 0;
    const linesBySection: Record<string, CostLineData[]> = {};

    for (const line of lines) {
      const budget = line.budgetCents ?? 0;
      const approved = line.approvedContractCents ?? 0;
      totalBudgetCents += budget;
      totalApprovedCents += approved;

      if (line.section === 'CONTINGENCY') {
        contingencyBudgetCents += budget;
      }

      // Forecast = approved contract + variation forecasts for this line
      // If no approved contract yet, fall back to budget
      const lineVariations = variationsByCostLine.get(line.id) ?? 0;
      const forecastCents = (approved > 0 ? approved : budget) + lineVariations;

      const section = line.section ?? 'OTHER';
      if (!linesBySection[section]) linesBySection[section] = [];
      linesBySection[section].push({
        id: line.id,
        section,
        activity: line.activity ?? '',
        budgetCents: budget,
        approvedContractCents: approved,
        forecastCents,
        varianceCents: forecastCents - budget,
      });
    }

    // Calculate total forecast from all line forecasts
    const totalForecastCents = Object.values(linesBySection)
      .flat()
      .reduce((sum, l) => sum + l.forecastCents, 0);

    const varianceCents = totalForecastCents - totalBudgetCents;
    const variancePercent =
      totalBudgetCents > 0
        ? ((totalForecastCents - totalBudgetCents) / totalBudgetCents) * 100
        : 0;

    // Fetch invoices
    const invoicesList = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.projectId, projectId), isNull(invoices.deletedAt)));

    let totalInvoicedCents = 0;
    let thisPeriodCount = 0,
      thisPeriodValueCents = 0;

    for (const inv of invoicesList) {
      const amount = inv.amountCents ?? 0;
      totalInvoicedCents += amount;

      if (params?.reportingPeriod && inv.createdAt) {
        const date = new Date(inv.createdAt as unknown as string);
        const start = new Date(params.reportingPeriod.start);
        const end = new Date(params.reportingPeriod.end);
        if (date >= start && date <= end) {
          thisPeriodCount++;
          thisPeriodValueCents += amount;
        }
      }
    }

    const contingencyUsedCents = approvedValueCents;
    const contingencyRemainingCents = contingencyBudgetCents - contingencyUsedCents;

    const data: CostPlanData = {
      totalBudgetCents,
      totalForecastCents,
      totalApprovedContractCents: totalApprovedCents,
      totalInvoicedCents,
      varianceCents,
      variancePercent,
      contingency: {
        budgetCents: contingencyBudgetCents,
        usedCents: contingencyUsedCents,
        remainingCents: contingencyRemainingCents,
        percentRemaining:
          contingencyBudgetCents > 0
            ? (contingencyRemainingCents / contingencyBudgetCents) * 100
            : 0,
      },
      linesBySection,
      variationsSummary: {
        pendingCount,
        pendingValueCents,
        approvedCount,
        approvedValueCents,
      },
      invoicesSummary: {
        totalCount: invoicesList.length,
        totalValueCents: totalInvoicedCents,
        thisPeriodCount,
        thisPeriodValueCents,
      },
    };

    // Token estimate: ~30 tokens base + ~15 per cost line
    const estimatedTokens = 30 + lines.length * 15;

    return { moduleName: 'costPlan', success: true, data, estimatedTokens };
  } catch (error) {
    return {
      moduleName: 'costPlan',
      success: false,
      data: {} as CostPlanData,
      error: `Cost plan fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
