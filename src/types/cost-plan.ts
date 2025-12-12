/**
 * Cost Planning Types
 * Feature 006 - Cost Planning Module
 */

// ============================================================================
// SECTION TYPES
// ============================================================================

export type CostLineSection = 'FEES' | 'CONSULTANTS' | 'CONSTRUCTION' | 'CONTINGENCY';

export const SECTION_NAMES: Record<CostLineSection, string> = {
  FEES: 'Fees and Charges',
  CONSULTANTS: 'Consultants',
  CONSTRUCTION: 'Construction',
  CONTINGENCY: 'Contingency',
};

export const SECTION_ORDER: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];

// ============================================================================
// DISCIPLINE TYPES
// ============================================================================

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
  disciplineId?: string | null;
  tradeId?: string | null;
  section: CostLineSection;
  costCode?: string | null;
  activity: string;
  reference?: string | null;
  budgetCents: number;
  approvedContractCents: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CostLineWithDiscipline extends CostLine {
  discipline?: Discipline | null;
  trade?: Trade | null;
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
export interface CostLineWithCalculations extends CostLineWithDiscipline {
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

export interface CreateCostLineInput {
  projectId: string;
  disciplineId?: string;
  tradeId?: string;
  section: CostLineSection;
  costCode?: string;
  activity: string;
  reference?: string;
  budgetCents?: number;
  approvedContractCents?: number;
  sortOrder: number;
}

export interface UpdateCostLineInput {
  disciplineId?: string | null;
  tradeId?: string | null;
  section?: CostLineSection;
  costCode?: string | null;
  activity?: string;
  reference?: string | null;
  budgetCents?: number;
  approvedContractCents?: number;
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
