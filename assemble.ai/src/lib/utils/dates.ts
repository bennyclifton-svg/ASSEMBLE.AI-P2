/**
 * Date Utilities
 * Feature 006 - Cost Planning Module (Task T061)
 *
 * Utility functions for period-based date handling.
 * Periods are stored as separate year (number) and month (1-12) integers.
 */

// ============================================================================
// PERIOD TYPE
// ============================================================================

export interface Period {
  year: number;
  month: number; // 1-12 (not 0-11)
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert period (year, month) to JavaScript Date (first day of month)
 */
export function periodToDate(year: number, month: number): Date {
  return new Date(year, month - 1, 1); // month is 0-indexed in Date
}

/**
 * Convert period object to JavaScript Date
 */
export function periodObjToDate(period: Period): Date {
  return periodToDate(period.year, period.month);
}

/**
 * Convert JavaScript Date to period (year, month)
 */
export function dateToPeriod(date: Date): Period {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // Convert 0-indexed to 1-indexed
  };
}

/**
 * Get first day of the month for a given date
 */
export function getFirstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get last day of the month for a given date
 */
export function getLastOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// ============================================================================
// PERIOD FORMATTING
// ============================================================================

/**
 * Format period as display string (e.g., "Dec 2024")
 */
export function formatPeriod(year: number, month: number): string {
  const date = periodToDate(year, month);
  return date.toLocaleString('en-AU', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format period as full display string (e.g., "December 2024")
 */
export function formatPeriodFull(year: number, month: number): string {
  const date = periodToDate(year, month);
  return date.toLocaleString('en-AU', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format period as compact string (e.g., "12/24")
 */
export function formatPeriodCompact(year: number, month: number): string {
  const monthStr = month.toString().padStart(2, '0');
  const yearStr = (year % 100).toString().padStart(2, '0');
  return `${monthStr}/${yearStr}`;
}

/**
 * Format period as ISO-like string (e.g., "2024-12")
 */
export function formatPeriodISO(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

// ============================================================================
// PERIOD PARSING
// ============================================================================

/**
 * Parse period from ISO-like string (e.g., "2024-12")
 */
export function parsePeriodISO(value: string): Period | null {
  const match = value.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  if (month < 1 || month > 12) return null;

  return { year, month };
}

/**
 * Parse period from various formats
 */
export function parsePeriod(value: string): Period | null {
  // Try ISO format first (2024-12)
  const isoResult = parsePeriodISO(value);
  if (isoResult) return isoResult;

  // Try compact format (12/24 or 12/2024)
  const compactMatch = value.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (compactMatch) {
    const month = parseInt(compactMatch[1], 10);
    let year = parseInt(compactMatch[2], 10);
    if (year < 100) year += 2000; // Convert 24 to 2024
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // Try parsing as date string
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return dateToPeriod(date);
  }

  return null;
}

// ============================================================================
// PERIOD ARITHMETIC
// ============================================================================

/**
 * Get current period
 */
export function getCurrentPeriod(): Period {
  return dateToPeriod(new Date());
}

/**
 * Add months to a period
 */
export function addMonths(period: Period, months: number): Period {
  const date = periodObjToDate(period);
  date.setMonth(date.getMonth() + months);
  return dateToPeriod(date);
}

/**
 * Subtract months from a period
 */
export function subtractMonths(period: Period, months: number): Period {
  return addMonths(period, -months);
}

/**
 * Get next period (next month)
 */
export function getNextPeriod(period: Period): Period {
  return addMonths(period, 1);
}

/**
 * Get previous period (previous month)
 */
export function getPreviousPeriod(period: Period): Period {
  return addMonths(period, -1);
}

/**
 * Get difference between two periods in months
 */
export function periodDiffMonths(from: Period, to: Period): number {
  return (to.year - from.year) * 12 + (to.month - from.month);
}

// ============================================================================
// PERIOD COMPARISON
// ============================================================================

/**
 * Compare two periods
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
export function comparePeriods(a: Period, b: Period): number {
  if (a.year !== b.year) {
    return a.year < b.year ? -1 : 1;
  }
  if (a.month !== b.month) {
    return a.month < b.month ? -1 : 1;
  }
  return 0;
}

/**
 * Check if two periods are equal
 */
export function periodsEqual(a: Period, b: Period): boolean {
  return a.year === b.year && a.month === b.month;
}

/**
 * Check if period a is before period b
 */
export function periodIsBefore(a: Period, b: Period): boolean {
  return comparePeriods(a, b) < 0;
}

/**
 * Check if period a is after period b
 */
export function periodIsAfter(a: Period, b: Period): boolean {
  return comparePeriods(a, b) > 0;
}

/**
 * Check if period is within a range (inclusive)
 */
export function periodInRange(period: Period, start: Period, end: Period): boolean {
  return comparePeriods(period, start) >= 0 && comparePeriods(period, end) <= 0;
}

// ============================================================================
// PERIOD RANGE GENERATION
// ============================================================================

/**
 * Generate array of periods between start and end (inclusive)
 */
export function generatePeriodRange(start: Period, end: Period): Period[] {
  const periods: Period[] = [];
  let current = { ...start };

  while (comparePeriods(current, end) <= 0) {
    periods.push({ ...current });
    current = getNextPeriod(current);
  }

  return periods;
}

/**
 * Generate periods for a fiscal year (July to June for Australian FY)
 */
export function generateFiscalYearPeriods(fiscalYear: number): Period[] {
  // Australian FY: July of previous year to June of fiscal year
  // FY2024 = July 2023 to June 2024
  const start: Period = { year: fiscalYear - 1, month: 7 };
  const end: Period = { year: fiscalYear, month: 6 };
  return generatePeriodRange(start, end);
}

/**
 * Get fiscal year for a given period (Australian: July-June)
 */
export function getFiscalYear(period: Period): number {
  // If month is July (7) or later, it's the next fiscal year
  return period.month >= 7 ? period.year + 1 : period.year;
}

/**
 * Get fiscal year label (e.g., "FY24" or "2023-24")
 */
export function formatFiscalYear(fiscalYear: number, format: 'short' | 'long' = 'short'): string {
  if (format === 'short') {
    return `FY${(fiscalYear % 100).toString().padStart(2, '0')}`;
  }
  return `${fiscalYear - 1}-${(fiscalYear % 100).toString().padStart(2, '0')}`;
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number, format: 'short' | 'long' = 'short'): string {
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleString('en-AU', { month: format });
}

/**
 * Get all month names
 */
export function getMonthNames(format: 'short' | 'long' = 'short'): string[] {
  return Array.from({ length: 12 }, (_, i) => getMonthName(i + 1, format));
}

/**
 * Validate period values
 */
export function isValidPeriod(year: number, month: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 1900 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12
  );
}
