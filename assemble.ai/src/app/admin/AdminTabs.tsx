'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Cpu, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/models', label: 'AI Models', icon: Cpu },
    { href: '/admin/products', label: 'Products', icon: Package },
] as const;

/**
 * Tab row for admin sections. Adopts the same styling as the project
 * dashboard's main tabs (tab-aurora-main) — short hover line under inactive
 * tabs, full-width gradient underline on the active tab.
 */
export function AdminTabs() {
    const pathname = usePathname();

    return (
        <nav className="flex w-full items-end gap-1.5 border-b border-[var(--color-border)] pl-[5%]">
            {TABS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                    <Link
                        key={href}
                        href={href}
                        data-state={active ? 'active' : 'inactive'}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'relative flex items-center gap-2 rounded-none px-4 py-3 text-[15px] font-medium transition-all duration-200 ease-out',
                            'tab-aurora-main',
                            active
                                ? 'text-[var(--color-text-primary)]'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
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
