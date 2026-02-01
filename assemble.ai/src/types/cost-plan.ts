/**
 * Cost Planning Types
 * Feature 006 - Cost Planning Module
 */

import type { MasterStageId } from '@/lib/types/project-initiator';
import type { Stakeholder } from '@/types/stakeholder';

// ============================================================================
// SECTION TYPES
// ============================================================================

export type CostLineSection = 'FEES' | 'CONSULTANTS' | 'CONSTRUCTION' | 'CONTINGENCY';

export const SECTION_NAMES: Record<CostLineSection, string> = {
  FEES: 'Authorities',
  CONSULTANTS: 'Consultants',
  CONSTRUCTION: 'Construction',
  CONTINGENCY: 'Contingency',
};

export const SECTION_ORDER: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];

// ============================================================================
// STAKEHOLDER TYPES (for cost plan context)
// ============================================================================

// Re-export Stakeholder for convenience
export type { Stakeholder };

// Legacy type aliases for backward compatibility during migration
export interface Discipline {
  id: string;
  projectId: string;
  disciplineName: string;
  isEnabled: boolean;
  order: number;
}

export interface Trade {
  id: string;
  projectId: string;
  tradeName: string;
  isEnabled: boolean;
  order: number;
}

// ============================================================================
// COMPANY TYPES (retained for invoices)
// ============================================================================

export interface Company {
  id: string;
  name: string;
  abn?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateCompanyInput {
  name: string;
  abn?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface UpdateCompanyInput {
  name?: string;
  abn?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
}

// ============================================================================
// COST LINE TYPES
// ============================================================================

export interface CostLine {
  id: string;
  projectId: string;
  stakeholderId?: string | null;
  section: CostLineSection;
  costCode?: string | null;
  activity: string;
  reference?: string | null;
  budgetCents: number;
  approvedContractCents: number;
  masterStage?: MasterStageId | null;  // Links to one of 5 master stages
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CostLineWithStakeholder extends CostLine {
  stakeholder?: Stakeholder | null;
}

// Legacy alias for backward compatibility during migration
export interface CostLineWithDiscipline extends CostLine {
  discipline?: Discipline | null;
  trade?: Trade | null;
  stakeholder?: Stakeholder | null;
}

export interface CostLineAllocation {
  id: string;
  costLineId: string;
  fiscalYear: number;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
}

// Cost line with all calculated fields
export interface CostLineWithCalculations extends CostLineWithStakeholder {
  allocations: CostLineAllocation[];
  calculated: {
    forecastVariationsCents: number;
    approvedVariationsCents: number;
    finalForecastCents: number;
    varianceToBudgetCents: number;
    claimedToDateCents: number;
    currentMonthCents: number;
    etcCents: number;
  };
}

// Grouped line for roll-up view (aggregates lines by stakeholder)
export interface GroupedLineTotals {
  budget: number;
  approvedContract: number;
  forecastVars: number;
  approvedVars: number;
  finalForecast: number;
  variance: number;
  claimed: number;
  currentMonth: number;
  etc: number;
}

export interface GroupedLine {
  groupKey: string;           // "CONSULTANTS:stakeholderId" or "CONSTRUCTION:stakeholderId"
  groupName: string;          // Stakeholder name or "Unassigned"
  groupId: string | null;     // stakeholderId
  lines: CostLineWithCalculations[];
  totals: GroupedLineTotals;
}

export interface CreateCostLineInput {
  projectId: string;
  stakeholderId?: string | null;
  section: CostLineSection;
  costCode?: string;
  activity: string;
  reference?: string;
  budgetCents?: number;
  approvedContractCents?: number;
  masterStage?: MasterStageId;
  sortOrder?: number;
}

export interface UpdateCostLineInput {
  stakeholderId?: string | null;
  section?: CostLineSection;
  costCode?: string | null;
  activity?: string;
  reference?: string | null;
  budgetCents?: number;
  approvedContractCents?: number;
  masterStage?: MasterStageId | null;
  sortOrder?: number;
}

// ============================================================================
// COST PLAN TOTALS
// ============================================================================

export interface SectionTotals {
  section: CostLineSection;
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

export interface CostPlanTotals {
  budgetCents: number;
  approvedContractCents: number;
  forecastVariationsCents: number;
  approvedVariationsCents: number;
  finalForecastCents: number;
  varianceCents: number;
  claimedCents: number;
  currentMonthCents: number;
  etcCents: number;
  sectionTotals: SectionTotals[];
}

// ============================================================================
// FULL COST PLAN RESPONSE
// ============================================================================

export interface CostPlan {
  project: {
    id: string;
    name: string;
    code?: string | null;
    currentReportMonth?: string | null;
    revision: string;
    currencyCode: string;
    showGst: boolean;
  };
  costLines: CostLineWithCalculations[];
  totals: CostPlanTotals;
  invoicesCount: number;
  variationsCount: number;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export type BatchOperation<T> =
  | { op: 'create'; data: T }
  | { op: 'update'; id: string; data: Partial<T> }
  | { op: 'delete'; id: string };

export interface BatchResult {
  created: string[];
  updated: string[];
  deleted: string[];
  errors: Array<{ index: number; error: string }>;
}
