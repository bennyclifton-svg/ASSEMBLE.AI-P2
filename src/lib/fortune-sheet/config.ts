/**
 * FortuneSheet Base Configuration
 * Feature 006 - Cost Planning Module (Task T074)
 *
 * Base configuration for FortuneSheet spreadsheet component.
 */

// ============================================================================
// THEME COLORS - Match VS Code dark theme
// ============================================================================

export const COLORS = {
  bg: {
    primary: '#1e1e1e',
    secondary: '#252526',
    tertiary: '#2d2d30',
    hover: '#37373d',
    selected: '#264f78',
  },
  text: {
    primary: '#cccccc',
    secondary: '#858585',
    muted: '#6e6e6e',
    white: '#ffffff',
  },
  border: {
    primary: '#3e3e42',
    secondary: '#555555',
    focus: '#0e639c',
  },
  accent: {
    blue: '#0e639c',
    costPlan: '#B85C5C',
    variation: '#D4A574',
    invoice: '#6B9BD1',
    green: '#4ade80',
    red: '#f87171',
  },
};

// ============================================================================
// FORTUNE SHEET CONFIGURATION
// ============================================================================

export interface FortuneSheetConfig {
  showToolbar: boolean;
  showFormulaBar: boolean;
  showSheetTabs: boolean;
  allowEdit: boolean;
  lang: string;
  column: number;
  row: number;
  gridKey: string;
}

/**
 * Default FortuneSheet configuration for cost planning
 */
export const DEFAULT_CONFIG: FortuneSheetConfig = {
  showToolbar: false,
  showFormulaBar: false,
  showSheetTabs: false,
  allowEdit: true,
  lang: 'en',
  column: 13, // Default column count
  row: 100, // Default row count (will grow as needed)
  gridKey: 'cost-plan-sheet',
};

/**
 * Create read-only configuration
 */
export function createReadOnlyConfig(): Partial<FortuneSheetConfig> {
  return {
    ...DEFAULT_CONFIG,
    allowEdit: false,
  };
}

/**
 * Create full configuration with toolbar
 */
export function createFullConfig(): Partial<FortuneSheetConfig> {
  return {
    ...DEFAULT_CONFIG,
    showToolbar: true,
    showFormulaBar: true,
  };
}

// ============================================================================
// COLUMN WIDTH PRESETS
// ============================================================================

export const COLUMN_WIDTHS = {
  narrow: 60, // Cost codes, small values
  standard: 80, // Most columns
  medium: 100, // Currency amounts
  wide: 150, // Descriptions, company names
  extraWide: 200, // Long descriptions
};

/**
 * Default column widths for Project Summary sheet
 */
export const PROJECT_SUMMARY_COLUMN_WIDTHS: Record<number, number> = {
  0: 80, // Cost Code
  1: 150, // Company
  2: 200, // Description
  3: 100, // Reference
  4: 100, // Budget
  5: 100, // Approved Contract
  6: 100, // Forecast Vars
  7: 100, // Approved Vars
  8: 100, // Final Forecast
  9: 100, // Variance
  10: 100, // Claimed
  11: 100, // Current Month
  12: 100, // ETC
};

// ============================================================================
// ROW HEIGHT PRESETS
// ============================================================================

export const ROW_HEIGHTS = {
  header: 32,
  sectionHeader: 28,
  dataRow: 24,
  totalRow: 28,
};

// ============================================================================
// CELL STYLES
// ============================================================================

export interface CellStyle {
  bg?: string;
  fc?: string; // font color
  bl?: number; // bold (0 or 1)
  it?: number; // italic (0 or 1)
  ht?: number; // horizontal alignment (0=center, 1=left, 2=right)
  vt?: number; // vertical alignment (0=middle, 1=top, 2=bottom)
  fs?: number; // font size
  ff?: string; // font family
}

/**
 * Header row style
 */
export const HEADER_STYLE: CellStyle = {
  bg: COLORS.accent.costPlan,
  fc: COLORS.text.white,
  bl: 1,
  ht: 0, // Center
  fs: 11,
};

/**
 * Section header style
 */
export const SECTION_HEADER_STYLE: CellStyle = {
  bg: COLORS.bg.hover,
  fc: COLORS.text.primary,
  bl: 1,
  ht: 1, // Left
  fs: 11,
};

/**
 * Sub-total row style
 */
export const SUBTOTAL_STYLE: CellStyle = {
  bg: COLORS.bg.tertiary,
  fc: COLORS.text.primary,
  bl: 1,
  ht: 2, // Right for numbers
  fs: 11,
};

/**
 * Grand total row style
 */
export const GRAND_TOTAL_STYLE: CellStyle = {
  bg: COLORS.bg.tertiary,
  fc: COLORS.text.primary,
  bl: 1,
  ht: 2, // Right for numbers
  fs: 11,
};

/**
 * Data cell style (editable)
 */
export const DATA_CELL_STYLE: CellStyle = {
  bg: COLORS.bg.secondary,
  fc: COLORS.accent.blue,
  ht: 2, // Right for numbers
  fs: 11,
};

/**
 * Calculated cell style (read-only)
 */
export const CALCULATED_CELL_STYLE: CellStyle = {
  bg: COLORS.bg.primary,
  fc: COLORS.text.secondary,
  ht: 2, // Right for numbers
  fs: 11,
};

/**
 * Variance positive (under budget) style
 */
export const VARIANCE_POSITIVE_STYLE: CellStyle = {
  fc: COLORS.accent.green,
  ht: 2,
};

/**
 * Variance negative (over budget) style
 */
export const VARIANCE_NEGATIVE_STYLE: CellStyle = {
  fc: COLORS.accent.red,
  ht: 2,
};

// ============================================================================
// CELL TYPE DEFINITIONS
// ============================================================================

export interface CellType {
  fa: string; // format string
  t: 's' | 'n' | 'd' | 'b'; // string, number, date, boolean
}

export const CELL_TYPES = {
  text: { fa: '@', t: 's' } as CellType,
  number: { fa: '#,##0', t: 'n' } as CellType,
  currency: { fa: '$#,##0', t: 'n' } as CellType,
  currencyWithCents: { fa: '$#,##0.00', t: 'n' } as CellType,
  percent: { fa: '0.0%', t: 'n' } as CellType,
  date: { fa: 'yyyy-mm-dd', t: 'd' } as CellType,
  monthYear: { fa: 'mmm yyyy', t: 'd' } as CellType,
};

// ============================================================================
// SHEET DATA HELPERS
// ============================================================================

/**
 * Create a cell data object for FortuneSheet
 */
export function createCell(
  value: string | number | null,
  style?: CellStyle,
  cellType?: CellType
): Record<string, unknown> {
  return {
    v: value,
    ...(style && { ...style }),
    ...(cellType && { ct: cellType }),
  };
}

/**
 * Create celldata array format for FortuneSheet
 */
export function toCellData(
  rows: Array<Array<Record<string, unknown>>>
): Array<{ r: number; c: number; v: Record<string, unknown> }> {
  const celldata: Array<{ r: number; c: number; v: Record<string, unknown> }> = [];

  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell !== null) {
        celldata.push({ r, c, v: cell });
      }
    });
  });

  return celldata;
}

/**
 * Create sheet configuration object
 */
export function createSheetConfig(options: {
  name: string;
  rows: Array<Array<Record<string, unknown>>>;
  columnWidths?: Record<number, number>;
  frozenRows?: number;
  frozenCols?: number;
}): Record<string, unknown> {
  const { name, rows, columnWidths = {}, frozenRows = 0, frozenCols = 0 } = options;

  return {
    name,
    celldata: toCellData(rows),
    row: rows.length + 10, // Add extra rows for expansion
    column: rows[0]?.length || 13,
    config: {
      columnlen: columnWidths,
      rowlen: {},
      rowhidden: {},
    },
    frozen: frozenRows > 0 || frozenCols > 0
      ? {
          type: 'both',
          range: { row_focus: frozenRows - 1, column_focus: frozenCols - 1 },
        }
      : undefined,
  };
}
