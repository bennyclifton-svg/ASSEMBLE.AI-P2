'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const MEETING_RECORD_ACCENT = 'var(--sw-cyan)';
export const REPORT_RECORD_ACCENT = 'var(--sw-lav)';

export function RecordSectionHeading({
    children,
    accentColor,
    muted = false,
    className,
}: {
    children: ReactNode;
    accentColor: string;
    muted?: boolean;
    className?: string;
}) {
    return (
        <h3
            className={cn(
                'flex items-center gap-2 text-sm font-semibold transition-colors',
                muted ? 'text-[var(--sw-muted)]' : 'text-[var(--sw-ink)]',
                className
            )}
        >
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" style={{ background: accentColor }} />
            {children}
        </h3>
    );
}
