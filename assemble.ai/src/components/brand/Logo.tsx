'use client';

import { cn } from '@/lib/utils';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

const sizeConfig = {
  sm: {
    fontSize: 'text-2xl',
  },
  md: {
    fontSize: 'text-3xl',
  },
  lg: {
    fontSize: 'text-4xl',
  },
};

/**
 * Foundry Logo Component
 *
 * Displays the Foundry brand logo with gradient text effect.
 * Gradient flows from warm peach/orange to green/teal.
 *
 * @param size - Logo size variant (sm, md, lg)
 * @param className - Additional CSS classes
 */
export function Logo({ size = 'md', className }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex items-center',
        'select-none cursor-pointer',
        'hover:scale-[1.02] transition-transform duration-200',
        className
      )}
    >
      <span
        className={cn(
          config.fontSize,
          'font-bold tracking-tight ml-2',
          'bg-gradient-to-br from-[#e8a878] via-[#a8b078] to-[#48a878]',
          'bg-clip-text text-transparent'
        )}
      >
        Foundry
      </span>
    </div>
  );
}

/**
 * Compact logo variant - same as full logo at small size
 */
export function LogoIcon({ size = 'sm', className }: LogoProps) {
  return <Logo size={size} className={className} />;
}
