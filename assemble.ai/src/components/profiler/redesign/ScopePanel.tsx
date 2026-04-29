'use client';

import { useState, useMemo } from 'react';
import { CheckCheck } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type {
  BuildingClass,
  ProjectType,
  WorkScopeItem,
  WorkScopeCategory,
  WorkScopeClassOverride,
} from '@/types/profiler';

interface ScopePanelProps {
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  value: string[];
  onChange: (scopes: string[]) => void;
  standardItems?: string[] | null;
  onTickStandard?: () => void;
}

interface CategoryWithItems {
  key: string;
  label: string;
  items: WorkScopeItem[];
}

export function ScopePanel({
  buildingClass,
  projectType,
  value,
  onChange,
  standardItems,
  onTickStandard,
}: ScopePanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const open = buildingClass !== null && projectType !== null;

  const categories = useMemo((): CategoryWithItems[] => {
    if (!open || !projectType || !buildingClass) return [];
    const workScopeOptions = (profileTemplates as Record<string, unknown>).workScopeOptions as Record<string, unknown>;
    if (!workScopeOptions) return [];
    const applicableTypes = (workScopeOptions.applicableProjectTypes as string[]) ?? [];
    if (!applicableTypes.includes(projectType)) return [];
    const typeConfig = workScopeOptions[projectType] as Record<string, WorkScopeCategory> | undefined;
    if (!typeConfig) return [];

    const result: CategoryWithItems[] = Object.entries(typeConfig).map(([key, cat]) => ({
      key,
      label: cat.label,
      items: [...cat.items],
    }));

    const classOverrides = (workScopeOptions.classOverrides as Record<string, { additionalItems?: WorkScopeClassOverride[] }>)?.[buildingClass];
    if (classOverrides?.additionalItems) {
      classOverrides.additionalItems.forEach((override) => {
        const [overrideType, categoryKey] = override.category.split('.');
        if (overrideType === projectType) {
          const existing = result.find((c) => c.key === categoryKey);
          if (existing) {
            existing.items.push({
              value: override.value,
              label: override.label,
              consultants: override.consultants,
            });
          }
        }
      });
    }
    return result;
  }, [open, projectType, buildingClass]);

  if (!open || categories.length === 0) return null;

  const tab = activeTab && categories.some((c) => c.key === activeTab) ? activeTab : categories[0].key;
  const activeCategory = categories.find((c) => c.key === tab)!;

  const toggleScope = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((s) => s !== v));
    } else {
      onChange([...value, v]);
    }
  };

  const selectionCount = (cat: CategoryWithItems) =>
    cat.items.filter((i) => value.includes(i.value)).length;

  const allStandardTicked = standardItems
    ? standardItems.every((i) => value.includes(i))
    : false;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Scope
        </span>
        {standardItems && standardItems.length > 0 && onTickStandard && (
          <button
            type="button"
            onClick={onTickStandard}
            disabled={allStandardTicked}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/60 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-copper)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className="w-2.5 h-2.5" />
            {allStandardTicked ? 'Done' : 'Standard'}
          </button>
        )}
      </div>

      {/* Category tabs — horizontal scroll */}
      <div
        className="flex gap-1 overflow-x-auto mb-1.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {categories.map((cat) => {
          const count = selectionCount(cat);
          const isActive = cat.key === tab;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveTab(cat.key)}
              className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-medium transition-all ${
                isActive
                  ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]/60'
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span className={`rounded-full px-1 text-[8px] font-bold ${
                  isActive ? 'bg-[var(--color-accent-copper)] text-[var(--color-text-inverse)]' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Items for active category */}
      <div
        className="grid grid-cols-2 gap-x-1 gap-y-0.5 overflow-y-auto"
        style={{ maxHeight: '80px' }}
      >
        {activeCategory.items.map((item) => {
          const isSelected = value.includes(item.value);
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => toggleScope(item.value)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-left transition-all truncate ${
                isSelected
                  ? 'bg-[var(--color-card-scope-selected)] text-[var(--color-card-scope-text)]'
                  : 'bg-[var(--color-card-scope)] text-[var(--color-card-scope-text)] hover:bg-[var(--color-card-scope-hover)]'
              }`}
              title={item.label}
            >
              <span
                className={`flex-shrink-0 w-2 h-2 rounded-sm border transition-colors ${
                  isSelected
                    ? 'bg-[var(--color-accent-copper)] border-[var(--color-accent-copper)]'
                    : 'border-[var(--color-border)]'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
