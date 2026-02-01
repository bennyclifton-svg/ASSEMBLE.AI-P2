'use client';

/**
 * Cost Line Dropdown Cell
 * Feature 006 - Cost Planning Module (Task T094)
 *
 * Dropdown selector for cost lines, grouped by section.
 * Shows discipline - description format.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, FileText, Check } from 'lucide-react';
import {
  CostLineSection,
  SECTION_NAMES,
  SECTION_ORDER,
} from '@/types/cost-plan';

interface CostLineOption {
  id: string;
  description: string;
  section: CostLineSection;
}

interface CostLineDropdownProps {
  value?: string | null; // Cost line ID
  costLines: CostLineOption[];
  onChange: (costLineId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showClear?: boolean;
  filterSection?: CostLineSection;
}

export function CostLineDropdown({
  value,
  costLines,
  onChange,
  placeholder = 'Select cost line...',
  disabled = false,
  className = '',
  showClear = true,
  filterSection,
}: CostLineDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

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

  // Get selected cost line
  const selectedCostLine = useMemo(() => {
    return costLines.find((cl) => cl.id === value);
  }, [costLines, value]);

  // Filter and group cost lines
  const filteredAndGrouped = useMemo(() => {
    const searchLower = search.toLowerCase();

    // Filter cost lines
    let filtered = costLines.filter((cl) => {
      if (filterSection && cl.section !== filterSection) return false;
      if (!search) return true;
      const desc = cl.description.toLowerCase();
      return desc.includes(searchLower);
    });

    // Group by section
    const grouped: Record<CostLineSection, CostLineOption[]> = {
      FEES: [],
      CONSULTANTS: [],
      CONSTRUCTION: [],
      CONTINGENCY: [],
    };

    filtered.forEach((cl) => {
      grouped[cl.section].push(cl);
    });

    // Sort items within each section alphanumerically by description
    const sortAlphanumeric = (a: CostLineOption, b: CostLineOption) => {
      const aKey = a.description.toLowerCase();
      const bKey = b.description.toLowerCase();
      return aKey.localeCompare(bKey, undefined, { numeric: true, sensitivity: 'base' });
    };

    Object.keys(grouped).forEach((section) => {
      grouped[section as CostLineSection].sort(sortAlphanumeric);
    });

    // Return only sections with items
    return SECTION_ORDER
      .filter((section) => grouped[section].length > 0)
      .map((section) => ({
        section,
        items: grouped[section],
      }));
  }, [costLines, search, filterSection]);

  const formatCostLine = (cl: CostLineOption) => {
    return cl.description;
  };

  const handleSelect = (costLineId: string) => {
    onChange(costLineId);
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
          bg-[#3c3c3c] border border-[#3e3e42] rounded text-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#4e4e52] cursor-pointer'}
          ${isOpen ? 'border-[#007acc]' : ''}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-4 h-4 flex-shrink-0 text-[#858585]" />
          <span className={`truncate ${selectedCostLine ? 'text-[#cccccc]' : 'text-[#6e6e6e]'}`}>
            {selectedCostLine ? formatCostLine(selectedCostLine) : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {showClear && selectedCostLine && (
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
        <div className="absolute z-50 w-full min-w-[300px] mt-1 bg-[#252526] border border-[#3e3e42] rounded shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-[#3e3e42]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cost lines..."
                className="w-full bg-[#3c3c3c] border border-[#3e3e42] rounded pl-8 pr-3 py-1.5 text-sm text-[#cccccc] placeholder:text-[#6e6e6e] focus:outline-none focus:border-[#007acc]"
              />
            </div>
          </div>

          {/* Grouped list */}
          <div className="max-h-60 overflow-auto">
            {filteredAndGrouped.length > 0 ? (
              filteredAndGrouped.map(({ section, items }) => (
                <div key={section}>
                  {/* Section header */}
                  <div className="sticky top-0 px-3 py-1.5 bg-[#2d2d30] text-xs font-medium text-[#858585] uppercase tracking-wider">
                    {SECTION_NAMES[section]}
                  </div>

                  {/* Cost line items */}
                  {items.map((cl) => (
                    <button
                      key={cl.id}
                      onClick={() => handleSelect(cl.id)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                        hover:bg-[#37373d] transition-colors
                        ${cl.id === value ? 'bg-[#094771]' : ''}
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`truncate ${cl.id === value ? 'text-white' : 'text-[#cccccc]'}`}>
                          {formatCostLine(cl)}
                        </div>
                      </div>
                      {cl.id === value && (
                        <Check className="w-4 h-4 text-[#4fc3f7] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-[#858585]">
                {search ? 'No matching cost lines' : 'No cost lines available'}
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
export function CostLineDropdownCell({
  value,
  costLines,
  onChange,
  onBlur,
}: {
  value?: string | null;
  costLines: CostLineOption[];
  onChange: (costLineId: string | null) => void;
  onBlur?: () => void;
}) {
  return (
    <CostLineDropdown
      value={value}
      costLines={costLines}
      onChange={(id) => {
        onChange(id);
        onBlur?.();
      }}
      className="min-w-[250px]"
    />
  );
}

export default CostLineDropdown;
