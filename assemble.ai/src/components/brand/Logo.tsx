'use client';

import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  size?: LogoSize;
  className?: string;
  showText?: boolean;
}

const sizeConfig = {
  sm: {
    icon: 'w-[18px] h-[18px]',
    text: 'text-base',
    gap: 'gap-1.5',
  },
  md: {
    icon: 'w-[22px] h-[22px]',
    text: 'text-lg',
    gap: 'gap-2',
  },
  lg: {
    icon: 'w-[28px] h-[28px]',
    text: 'text-[22px]',
    gap: 'gap-2.5',
  },
};

/**
 * TESSERA Logo Component
 *
 * Displays the TESSERA brand identity with:
 * - Grid icon representing precision and structure
 * - Copper accent color (adapts to precision themes)
 * - Typography using DM Sans
 *
 * @param size - Logo size variant (sm, md, lg)
 * @param showText - Whether to show "TESSERA" text (default: true)
 * @param className - Additional CSS classes
 */
export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex items-center',
        config.gap,
        'select-none cursor-pointer',
        'hover:scale-[1.02] transition-transform duration-200',
        className
      )}
    >
      <LayoutGrid
        className={cn(
          config.icon,
          'text-[var(--color-accent-primary)]',
          'flex-shrink-0'
        )}
        strokeWidth={2}
      />
      {showText && (
        <span
          className={cn(
            config.text,
            'font-semibold tracking-tight',
            'text-[var(--color-text-primary)]'
          )}
        >
          TESSERA
        </span>
      )}
    </div>
  );
}

/**
 * Compact logo variant (icon only)
 */
export function LogoIcon({ size = 'md', className }: Omit<LogoProps, 'showText'>) {
  return <Logo size={size} showText={false} className={className} />;
}
