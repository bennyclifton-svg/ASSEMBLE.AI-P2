'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SitewiseNavItemProps {
    label: string;
    kbd?: string;
    active?: boolean;
    icon?: LucideIcon;
    iconColor?: string;
    iconBackground?: string;
    onClick?: () => void;
}

export function SitewiseNavItem({
    label,
    kbd,
    active,
    icon: Icon,
    iconColor = 'var(--sw-rose)',
    iconBackground = 'rgba(196, 73, 92, 0.14)',
    onClick,
}: SitewiseNavItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={cn(
                'sitewise-nav-item flex items-center justify-between gap-2 px-2.5 py-2 transition-colors text-left',
                active && 'sitewise-nav-item-active'
            )}
            style={{
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--sw-ink)' : 'var(--sw-muted)',
                background: active ? 'white' : 'transparent',
                border: active ? '1px solid var(--sw-rule)' : '1px solid transparent',
                borderLeft: active ? '2px solid var(--sw-rose)' : '2px solid transparent',
                cursor: 'pointer',
            }}
        >
            <span className="flex min-w-0 items-center gap-2">
                {Icon && (
                    <span
                        className="sitewise-nav-icon-grid flex h-7 w-7 shrink-0 items-center justify-center border transition-all"
                        style={{
                            color: iconColor,
                            background: iconBackground,
                            borderColor: active ? iconColor : 'transparent',
                        }}
                    >
                        <Icon className="h-4 w-4" strokeWidth={2.2} />
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
