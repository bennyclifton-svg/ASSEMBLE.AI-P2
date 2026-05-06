'use client';

import { cn } from '@/lib/utils';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  size?: LogoSize;
  className?: string;
  showText?: boolean;
}

const sizeConfig = {
  sm: { fontSize: 'text-lg' },
  md: { fontSize: 'text-xl' },
  lg: { fontSize: 'text-2xl' },
};

export function Logo({ size = 'md', className, showText = true }: LogoProps) {
  if (!showText) return null;
  const config = sizeConfig[size];

  return (
    <span
      className={cn(
        config.fontSize,
        'font-[family-name:var(--font-exo-2)] font-bold italic tracking-normal',
        'text-[var(--color-text-primary)]',
        'select-none cursor-pointer',
        'hover:scale-[1.02] transition-transform duration-200 inline-block',
        className
      )}
    >
      SiteWise
    </span>
  );
}
