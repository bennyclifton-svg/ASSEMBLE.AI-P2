'use client';

/**
 * Discipline/Trade Dropdown Cell
 * Feature 006 - Cost Planning Module
 *
 * Dropdown selector for disciplines (CONSULTANTS section) and trades (CONSTRUCTION section).
 * Shows only active (enabled) items filtered by section type.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import type { CostLineSection } from '@/types/cost-plan';

interface DisciplineOption {
  id: string;
  name: string;
  isEnabled: boolean;
  order: number;
}

interface TradeOption {
  id: string;
  name: string;
  isEnabled: boolean;
  order: number;
}

interface DisciplineDropdownProps {
  value?: string | null; // Discipline or Trade ID
  displayValue?: string | null; // Display name
  section: CostLineSection;
  disciplines: DisciplineOption[];
  trades: TradeOption[];
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DisciplineDropdown({
  value,
  displayValue,
  section,
  disciplines,
  trades,
  onChange,
  placeholder,
  disabled = false,
  className = '',
}: DisciplineDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Determine which items to show based on section
  const isConsultants = section === 'CONSULTANTS';
  const isConstruction = section === 'CONSTRUCTION';
  const showDropdown = isConsultants || isConstruction;

  // Get items based on section
  const items = useMemo(() => {
    if (isConsultants) {
      return disciplines
        .filter(d => d.isEnabled)
        .sort((a, b) => a.order - b.order)
        .map(d => ({ id: d.id, name: d.name }));
    }
    if (isConstruction) {
      return trades
        .filter(t => t.isEnabled)
        .sort((a, b) => a.order - b.order)
        .map(t => ({ id: t.id, name: t.name }));
    }
    return [];
  }, [disciplines, trades, isConsultants, isConstruction]);

  // Get selected item
  const selectedItem = useMemo(() => {
    if (!value) return null;
    return items.find((item) => item.id === value) || null;
  }, [items, value]);

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

  const handleSelect = (itemId: string) => {
    onChange(itemId);
    setIsOpen(false);
  };

  // Dynamic placeholder
  const defaultPlaceholder = isConsultants
    ? 'Select discipline...'
    : isConstruction
    ? 'Select trade...'
    : 'N/A';

  // If not a section that supports disciplines/trades, show static text
  if (!showDropdown) {
    return (
      <div className={`text-[#6e6e6e] text-xs ${className}`}>
        {displayValue || '-'}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center px-1.5 py-0.5
          bg-transparent hover:bg-[#3c3c3c] rounded text-xs
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'bg-[#3c3c3c]' : ''}
          transition-colors
        `}
      >
        <span className={`truncate ${selectedItem ? 'text-[#cccccc]' : 'text-[#6e6e6e]'}`}>
          {selectedItem?.name || displayValue || placeholder || defaultPlaceholder}
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full min-w-[180px] mt-1 bg-[#252526] border border-[#3e3e42] rounded shadow-lg">
          {/* Item list */}
          <div className="max-h-48 overflow-auto">
            {items.length > 0 ? (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleSelect(item.id)}
                      className={`
                        w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs
                        hover:bg-[#37373d] transition-colors
                        ${item.id === value ? 'bg-[#094771]' : ''}
                      `}
                    >
                      <span className={`flex-1 truncate ${item.id === value ? 'text-white' : 'text-[#cccccc]'}`}>
                        {item.name}
                      </span>
                      {item.id === value && (
                        <Check className="w-3 h-3 text-[#4fc3f7] flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-2 py-3 text-center text-xs text-[#858585]">
                {`No active ${isConsultants ? 'disciplines' : 'trades'} available`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline cell version for table editing
 */
export function DisciplineDropdownCell({
  value,
  displayValue,
  section,
  disciplines,
  trades,
  onChange,
  onBlur,
}: {
  value?: string | null;
  displayValue?: string | null;
  section: CostLineSection;
  disciplines: DisciplineOption[];
  trades: TradeOption[];
  onChange: (id: string | null) => void;
  onBlur?: () => void;
}) {
  return (
    <DisciplineDropdown
      value={value}
      displayValue={displayValue}
      section={section}
      disciplines={disciplines}
      trades={trades}
      onChange={(id) => {
        onChange(id);
        onBlur?.();
      }}
      className="min-w-[120px]"
    />
  );
}

export default DisciplineDropdown;
