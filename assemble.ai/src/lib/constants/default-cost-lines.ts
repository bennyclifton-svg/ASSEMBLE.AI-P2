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
 * No default lines - new projects start with an empty cost plan
 */
export const DEFAULT_COST_LINES: DefaultCostLineTemplate[] = [];

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
