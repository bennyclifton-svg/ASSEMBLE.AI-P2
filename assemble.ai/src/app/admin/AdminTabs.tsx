'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Cpu, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
    { href: '/admin/users', label: 'users', icon: Users },
    { href: '/admin/models', label: 'ai models', icon: Cpu },
    { href: '/admin/products', label: 'products', icon: Package },
] as const;

/**
 * Tab row for admin sections. Adopts the same styling as the project
 * dashboard's main tabs (tab-aurora-main) — short hover line under inactive
 * tabs, full-width gradient underline on the active tab.
 */
export function AdminTabs() {
    const pathname = usePathname();

    return (
        <nav className="flex w-full items-end gap-1.5 border-b border-[var(--sw-rule)] pl-[5%]">
            {TABS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                    <Link
                        key={href}
                        href={href}
                        data-state={active ? 'active' : 'inactive'}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'relative flex items-center gap-2 rounded-none px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200 ease-out',
                            'tab-aurora-main',
                            active
                                ? 'text-[var(--sw-ink)]'
                                : 'text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
