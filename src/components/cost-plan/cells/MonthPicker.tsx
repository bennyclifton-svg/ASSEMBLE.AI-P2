'use client';

/**
 * Month Picker Cell
 * Feature 006 - Cost Planning Module (Task T096)
 *
 * Month/year selector component.
 * Defaults to project's current_report_month when available.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthPickerProps {
  value?: { year: number; month: number } | null; // month is 1-12
  onChange: (value: { year: number; month: number } | null) => void;
  minYear?: number;
  maxYear?: number;
  defaultToCurrentMonth?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showClear?: boolean;
  format?: 'short' | 'long'; // 'short' = "Jan 2025", 'long' = "January 2025"
}

export function MonthPicker({
  value,
  onChange,
  minYear = 2020,
  maxYear = 2030,
  defaultToCurrentMonth = false,
  placeholder = 'Select month...',
  disabled = false,
  className = '',
  showClear = true,
  format = 'short',
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value?.year ?? new Date().getFullYear());

  const containerRef = useRef<HTMLDivElement>(null);

  // Set default value on mount if specified
  useEffect(() => {
    if (defaultToCurrentMonth && !value) {
      const now = new Date();
      onChange({ year: now.getFullYear(), month: now.getMonth() + 1 });
    }
  }, [defaultToCurrentMonth, value, onChange]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update view year when value changes
  useEffect(() => {
    if (value?.year) {
      setViewYear(value.year);
    }
  }, [value?.year]);

  const formattedValue = useMemo(() => {
    if (!value) return null;
    const monthNames = format === 'long' ? FULL_MONTHS : MONTHS;
    return `${monthNames[value.month - 1]} ${value.year}`;
  }, [value, format]);

  const handleMonthSelect = (month: number) => {
    onChange({ year: viewYear, month });
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const canGoPrevYear = viewYear > minYear;
  const canGoNextYear = viewYear < maxYear;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-1.5
          bg-[#3c3c3c] border border-[#3e3e42] rounded text-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#4e4e52] cursor-pointer'}
          ${isOpen ? 'border-[#007acc]' : ''}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Calendar className="w-4 h-4 flex-shrink-0 text-[#858585]" />
          <span className={formattedValue ? 'text-[#cccccc]' : 'text-[#6e6e6e]'}>
            {formattedValue || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {showClear && value && (
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-[#4e4e52] rounded"
            >
              <span className="text-[#858585] hover:text-[#cccccc] text-xs">×</span>
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-[#858585] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-[#252526] border border-[#3e3e42] rounded shadow-lg p-3 w-[240px]">
          {/* Year selector */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => canGoPrevYear && setViewYear(viewYear - 1)}
              disabled={!canGoPrevYear}
              className={`p-1 rounded ${canGoPrevYear ? 'hover:bg-[#37373d] text-[#cccccc]' : 'text-[#4e4e52] cursor-not-allowed'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-[#cccccc]">{viewYear}</span>
            <button
              onClick={() => canGoNextYear && setViewYear(viewYear + 1)}
              disabled={!canGoNextYear}
              className={`p-1 rounded ${canGoNextYear ? 'hover:bg-[#37373d] text-[#cccccc]' : 'text-[#4e4e52] cursor-not-allowed'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((month, index) => {
              const monthNum = index + 1;
              const isSelected = value?.year === viewYear && value?.month === monthNum;
              const isCurrent =
                new Date().getFullYear() === viewYear &&
                new Date().getMonth() === index;

              return (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(monthNum)}
                  className={`
                    px-2 py-2 text-xs rounded transition-colors
                    ${isSelected
                      ? 'bg-[#0e639c] text-white'
                      : isCurrent
                      ? 'bg-[#37373d] text-[#4fc3f7] ring-1 ring-[#4fc3f7]/30'
                      : 'text-[#cccccc] hover:bg-[#37373d]'}
                  `}
                >
                  {month}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="mt-3 pt-2 border-t border-[#3e3e42] flex gap-2">
            <button
              onClick={() => {
                const now = new Date();
                onChange({ year: now.getFullYear(), month: now.getMonth() + 1 });
                setIsOpen(false);
              }}
              className="flex-1 px-2 py-1 text-xs text-[#4fc3f7] hover:bg-[#37373d] rounded"
            >
              This Month
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
                onChange({
                  year: prevMonth.getFullYear(),
                  month: prevMonth.getMonth() + 1,
                });
                setIsOpen(false);
              }}
              className="flex-1 px-2 py-1 text-xs text-[#858585] hover:bg-[#37373d] rounded"
            >
              Last Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact cell version for FortuneSheet editing
 * Accepts/returns period as year and month separately
 */
export function MonthPickerCell({
  year,
  month,
  onChange,
  onBlur,
}: {
  year?: number | null;
  month?: number | null;
  onChange: (year: number, month: number) => void;
  onBlur?: () => void;
}) {
  const value = year && month ? { year, month } : null;

  return (
    <MonthPicker
      value={value}
      onChange={(val) => {
        if (val) {
          onChange(val.year, val.month);
        }
        onBlur?.();
      }}
      showClear={false}
      className="min-w-[160px]"
    />
  );
}

/**
 * Inline display version (read-only formatted display)
 */
export function MonthDisplay({
  year,
  month,
  format = 'short',
  className = '',
}: {
  year?: number | null;
  month?: number | null;
  format?: 'short' | 'long';
  className?: string;
}) {
  if (!year || !month) {
    return <span className={`text-[#6e6e6e] ${className}`}>-</span>;
  }

  const monthNames = format === 'long' ? FULL_MONTHS : MONTHS;
  return (
    <span className={`text-[#cccccc] ${className}`}>
      {monthNames[month - 1]} {year}
    </span>
  );
}

export default MonthPicker;
