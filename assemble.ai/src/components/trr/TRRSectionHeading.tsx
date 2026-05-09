import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const TRR_ACCENT_COLOR = 'var(--sw-cyan)';

export function TRRSectionHeading({
    children,
    muted = false,
}: {
    children: ReactNode;
    muted?: boolean;
}) {
    return (
        <h3
            className={cn(
                'flex items-center gap-2 text-sm font-semibold transition-colors',
                muted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
            )}
        >
            <span aria-hidden="true" className="h-1.5 w-1.5 bg-[var(--sw-cyan)]" />
            {children}
        </h3>
    );
}
