/**
 * Sheet Validation Definitions
 * Feature 006 - Cost Planning Module (Task T080)
 *
 * Input validation, data type validation, and range validation for cost plan sheets.
 */

import type { ColumnType } from './columns';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export type ValidationResult = {
  valid: boolean;
  error?: string;
  sanitizedValue?: unknown;
};

export type ValidatorFn = (value: unknown, context?: ValidationContext) => ValidationResult;

export interface ValidationRule {
  type: 'required' | 'minValue' | 'maxValue' | 'pattern' | 'custom' | 'range' | 'length' | 'enum';
  message: string;
  params?: Record<string, unknown>;
  validator?: ValidatorFn;
}

export interface ValidationContext {
  columnKey?: string;
  columnType?: ColumnType;
  rowData?: Record<string, unknown>;
  existingValues?: unknown[];
}

export interface ColumnValidation {
  columnKey: string;
  rules: ValidationRule[];
}

// ============================================================================
// VALIDATION RESULT HELPERS
// ============================================================================

function valid(sanitizedValue?: unknown): ValidationResult {
  return { valid: true, sanitizedValue };
}

function invalid(error: string): ValidationResult {
  return { valid: false, error };
}

// ============================================================================
// BASIC VALIDATORS
// ============================================================================

/**
 * Required field validator
 */
export function validateRequired(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return invalid('This field is required');
  }
  return valid(value);
}

/**
 * Validate number is not negative
 */
export function validateNonNegative(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid(value);
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(num)) {
    return invalid('Must be a valid number');
  }

  if (num < 0) {
    return invalid('Value cannot be negative');
  }

  return valid(num);
}

/**
 * Validate number is within range
 */
export function validateRange(
  value: unknown,
  min?: number,
  max?: number
): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid(value);
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(num)) {
    return invalid('Must be a valid number');
  }

  if (min !== undefined && num < min) {
    return invalid(`Value must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    return invalid(`Value must be at most ${max}`);
  }

  return valid(num);
}

/**
 * Validate string length
 */
export function validateLength(
  value: unknown,
  minLength?: number,
  maxLength?: number
): ValidationResult {
  if (value === null || value === undefined) {
    return valid(value);
  }

  const str = String(value);

  if (minLength !== undefined && str.length < minLength) {
    return invalid(`Must be at least ${minLength} characters`);
  }

  if (maxLength !== undefined && str.length > maxLength) {
    return invalid(`Must be at most ${maxLength} characters`);
  }

  return valid(str);
}

/**
 * Validate against regex pattern
 */
export function validatePattern(
  value: unknown,
  pattern: RegExp,
  errorMessage = 'Invalid format'
): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid(value);
  }

  const str = String(value);

  if (!pattern.test(str)) {
    return invalid(errorMessage);
  }

  return valid(str);
}

/**
 * Validate value is in enum list
 */
export function validateEnum(
  value: unknown,
  allowedValues: unknown[],
  errorMessage?: string
): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid(value);
  }

  if (!allowedValues.includes(value)) {
    return invalid(errorMessage ?? `Must be one of: ${allowedValues.join(', ')}`);
  }

  return valid(value);
}

/**
 * Validate unique value within column
 */
export function validateUnique(
  value: unknown,
  existingValues: unknown[],
  errorMessage = 'Value must be unique'
): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid(value);
  }

  if (existingValues.includes(value)) {
    return invalid(errorMessage);
  }

  return valid(value);
}

// ============================================================================
// TYPE-SPECIFIC VALIDATORS
// ============================================================================

/**
 * Validate currency input
 */
export function validateCurrency(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid(0);
  }

  // Handle string input (may include $ and commas)
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '').replace(/^\(/, '-').replace(/\)$/, '');
    const num = parseFloat(cleaned);

    if (isNaN(num)) {
      return invalid('Must be a valid currency amount');
    }

    // Convert to cents
    return valid(Math.round(num * 100));
  }

  if (typeof value === 'number') {
    // Assume input is in dollars, convert to cents
    return valid(Math.round(value * 100));
  }

  return invalid('Must be a valid currency amount');
}

/**
 * Validate positive currency (no negative amounts)
 */
export function validatePositiveCurrency(value: unknown): ValidationResult {
  const result = validateCurrency(value);

  if (!result.valid) {
    return result;
  }

  if (typeof result.sanitizedValue === 'number' && result.sanitizedValue < 0) {
    return invalid('Amount cannot be negative');
  }

  return result;
}

/**
 * Validate percentage input (0-100)
 */
export function validatePercent(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid(0);
  }

  let num: number;

  if (typeof value === 'string') {
    const cleaned = value.replace(/%/g, '').trim();
    num = parseFloat(cleaned);
  } else if (typeof value === 'number') {
    num = value;
  } else {
    return invalid('Must be a valid percentage');
  }

  if (isNaN(num)) {
    return invalid('Must be a valid percentage');
  }

  if (num < 0 || num > 100) {
    return invalid('Percentage must be between 0 and 100');
  }

  return valid(num);
}

/**
 * Validate date input
 */
export function validateDate(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid(null);
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return invalid('Invalid date');
    }
    return valid(value);
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return invalid('Invalid date format');
    }
    return valid(date);
  }

  if (typeof value === 'number') {
    // Assume Excel serial date or Unix timestamp
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return invalid('Invalid date');
    }
    return valid(date);
  }

  return invalid('Invalid date format');
}

/**
 * Validate month/year period input
 */
export function validateMonthYear(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid(null);
  }

  // Accept formats: "Jan 2024", "01/2024", "2024-01", "January 2024"
  if (typeof value === 'string') {
    // Try ISO format first (YYYY-MM)
    const isoMatch = value.match(/^(\d{4})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return valid({ year, month });
      }
    }

    // Try MM/YYYY format
    const slashMatch = value.match(/^(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1], 10);
      const year = parseInt(slashMatch[2], 10);
      if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return valid({ year, month });
      }
    }

    // Try "MMM YYYY" format (e.g., "Jan 2024")
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const textMatch = value.toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
    if (textMatch) {
      const monthIndex = monthNames.findIndex((m) => textMatch[1].startsWith(m));
      const year = parseInt(textMatch[2], 10);
      if (monthIndex !== -1 && year >= 1900 && year <= 2100) {
        return valid({ year, month: monthIndex + 1 });
      }
    }

    return invalid('Invalid month/year format. Use "Jan 2024" or "01/2024"');
  }

  if (typeof value === 'object' && value !== null && 'year' in value && 'month' in value) {
    const obj = value as { year: number; month: number };
    if (obj.month >= 1 && obj.month <= 12 && obj.year >= 1900 && obj.year <= 2100) {
      return valid(obj);
    }
  }

  return invalid('Invalid month/year format');
}

/**
 * Validate cost code format
 */
export function validateCostCode(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid('');
  }

  const str = String(value).trim().toUpperCase();

  // Cost codes should be alphanumeric, may include dots, dashes, underscores
  const costCodePattern = /^[A-Z0-9][A-Z0-9._-]{0,19}$/;

  if (!costCodePattern.test(str)) {
    return invalid('Cost code must be 1-20 alphanumeric characters');
  }

  return valid(str);
}

/**
 * Validate company name/reference
 */
export function validateCompany(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return valid('');
  }

  const str = String(value).trim();

  if (str.length > 100) {
    return invalid('Company name must be 100 characters or less');
  }

  return valid(str);
}

// ============================================================================
// COLUMN-SPECIFIC VALIDATION RULES
// ============================================================================

/**
 * Validation rules for Project Summary columns
 */
export const PROJECT_SUMMARY_VALIDATION: ColumnValidation[] = [
  {
    columnKey: 'costCode',
    rules: [
      { type: 'custom', message: 'Invalid cost code', validator: validateCostCode },
    ],
  },
  {
    columnKey: 'company',
    rules: [
      { type: 'length', message: 'Company name too long', params: { maxLength: 100 } },
    ],
  },
  {
    columnKey: 'description',
    rules: [
      { type: 'required', message: 'Description is required' },
      { type: 'length', message: 'Description too long', params: { maxLength: 500 } },
    ],
  },
  {
    columnKey: 'reference',
    rules: [
      { type: 'length', message: 'Reference too long', params: { maxLength: 100 } },
    ],
  },
  {
    columnKey: 'budgetCents',
    rules: [
      { type: 'custom', message: 'Invalid amount', validator: validatePositiveCurrency },
    ],
  },
  {
    columnKey: 'approvedContractCents',
    rules: [
      { type: 'custom', message: 'Invalid amount', validator: validatePositiveCurrency },
    ],
  },
];

/**
 * Validation rules for Invoices columns
 */
export const INVOICES_VALIDATION: ColumnValidation[] = [
  {
    columnKey: 'invoiceNumber',
    rules: [
      { type: 'required', message: 'Invoice number is required' },
      { type: 'length', message: 'Invoice number too long', params: { maxLength: 50 } },
    ],
  },
  {
    columnKey: 'costLine',
    rules: [
      { type: 'required', message: 'Cost line is required' },
    ],
  },
  {
    columnKey: 'period',
    rules: [
      { type: 'required', message: 'Period is required' },
      { type: 'custom', message: 'Invalid period', validator: validateMonthYear },
    ],
  },
  {
    columnKey: 'amountCents',
    rules: [
      { type: 'required', message: 'Amount is required' },
      { type: 'custom', message: 'Invalid amount', validator: validatePositiveCurrency },
    ],
  },
  {
    columnKey: 'status',
    rules: [
      { type: 'enum', message: 'Invalid status', params: { values: ['pending', 'approved', 'paid', 'rejected'] } },
    ],
  },
  {
    columnKey: 'invoiceDate',
    rules: [
      { type: 'custom', message: 'Invalid date', validator: validateDate },
    ],
  },
];

/**
 * Validation rules for Variations columns
 */
export const VARIATIONS_VALIDATION: ColumnValidation[] = [
  {
    columnKey: 'costLine',
    rules: [
      { type: 'required', message: 'Cost line is required' },
    ],
  },
  {
    columnKey: 'description',
    rules: [
      { type: 'required', message: 'Description is required' },
      { type: 'length', message: 'Description too long', params: { maxLength: 500 } },
    ],
  },
  {
    columnKey: 'category',
    rules: [
      { type: 'required', message: 'Category is required' },
      { type: 'enum', message: 'Invalid category', params: { values: ['PV', 'CV', 'LV'] } },
    ],
  },
  {
    columnKey: 'status',
    rules: [
      { type: 'required', message: 'Status is required' },
      { type: 'enum', message: 'Invalid status', params: { values: ['forecast', 'approved'] } },
    ],
  },
  {
    columnKey: 'amountForecastCents',
    rules: [
      { type: 'custom', message: 'Invalid amount', validator: validateCurrency },
    ],
  },
  {
    columnKey: 'amountApprovedCents',
    rules: [
      { type: 'custom', message: 'Invalid amount', validator: validateCurrency },
    ],
  },
  {
    columnKey: 'requestedDate',
    rules: [
      { type: 'custom', message: 'Invalid date', validator: validateDate },
    ],
  },
  {
    columnKey: 'approvedDate',
    rules: [
      { type: 'custom', message: 'Invalid date', validator: validateDate },
    ],
  },
];

// ============================================================================
// VALIDATION EXECUTION
// ============================================================================

/**
 * Execute a single validation rule
 */
function executeRule(
  rule: ValidationRule,
  value: unknown,
  context?: ValidationContext
): ValidationResult {
  switch (rule.type) {
    case 'required':
      return validateRequired(value);

    case 'minValue':
      return validateRange(value, rule.params?.min as number, undefined);

    case 'maxValue':
      return validateRange(value, undefined, rule.params?.max as number);

    case 'range':
      return validateRange(
        value,
        rule.params?.min as number,
        rule.params?.max as number
      );

    case 'length':
      return validateLength(
        value,
        rule.params?.minLength as number,
        rule.params?.maxLength as number
      );

    case 'pattern':
      return validatePattern(
        value,
        rule.params?.pattern as RegExp,
        rule.message
      );

    case 'enum':
      return validateEnum(
        value,
        rule.params?.values as unknown[],
        rule.message
      );

    case 'custom':
      if (rule.validator) {
        return rule.validator(value, context);
      }
      return valid(value);

    default:
      return valid(value);
  }
}

/**
 * Validate a cell value against all rules for a column
 */
export function validateCell(
  value: unknown,
  columnKey: string,
  validationRules: ColumnValidation[],
  context?: ValidationContext
): ValidationResult {
  const columnRules = validationRules.find((v) => v.columnKey === columnKey);

  if (!columnRules) {
    return valid(value);
  }

  let sanitizedValue = value;

  for (const rule of columnRules.rules) {
    const result = executeRule(rule, sanitizedValue, context);

    if (!result.valid) {
      return result;
    }

    if (result.sanitizedValue !== undefined) {
      sanitizedValue = result.sanitizedValue;
    }
  }

  return valid(sanitizedValue);
}

/**
 * Validate an entire row of data
 */
export function validateRow(
  rowData: Record<string, unknown>,
  validationRules: ColumnValidation[],
  context?: Omit<ValidationContext, 'rowData'>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const columnValidation of validationRules) {
    const value = rowData[columnValidation.columnKey];
    results[columnValidation.columnKey] = validateCell(
      value,
      columnValidation.columnKey,
      validationRules,
      { ...context, rowData }
    );
  }

  return results;
}

/**
 * Check if all validations passed for a row
 */
export function isRowValid(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).every((r) => r.valid);
}

/**
 * Get all validation errors for a row
 */
export function getRowErrors(
  results: Record<string, ValidationResult>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [key, result] of Object.entries(results)) {
    if (!result.valid && result.error) {
      errors[key] = result.error;
    }
  }

  return errors;
}
