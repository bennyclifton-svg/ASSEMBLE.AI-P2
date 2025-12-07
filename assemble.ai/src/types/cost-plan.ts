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
// COMPANY TYPES
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
  companyId?: string | null;
  section: CostLineSection;
  costCode?: string | null;
  description: string;
  reference?: string | null;
  budgetCents: number;
  approvedContractCents: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CostLineWithCompany extends CostLine {
  company?: Company | null;
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
export interface CostLineWithCalculations extends CostLineWithCompany {
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
  companyId?: string;
  section: CostLineSection;
  costCode?: string;
  description: string;
  reference?: string;
  budgetCents?: number;
  approvedContractCents?: number;
  sortOrder: number;
}

export interface UpdateCostLineInput {
  companyId?: string | null;
  section?: CostLineSection;
  costCode?: string | null;
  description?: string;
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
