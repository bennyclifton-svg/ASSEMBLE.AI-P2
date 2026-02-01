/**
 * Sheet Column Definitions
 * Feature 006 - Cost Planning Module (Task T078)
 *
 * Column definitions for Project Summary, Invoices, and Variations sheets.
 */

// ============================================================================
// COLUMN TYPE DEFINITIONS
// ============================================================================

export type ColumnType = 'text' | 'currency' | 'currencyVariance' | 'percent' | 'date' | 'monthYear' | 'discipline' | 'dropdown';

export type ColumnAlign = 'left' | 'center' | 'right';

export interface ColumnDefinition {
  key: string;
  label: string;
  shortLabel?: string; // For narrow displays
  type: ColumnType;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  editable: boolean;
  required?: boolean;
  align: ColumnAlign;
  hidden?: boolean;
  frozen?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  description?: string; // Tooltip/help text
}

// ============================================================================
// PROJECT SUMMARY COLUMNS
// ============================================================================

export const PROJECT_SUMMARY_COLUMNS: ColumnDefinition[] = [
  {
    key: 'discipline',
    label: 'Discipline',
    type: 'discipline',
    width: 150,
    minWidth: 100,
    maxWidth: 250,
    editable: true,
    align: 'left',
    sortable: true,
    filterable: true,
    resizable: true,
    description: 'Consultant discipline (e.g., Architect, Structural)',
  },
  {
    key: 'activity',
    label: 'Activity',
    shortLabel: 'Act',
    type: 'text',
    width: 200,
    minWidth: 100,
    maxWidth: 400,
    editable: true,
    required: true,
    align: 'left',
    sortable: true,
    filterable: true,
    resizable: true,
    description: 'Activity or work description',
  },
  {
    key: 'reference',
    label: 'Reference',
    shortLabel: 'Ref',
    type: 'text',
    width: 100,
    minWidth: 60,
    maxWidth: 150,
    editable: true,
    align: 'left',
    resizable: true,
    description: 'External reference (PO number, quote ref)',
  },
  {
    key: 'budgetCents',
    label: 'Budget',
    type: 'currency',
    width: 100,
    minWidth: 80,
    maxWidth: 120,
    editable: true,
    align: 'right',
    sortable: true,
    resizable: true,
    description: 'Original budget amount',
  },
  {
    key: 'approvedContractCents',
    label: 'Approved Contract',
    shortLabel: 'Contract',
    type: 'currency',
    width: 110,
    minWidth: 80,
    maxWidth: 130,
    editable: true,
    align: 'right',
    sortable: true,
    resizable: true,
    description: 'Approved contract value',
  },
  {
    key: 'forecastVariationsCents',
    label: 'Forecast Variations',
    shortLabel: 'Fcst Vars',
    type: 'currency',
    width: 100,
    minWidth: 80,
    maxWidth: 120,
    editable: false,
    align: 'right',
    sortable: true,
    resizable: true,
    description: 'Sum of forecast (pending) variations',
  },
  {
    key: 'approvedVariationsCents',
    label: 'Approved Variations',
    shortLabel: 'Appr Vars',
    type: 'currency',
    width: 100,
    minWidth: 80,
    maxWidth: 120,
    editable: false,
    align: 'right',
    sortable: true,
    resizable: true,
    description: 'Sum of approved variations',
  },
  {
    key: 'finalForecastCents',
    label: 'Final Forecast',
    shortLabel: 'Forecast',
    type: 'currency',
    width: 110,
    minWidth: 90,
    maxWidth: 130,
    editable: false,
    align: 'right',
    sortable: true,
    resizable: true,
    description: 'Contract + Forecast Vars + Approved Vars',
  },
  {
    key: 'varianceToBudgetCents',
    label: 'Variance',
    shortLabel: 'Var',
    type: 'currencyVariance',
    width: 100,
    minWidth: 80,
    maxWidth: 120,
    editable: false,
    align: 'right',
    sortable: true,
    resizable: true,
    description: 'Budget - Final Forecast (+ = under budget)',
  },
  {
    key: 'claimedToDateCents',
    label: 'Claimed to Date',
    shortLabel: 'Claimed',
    type: 'currency',
    width: 100,
    minWidth: 80,
    maxWidth: 120,
    editable: false,
    align: 'right',
    sortable: true,
    resizable: true,
    description: 'Total invoiced amount',
  },
  {
    key: 'currentMonthCents',
    label: 'Current Month',
    shortLabel: 'Month',
    type: 'currency',
    width: 100,
    minWidth: 80,
    maxWidth: 120,
    editable: false,
    align: 'right',
    sortable: true,
    resizable: true,
    description: 'Invoiced in current report month',
  },
  {
    key: 'etcCents',
    label: 'Estimate to Complete',
    shortLabel: 'ETC',
    type: 'currency',
    width: 100,
    minWidth: 80,
    maxWidth: 120,
    editable: false,
    align: 'right',
    sortable: true,
    resizable: true,
    description: 'Final Forecast - Claimed to Date',
  },
];

// ============================================================================
// INVOICES SHEET COLUMNS
// ============================================================================

export const INVOICES_COLUMNS: ColumnDefinition[] = [
  {
    key: 'invoiceNumber',
    label: 'Invoice #',
    type: 'text',
    width: 100,
    editable: true,
    required: true,
    align: 'left',
    sortable: true,
    filterable: true,
  },
  {
    key: 'company',
    label: 'Company',
    type: 'company',
    width: 150,
    editable: true,
    align: 'left',
    sortable: true,
    filterable: true,
  },
  {
    key: 'costLine',
    label: 'Cost Line',
    type: 'dropdown',
    width: 180,
    editable: true,
    required: true,
    align: 'left',
    sortable: true,
    filterable: true,
  },
  {
    key: 'description',
    label: 'Description',
    type: 'text',
    width: 200,
    editable: true,
    align: 'left',
    filterable: true,
  },
  {
    key: 'period',
    label: 'Period',
    type: 'monthYear',
    width: 100,
    editable: true,
    required: true,
    align: 'center',
    sortable: true,
    filterable: true,
  },
  {
    key: 'amountCents',
    label: 'Amount',
    type: 'currency',
    width: 110,
    editable: true,
    required: true,
    align: 'right',
    sortable: true,
  },
  {
    key: 'gstCents',
    label: 'GST',
    type: 'currency',
    width: 90,
    editable: false,
    align: 'right',
  },
  {
    key: 'totalCents',
    label: 'Total Inc GST',
    type: 'currency',
    width: 110,
    editable: false,
    align: 'right',
  },
  {
    key: 'variationNumber',
    label: 'Variation',
    type: 'dropdown',
    width: 100,
    editable: true,
    align: 'left',
    filterable: true,
    description: 'Link to variation if applicable',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'dropdown',
    width: 90,
    editable: true,
    align: 'center',
    sortable: true,
    filterable: true,
  },
  {
    key: 'invoiceDate',
    label: 'Date',
    type: 'date',
    width: 100,
    editable: true,
    align: 'center',
    sortable: true,
  },
];

// ============================================================================
// VARIATIONS SHEET COLUMNS
// ============================================================================

export const VARIATIONS_COLUMNS: ColumnDefinition[] = [
  {
    key: 'variationNumber',
    label: 'Variation #',
    type: 'text',
    width: 100,
    editable: false, // Auto-generated
    align: 'left',
    sortable: true,
    filterable: true,
  },
  {
    key: 'costLine',
    label: 'Cost Line',
    type: 'dropdown',
    width: 180,
    editable: true,
    required: true,
    align: 'left',
    sortable: true,
    filterable: true,
  },
  {
    key: 'description',
    label: 'Description',
    type: 'text',
    width: 250,
    editable: true,
    required: true,
    align: 'left',
    filterable: true,
  },
  {
    key: 'category',
    label: 'Category',
    type: 'dropdown',
    width: 100,
    editable: true,
    required: true,
    align: 'center',
    sortable: true,
    filterable: true,
    description: 'Principal (PV), Contractor (CV), or Latent (LV)',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'dropdown',
    width: 90,
    editable: true,
    required: true,
    align: 'center',
    sortable: true,
    filterable: true,
    description: 'Forecast or Approved',
  },
  {
    key: 'amountForecastCents',
    label: 'Forecast Amount',
    type: 'currency',
    width: 120,
    editable: true,
    align: 'right',
    sortable: true,
    description: 'Expected variation amount (before approval)',
  },
  {
    key: 'amountApprovedCents',
    label: 'Approved Amount',
    type: 'currency',
    width: 120,
    editable: true,
    align: 'right',
    sortable: true,
    description: 'Final approved variation amount',
  },
  {
    key: 'requestedDate',
    label: 'Requested',
    type: 'date',
    width: 100,
    editable: true,
    align: 'center',
    sortable: true,
  },
  {
    key: 'approvedDate',
    label: 'Approved',
    type: 'date',
    width: 100,
    editable: true,
    align: 'center',
    sortable: true,
  },
  {
    key: 'reference',
    label: 'Reference',
    type: 'text',
    width: 120,
    editable: true,
    align: 'left',
    description: 'External reference number',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get column widths as Record for FortuneSheet config
 */
export function getColumnWidths(columns: ColumnDefinition[]): Record<number, number> {
  return columns.reduce((acc, col, index) => {
    if (!col.hidden) {
      acc[index] = col.width;
    }
    return acc;
  }, {} as Record<number, number>);
}

/**
 * Get editable column indices
 */
export function getEditableColumns(columns: ColumnDefinition[]): number[] {
  return columns
    .map((col, index) => (col.editable ? index : -1))
    .filter((index) => index !== -1);
}

/**
 * Get column index by key
 */
export function getColumnIndex(columns: ColumnDefinition[], key: string): number {
  return columns.findIndex((col) => col.key === key);
}

/**
 * Get column definition by key
 */
export function getColumn(columns: ColumnDefinition[], key: string): ColumnDefinition | undefined {
  return columns.find((col) => col.key === key);
}

/**
 * Get visible columns
 */
export function getVisibleColumns(columns: ColumnDefinition[]): ColumnDefinition[] {
  return columns.filter((col) => !col.hidden);
}

/**
 * Get column labels as array (for header row)
 */
export function getColumnLabels(columns: ColumnDefinition[], useShort = false): string[] {
  return columns
    .filter((col) => !col.hidden)
    .map((col) => (useShort && col.shortLabel) ? col.shortLabel : col.label);
}

/**
 * Check if column is currency type
 */
export function isCurrencyColumn(column: ColumnDefinition): boolean {
  return column.type === 'currency' || column.type === 'currencyVariance';
}

/**
 * Get field name to update from column index
 */
export function getFieldFromColumn(columns: ColumnDefinition[], colIndex: number): string | null {
  const column = columns[colIndex];
  return column?.editable ? column.key : null;
}
