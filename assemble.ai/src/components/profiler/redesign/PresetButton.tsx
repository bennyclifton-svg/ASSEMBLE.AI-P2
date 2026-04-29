'use client';

import { Wand2 } from 'lucide-react';
import { getPreset } from './presetMatrix';
import type { BuildingClass, ProjectType } from '@/types/profiler';

interface PresetButtonProps {
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  onApply: () => void;
}

export function PresetButton({ buildingClass, projectType, onApply }: PresetButtonProps) {
  const available = getPreset(buildingClass, projectType) !== null;
  return (
    <button
      type="button"
      onClick={onApply}
      disabled={!available}
      title={available ? 'Stamp standard defaults for this Class + Type' : 'Pick Class and Type to enable'}
      className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-all ${
        available
          ? 'bg-[var(--color-accent-copper)] text-[var(--color-text-inverse)] hover:opacity-90'
          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
      }`}
    >
      <Wand2 className="w-3 h-3" />
      Set Default
    </button>
  );
}
