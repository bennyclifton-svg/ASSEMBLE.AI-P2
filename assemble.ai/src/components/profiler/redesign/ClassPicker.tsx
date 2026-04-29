'use client';

import {
  Building2, Home, Factory, Landmark, Layers, Route, Tractor, Shield, MoreHorizontal,
} from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type { BuildingClass, BuildingClassConfig } from '@/types/profiler';

const ICONS: Record<string, React.ReactNode> = {
  residential: <Home className="w-3.5 h-3.5" />,
  commercial: <Building2 className="w-3.5 h-3.5" />,
  industrial: <Factory className="w-3.5 h-3.5" />,
  institution: <Landmark className="w-3.5 h-3.5" />,
  mixed: <Layers className="w-3.5 h-3.5" />,
  infrastructure: <Route className="w-3.5 h-3.5" />,
  agricultural: <Tractor className="w-3.5 h-3.5" />,
  defense_secure: <Shield className="w-3.5 h-3.5" />,
};

const SHORT: Record<string, string> = {
  residential: 'Res',
  commercial: 'Com',
  industrial: 'Ind',
  institution: 'Inst',
  mixed: 'Mix',
  infrastructure: 'Infra',
  agricultural: 'Agri',
  defense_secure: 'Def',
};

const PRIMARY: BuildingClass[] = ['residential', 'commercial', 'industrial', 'institution'];
const SECONDARY: BuildingClass[] = ['mixed', 'infrastructure', 'agricultural', 'defense_secure'];

interface ClassPickerProps {
  value: BuildingClass | null;
  onChange: (v: BuildingClass | null) => void;
  expandedOthers: boolean;
  onExpandedChange: (v: boolean) => void;
}

export function ClassPicker({ value, onChange, expandedOthers, onExpandedChange }: ClassPickerProps) {
  const classes = profileTemplates.buildingClasses as Record<string, BuildingClassConfig>;
  const secondarySelected = SECONDARY.includes(value as BuildingClass);

  const renderBtn = (key: BuildingClass) => {
    const config = classes[key];
    const selected = value === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => onChange(selected ? null : key)}
        title={config.label}
        className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded border text-[9px] font-semibold transition-all flex-1 ${
          selected
            ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
        }`}
      >
        {ICONS[key]}
        <span>{SHORT[key]}</span>
      </button>
    );
  };

  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block">
        Class
      </span>
      <div className="flex gap-1">
        {PRIMARY.map(renderBtn)}
        <button
          type="button"
          onClick={() => onExpandedChange(!expandedOthers)}
          title="More classes"
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded border text-[9px] font-semibold transition-all ${
            secondarySelected || expandedOthers
              ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]/50 text-[var(--color-text-muted)]'
          }`}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
          <span>More</span>
        </button>
      </div>
      {expandedOthers && (
        <div className="flex gap-1 mt-1">
          {SECONDARY.map(renderBtn)}
        </div>
      )}
    </div>
  );
}
