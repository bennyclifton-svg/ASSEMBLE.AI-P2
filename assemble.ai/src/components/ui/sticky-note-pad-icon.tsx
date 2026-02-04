'use client';

import { cn } from '@/lib/utils';

interface StickyNotePadIconProps {
    className?: string;
}

/**
 * Sticky Note Pad Icon - Simple sticky note tile with peeled corner
 * Matches the profile section's notes tile style (yellow Post-it look)
 */
export function StickyNotePadIcon({ className }: StickyNotePadIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('inline-block', className)}
        >
            {/* Main note body - square with bottom-left corner cut for fold */}
            <path
                d="M4 3C3.44772 3 3 3.44772 3 4V16L9 22H20C20.5523 22 21 21.5523 21 21V4C21 3.44772 20.5523 3 20 3H4Z"
                fill="currentColor"
                opacity="0.75"
            />
            {/* Folded corner - darker triangle */}
            <path
                d="M3 16L9 16L9 22L3 16Z"
                fill="currentColor"
                opacity="0.5"
            />
            {/* Fold shadow line for depth */}
            <path
                d="M4 16.5L8.5 21"
                stroke="currentColor"
                strokeWidth="0.75"
                opacity="0.3"
            />
            {/* Content lines (like text on note) */}
            <line x1="6" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <line x1="6" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <line x1="6" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        </svg>
    );
}
