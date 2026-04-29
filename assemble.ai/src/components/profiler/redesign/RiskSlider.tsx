'use client';

import * as Slider from '@radix-ui/react-slider';
import type { RiskLevel } from './profilerReducer';

interface RiskSliderProps {
  value: RiskLevel | null;
  isModified: boolean;
  disabled?: boolean;
  onChange: (level: RiskLevel) => void;
  onClear: () => void;
}

const LEVELS: RiskLevel[] = ['low', 'medium', 'high'];
const FILL_VAR: Record<RiskLevel, string> = {
  low: 'var(--color-accent-green)',
  medium: 'var(--color-accent-copper)',
  high: 'var(--color-error)',
};

export function RiskSlider({ value, isModified, disabled, onChange, onClear }: RiskSliderProps) {
  const idx = value ? LEVELS.indexOf(value) : -1;
  const fill = value ? FILL_VAR[value] : 'var(--color-bg-tertiary)';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Risk</span>
        <div className="flex items-center gap-1.5">
          {isModified && (
            <span className="px-1 py-0.5 rounded text-[8px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              modified
            </span>
          )}
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="text-[9px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[idx === -1 ? 0 : idx]}
        min={0}
        max={2}
        step={1}
        onValueChange={(v) => onChange(LEVELS[v[0]])}
        disabled={disabled}
        aria-label="Risk level"
      >
        <Slider.Track className="relative grow h-1 rounded-full bg-[var(--color-bg-tertiary)]">
          {idx >= 0 && (
            <Slider.Range
              className="absolute h-full rounded-full transition-colors"
              style={{ backgroundColor: fill }}
            />
          )}
        </Slider.Track>
        <Slider.Thumb
          className="block h-3 w-3 rounded-full bg-[var(--color-bg-primary)] border-2 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-copper)]/40 disabled:opacity-50"
          style={{ borderColor: disabled ? 'var(--color-border)' : fill, opacity: idx === -1 ? 0.4 : 1 }}
        />
      </Slider.Root>

      <div className="flex justify-between mt-0.5 text-[9px] text-[var(--color-text-muted)]">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => !disabled && onChange(l)}
            disabled={disabled}
            className={`transition-colors disabled:cursor-not-allowed ${
              value === l ? 'text-[var(--color-text-primary)] font-semibold' : 'hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {l === 'low' ? 'Low' : l === 'medium' ? 'Med' : 'High'}
          </button>
        ))}
      </div>
    </div>
  );
}
