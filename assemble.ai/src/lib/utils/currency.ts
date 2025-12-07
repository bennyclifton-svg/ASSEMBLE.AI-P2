/**
 * Currency Utilities
 * Feature 006 - Cost Planning Module (Task T060)
 *
 * Utility functions for currency conversion, formatting, and parsing.
 * All internal amounts are stored in cents (integers) to avoid floating-point precision issues.
 */

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars to cents (rounds to nearest cent)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert string dollar amount to cents
 */
export function parseDollarsToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : dollarsToCents(parsed);
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

export interface CurrencyFormatOptions {
  currencyCode?: string;
  showCents?: boolean;
  showSign?: boolean;
  compact?: boolean;
  showGst?: boolean;
  gstRate?: number;
}

/**
 * Format cents as currency string
 */
export function formatCurrency(
  cents: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    currencyCode = 'AUD',
    showCents = false,
    showSign = false,
    compact = false,
    showGst = false,
    gstRate = 0.1,
  } = options;

  let value = cents;
  if (showGst) {
    value = Math.round(cents * (1 + gstRate));
  }

  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
    notation: compact ? 'compact' : 'standard',
  });

  let formatted = formatter.format(value / 100);

  if (showSign && cents > 0) {
    formatted = '+' + formatted;
  }

  return formatted;
}

/**
 * Format cents as compact currency string (e.g., "$1.5M")
 */
export function formatCurrencyCompact(
  cents: number,
  currencyCode = 'AUD'
): string {
  return formatCurrency(cents, { currencyCode, compact: true });
}

/**
 * Format cents as accounting style (negatives in parentheses)
 */
export function formatCurrencyAccounting(
  cents: number,
  currencyCode = 'AUD'
): string {
  if (cents < 0) {
    return `(${formatCurrency(Math.abs(cents), { currencyCode })})`;
  }
  return formatCurrency(cents, { currencyCode });
}

/**
 * Format cents with explicit sign (+ or -)
 */
export function formatCurrencyWithSign(
  cents: number,
  currencyCode = 'AUD'
): string {
  return formatCurrency(cents, { currencyCode, showSign: true });
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse currency input string to cents
 * Handles various input formats:
 * - "$1,234.56" → 123456
 * - "1234.56" → 123456
 * - "1,234" → 123400
 * - "$1.5k" → 150000
 * - "$1.5M" → 150000000
 */
export function parseCurrencyInput(input: string): number {
  if (!input || typeof input !== 'string') {
    return 0;
  }

  // Normalize the input
  let cleaned = input.trim().toLowerCase();

  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[$€£¥₹a-z\s]/gi, (match) => {
    // Preserve multiplier suffixes
    if (match === 'k' || match === 'm' || match === 'b') {
      return match;
    }
    return '';
  });

  // Handle multiplier suffixes
  let multiplier = 1;
  if (cleaned.endsWith('k')) {
    multiplier = 1000;
    cleaned = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('m')) {
    multiplier = 1000000;
    cleaned = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('b')) {
    multiplier = 1000000000;
    cleaned = cleaned.slice(0, -1);
  }

  // Remove thousand separators (commas)
  cleaned = cleaned.replace(/,/g, '');

  // Handle negative values in parentheses (accounting format)
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  // Also check for leading minus
  const hasMinusSign = cleaned.startsWith('-');
  if (hasMinusSign) {
    cleaned = cleaned.slice(1);
  }

  // Parse the number
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return 0;
  }

  // Apply multiplier and convert to cents
  let cents = Math.round(parsed * multiplier * 100);

  // Apply negative sign
  if (isNegative || hasMinusSign) {
    cents = -cents;
  }

  return cents;
}

/**
 * Validate currency input string
 */
export function isValidCurrencyInput(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Allow empty string
  if (input.trim() === '') {
    return true;
  }

  // Try to parse and check for valid result
  const parsed = parseCurrencyInput(input);
  return !isNaN(parsed);
}

// ============================================================================
// GST/TAX FUNCTIONS
// ============================================================================

/**
 * Add GST to cents amount
 */
export function addGst(cents: number, gstRate = 0.1): number {
  return Math.round(cents * (1 + gstRate));
}

/**
 * Remove GST from cents amount (GST-inclusive to exclusive)
 */
export function removeGst(centsIncGst: number, gstRate = 0.1): number {
  return Math.round(centsIncGst / (1 + gstRate));
}

/**
 * Calculate GST component from GST-inclusive amount
 */
export function calculateGstComponent(centsIncGst: number, gstRate = 0.1): number {
  return centsIncGst - removeGst(centsIncGst, gstRate);
}

/**
 * Calculate GST from GST-exclusive amount
 */
export function calculateGstFromExclusive(centsExclGst: number, gstRate = 0.1): number {
  return Math.round(centsExclGst * gstRate);
}

// ============================================================================
// COMPARISON & VALIDATION
// ============================================================================

/**
 * Compare two cent amounts with tolerance for floating-point errors
 */
export function centsEqual(a: number, b: number, tolerance = 1): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Clamp cents value to a range
 */
export function clampCents(cents: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, cents));
}

/**
 * Check if cents value is within budget
 */
export function isWithinBudget(actualCents: number, budgetCents: number): boolean {
  return actualCents <= budgetCents;
}

/**
 * Calculate percentage of budget used
 */
export function budgetUsedPercent(actualCents: number, budgetCents: number): number {
  if (budgetCents === 0) return actualCents > 0 ? 100 : 0;
  return Math.round((actualCents / budgetCents) * 10000) / 100; // 2 decimal places
}
