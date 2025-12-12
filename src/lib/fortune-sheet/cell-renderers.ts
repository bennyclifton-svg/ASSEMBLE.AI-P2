/**
 * FortuneSheet Cell Renderers
 * Feature 006 - Cost Planning Module (Task T077)
 *
 * Custom cell rendering functions and formatters for FortuneSheet cells.
 */

import { COLORS } from './config';

// ============================================================================
// CELL VALUE TYPES
// ============================================================================

export type CellValueType = 'text' | 'currency' | 'percent' | 'date' | 'monthYear' | 'company' | 'dropdown';

export interface CellRenderConfig {
  type: CellValueType;
  currencyCode?: string;
  showGst?: boolean;
  dropdownOptions?: string[];
  format?: string;
}

// ============================================================================
// CURRENCY RENDERING
// ============================================================================

/**
 * Render cents as formatted currency for display
 */
export function renderCurrency(
  cents: number | null | undefined,
  options: {
    currencyCode?: string;
    showCents?: boolean;
    showSign?: boolean;
    showZeroAsDash?: boolean;
  } = {}
): string {
  const {
    currencyCode = 'AUD',
    showCents = false,
    showSign = false,
    showZeroAsDash = true,
  } = options;

  if (cents === null || cents === undefined) {
    return '-';
  }

  if (cents === 0 && showZeroAsDash) {
    return '-';
  }

  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });

  let result = formatter.format(cents / 100);

  if (showSign && cents > 0) {
    result = '+' + result;
  }

  return result;
}

/**
 * Get FortuneSheet cell data for currency value
 */
export function createCurrencyCell(
  cents: number | null | undefined,
  options: {
    editable?: boolean;
    varianceStyle?: boolean;
  } = {}
): Record<string, unknown> {
  const { editable = false, varianceStyle = false } = options;
  const value = cents !== null && cents !== undefined ? cents / 100 : null;

  let fc = editable ? COLORS.accent.blue : COLORS.text.secondary;

  // Apply variance coloring
  if (varianceStyle && cents !== null && cents !== undefined) {
    if (cents > 0) {
      fc = COLORS.accent.green;
    } else if (cents < 0) {
      fc = COLORS.accent.red;
    }
  }

  return {
    v: value,
    ct: { fa: '$#,##0', t: 'n' },
    fc,
    ht: 2, // Right align
  };
}

// ============================================================================
// DATE/PERIOD RENDERING
// ============================================================================

/**
 * Render period (year, month) as formatted string
 */
export function renderPeriod(
  year: number | null | undefined,
  month: number | null | undefined,
  format: 'short' | 'long' | 'compact' = 'short'
): string {
  if (year === null || year === undefined || month === null || month === undefined) {
    return '-';
  }

  const date = new Date(year, month - 1, 1);

  switch (format) {
    case 'long':
      return date.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
    case 'compact':
      return `${month.toString().padStart(2, '0')}/${(year % 100).toString().padStart(2, '0')}`;
    case 'short':
    default:
      return date.toLocaleString('en-AU', { month: 'short', year: 'numeric' });
  }
}

/**
 * Create FortuneSheet cell data for period
 */
export function createPeriodCell(
  year: number | null | undefined,
  month: number | null | undefined
): Record<string, unknown> {
  const displayValue = renderPeriod(year, month, 'short');

  return {
    v: displayValue,
    ct: { fa: '@', t: 's' },
    fc: COLORS.text.primary,
    ht: 0, // Center align
  };
}

// ============================================================================
// TEXT RENDERING
// ============================================================================

/**
 * Render text with truncation
 */
export function renderText(
  value: string | null | undefined,
  maxLength?: number
): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (maxLength && value.length > maxLength) {
    return value.substring(0, maxLength - 3) + '...';
  }

  return value;
}

/**
 * Create FortuneSheet cell data for text
 */
export function createTextCell(
  value: string | null | undefined,
  options: {
    editable?: boolean;
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
    color?: string;
  } = {}
): Record<string, unknown> {
  const {
    editable = false,
    bold = false,
    align = 'left',
    color,
  } = options;

  const htMap = { left: 1, center: 0, right: 2 };

  return {
    v: value ?? '',
    ct: { fa: '@', t: 's' },
    fc: color ?? (editable ? COLORS.accent.blue : COLORS.text.primary),
    bl: bold ? 1 : 0,
    ht: htMap[align],
  };
}

// ============================================================================
// COMPANY RENDERING
// ============================================================================

/**
 * Render company name with optional truncation
 */
export function renderCompany(
  company: { name: string; id?: string } | null | undefined,
  maxLength = 30
): string {
  if (!company || !company.name) {
    return '-';
  }

  return renderText(company.name, maxLength);
}

/**
 * Create FortuneSheet cell data for company
 */
export function createCompanyCell(
  company: { name: string; id?: string } | null | undefined,
  editable = false
): Record<string, unknown> {
  return {
    v: company?.name ?? '',
    ct: { fa: '@', t: 's' },
    fc: editable ? COLORS.accent.blue : COLORS.text.secondary,
    ht: 1, // Left align
  };
}

/**
 * Create FortuneSheet cell data for discipline
 */
export function createDisciplineCell(
  discipline: { disciplineName: string; id?: string } | null | undefined,
  editable = false
): Record<string, unknown> {
  return {
    v: discipline?.disciplineName ?? '',
    ct: { fa: '@', t: 's' },
    fc: editable ? COLORS.accent.blue : COLORS.text.secondary,
    ht: 1, // Left align
  };
}

// ============================================================================
// VARIANCE RENDERING
// ============================================================================

/**
 * Get color for variance value
 */
export function getVarianceColor(varianceCents: number): string {
  if (varianceCents > 0) return COLORS.accent.green;
  if (varianceCents < 0) return COLORS.accent.red;
  return COLORS.text.secondary;
}

/**
 * Get background color for variance severity
 */
export function getVarianceBackground(
  varianceCents: number,
  thresholds: { warning: number; critical: number } = { warning: 10000, critical: 50000 }
): string | undefined {
  const absVariance = Math.abs(varianceCents);

  if (varianceCents < 0) {
    if (absVariance >= thresholds.critical) {
      return '#7f1d1d'; // Dark red background
    }
    if (absVariance >= thresholds.warning) {
      return '#991b1b'; // Lighter red background
    }
  }

  return undefined;
}

/**
 * Create FortuneSheet cell data for variance
 */
export function createVarianceCell(varianceCents: number | null | undefined): Record<string, unknown> {
  const value = varianceCents !== null && varianceCents !== undefined ? varianceCents / 100 : null;
  const fc = varianceCents ? getVarianceColor(varianceCents) : COLORS.text.secondary;
  const bg = varianceCents ? getVarianceBackground(varianceCents) : undefined;

  return {
    v: value,
    ct: { fa: '$#,##0', t: 'n' },
    fc,
    ...(bg && { bg }),
    ht: 2, // Right align
  };
}

// ============================================================================
// HEADER RENDERING
// ============================================================================

/**
 * Create header cell
 */
export function createHeaderCell(
  label: string,
  options: {
    align?: 'left' | 'center' | 'right';
    span?: number;
  } = {}
): Record<string, unknown> {
  const { align = 'center' } = options;
  const htMap = { left: 1, center: 0, right: 2 };

  return {
    v: label,
    ct: { fa: '@', t: 's' },
    bg: COLORS.accent.costPlan,
    fc: COLORS.text.white,
    bl: 1,
    ht: htMap[align],
  };
}

/**
 * Create section header cell
 */
export function createSectionHeaderCell(
  sectionName: string,
  isCollapsed = false
): Record<string, unknown> {
  const icon = isCollapsed ? '▶' : '▼';

  return {
    v: `${icon} ${sectionName}`,
    ct: { fa: '@', t: 's' },
    bg: COLORS.bg.hover,
    fc: COLORS.text.primary,
    bl: 1,
    ht: 1, // Left align
  };
}

/**
 * Create subtotal cell
 */
export function createSubtotalCell(
  value: number | string,
  isNumeric = true
): Record<string, unknown> {
  if (isNumeric) {
    return {
      v: typeof value === 'number' ? value / 100 : value,
      ct: { fa: '$#,##0', t: 'n' },
      bg: COLORS.bg.tertiary,
      fc: COLORS.text.primary,
      bl: 1,
      ht: 2, // Right align
    };
  }

  return {
    v: value,
    ct: { fa: '@', t: 's' },
    bg: COLORS.bg.tertiary,
    fc: COLORS.text.primary,
    bl: 1,
    ht: 1, // Left align
  };
}

/**
 * Create grand total cell
 */
export function createTotalCell(
  value: number | string,
  isNumeric = true
): Record<string, unknown> {
  if (isNumeric) {
    return {
      v: typeof value === 'number' ? value / 100 : value,
      ct: { fa: '$#,##0', t: 'n' },
      bg: COLORS.bg.tertiary,
      fc: COLORS.text.primary,
      bl: 1,
      ht: 2, // Right align
    };
  }

  return {
    v: value,
    ct: { fa: '@', t: 's' },
    bg: COLORS.bg.tertiary,
    fc: COLORS.text.primary,
    bl: 1,
    ht: 1, // Left align
  };
}

// ============================================================================
// EMPTY/PLACEHOLDER CELLS
// ============================================================================

/**
 * Create empty cell
 */
export function createEmptyCell(bg?: string): Record<string, unknown> {
  return {
    v: '',
    bg: bg ?? COLORS.bg.primary,
  };
}

/**
 * Create placeholder cell for empty sections
 */
export function createPlaceholderCell(message = 'No items'): Record<string, unknown> {
  return {
    v: message,
    ct: { fa: '@', t: 's' },
    fc: COLORS.text.muted,
    it: 1, // Italic
    ht: 0, // Center
  };
}
