'use client';

import { Hammer, Wrench, Plus, Sparkles, MessageSquare } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type { ProjectType } from '@/types/profiler';

const ICONS: Record<ProjectType, React.ReactNode> = {
  new: <Hammer className="w-3.5 h-3.5" />,
  refurb: <Wrench className="w-3.5 h-3.5" />,
  extend: <Plus className="w-3.5 h-3.5" />,
  remediation: <Sparkles className="w-3.5 h-3.5" />,
  advisory: <MessageSquare className="w-3.5 h-3.5" />,
};

const SHORT: Record<ProjectType, string> = {
  new: 'New',
  refurb: 'Refurb',
  extend: 'Extend',
  remediation: 'Remed',
  advisory: 'Advise',
};

interface TypePickerProps {
  value: ProjectType | null;
  onChange: (v: ProjectType | null) => void;
}

export function TypePicker({ value, onChange }: TypePickerProps) {
  const types = profileTemplates.projectTypes as Array<{ value: ProjectType; label: string }>;

  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block">
        Type
      </span>
      <div className="flex gap-1">
        {types.map((t) => {
          const selected = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange(selected ? null : t.value)}
              title={t.label}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded border text-[9px] font-semibold transition-all flex-1 ${
                selected
                  ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
              }`}
            >
              {ICONS[t.value]}
              <span>{SHORT[t.value]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
