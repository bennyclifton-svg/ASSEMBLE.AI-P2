/**
 * Variation Types
 * Feature 006 - Cost Planning Module
 */

// ============================================================================
// STATUS & CATEGORY TYPES
// ============================================================================

export type VariationStatus = 'Forecast' | 'Approved' | 'Rejected' | 'Withdrawn';
export type VariationCategory = 'Principal' | 'Contractor' | 'Lessor Works';

export const VARIATION_STATUS_OPTIONS: VariationStatus[] = ['Forecast', 'Approved', 'Rejected', 'Withdrawn'];
export const VARIATION_CATEGORY_OPTIONS: VariationCategory[] = ['Principal', 'Contractor', 'Lessor Works'];

// Prefix for variation number based on category
export const VARIATION_PREFIXES: Record<VariationCategory, string> = {
  Principal: 'PV',
  Contractor: 'CV',
  'Lessor Works': 'LV',
};

// ============================================================================
// VARIATION TYPES
// ============================================================================

export interface Variation {
  id: string;
  projectId: string;
  costLineId?: string | null;
  variationNumber: string;
  category: VariationCategory;
  description: string;
  status: VariationStatus;
  amountForecastCents: number;
  amountApprovedCents: number;
  dateSubmitted?: string | null;
  dateApproved?: string | null;
  requestedBy?: string | null;
  approvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface VariationWithCostLine extends Variation {
  costLine?: {
    id: string;
    costCode?: string | null;
    activity: string;
    section: string;
  } | null;
}

export interface CreateVariationInput {
  projectId: string;
  costLineId?: string;
  category: VariationCategory;
  description: string;
  status?: VariationStatus;
  amountForecastCents?: number;
  amountApprovedCents?: number;
  dateSubmitted?: string;
  dateApproved?: string;
  requestedBy?: string;
  approvedBy?: string;
}

export interface UpdateVariationInput {
  costLineId?: string | null;
  category?: VariationCategory;
  description?: string;
  status?: VariationStatus;
  amountForecastCents?: number;
  amountApprovedCents?: number;
  dateSubmitted?: string | null;
  dateApproved?: string | null;
  requestedBy?: string | null;
  approvedBy?: string | null;
}

// ============================================================================
// VARIATION SUMMARY
// ============================================================================

export interface VariationSummary {
  totalCount: number;
  forecastCount: number;
  approvedCount: number;
  rejectedCount: number;
  withdrawnCount: number;
  totalForecastCents: number;
  totalApprovedCents: number;
}

export interface CostLineVariationSummary {
  costLineId: string;
  forecastVariationsCents: number;
  approvedVariationsCents: number;
  variationCount: number;
}
