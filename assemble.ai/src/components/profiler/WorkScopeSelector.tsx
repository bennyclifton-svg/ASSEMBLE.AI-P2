'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, AlertTriangle, Info } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type {
  BuildingClass,
  ProjectType,
  WorkScopeItem,
  WorkScopeCategory,
  WorkScopeConfig,
  WorkScopeClassOverride,
} from '@/types/profiler';

interface WorkScopeSelectorProps {
  projectType: ProjectType;
  buildingClass: BuildingClass;
  selectedScopes: string[];
  onScopeChange: (scopes: string[]) => void;
}

interface CategoryWithItems {
  key: string;
  label: string;
  items: WorkScopeItem[];
}

export function WorkScopeSelector({
  projectType,
  buildingClass,
  selectedScopes,
  onScopeChange,
}: WorkScopeSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Check if work scope is applicable for this project type
  const workScopeOptions = (profileTemplates as any).workScopeOptions;
  const applicableTypes = workScopeOptions?.applicableProjectTypes || [];
  const isApplicable = applicableTypes.includes(projectType);

  // Get categories for the current project type
  // NOTE: This hook must be called unconditionally (before any early returns)
  const categories = useMemo((): CategoryWithItems[] => {
    if (!isApplicable) return [];

    const typeConfig = workScopeOptions?.[projectType] as WorkScopeConfig | undefined;
    if (!typeConfig) return [];

    const result: CategoryWithItems[] = [];

    // Add base categories from project type
    Object.entries(typeConfig).forEach(([key, category]) => {
      const cat = category as WorkScopeCategory;
      result.push({
        key,
        label: cat.label,
        items: [...cat.items],
      });
    });

    // Add class-specific overrides
    const classOverrides = workScopeOptions?.classOverrides?.[buildingClass];
    if (classOverrides?.additionalItems) {
      classOverrides.additionalItems.forEach((override: WorkScopeClassOverride) => {
        // Parse the category path (e.g., "refurb.common_areas")
        const [overrideType, categoryKey] = override.category.split('.');

        // Only add if it matches current project type
        if (overrideType === projectType) {
          const existingCategory = result.find(c => c.key === categoryKey);
          if (existingCategory) {
            existingCategory.items.push({
              value: override.value,
              label: override.label,
              consultants: override.consultants,
            });
          }
        }
      });
    }

    return result;
  }, [projectType, buildingClass, workScopeOptions, isApplicable]);

  // Early return after all hooks have been called
  if (!isApplicable) {
    return null;
  }

  // Toggle category expansion
  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  // Toggle scope selection
  const toggleScope = (scopeValue: string) => {
    if (selectedScopes.includes(scopeValue)) {
      onScopeChange(selectedScopes.filter(s => s !== scopeValue));
    } else {
      onScopeChange([...selectedScopes, scopeValue]);
    }
  };

  // Count selections per category
  const getCategorySelectionCount = (category: CategoryWithItems): number => {
    return category.items.filter(item => selectedScopes.includes(item.value)).length;
  };

  // Get risk definitions
  const riskDefinitions = workScopeOptions?.riskDefinitions || {};

  // Get risk icon for an item
  const getRiskIcon = (item: WorkScopeItem) => {
    if (!item.riskFlag) return null;
    const risk = riskDefinitions[item.riskFlag];
    if (!risk) return null;

    if (risk.severity === 'critical') {
      return <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />;
    } else if (risk.severity === 'warning') {
      return <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />;
    } else {
      return <Info className="w-3 h-3 text-blue-500 flex-shrink-0" />;
    }
  };

  // Total selection count - only count items that exist in current categories
  const validScopeValues = new Set(categories.flatMap(cat => cat.items.map(item => item.value)));
  const totalSelections = selectedScopes.filter(scope => validScopeValues.has(scope)).length;

  if (categories.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          Scope of Work
        </h3>
        {totalSelections > 0 && (
          <button
            onClick={() => onScopeChange([])}
            className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--color-card-scope)', color: 'var(--color-card-scope-text)' }}
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Sticky-note grid layout matching complexity tiles */}
      <div className="grid grid-cols-1 @[300px]:grid-cols-2 @[500px]:grid-cols-3 @[700px]:grid-cols-4 gap-4">
        {categories.map((category) => {
          const selectionCount = getCategorySelectionCount(category);

          return (
            <div
              key={category.key}
              className="p-3 shadow-md transition-colors duration-150 aspect-square flex flex-col"
              style={{ backgroundColor: 'var(--color-card-scope)' }}
            >
              <label className="block text-xs font-semibold mb-3 capitalize" style={{ color: 'var(--color-card-scope-text)' }}>
                {category.label}
              </label>
              <div className="flex flex-col gap-0.5">
                {category.items.map((item) => {
                  const isSelected = selectedScopes.includes(item.value);
                  const riskIcon = getRiskIcon(item);

                  return (
                    <button
                      key={item.value}
                      onClick={() => toggleScope(item.value)}
                      className="px-2 py-1 rounded text-xs font-medium transition-all text-left flex items-center justify-between"
                      style={{
                        fontFamily: "'Ink Free', 'Lucida Handwriting', 'Segoe Print', cursive",
                        backgroundColor: isSelected ? 'var(--color-card-scope-selected)' : 'var(--color-card-scope)',
                        color: 'var(--color-card-scope-text)'
                      }}
                      title={item.consultants?.length ? `Consultants: ${item.consultants.join(', ')}` : undefined}
                    >
                      <span className="truncate">{item.label}</span>
                      {riskIcon}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
