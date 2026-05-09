'use client';

/**
 * Variation Dropdown Cell
 * Feature 006 - Cost Planning Module (Task T095)
 *
 * Dropdown selector for variations, filtered by cost line.
 * Shows only approved variations by default.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, GitBranch, Check, Filter } from 'lucide-react';
import {
  VariationStatus,
  VariationCategory,
  VARIATION_STATUS_OPTIONS,
} from '@/types/variation';
import { formatCurrency } from '@/lib/calculations/cost-plan-formulas';

interface VariationOption {
  id: string;
  variationNumber: string;
  category: VariationCategory;
  description: string;
  status: VariationStatus;
  amountForecastCents: number;
  amountApprovedCents: number;
  costLineId?: string | null;
}

interface VariationDropdownProps {
  value?: string | null; // Variation ID
  variations: VariationOption[];
  onChange: (variationId: string | null) => void;
  costLineId?: string | null; // Filter to show only variations for this cost line
  statusFilter?: VariationStatus[]; // Default: ['Approved']
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showClear?: boolean;
  showAmount?: boolean;
}

// Category colors matching VariationsSheet
const CATEGORY_COLORS: Record<VariationCategory, string> = {
  Principal: 'var(--sw-cyan)',
  Contractor: 'var(--sw-peach)',
  'Lessor Works': 'var(--sw-lav)',
};

const STATUS_COLORS: Record<VariationStatus, string> = {
  Forecast: 'var(--color-warning)',
  Approved: 'var(--color-success)',
  Rejected: 'var(--color-error)',
  Withdrawn: 'var(--color-text-muted)',
};

export function VariationDropdown({
  value,
  variations,
  onChange,
  costLineId,
  statusFilter = ['Approved'],
  placeholder = 'Select variation...',
  disabled = false,
  className = '',
  showClear = true,
  showAmount = true,
}: VariationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<VariationStatus[]>(statusFilter);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Get selected variation
  const selectedVariation = useMemo(() => {
    return variations.find((v) => v.id === value);
  }, [variations, value]);

  // Filter variations
  const filteredVariations = useMemo(() => {
    const searchLower = search.toLowerCase();

    return variations.filter((v) => {
      // Filter by cost line if provided
      if (costLineId && v.costLineId !== costLineId) return false;

      // Filter by status
      if (activeStatusFilter.length > 0 && !activeStatusFilter.includes(v.status)) return false;

      // Filter by search
      if (!search) return true;
      const number = v.variationNumber.toLowerCase();
      const desc = v.description.toLowerCase();
      return number.includes(searchLower) || desc.includes(searchLower);
    });
  }, [variations, search, costLineId, activeStatusFilter]);

  const toggleStatusFilter = (status: VariationStatus) => {
    setActiveStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const formatVariation = (v: VariationOption) => {
    return `${v.variationNumber} - ${v.description}`;
  };

  const getAmount = (v: VariationOption) => {
    return v.status === 'Approved' ? v.amountApprovedCents : v.amountForecastCents;
  };

  const handleSelect = (variationId: string) => {
    onChange(variationId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-1.5
          bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--color-border)] cursor-pointer'}
          ${isOpen ? 'border-[var(--color-accent-primary)]' : ''}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GitBranch className="w-4 h-4 flex-shrink-0 text-[var(--color-text-muted)]" />
          {selectedVariation ? (
            <>
              <span
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${CATEGORY_COLORS[selectedVariation.category]}20`,
                  color: CATEGORY_COLORS[selectedVariation.category],
                }}
              >
                {selectedVariation.variationNumber}
              </span>
              <span className="truncate text-[var(--color-text-primary)]">
                {selectedVariation.description}
              </span>
            </>
          ) : (
            <span className="text-[var(--color-text-muted)]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {showClear && selectedVariation && (
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-[var(--color-border)] rounded"
            >
              <span className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xs">×</span>
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full min-w-[350px] mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-[var(--color-border)]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search variations..."
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded pl-8 pr-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-primary)]"
              />
            </div>
          </div>

          {/* Status filters */}
          <div className="px-2 py-1.5 border-b border-[var(--color-border)] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)] mr-1" />
            {VARIATION_STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`
                  px-2 py-0.5 rounded text-xs transition-colors
                  ${activeStatusFilter.includes(status)
                    ? 'text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}
                `}
                style={{
                  backgroundColor: activeStatusFilter.includes(status)
                    ? `${STATUS_COLORS[status]}80`
                    : 'transparent',
                }}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Variation list */}
          <div className="max-h-60 overflow-auto">
            {filteredVariations.length > 0 ? (
              <ul>
                {filteredVariations.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => handleSelect(v.id)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                        hover:bg-[var(--color-bg-hover)] transition-colors
                        ${v.id === value ? 'bg-[var(--color-accent-primary-tint)]' : ''}
                      `}
                    >
                      {/* Variation number badge */}
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[v.category]}20`,
                          color: CATEGORY_COLORS[v.category],
                        }}
                      >
                        {v.variationNumber}
                      </span>

                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        <div className={`truncate ${v.id === value ? 'text-white' : 'text-[var(--color-text-primary)]'}`}>
                          {v.description}
                        </div>
                      </div>

                      {/* Status & Amount */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {showAmount && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {formatCurrency(getAmount(v))}
                          </span>
                        )}
                        <span
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ color: STATUS_COLORS[v.status] }}
                        >
                          {v.status}
                        </span>
                        {v.id === value && (
                          <Check className="w-4 h-4 text-[var(--sw-cyan)]" />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-4 text-center text-sm text-[var(--color-text-muted)]">
                {search
                  ? 'No matching variations'
                  : activeStatusFilter.length > 0
                  ? 'No variations with selected status'
                  : 'No variations available'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact cell version for FortuneSheet editing
 */
export function VariationDropdownCell({
  value,
  variations,
  costLineId,
  onChange,
  onBlur,
}: {
  value?: string | null;
  variations: VariationOption[];
  costLineId?: string | null;
  onChange: (variationId: string | null) => void;
  onBlur?: () => void;
}) {
  return (
    <VariationDropdown
      value={value}
      variations={variations}
      costLineId={costLineId}
      onChange={(id) => {
        onChange(id);
        onBlur?.();
      }}
      className="min-w-[300px]"
    />
  );
}

export default VariationDropdown;
