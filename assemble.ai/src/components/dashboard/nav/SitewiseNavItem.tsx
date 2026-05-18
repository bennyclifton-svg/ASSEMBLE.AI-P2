'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SitewiseNavItemProps {
    label: string;
    kbd?: string;
    active?: boolean;
    icon?: LucideIcon;
    onClick?: () => void;
}

export function SitewiseNavItem({
    label,
    kbd,
    active,
    icon: Icon,
    onClick,
}: SitewiseNavItemProps) {
    const [hovered, setHovered] = useState(false);
    const highlighted = active || hovered;
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={label}
            aria-label={label}
            className={cn(
                'sitewise-nav-item flex items-center justify-between gap-2 px-3 py-2 transition-colors text-left',
                active && 'sitewise-nav-item-active'
            )}
            style={{
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: highlighted ? 'var(--sw-paper)' : 'var(--sw-muted)',
                background: highlighted ? '#2F363E' : 'transparent',
                border: '1px solid transparent',
                borderLeft: active ? '2px solid var(--sw-rose)' : '2px solid transparent',
                cursor: 'pointer',
            }}
        >
            <span className="flex min-w-0 items-center gap-2">
                {Icon && (
                    <span
                        className="sitewise-nav-icon-grid flex h-7 w-7 shrink-0 items-center justify-center"
                        style={{ color: 'currentColor' }}
                    >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                )}
                <span className="sitewise-nav-label truncate">{label}</span>
            </span>
            {kbd && (
                <span
                    className="sitewise-nav-kbd shrink-0"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-muted)',
                        opacity: 0.7,
                    }}
                >
                    {kbd}
                </span>
            )}
        </button>
    );
}
