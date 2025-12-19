/**
 * Default Cost Line Templates
 * Feature 009 - Default Financial Data Initialization
 *
 * These templates are used to pre-populate the cost plan when a new project is created.
 * Total budget: $0 across 4 sections (8 line items)
 */

import type { CostLineSection } from '@/types/cost-plan';

export interface DefaultCostLineTemplate {
  section: CostLineSection;
  costCode: string;
  description: string;
  budgetCents: number;
  sortOrder: number;
}

/**
 * Default cost line templates organized by section
 *
 * FEES (2 items): $0
 * CONSULTANTS (3 items): $0
 * CONSTRUCTION (2 items): $0
 * CONTINGENCY (1 item): $0
 *
 * Total: 8 items, $0
 */
export const DEFAULT_COST_LINES: DefaultCostLineTemplate[] = [
  // ============================================================================
  // FEES Section (Cost Codes: 1.xx)
  // ============================================================================
  {
    section: 'FEES',
    costCode: '1.01',
    description: 'Council Fees',
    budgetCents: 0,
    sortOrder: 1,
  },
  {
    section: 'FEES',
    costCode: '1.02',
    description: 'Authority Fees',
    budgetCents: 0,
    sortOrder: 2,
  },

  // ============================================================================
  // CONSULTANTS Section (Cost Codes: 2.xx)
  // ============================================================================
  {
    section: 'CONSULTANTS',
    costCode: '2.01',
    description: 'Stage 1',
    budgetCents: 0,
    sortOrder: 1,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.02',
    description: 'Stage 2',
    budgetCents: 0,
    sortOrder: 2,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.03',
    description: 'Stage 3',
    budgetCents: 0,
    sortOrder: 3,
  },

  // ============================================================================
  // CONSTRUCTION Section (Cost Codes: 3.xx)
  // ============================================================================
  {
    section: 'CONSTRUCTION',
    costCode: '3.01',
    description: 'Prelims & Margin',
    budgetCents: 0,
    sortOrder: 1,
  },
  {
    section: 'CONSTRUCTION',
    costCode: '3.02',
    description: 'Trade Costs',
    budgetCents: 0,
    sortOrder: 2,
  },

  // ============================================================================
  // CONTINGENCY Section (Cost Codes: 4.xx)
  // ============================================================================
  {
    section: 'CONTINGENCY',
    costCode: '4.01',
    description: 'Construction',
    budgetCents: 0,
    sortOrder: 1,
  },
];

/**
 * Find a default cost line template by its cost code
 * Useful for linking sample variations/invoices to specific cost lines
 */
export function findCostLineByCode(costCode: string): DefaultCostLineTemplate | undefined {
  return DEFAULT_COST_LINES.find(line => line.costCode === costCode);
}

/**
 * Get all cost lines for a specific section
 */
export function getCostLinesBySection(section: CostLineSection): DefaultCostLineTemplate[] {
  return DEFAULT_COST_LINES.filter(line => line.section === section);
}

/**
 * Get the total budget for all default cost lines
 */
export function getTotalDefaultBudget(): number {
  return DEFAULT_COST_LINES.reduce((sum, line) => sum + line.budgetCents, 0);
}

/**
 * Get the total budget for a specific section
 */
export function getSectionBudget(section: CostLineSection): number {
  return getCostLinesBySection(section).reduce((sum, line) => sum + line.budgetCents, 0);
}
