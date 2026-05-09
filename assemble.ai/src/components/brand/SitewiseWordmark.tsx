'use client';

import { cn } from '@/lib/utils';

interface SitewiseWordmarkProps {
    size?: number;
    color?: string;
    accent?: string;
    className?: string;
}

export function SitewiseWordmark({
    size = 28,
    color = 'var(--sw-ink)',
    accent = 'var(--sw-rose)',
    className,
}: SitewiseWordmarkProps) {
    return (
        <span
            className={cn('inline-flex items-baseline leading-none', className)}
            style={{
                fontFamily: 'var(--sw-font-sans)',
                fontWeight: 800,
                fontSize: size,
                letterSpacing: '-0.04em',
                color,
            }}
        >
            <span>site</span>
            <span style={{ color: accent }}>wise</span>
        </span>
    );
}
