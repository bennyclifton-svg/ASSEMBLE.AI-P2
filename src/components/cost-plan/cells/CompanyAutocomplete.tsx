'use client';

/**
 * Company Autocomplete Cell
 * Feature 006 - Cost Planning Module (Task T093)
 *
 * Search-as-you-type company selector with "Add new company" option.
 * Integrates with useCompanies hook.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Building2, Loader2, X } from 'lucide-react';
import { useCompanies, useCompanyMutations } from '@/lib/hooks/cost-plan/use-companies';
import type { Company, CreateCompanyInput } from '@/types/cost-plan';

interface CompanyAutocompleteProps {
  value?: string | null; // Company ID
  displayValue?: string | null; // Company name for display
  onChange: (companyId: string | null, companyName: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function CompanyAutocomplete({
  value,
  displayValue,
  onChange,
  placeholder = 'Search companies...',
  disabled = false,
  className = '',
  autoFocus = false,
}: CompanyAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { companies, isLoading } = useCompanies(debouncedSearch);
  const { createCompany, isSubmitting } = useCompanyMutations();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setShowAddForm(false);
      inputRef.current?.blur();
    }
    if (e.key === 'Enter' && showAddForm && newCompanyName.trim()) {
      e.preventDefault();
      handleCreateCompany();
    }
  }, [showAddForm, newCompanyName]);

  const handleSelect = (company: Company) => {
    onChange(company.id, company.name);
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null, null);
    setSearch('');
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;

    try {
      const created = await createCompany({ name: newCompanyName.trim() });
      if (created) {
        onChange(created.id, created.name);
        setNewCompanyName('');
        setShowAddForm(false);
        setIsOpen(false);
      }
    } catch {
      // Error handled in hook
    }
  };

  const handleAddNewClick = () => {
    // Use inline form for quick company creation
    setShowAddForm(true);
    setNewCompanyName(search);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input field */}
      <div className="relative">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[#858585] pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : (displayValue || '')}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (displayValue) setSearch('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`
            w-full bg-[#3c3c3c] border border-[#3e3e42] rounded px-8 py-1.5 text-sm text-[#cccccc]
            placeholder:text-[#6e6e6e] focus:outline-none focus:border-[#007acc]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />

        {/* Clear button */}
        {(value || displayValue) && !isOpen && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#858585] hover:text-[#cccccc]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-[#252526] border border-[#3e3e42] rounded shadow-lg max-h-60 overflow-auto"
        >
          {showAddForm ? (
            /* Inline add form */
            <div className="p-3">
              <div className="text-xs text-[#858585] mb-2">Add new company</div>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Company name"
                autoFocus
                className="w-full bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1.5 text-sm text-[#cccccc] placeholder:text-[#6e6e6e] focus:outline-none focus:border-[#007acc] mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCompany}
                  disabled={!newCompanyName.trim() || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-[#0e639c] text-white text-xs rounded hover:bg-[#1177bb] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Add
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-[#37373d] text-[#cccccc] text-xs rounded hover:bg-[#4e4e52]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Company list */}
              {isLoading ? (
                <div className="flex items-center justify-center py-4 text-[#858585]">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm">Searching...</span>
                </div>
              ) : companies.length > 0 ? (
                <ul>
                  {companies.map((company) => (
                    <li key={company.id}>
                      <button
                        onClick={() => handleSelect(company)}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                          hover:bg-[#37373d] transition-colors
                          ${company.id === value ? 'bg-[#094771] text-white' : 'text-[#cccccc]'}
                        `}
                      >
                        <Building2 className="w-4 h-4 flex-shrink-0 text-[#858585]" />
                        <span className="truncate">{company.name}</span>
                        {company.abn && (
                          <span className="ml-auto text-xs text-[#6e6e6e]">
                            ABN: {company.abn}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : search ? (
                <div className="px-3 py-4 text-center text-sm text-[#858585]">
                  No companies found
                </div>
              ) : null}

              {/* Add new option */}
              <div className="border-t border-[#3e3e42]">
                <button
                  onClick={handleAddNewClick}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#4fc3f7] hover:bg-[#37373d] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add new company{search ? `: "${search}"` : ''}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline cell editing in FortuneSheet
 */
export function CompanyAutocompleteCell({
  value,
  displayValue,
  onChange,
  onBlur,
}: {
  value?: string | null;
  displayValue?: string | null;
  onChange: (companyId: string | null, companyName: string | null) => void;
  onBlur?: () => void;
}) {
  return (
    <CompanyAutocomplete
      value={value}
      displayValue={displayValue}
      onChange={(id, name) => {
        onChange(id, name);
        onBlur?.();
      }}
      autoFocus
      className="min-w-[200px]"
    />
  );
}

export default CompanyAutocomplete;
