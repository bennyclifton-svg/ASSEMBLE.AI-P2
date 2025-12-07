/**
 * Sheet Formatting Definitions
 * Feature 006 - Cost Planning Module (Task T079)
 *
 * Conditional formatting rules, variance highlighting, and cell color schemes.
 */

import { COLORS } from '@/lib/fortune-sheet/config';

// ============================================================================
// FORMATTING TYPES
// ============================================================================

export type FormatCondition =
  | 'positive'
  | 'negative'
  | 'zero'
  | 'overBudget'
  | 'underBudget'
  | 'onBudget'
  | 'warning'
  | 'critical';

export interface ConditionalFormat {
  condition: FormatCondition;
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface ThresholdConfig {
  warning: number;  // cents
  critical: number; // cents
}

// ============================================================================
// COLOR SCHEMES
// ============================================================================

/**
 * Variance color scheme - for budget vs actual comparisons
 */
export const VARIANCE_COLORS = {
  positive: {
    text: '#16a34a',      // Green - under budget (favorable)
    background: '#14532d', // Dark green background
  },
  negative: {
    text: '#dc2626',       // Red - over budget (unfavorable)
    background: '#7f1d1d', // Dark red background
  },
  neutral: {
    text: COLORS.text.secondary,
    background: undefined,
  },
  warning: {
    text: '#f59e0b',       // Amber
    background: '#78350f', // Dark amber background
  },
  critical: {
    text: '#dc2626',       // Red
    background: '#450a0a', // Very dark red background
  },
} as const;

/**
 * Cell type color scheme - distinguishes input from calculated cells
 */
export const CELL_TYPE_COLORS = {
  editable: {
    text: COLORS.accent.blue,
    background: undefined,
  },
  calculated: {
    text: COLORS.text.secondary,
    background: undefined,
  },
  locked: {
    text: COLORS.text.muted,
    background: COLORS.bg.tertiary,
  },
  header: {
    text: COLORS.text.white,
    background: COLORS.accent.costPlan,
  },
  sectionHeader: {
    text: COLORS.text.white,
    background: COLORS.bg.hover,
  },
  subtotal: {
    text: COLORS.text.primary,
    background: COLORS.bg.tertiary,
  },
  grandTotal: {
    text: COLORS.text.white,
    background: COLORS.accent.costPlan,
  },
} as const;

/**
 * Status color scheme - for variation/invoice status
 */
export const STATUS_COLORS = {
  forecast: {
    text: '#f59e0b',       // Amber
    background: undefined,
  },
  approved: {
    text: '#16a34a',       // Green
    background: undefined,
  },
  pending: {
    text: '#6b7280',       // Gray
    background: undefined,
  },
  rejected: {
    text: '#dc2626',       // Red
    background: undefined,
  },
} as const;

// ============================================================================
// DEFAULT THRESHOLDS
// ============================================================================

/**
 * Default variance thresholds in cents
 */
export const DEFAULT_VARIANCE_THRESHOLDS: ThresholdConfig = {
  warning: 1000000,   // $10,000
  critical: 5000000,  // $50,000
};

/**
 * Default percentage thresholds
 */
export const DEFAULT_PERCENT_THRESHOLDS = {
  warning: 5,    // 5% over budget
  critical: 10,  // 10% over budget
};

// ============================================================================
// CONDITIONAL FORMATTING RULES
// ============================================================================

/**
 * Get format condition based on variance value
 */
export function getVarianceCondition(
  varianceCents: number,
  thresholds: ThresholdConfig = DEFAULT_VARIANCE_THRESHOLDS
): FormatCondition {
  if (varianceCents === 0) return 'zero';

  if (varianceCents > 0) {
    // Positive variance = under budget (favorable)
    return 'positive';
  }

  // Negative variance = over budget (unfavorable)
  const absVariance = Math.abs(varianceCents);

  if (absVariance >= thresholds.critical) {
    return 'critical';
  }

  if (absVariance >= thresholds.warning) {
    return 'warning';
  }

  return 'negative';
}

/**
 * Get format condition based on percentage variance
 */
export function getPercentVarianceCondition(
  variancePercent: number,
  thresholds = DEFAULT_PERCENT_THRESHOLDS
): FormatCondition {
  if (variancePercent === 0) return 'zero';

  if (variancePercent > 0) {
    return 'positive'; // Under budget
  }

  const absPercent = Math.abs(variancePercent);

  if (absPercent >= thresholds.critical) {
    return 'critical';
  }

  if (absPercent >= thresholds.warning) {
    return 'warning';
  }

  return 'negative';
}

/**
 * Get budget condition (over/under/on budget)
 */
export function getBudgetCondition(
  budgetCents: number,
  actualCents: number,
  tolerancePercent = 1
): FormatCondition {
  if (budgetCents === 0) return 'zero';

  const variancePercent = ((budgetCents - actualCents) / budgetCents) * 100;

  if (Math.abs(variancePercent) <= tolerancePercent) {
    return 'onBudget';
  }

  return variancePercent > 0 ? 'underBudget' : 'overBudget';
}

// ============================================================================
// FORMAT APPLICATION
// ============================================================================

/**
 * Get cell styling for a format condition
 */
export function getConditionalFormat(condition: FormatCondition): ConditionalFormat {
  switch (condition) {
    case 'positive':
    case 'underBudget':
      return {
        condition,
        textColor: VARIANCE_COLORS.positive.text,
        backgroundColor: undefined,
      };

    case 'negative':
    case 'overBudget':
      return {
        condition,
        textColor: VARIANCE_COLORS.negative.text,
        backgroundColor: undefined,
      };

    case 'warning':
      return {
        condition,
        textColor: VARIANCE_COLORS.warning.text,
        backgroundColor: VARIANCE_COLORS.warning.background,
      };

    case 'critical':
      return {
        condition,
        textColor: VARIANCE_COLORS.critical.text,
        backgroundColor: VARIANCE_COLORS.critical.background,
        bold: true,
      };

    case 'zero':
    case 'onBudget':
    default:
      return {
        condition,
        textColor: VARIANCE_COLORS.neutral.text,
        backgroundColor: undefined,
      };
  }
}

/**
 * Apply variance formatting to a FortuneSheet cell
 */
export function applyVarianceFormat(
  cell: Record<string, unknown>,
  varianceCents: number,
  thresholds?: ThresholdConfig
): Record<string, unknown> {
  const condition = getVarianceCondition(varianceCents, thresholds);
  const format = getConditionalFormat(condition);

  return {
    ...cell,
    fc: format.textColor ?? cell.fc,
    ...(format.backgroundColor && { bg: format.backgroundColor }),
    ...(format.bold && { bl: 1 }),
    ...(format.italic && { it: 1 }),
  };
}

/**
 * Apply editable cell formatting
 */
export function applyEditableFormat(
  cell: Record<string, unknown>,
  isEditable: boolean
): Record<string, unknown> {
  const colors = isEditable ? CELL_TYPE_COLORS.editable : CELL_TYPE_COLORS.calculated;

  return {
    ...cell,
    fc: colors.text,
    ...(colors.background && { bg: colors.background }),
  };
}

/**
 * Apply status formatting
 */
export function applyStatusFormat(
  cell: Record<string, unknown>,
  status: 'forecast' | 'approved' | 'pending' | 'rejected'
): Record<string, unknown> {
  const colors = STATUS_COLORS[status];

  return {
    ...cell,
    fc: colors.text,
    ...(colors.background && { bg: colors.background }),
  };
}

// ============================================================================
// ROW FORMATTING
// ============================================================================

/**
 * Get row background color based on row type
 */
export function getRowBackground(
  rowType: 'header' | 'sectionHeader' | 'data' | 'subtotal' | 'grandTotal' | 'empty'
): string | undefined {
  switch (rowType) {
    case 'header':
      return CELL_TYPE_COLORS.header.background;
    case 'sectionHeader':
      return CELL_TYPE_COLORS.sectionHeader.background;
    case 'subtotal':
      return CELL_TYPE_COLORS.subtotal.background;
    case 'grandTotal':
      return CELL_TYPE_COLORS.grandTotal.background;
    case 'data':
    case 'empty':
    default:
      return undefined;
  }
}

/**
 * Get row text color based on row type
 */
export function getRowTextColor(
  rowType: 'header' | 'sectionHeader' | 'data' | 'subtotal' | 'grandTotal' | 'empty'
): string {
  switch (rowType) {
    case 'header':
      return CELL_TYPE_COLORS.header.text;
    case 'sectionHeader':
      return CELL_TYPE_COLORS.sectionHeader.text;
    case 'grandTotal':
      return CELL_TYPE_COLORS.grandTotal.text;
    case 'subtotal':
      return CELL_TYPE_COLORS.subtotal.text;
    case 'data':
    case 'empty':
    default:
      return COLORS.text.primary;
  }
}

// ============================================================================
// ALTERNATING ROW COLORS
// ============================================================================

/**
 * Get alternating row background for zebra striping
 */
export function getAlternatingRowBackground(
  rowIndex: number,
  enabled = true
): string | undefined {
  if (!enabled) return undefined;

  return rowIndex % 2 === 0 ? undefined : COLORS.bg.secondary;
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * FortuneSheet number format strings
 */
export const NUMBER_FORMATS = {
  currency: '$#,##0',
  currencyWithCents: '$#,##0.00',
  currencyNegative: '$#,##0;[Red]-$#,##0',
  currencyAccounting: '_($* #,##0_);_($* (#,##0);_($* "-"_);_(@_)',
  percent: '0%',
  percentDecimal: '0.00%',
  number: '#,##0',
  numberDecimal: '#,##0.00',
  text: '@',
  date: 'dd/mm/yyyy',
  monthYear: 'mmm yyyy',
} as const;

/**
 * Get FortuneSheet cell type configuration for a column type
 */
export function getCellTypeConfig(
  type: 'currency' | 'currencyVariance' | 'percent' | 'date' | 'monthYear' | 'text' | 'number'
): { fa: string; t: string } {
  switch (type) {
    case 'currency':
      return { fa: NUMBER_FORMATS.currency, t: 'n' };
    case 'currencyVariance':
      return { fa: NUMBER_FORMATS.currencyNegative, t: 'n' };
    case 'percent':
      return { fa: NUMBER_FORMATS.percent, t: 'n' };
    case 'date':
      return { fa: NUMBER_FORMATS.date, t: 'd' };
    case 'monthYear':
      return { fa: NUMBER_FORMATS.monthYear, t: 'd' };
    case 'number':
      return { fa: NUMBER_FORMATS.number, t: 'n' };
    case 'text':
    default:
      return { fa: NUMBER_FORMATS.text, t: 's' };
  }
}

// ============================================================================
// HIGHLIGHT RULES
// ============================================================================

export interface HighlightRule {
  name: string;
  check: (value: unknown, context?: Record<string, unknown>) => boolean;
  format: ConditionalFormat;
}

/**
 * Predefined highlight rules for common scenarios
 */
export const HIGHLIGHT_RULES: HighlightRule[] = [
  {
    name: 'criticalOverBudget',
    check: (value) => typeof value === 'number' && value < -5000000, // -$50,000
    format: getConditionalFormat('critical'),
  },
  {
    name: 'warningOverBudget',
    check: (value) => typeof value === 'number' && value < -1000000 && value >= -5000000,
    format: getConditionalFormat('warning'),
  },
  {
    name: 'overBudget',
    check: (value) => typeof value === 'number' && value < 0 && value >= -1000000,
    format: getConditionalFormat('negative'),
  },
  {
    name: 'underBudget',
    check: (value) => typeof value === 'number' && value > 0,
    format: getConditionalFormat('positive'),
  },
];

/**
 * Apply highlight rules to a cell value
 */
export function applyHighlightRules(
  cell: Record<string, unknown>,
  value: unknown,
  rules: HighlightRule[] = HIGHLIGHT_RULES,
  context?: Record<string, unknown>
): Record<string, unknown> {
  for (const rule of rules) {
    if (rule.check(value, context)) {
      return {
        ...cell,
        fc: rule.format.textColor ?? cell.fc,
        ...(rule.format.backgroundColor && { bg: rule.format.backgroundColor }),
        ...(rule.format.bold && { bl: 1 }),
        ...(rule.format.italic && { it: 1 }),
      };
    }
  }

  return cell;
}
