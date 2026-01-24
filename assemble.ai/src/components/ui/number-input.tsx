'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface NumberInputProps {
  value: number | '';
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  label?: string;
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 1,
  className = '',
  label,
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const increment = () => {
    const currentValue = typeof value === 'number' ? value : 0;
    const newValue = currentValue + step;
    if (max !== undefined && newValue > max) return;
    onChange(String(newValue));
  };

  const decrement = () => {
    const currentValue = typeof value === 'number' ? value : 0;
    const newValue = currentValue - step;
    if (min !== undefined && newValue < min) return;
    onChange(String(newValue));
  };

  const handleMouseDown = (action: 'increment' | 'decrement') => {
    // Execute once immediately
    action === 'increment' ? increment() : decrement();

    // Then start repeating after a delay
    const timeout = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        action === 'increment' ? increment() : decrement();
      }, 75);
    }, 400);

    intervalRef.current = timeout as unknown as NodeJS.Timeout;
  };

  const handleMouseUp = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      clearTimeout(intervalRef.current as unknown as number);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        clearTimeout(intervalRef.current as unknown as number);
      }
    };
  }, []);

  // Add global mouseup listener to handle case where mouse leaves button while pressed
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`
          number-input-hide-spinners
          w-full pl-3 pr-10 py-2.5 text-sm
          bg-[var(--color-bg-tertiary)]
          border rounded-lg
          text-[var(--color-text-primary)]
          placeholder:text-[var(--color-text-muted)]
          transition-all duration-150
          ${isFocused
            ? 'border-[var(--color-accent-copper)] ring-1 ring-[var(--color-accent-copper)]/30'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
          }
          focus:outline-none
        `}
      />

      {/* Custom spinner buttons */}
      <div className="absolute right-1 top-1 bottom-1 flex flex-col w-7">
        <button
          type="button"
          onMouseDown={() => handleMouseDown('increment')}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`
            flex-1 flex items-center justify-center
            rounded-t-md transition-all duration-100
            text-[var(--color-text-muted)]
            hover:bg-[var(--color-accent-copper-tint)]
            hover:text-[var(--color-accent-copper)]
            active:bg-[var(--color-accent-copper)]
            active:text-[var(--color-text-inverse)]
          `}
          tabIndex={-1}
        >
          <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
        </button>
        <div className="h-px bg-[var(--color-border)]" />
        <button
          type="button"
          onMouseDown={() => handleMouseDown('decrement')}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`
            flex-1 flex items-center justify-center
            rounded-b-md transition-all duration-100
            text-[var(--color-text-muted)]
            hover:bg-[var(--color-accent-copper-tint)]
            hover:text-[var(--color-accent-copper)]
            active:bg-[var(--color-accent-copper)]
            active:text-[var(--color-text-inverse)]
          `}
          tabIndex={-1}
        >
          <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
