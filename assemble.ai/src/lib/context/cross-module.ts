// src/lib/context/cross-module.ts
// 5 cross-module intelligence patterns that run on already-fetched data

import type { ModuleResult, ModuleName } from './types';
import type { CostPlanData } from './modules/cost-plan';
import type { ProgramData } from './modules/program';
import type { RisksData } from './modules/risks';
import type { ProcurementData } from './modules/procurement';

export interface CrossModuleInsight {
  pattern: string;
  modules: ModuleName[];
  severity: 'info' | 'warning' | 'critical';
  insight: string;
}

function fmtCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(dollars));
}

/**
 * Run all applicable cross-module intelligence patterns on fetched data.
 * Only runs patterns where both source modules have been successfully fetched.
 */
export function analyzeCrossModulePatterns(
  modules: Map<ModuleName, ModuleResult>
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  const costPlan = modules.get('costPlan') as
    | ModuleResult<CostPlanData>
    | undefined;
  const program = modules.get('program') as
    | ModuleResult<ProgramData>
    | undefined;
  const procurement = modules.get('procurement') as
    | ModuleResult<ProcurementData>
    | undefined;
  const risksResult = modules.get('risks') as
    | ModuleResult<RisksData>
    | undefined;

  // Pattern 1: Variation -> Program Impact
  if (costPlan?.success && program?.success) {
    insights.push(
      ...analyzeVariationProgramImpact(costPlan.data, program.data)
    );
  }

  // Pattern 2: Procurement Delay -> Cost Forecasting
  if (procurement?.success && costPlan?.success) {
    insights.push(
      ...analyzeProcurementCostImpact(procurement.data, costPlan.data)
    );
  }

  // Pattern 3: Risk -> Cost Line
  if (risksResult?.success && costPlan?.success) {
    insights.push(
      ...analyzeRiskCostLinks(risksResult.data, costPlan.data)
    );
  }

  // Pattern 4: Invoice -> Program Progress
  if (costPlan?.success && program?.success) {
    insights.push(
      ...analyzeInvoiceProgramAlignment(costPlan.data, program.data)
    );
  }

  // Pattern 5: Stakeholder -> Milestone
  if (procurement?.success && program?.success) {
    insights.push(
      ...analyzeStakeholderMilestoneReadiness(procurement.data, program.data)
    );
  }

  return insights;
}

/**
 * Pattern 1: Detect when approved/pending variations may impact program milestones.
 */
function analyzeVariationProgramImpact(
  costPlan: CostPlanData,
  program: ProgramData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  const pendingValue = costPlan.variationsSummary.pendingValueCents;
  const totalBudget = costPlan.totalBudgetCents;

  if (totalBudget > 0 && pendingValue / totalBudget > 0.05) {
    const nearMilestones = program.milestones.filter(
      (m) => m.daysUntil >= 0 && m.daysUntil <= 30
    );

    if (nearMilestones.length > 0) {
      const milestoneNames = nearMilestones.map((m) => m.name).join(', ');
      insights.push({
        pattern: 'variation-program-impact',
        modules: ['costPlan', 'program'],
        severity: 'warning',
        insight:
          `Pending variations total ${fmtCurrency(pendingValue)} ` +
          `(${((pendingValue / totalBudget) * 100).toFixed(1)}% of budget) with ` +
          `${nearMilestones.length} milestone(s) due within 30 days (${milestoneNames}). ` +
          `Unresolved variations may impact program if scope changes require additional time.`,
      });
    }
  }

  return insights;
}

/**
 * Pattern 2: Detect when procurement delays may affect cost forecast reliability.
 */
function analyzeProcurementCostImpact(
  procurement: ProcurementData,
  costPlan: CostPlanData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  const totalStakeholders =
    procurement.overview.consultantsTotal +
    procurement.overview.contractorsTotal;
  const totalAwarded =
    procurement.overview.consultantsAwarded +
    procurement.overview.contractorsAwarded;

  if (totalStakeholders > 0 && totalAwarded < totalStakeholders * 0.5) {
    const unawardedPercent = (
      ((totalStakeholders - totalAwarded) / totalStakeholders) *
      100
    ).toFixed(0);
    insights.push({
      pattern: 'procurement-cost-impact',
      modules: ['procurement', 'costPlan'],
      severity: 'warning',
      insight:
        `${unawardedPercent}% of disciplines/trades are not yet awarded ` +
        `(${totalStakeholders - totalAwarded} of ${totalStakeholders}). ` +
        `Cost forecast of ${fmtCurrency(costPlan.totalForecastCents)} relies on ` +
        `budget estimates rather than contracted amounts for these items. ` +
        `Forecast confidence is reduced until procurement advances.`,
    });
  }

  return insights;
}

/**
 * Pattern 3: Link risk items to cost plan sections based on keyword matching.
 */
function analyzeRiskCostLinks(
  risksData: RisksData,
  costPlan: CostPlanData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  const costKeywords: Record<string, string[]> = {
    CONSTRUCTION: ['construction', 'build', 'contractor', 'trade', 'site'],
    CONSULTANTS: ['consultant', 'design', 'engineer', 'architect', 'fees'],
    CONTINGENCY: ['contingency', 'unforeseen', 'risk allowance'],
    FEES: ['fee', 'authority', 'council', 'approval'],
  };

  for (const risk of risksData.topActiveRisks.slice(0, 5)) {
    if (risk.severity !== 'high') continue;

    const riskText = `${risk.title} ${risk.description ?? ''}`.toLowerCase();

    for (const [section, keywords] of Object.entries(costKeywords)) {
      if (keywords.some((kw) => riskText.includes(kw))) {
        const sectionLines = costPlan.linesBySection[section];
        if (sectionLines) {
          const sectionBudget = sectionLines.reduce(
            (s, l) => s + l.budgetCents,
            0
          );
          insights.push({
            pattern: 'risk-cost-link',
            modules: ['risks', 'costPlan'],
            severity: 'info',
            insight:
              `High-severity risk "${risk.title}" may affect the ${section} section ` +
              `(${sectionLines.length} lines, budget ${fmtCurrency(sectionBudget)}). ` +
              `Consider whether contingency allocation covers this exposure.`,
          });
        }
        break; // One link per risk
      }
    }
  }

  return insights;
}

/**
 * Pattern 4: Compare invoicing progress against program completion.
 */
function analyzeInvoiceProgramAlignment(
  costPlan: CostPlanData,
  program: ProgramData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  if (
    costPlan.totalApprovedContractCents === 0 ||
    program.percentComplete === 0
  ) {
    return insights;
  }

  const invoicedPercent =
    (costPlan.totalInvoicedCents / costPlan.totalApprovedContractCents) * 100;
  const programPercent = program.percentComplete;
  const gap = Math.abs(invoicedPercent - programPercent);

  if (gap > 15) {
    const direction =
      invoicedPercent > programPercent ? 'ahead of' : 'behind';
    insights.push({
      pattern: 'invoice-program-alignment',
      modules: ['costPlan', 'program'],
      severity: gap > 25 ? 'warning' : 'info',
      insight:
        `Invoicing progress (${invoicedPercent.toFixed(0)}% of approved contracts claimed) ` +
        `is ${direction} program completion (${programPercent}%). ` +
        `A gap of ${gap.toFixed(0)}% may indicate ` +
        `${invoicedPercent > programPercent ? 'front-loaded claiming' : 'uncertified works'}.`,
    });
  }

  return insights;
}

/**
 * Pattern 5: Check if stakeholder appointments align with upcoming milestones.
 */
function analyzeStakeholderMilestoneReadiness(
  procurement: ProcurementData,
  program: ProgramData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  const unappointed = [
    ...procurement.consultants.filter((c) => c.currentStatus !== 'award'),
    ...procurement.contractors.filter((c) => c.currentStatus !== 'award'),
  ];

  const nearMilestones = program.milestones.filter(
    (m) => m.daysUntil >= 0 && m.daysUntil <= 60
  );

  if (unappointed.length > 0 && nearMilestones.length > 0) {
    const names = unappointed
      .slice(0, 5)
      .map((s) => s.name)
      .join(', ');
    const milestoneNames = nearMilestones
      .slice(0, 3)
      .map((m) => m.name)
      .join(', ');
    insights.push({
      pattern: 'stakeholder-milestone-readiness',
      modules: ['procurement', 'program'],
      severity: 'warning',
      insight:
        `${unappointed.length} discipline(s)/trade(s) not yet awarded (${names}${unappointed.length > 5 ? '...' : ''}) ` +
        `with ${nearMilestones.length} milestone(s) due within 60 days (${milestoneNames}). ` +
        `Late appointments may delay milestone achievement.`,
    });
  }

  return insights;
}

/**
 * Format all cross-module insights into a prompt-ready string.
 */
export function formatCrossModuleInsights(
  insights: CrossModuleInsight[]
): string {
  if (insights.length === 0) return '';

  const lines = ['## Cross-Module Observations'];

  const critical = insights.filter((i) => i.severity === 'critical');
  const warnings = insights.filter((i) => i.severity === 'warning');
  const info = insights.filter((i) => i.severity === 'info');

  if (critical.length > 0) {
    lines.push('\n**Critical:**');
    critical.forEach((i) => lines.push(`- ${i.insight}`));
  }
  if (warnings.length > 0) {
    lines.push('\n**Attention:**');
    warnings.forEach((i) => lines.push(`- ${i.insight}`));
  }
  if (info.length > 0) {
    lines.push('\n**Notes:**');
    info.forEach((i) => lines.push(`- ${i.insight}`));
  }

  return lines.join('\n');
}
