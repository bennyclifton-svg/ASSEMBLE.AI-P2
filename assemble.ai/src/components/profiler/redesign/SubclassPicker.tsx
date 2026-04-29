'use client';

import { Check } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type { BuildingClass, BuildingClassConfig, SubclassOption } from '@/types/profiler';

interface SubclassPickerProps {
  buildingClass: BuildingClass | null;
  value: string[];
  onToggle: (v: string) => void;
  expandedOthers: boolean;
  onExpandedChange: (v: boolean) => void;
}

export function SubclassPicker({
  buildingClass,
  value,
  onToggle,
  expandedOthers,
  onExpandedChange,
}: SubclassPickerProps) {
  if (!buildingClass) return null;

  const config = (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[buildingClass];
  const subclasses: SubclassOption[] = config?.subclasses ?? [];
  const isMixed = buildingClass === 'mixed';
  const primary = subclasses.slice(0, 6);
  const secondary = subclasses.slice(6);
  const shown = expandedOthers ? subclasses : primary;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Subclass
        </span>
        {isMixed && (
          <span className="text-[9px] text-[var(--color-text-muted)]">up to 4</span>
        )}
      </div>
      <div
        className="flex gap-1 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {shown.map((sub) => {
          const selected = value.includes(sub.value);
          return (
            <button
              key={sub.value}
              type="button"
              onClick={() => onToggle(sub.value)}
              className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium transition-all ${
                selected
                  ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
              }`}
            >
              {sub.label}
              {selected && <Check className="w-2.5 h-2.5 flex-shrink-0" />}
            </button>
          );
        })}
        {!expandedOthers && secondary.length > 0 && (
          <button
            type="button"
            onClick={() => onExpandedChange(true)}
            className="flex-shrink-0 px-2 py-1 rounded border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]/50 transition-colors"
          >
            +{secondary.length}
          </button>
        )}
        {expandedOthers && secondary.length > 0 && (
          <button
            type="button"
            onClick={() => onExpandedChange(false)}
            className="flex-shrink-0 px-2 py-1 rounded border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]/50 transition-colors"
          >
            less
          </button>
        )}
      </div>
    </div>
  );
}
