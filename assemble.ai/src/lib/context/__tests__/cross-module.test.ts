import {
  analyzeCrossModulePatterns,
  formatCrossModuleInsights,
} from '../cross-module';
import type { ModuleResult, ModuleName } from '../types';
import type { CostPlanData } from '../modules/cost-plan';
import type { ProgramData } from '../modules/program';
import type { RisksData } from '../modules/risks';
import type { ProcurementData } from '../modules/procurement';

function makeResult<T>(
  moduleName: ModuleName,
  data: T
): ModuleResult<T> {
  return { moduleName, success: true, data, estimatedTokens: 100 };
}

const baseCostPlan: CostPlanData = {
  totalBudgetCents: 100000000,
  totalForecastCents: 105000000,
  totalApprovedContractCents: 80000000,
  totalInvoicedCents: 30000000,
  varianceCents: 5000000,
  variancePercent: 5.0,
  contingency: {
    budgetCents: 10000000,
    usedCents: 2000000,
    remainingCents: 8000000,
    percentRemaining: 80,
  },
  linesBySection: {
    CONSTRUCTION: [
      {
        id: '1',
        section: 'CONSTRUCTION',
        activity: 'Structural',
        budgetCents: 50000000,
        approvedContractCents: 45000000,
        forecastCents: 48000000,
        varianceCents: -2000000,
      },
    ],
  },
  variationsSummary: {
    pendingCount: 3,
    pendingValueCents: 8000000, // 8% of budget, triggers Pattern 1
    approvedCount: 2,
    approvedValueCents: 2000000,
  },
  invoicesSummary: {
    totalCount: 10,
    totalValueCents: 30000000,
    thisPeriodCount: 2,
    thisPeriodValueCents: 5000000,
  },
};

const baseProgram: ProgramData = {
  totalActivities: 20,
  completedActivities: 5,
  percentComplete: 25,
  activities: [],
  milestones: [
    {
      id: 'm1',
      name: 'Design Completion',
      date: new Date(Date.now() + 15 * 86400000).toISOString(), // 15 days from now
      activityId: null,
      activityName: null,
      daysUntil: 15,
    },
    {
      id: 'm2',
      name: 'Construction Start',
      date: new Date(Date.now() + 45 * 86400000).toISOString(), // 45 days from now
      activityId: null,
      activityName: null,
      daysUntil: 45,
    },
  ],
  nextMilestone: null,
};

const baseProcurement: ProcurementData = {
  consultants: [
    {
      id: 's1',
      name: 'Architect',
      group: 'consultant',
      disciplineOrTrade: 'Architecture',
      currentStatus: 'award',
      awardedFirm: null,
      awardedValue: null,
    },
    {
      id: 's2',
      name: 'Structural Engineer',
      group: 'consultant',
      disciplineOrTrade: 'Structural',
      currentStatus: 'tender',
      awardedFirm: null,
      awardedValue: null,
    },
  ],
  contractors: [
    {
      id: 's3',
      name: 'Main Contractor',
      group: 'contractor',
      disciplineOrTrade: 'Building',
      currentStatus: 'brief',
      awardedFirm: null,
      awardedValue: null,
    },
  ],
  overview: {
    consultantsTotal: 2,
    consultantsAwarded: 1,
    consultantsTendered: 1,
    consultantsBriefed: 0,
    contractorsTotal: 1,
    contractorsAwarded: 0,
    contractorsTendered: 0,
    contractorsBriefed: 1,
  },
  shortlistedFirms: [],
  awardedFirms: [],
};

const baseRisks: RisksData = {
  totalCount: 3,
  byStatus: { identified: 2, mitigated: 1, closed: 0 },
  bySeverity: { high: 1, medium: 1, low: 1 },
  topActiveRisks: [
    {
      id: 'r1',
      title: 'Construction cost overrun',
      description: 'Contractor may claim additional costs for site conditions',
      likelihood: 'high',
      impact: 'high',
      mitigation: 'Monitor closely',
      status: 'identified',
      severity: 'high',
    },
    {
      id: 'r2',
      title: 'Design delay',
      description: 'Consultant may not deliver on time',
      likelihood: 'medium',
      impact: 'medium',
      mitigation: null,
      status: 'identified',
      severity: 'medium',
    },
  ],
};

describe('Pattern 1: Variation -> Program Impact', () => {
  it('triggers when pending variations > 5% of budget with milestones within 30 days', () => {
    const modules = new Map<ModuleName, ModuleResult>([
      ['costPlan', makeResult('costPlan', baseCostPlan)],
      ['program', makeResult('program', baseProgram)],
    ]);

    const insights = analyzeCrossModulePatterns(modules);
    const pattern1 = insights.find(
      (i) => i.pattern === 'variation-program-impact'
    );

    expect(pattern1).toBeDefined();
    expect(pattern1!.severity).toBe('warning');
    expect(pattern1!.insight).toContain('Design Completion');
  });

  it('does not trigger when pending variations < 5% of budget', () => {
    const lowVariations = {
      ...baseCostPlan,
      variationsSummary: {
        ...baseCostPlan.variationsSummary,
        pendingValueCents: 100000, // 0.1% of budget
      },
    };

    const modules = new Map<ModuleName, ModuleResult>([
      ['costPlan', makeResult('costPlan', lowVariations)],
      ['program', makeResult('program', baseProgram)],
    ]);

    const insights = analyzeCrossModulePatterns(modules);
    const pattern1 = insights.find(
      (i) => i.pattern === 'variation-program-impact'
    );

    expect(pattern1).toBeUndefined();
  });
});

describe('Pattern 2: Procurement Delay -> Cost Forecasting', () => {
  it('triggers when less than 50% of stakeholders are awarded', () => {
    const modules = new Map<ModuleName, ModuleResult>([
      ['procurement', makeResult('procurement', baseProcurement)],
      ['costPlan', makeResult('costPlan', baseCostPlan)],
    ]);

    const insights = analyzeCrossModulePatterns(modules);
    const pattern2 = insights.find(
      (i) => i.pattern === 'procurement-cost-impact'
    );

    expect(pattern2).toBeDefined();
    expect(pattern2!.severity).toBe('warning');
    expect(pattern2!.insight).toContain('67%'); // 2 of 3 unawarded
  });
});

describe('Pattern 3: Risk -> Cost Line', () => {
  it('links high-severity risk with matching cost section keyword', () => {
    const modules = new Map<ModuleName, ModuleResult>([
      ['risks', makeResult('risks', baseRisks)],
      ['costPlan', makeResult('costPlan', baseCostPlan)],
    ]);

    const insights = analyzeCrossModulePatterns(modules);
    const pattern3 = insights.find((i) => i.pattern === 'risk-cost-link');

    expect(pattern3).toBeDefined();
    expect(pattern3!.severity).toBe('info');
    expect(pattern3!.insight).toContain('Construction cost overrun');
    expect(pattern3!.insight).toContain('CONSTRUCTION');
  });
});

describe('Pattern 4: Invoice -> Program Progress', () => {
  it('triggers when invoicing and program completion diverge by more than 15%', () => {
    // Invoiced: 30M / 80M = 37.5%, Program: 25% → gap = 12.5% (below threshold)
    // Let's adjust to trigger: invoiced 50M / 80M = 62.5%, Program: 25% → gap = 37.5%
    const highInvoice = {
      ...baseCostPlan,
      totalInvoicedCents: 50000000,
    };

    const modules = new Map<ModuleName, ModuleResult>([
      ['costPlan', makeResult('costPlan', highInvoice)],
      ['program', makeResult('program', baseProgram)],
    ]);

    const insights = analyzeCrossModulePatterns(modules);
    const pattern4 = insights.find(
      (i) => i.pattern === 'invoice-program-alignment'
    );

    expect(pattern4).toBeDefined();
    expect(pattern4!.insight).toContain('ahead of');
  });

  it('does not trigger when gap is small', () => {
    // Invoiced: 20M / 80M = 25%, Program: 25% → gap = 0
    const alignedInvoice = {
      ...baseCostPlan,
      totalInvoicedCents: 20000000,
    };

    const modules = new Map<ModuleName, ModuleResult>([
      ['costPlan', makeResult('costPlan', alignedInvoice)],
      ['program', makeResult('program', baseProgram)],
    ]);

    const insights = analyzeCrossModulePatterns(modules);
    const pattern4 = insights.find(
      (i) => i.pattern === 'invoice-program-alignment'
    );

    expect(pattern4).toBeUndefined();
  });
});

describe('Pattern 5: Stakeholder -> Milestone', () => {
  it('triggers when unappointed stakeholders exist with milestones within 60 days', () => {
    const modules = new Map<ModuleName, ModuleResult>([
      ['procurement', makeResult('procurement', baseProcurement)],
      ['program', makeResult('program', baseProgram)],
    ]);

    const insights = analyzeCrossModulePatterns(modules);
    const pattern5 = insights.find(
      (i) => i.pattern === 'stakeholder-milestone-readiness'
    );

    expect(pattern5).toBeDefined();
    expect(pattern5!.severity).toBe('warning');
    expect(pattern5!.insight).toContain('2 discipline(s)/trade(s)');
  });
});

describe('formatCrossModuleInsights', () => {
  it('returns empty string when no insights', () => {
    expect(formatCrossModuleInsights([])).toBe('');
  });

  it('formats insights grouped by severity', () => {
    const modules = new Map<ModuleName, ModuleResult>([
      ['costPlan', makeResult('costPlan', baseCostPlan)],
      ['program', makeResult('program', baseProgram)],
      ['procurement', makeResult('procurement', baseProcurement)],
      ['risks', makeResult('risks', baseRisks)],
    ]);

    const insights = analyzeCrossModulePatterns(modules);
    const formatted = formatCrossModuleInsights(insights);

    expect(formatted).toContain('Cross-Module Observations');
    expect(formatted).toContain('Attention:'); // Warnings section
  });

  it('does not run patterns when modules are missing', () => {
    // Only profile, no cost or program
    const modules = new Map<ModuleName, ModuleResult>();
    const insights = analyzeCrossModulePatterns(modules);
    expect(insights).toHaveLength(0);
  });
});
