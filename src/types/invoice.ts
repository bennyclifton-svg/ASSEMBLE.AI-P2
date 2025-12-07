/**
 * Invoice Types
 * Feature 006 - Cost Planning Module
 */

// ============================================================================
// STATUS TYPES
// ============================================================================

export type PaidStatus = 'unpaid' | 'paid' | 'partial';

export const PAID_STATUS_OPTIONS: PaidStatus[] = ['unpaid', 'paid', 'partial'];

// ============================================================================
// INVOICE TYPES
// ============================================================================

export interface Invoice {
  id: string;
  projectId: string;
  costLineId?: string | null;
  variationId?: string | null;
  companyId?: string | null;
  fileAssetId?: string | null; // Link to source PDF (Phase 14)
  invoiceDate: string;
  poNumber?: string | null;
  invoiceNumber: string;
  description?: string | null;
  amountCents: number;
  gstCents: number;
  periodYear: number;
  periodMonth: number;
  paidStatus: PaidStatus;
  paidDate?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface InvoiceWithRelations extends Invoice {
  costLine?: {
    id: string;
    costCode?: string | null;
    description: string;
    section: string;
  } | null;
  variation?: {
    id: string;
    variationNumber: string;
    description: string;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateInvoiceInput {
  projectId: string;
  costLineId?: string;
  variationId?: string;
  companyId?: string;
  invoiceDate: string;
  poNumber?: string;
  invoiceNumber: string;
  description?: string;
  amountCents: number;
  gstCents?: number;
  periodYear: number;
  periodMonth: number;
  paidStatus?: PaidStatus;
  paidDate?: string;
}

export interface UpdateInvoiceInput {
  costLineId?: string | null;
  variationId?: string | null;
  companyId?: string | null;
  invoiceDate?: string;
  poNumber?: string | null;
  invoiceNumber?: string;
  description?: string | null;
  amountCents?: number;
  gstCents?: number;
  periodYear?: number;
  periodMonth?: number;
  paidStatus?: PaidStatus;
  paidDate?: string | null;
}

// ============================================================================
// INVOICE SUMMARY
// ============================================================================

export interface InvoiceSummary {
  totalCount: number;
  totalAmountCents: number;
  totalGstCents: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
}

export interface CostLineInvoiceSummary {
  costLineId: string;
  claimedToDateCents: number;
  currentMonthCents: number;
  invoiceCount: number;
}

// ============================================================================
// PERIOD HELPER
// ============================================================================

export interface Period {
  year: number;
  month: number;
}

export function periodToString(period: Period): string {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

export function stringToPeriod(str: string): Period {
  const [year, month] = str.split('-').map(Number);
  return { year, month };
}

export function formatPeriod(period: Period): string {
  const date = new Date(period.year, period.month - 1);
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}
