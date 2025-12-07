/**
 * Default Cost Line Templates
 * Feature 009 - Default Financial Data Initialization
 *
 * These templates are used to pre-populate the cost plan when a new project is created.
 * Total budget: $900,000 across 4 sections (20 line items)
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
 * FEES (4 items): $100,000
 * CONSULTANTS (10 items): $265,000
 * CONSTRUCTION (5 items): $455,000
 * CONTINGENCY (1 item): $80,000
 *
 * Total: 20 items, $900,000
 */
export const DEFAULT_COST_LINES: DefaultCostLineTemplate[] = [
  // ============================================================================
  // FEES Section (Cost Codes: 1.xx) - $100,000 total
  // ============================================================================
  {
    section: 'FEES',
    costCode: '1.01',
    description: 'Council Fees',
    budgetCents: 2500000, // $25,000
    sortOrder: 1,
  },
  {
    section: 'FEES',
    costCode: '1.02',
    description: 'Section 7.12 Levy',
    budgetCents: 5000000, // $50,000
    sortOrder: 2,
  },
  {
    section: 'FEES',
    costCode: '1.03',
    description: 'Long Service Leave Levy',
    budgetCents: 1500000, // $15,000
    sortOrder: 3,
  },
  {
    section: 'FEES',
    costCode: '1.04',
    description: 'Authority Fees',
    budgetCents: 1000000, // $10,000
    sortOrder: 4,
  },

  // ============================================================================
  // CONSULTANTS Section (Cost Codes: 2.xx) - $265,000 total
  // ============================================================================
  {
    section: 'CONSULTANTS',
    costCode: '2.01',
    description: 'Project Manager',
    budgetCents: 5000000, // $50,000
    sortOrder: 1,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.02',
    description: 'Architect',
    budgetCents: 8000000, // $80,000
    sortOrder: 2,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.03',
    description: 'Town Planner',
    budgetCents: 1500000, // $15,000
    sortOrder: 3,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.04',
    description: 'Structural Engineer',
    budgetCents: 2500000, // $25,000
    sortOrder: 4,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.05',
    description: 'Civil Engineer',
    budgetCents: 1500000, // $15,000
    sortOrder: 5,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.06',
    description: 'Surveyor',
    budgetCents: 800000, // $8,000
    sortOrder: 6,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.07',
    description: 'BCA Consultant',
    budgetCents: 1200000, // $12,000
    sortOrder: 7,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.08',
    description: 'Building Certifier',
    budgetCents: 2000000, // $20,000
    sortOrder: 8,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.09',
    description: 'Quantity Surveyor',
    budgetCents: 2500000, // $25,000
    sortOrder: 9,
  },
  {
    section: 'CONSULTANTS',
    costCode: '2.10',
    description: 'Fire Engineer',
    budgetCents: 1500000, // $15,000
    sortOrder: 10,
  },

  // ============================================================================
  // CONSTRUCTION Section (Cost Codes: 3.xx) - $455,000 total
  // ============================================================================
  {
    section: 'CONSTRUCTION',
    costCode: '3.01',
    description: 'Prelims & Margin',
    budgetCents: 15000000, // $150,000
    sortOrder: 1,
  },
  {
    section: 'CONSTRUCTION',
    costCode: '3.02',
    description: 'Fitout Works',
    budgetCents: 20000000, // $200,000
    sortOrder: 2,
  },
  {
    section: 'CONSTRUCTION',
    costCode: '3.03',
    description: 'FF&E',
    budgetCents: 5000000, // $50,000
    sortOrder: 3,
  },
  {
    section: 'CONSTRUCTION',
    costCode: '3.04',
    description: 'IT/AV Systems',
    budgetCents: 3000000, // $30,000
    sortOrder: 4,
  },
  {
    section: 'CONSTRUCTION',
    costCode: '3.05',
    description: 'Landscaping',
    budgetCents: 2500000, // $25,000
    sortOrder: 5,
  },

  // ============================================================================
  // CONTINGENCY Section (Cost Codes: 4.xx) - $80,000 total
  // ============================================================================
  {
    section: 'CONTINGENCY',
    costCode: '4.01',
    description: 'Construction Contingency',
    budgetCents: 8000000, // $80,000
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
