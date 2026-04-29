'use client';

import * as Slider from '@radix-ui/react-slider';

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function RangeSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  disabled,
  compact = false,
}: RangeSliderProps) {
  const labelCls = compact
    ? 'text-[10px] text-[var(--color-text-muted)]'
    : 'text-xs text-[var(--color-text-muted)]';
  const valueCls = compact
    ? 'text-[10px] font-medium text-[var(--color-text-primary)] tabular-nums'
    : 'text-xs font-medium text-[var(--color-text-primary)] tabular-nums';

  return (
    <div className="w-full">
      <div className={`flex items-baseline justify-between ${compact ? 'mb-0.5' : 'mb-1.5'}`}>
        <span className={labelCls}>{label}</span>
        <span className={valueCls}>
          {value.toLocaleString()}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        disabled={disabled}
        aria-label={label}
      >
        <Slider.Track
          className={`relative grow rounded-full bg-[var(--color-bg-tertiary)] ${compact ? 'h-1' : 'h-1.5'}`}
        >
          <Slider.Range className="absolute h-full rounded-full bg-[var(--color-accent-copper)]" />
        </Slider.Track>
        <Slider.Thumb
          className={`block rounded-full bg-[var(--color-bg-primary)] border-2 border-[var(--color-accent-copper)] shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-copper)]/40 disabled:opacity-50 ${
            compact ? 'h-3 w-3' : 'h-4 w-4'
          }`}
        />
      </Slider.Root>
    </div>
  );
}
