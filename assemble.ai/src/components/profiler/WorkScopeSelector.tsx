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

  // Total selection count
  const totalSelections = selectedScopes.length;

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          Work Scope
        </h3>
        {totalSelections > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]">
            {totalSelections} selected
          </span>
        )}
      </div>

      <div className="space-y-1">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.key);
          const selectionCount = getCategorySelectionCount(category);

          return (
            <div key={category.key} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.key)}
                className="w-full flex items-center justify-between p-2.5 text-left hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  )}
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {category.label}
                  </span>
                </div>
                {selectionCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-copper)] text-white">
                    {selectionCount}
                  </span>
                )}
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="px-2 pb-2 space-y-1">
                  {category.items.map((item) => {
                    const isSelected = selectedScopes.includes(item.value);
                    const riskIcon = getRiskIcon(item);

                    return (
                      <button
                        key={item.value}
                        onClick={() => toggleScope(item.value)}
                        className={`
                          w-full flex items-center justify-between p-2 rounded text-left text-xs transition-all
                          ${isSelected
                            ? 'bg-[var(--color-accent-copper-tint)] border border-[var(--color-accent-copper)]'
                            : 'bg-[var(--color-bg-secondary)] border border-transparent hover:border-[var(--color-border)]'
                          }
                        `}
                        title={item.consultants?.length ? `Consultants: ${item.consultants.join(', ')}` : undefined}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`
                            w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0
                            ${isSelected
                              ? 'bg-[var(--color-accent-copper)] border-[var(--color-accent-copper)]'
                              : 'border-[var(--color-border)]'
                            }
                          `}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={`truncate ${isSelected ? 'text-[var(--color-accent-copper)]' : 'text-[var(--color-text-secondary)]'}`}>
                            {item.label}
                          </span>
                        </div>
                        {riskIcon}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
        Select applicable work items. Hover for consultant requirements.
      </p>
    </div>
  );
}
