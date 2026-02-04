'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  size?: LogoSize;
  className?: string;
  showText?: boolean;
}

const sizeConfig = {
  sm: {
    fontSize: 'text-xl',
    iconSize: 32,
  },
  md: {
    fontSize: 'text-2xl',
    iconSize: 42,
  },
  lg: {
    fontSize: 'text-3xl',
    iconSize: 55,
  },
};

/**
 * Foundry Logo Component
 *
 * Displays the Foundry brand logo with SVG icon and Aurora-colored text.
 * Uses Aurora palette: Cyan (#00FFFF) for dark theme, Azure (#0066CC) for light theme.
 *
 * @param size - Logo size variant (sm, md, lg)
 * @param className - Additional CSS classes
 * @param showText - Whether to show "Foundry" text (default: true)
 */
export function Logo({ size = 'md', className, showText = true }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        'select-none cursor-pointer',
        'hover:scale-[1.02] transition-transform duration-200',
        className
      )}
    >
      <Image
        src="/logo-foundry.svg"
        alt="Foundry Logo"
        width={config.iconSize}
        height={config.iconSize}
        className="flex-shrink-0"
        priority
      />
      {showText && (
        <span
          className={cn(
            config.fontSize,
            'font-[family-name:var(--font-exo-2)] font-bold italic tracking-normal',
            'text-[var(--color-text-primary)]'
          )}
        >
          Foundry
        </span>
      )}
    </div>
  );
}

/**
 * Compact logo variant - icon only at small size
 */
export function LogoIcon({ size = 'sm', className }: LogoProps) {
  return <Logo size={size} className={className} showText={false} />;
}
