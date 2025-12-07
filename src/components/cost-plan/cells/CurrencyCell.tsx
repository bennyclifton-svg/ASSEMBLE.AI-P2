'use client';

/**
 * Currency Cell
 * Feature 006 - Cost Planning Module (Task T097)
 *
 * Formatted currency display with raw number input on edit.
 * Handles cents conversion internally.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { formatCurrency, centsToDollars, dollarsToCents } from '@/lib/calculations/cost-plan-formulas';

interface CurrencyCellProps {
  /** Value in cents */
  value: number;
  /** Called with value in cents */
  onChange: (valueCents: number) => void;
  /** Currency code (default: AUD) */
  currency?: string;
  /** Show GST indicator */
  showGst?: boolean;
  /** Allow negative values */
  allowNegative?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Show variance coloring (positive = green, negative = red) */
  showVarianceColor?: boolean;
  /** Placeholder when empty */
  placeholder?: string;
  /** Additional class names */
  className?: string;
  /** Called when editing is complete */
  onBlur?: () => void;
  /** Auto-focus the input */
  autoFocus?: boolean;
  /** Align text (default: right for currency) */
  align?: 'left' | 'center' | 'right';
}

export function CurrencyCell({
  value,
  onChange,
  currency = 'AUD',
  showGst = false,
  allowNegative = true,
  readOnly = false,
  showVarianceColor = false,
  placeholder = '$0.00',
  className = '',
  onBlur,
  autoFocus = false,
  align = 'right',
}: CurrencyCellProps) {
  const [isEditing, setIsEditing] = useState(autoFocus);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert cents to dollars for display
  const displayValue = formatCurrency(value, currency, showGst);
  const dollars = centsToDollars(value);

  // Set initial input value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      // Show raw number without formatting for editing
      setInputValue(dollars.toString());
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, dollars]);

  // Auto-focus on mount if specified
  useEffect(() => {
    if (autoFocus) {
      setIsEditing(true);
    }
  }, [autoFocus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty, numbers, decimal point, and optionally negative
    const regex = allowNegative ? /^-?\d*\.?\d{0,2}$/ : /^\d*\.?\d{0,2}$/;

    if (raw === '' || regex.test(raw)) {
      setInputValue(raw);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitValue();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue('');
      onBlur?.();
    }
    // Allow tab to move to next cell
    if (e.key === 'Tab') {
      commitValue();
    }
  };

  const commitValue = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const cents = dollarsToCents(parsed);
      onChange(cents);
    } else if (inputValue === '' || inputValue === '-') {
      // Empty or just negative sign = 0
      onChange(0);
    }
    setIsEditing(false);
    setInputValue('');
    onBlur?.();
  }, [inputValue, onChange, onBlur]);

  const handleBlur = () => {
    commitValue();
  };

  const handleClick = () => {
    if (!readOnly && !isEditing) {
      setIsEditing(true);
    }
  };

  // Determine text color based on variance
  const getTextColor = () => {
    if (showVarianceColor) {
      if (value > 0) return 'text-[#4ade80]'; // Green for positive
      if (value < 0) return 'text-[#f87171]'; // Red for negative
    }
    return 'text-[#cccccc]';
  };

  const textAlign = align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right';

  if (isEditing) {
    return (
      <div className={`relative ${className}`}>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#858585] text-sm">
          $
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`
            w-full bg-[#3c3c3c] border border-[#007acc] rounded
            pl-5 pr-2 py-1.5 text-sm text-[#cccccc] ${textAlign}
            focus:outline-none
          `}
        />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`
        px-2 py-1.5 text-sm ${textAlign} ${getTextColor()}
        ${readOnly ? 'cursor-default' : 'cursor-text hover:bg-[#37373d] rounded'}
        ${value === 0 ? 'text-[#6e6e6e]' : ''}
        ${className}
      `}
    >
      {value === 0 ? placeholder : displayValue}
    </div>
  );
}

/**
 * Read-only currency display (for calculated cells)
 */
export function CurrencyDisplay({
  value,
  currency = 'AUD',
  showGst = false,
  showVarianceColor = false,
  className = '',
  align = 'right',
}: {
  value: number;
  currency?: string;
  showGst?: boolean;
  showVarianceColor?: boolean;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <CurrencyCell
      value={value}
      onChange={() => {}}
      currency={currency}
      showGst={showGst}
      showVarianceColor={showVarianceColor}
      readOnly
      className={className}
      align={align}
    />
  );
}

/**
 * Currency input for forms (always in edit mode)
 */
export function CurrencyInput({
  value,
  onChange,
  currency = 'AUD',
  allowNegative = true,
  placeholder = '0.00',
  disabled = false,
  className = '',
  label,
  error,
}: {
  value: number;
  onChange: (valueCents: number) => void;
  currency?: string;
  allowNegative?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
}) {
  const [inputValue, setInputValue] = useState(() => {
    const dollars = centsToDollars(value);
    return dollars === 0 ? '' : dollars.toString();
  });

  // Sync external value changes
  useEffect(() => {
    const dollars = centsToDollars(value);
    const current = parseFloat(inputValue) || 0;
    if (dollars !== current) {
      setInputValue(dollars === 0 ? '' : dollars.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const regex = allowNegative ? /^-?\d*\.?\d{0,2}$/ : /^\d*\.?\d{0,2}$/;

    if (raw === '' || regex.test(raw)) {
      setInputValue(raw);
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        onChange(dollarsToCents(parsed));
      } else if (raw === '' || raw === '-') {
        onChange(0);
      }
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm text-[#cccccc] mb-1">{label}</label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858585]">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full bg-[#3c3c3c] border rounded
            pl-7 pr-3 py-2 text-sm text-[#cccccc] text-right
            placeholder:text-[#6e6e6e]
            focus:outline-none focus:border-[#007acc]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-[#f87171]' : 'border-[#3e3e42]'}
          `}
        />
        {currency !== 'AUD' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6e6e6e]">
            {currency}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-[#f87171]">{error}</p>
      )}
    </div>
  );
}

/**
 * Inline cell for FortuneSheet with cents-based value
 */
export function CurrencyCellInline({
  value,
  onChange,
  onBlur,
  showVarianceColor = false,
}: {
  value: number;
  onChange: (valueCents: number) => void;
  onBlur?: () => void;
  showVarianceColor?: boolean;
}) {
  return (
    <CurrencyCell
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      showVarianceColor={showVarianceColor}
      autoFocus
      className="min-w-[100px]"
    />
  );
}

export default CurrencyCell;
