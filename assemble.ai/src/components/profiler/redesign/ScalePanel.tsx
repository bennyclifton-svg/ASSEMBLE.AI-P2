'use client';

import profileTemplates from '@/lib/data/profile-templates.json';
import { RangeSlider } from './RangeSlider';
import type { BuildingClass, BuildingClassConfig, ScaleField } from '@/types/profiler';

interface ScalePanelProps {
  buildingClass: BuildingClass | null;
  subclass: string[];
  value: Record<string, number>;
  onChange: (key: string, v: number) => void;
}

const UNIVERSAL_FIELDS: Array<{ key: string; label: string; min: number; max: number; step: number; unit?: string }> = [
  { key: 'storeys', label: 'Storeys', min: 1, max: 60, step: 1 },
  { key: 'gfa_sqm', label: 'GFA', min: 50, max: 50000, step: 50, unit: 'm²' },
  { key: 'units', label: 'Units', min: 1, max: 500, step: 1 },
];

function fieldRange(field: ScaleField): { min: number; max: number; step: number } {
  const min = typeof field.min === 'number' ? field.min : 1;
  let max = typeof field.max === 'number' ? field.max : 1000;
  if (typeof field.max !== 'number') {
    if (field.key === 'storeys') max = 60;
    else if (field.key.endsWith('_sqm') || field.key === 'gfa_sqm') max = 50000;
    else if (['units', 'beds', 'dwellings', 'sites', 'ilus'].includes(field.key)) max = 1000;
    else if (field.key === 'bedrooms') max = 8;
    else if (field.key === 'garage_spaces') max = 6;
    else if (field.key.endsWith('_percent')) max = 100;
    else if (field.key === 'site_area_ha') max = 100;
    else max = 500;
  }
  let step = 1;
  if (field.type === 'decimal') {
    if (field.key.endsWith('_sqm') || field.key.endsWith('_per_bed')) step = 10;
    else if (field.key.endsWith('_percent')) step = 5;
    else step = 1;
  }
  return { min, max, step };
}

export function ScalePanel({ buildingClass, subclass, value, onChange }: ScalePanelProps) {
  const config = buildingClass
    ? (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[buildingClass]
    : null;
  const primarySubclass = subclass[0];
  const subclassFields: ScaleField[] = config && primarySubclass && config.scaleFields[primarySubclass]
    ? config.scaleFields[primarySubclass]
    : [];

  const subclassExtras = subclassFields.filter(
    (f) => !UNIVERSAL_FIELDS.some((u) => u.key === f.key)
  );

  const universalsResolved = UNIVERSAL_FIELDS.map((u) => {
    const override = subclassFields.find((f) => f.key === u.key);
    if (!override) return u;
    const { min, max, step } = fieldRange(override);
    return { ...u, min, max, step };
  });

  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
        Scale
      </span>
      <div className="space-y-2">
        {universalsResolved.map((f) => (
          <RangeSlider
            key={f.key}
            label={f.label}
            value={value[f.key] ?? f.min}
            min={f.min}
            max={f.max}
            step={f.step}
            unit={f.unit}
            onChange={(v) => onChange(f.key, v)}
            compact
          />
        ))}
        {subclassExtras.map((f) => {
          const r = fieldRange(f);
          return (
            <RangeSlider
              key={f.key}
              label={f.label}
              value={value[f.key] ?? r.min}
              min={r.min}
              max={r.max}
              step={r.step}
              onChange={(v) => onChange(f.key, v)}
              compact
            />
          );
        })}
      </div>
    </div>
  );
}
