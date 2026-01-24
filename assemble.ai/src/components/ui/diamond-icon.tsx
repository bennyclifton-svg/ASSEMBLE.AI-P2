'use client';

import { cn } from '@/lib/utils';

interface DiamondIconProps {
    className?: string;
    /** 'filled' shows inner filled square (default), 'empty' shows outline only */
    variant?: 'filled' | 'empty';
}

/**
 * Diamond Icon - Rotated square with optional inner filled square
 * Used as the AI generation indicator, replacing Sparkles icon
 * Matches the Knowledge button icon in Document Repository
 */
export function DiamondIcon({ className, variant = 'filled' }: DiamondIconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('inline-block', className)}
        >
            {/* Outer diamond (square rotated 45°) */}
            <path
                d="M8 1L15 8L8 15L1 8L8 1Z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
            />
            {/* Inner diamond (smaller, filled) - only shown for 'filled' variant */}
            {variant === 'filled' && (
                <path
                    d="M8 4.5L11.5 8L8 11.5L4.5 8L8 4.5Z"
                    fill="currentColor"
                />
            )}
        </svg>
    );
}
