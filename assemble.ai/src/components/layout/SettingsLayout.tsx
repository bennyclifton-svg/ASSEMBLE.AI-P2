'use client';

import { ReactNode, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ArrowLeft, CreditCard, Cpu, HardDrive, Package, User, Users } from 'lucide-react';
import { SitewiseWordmark } from '@/components/brand/SitewiseWordmark';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useSession } from '@/lib/auth-client';

const STORAGE_KEY = 'settings-panel-sizes';
const DEFAULT_SIZES = [17, 83];

interface NavItem {
    href: string;
    label: string;
    icon: typeof User;
}

const ACCOUNT_ITEMS: NavItem[] = [
    { href: '/settings/account', label: 'Account', icon: User },
    { href: '/settings/billing', label: 'Billing', icon: CreditCard },
];

const ADMIN_ITEMS: NavItem[] = [
    { href: '/settings/users', label: 'Users', icon: Users },
    { href: '/settings/models', label: 'AI Models', icon: Cpu },
    { href: '/settings/storage', label: 'Storage', icon: HardDrive },
    { href: '/settings/products', label: 'Products', icon: Package },
];

interface SettingsLayoutProps {
    children: ReactNode;
}

/**
 * SettingsLayout - Two-panel layout for the consolidated Settings section.
 *
 * - Left panel: Sitewise wordmark, Back-to-Dashboard, Account/Billing nav,
 *   and (for super admins) an Admin subhead with Users/AI Models/Storage/Products.
 * - Right panel: User profile dropdown header, watermark, and scrollable content.
 *
 * Active nav state is driven by the current pathname (exact match or descendant
 * route). Panel sizes are persisted to localStorage under `settings-panel-sizes`.
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isSuperAdmin =
        (session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin === true;

    const [panelSizes, setPanelSizes] = useState<number[]>(() => {
        if (typeof window === 'undefined') return DEFAULT_SIZES;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return DEFAULT_SIZES;
        try {
            const sizes = JSON.parse(saved);
            if (Array.isArray(sizes) && sizes.length === 2) return sizes;
        } catch {
            /* ignore malformed persisted sizes */
        }
        return DEFAULT_SIZES;
    });

    const handlePanelResize = useCallback((sizes: number[]) => {
        setPanelSizes(sizes);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
        }
    }, []);

    const renderItem = (item: NavItem) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
            <Link
                key={item.href}
                href={item.href}
                data-state={active ? 'active' : 'inactive'}
                aria-current={active ? 'page' : undefined}
                className="sitewise-button"
            >
                <Icon className="h-4 w-4" />
                {item.label}
            </Link>
        );
    };

    return (
        <div className="sitewise-control-surface h-screen w-full relative bg-[var(--sw-paper)]">
            <PanelGroup
                direction="horizontal"
                className="h-full w-full relative"
                onLayout={handlePanelResize}
            >
                <Panel
                    defaultSize={panelSizes[0]}
                    minSize={12}
                    className="border-r border-[var(--sw-rule)]"
                >
                    <div className="h-full flex flex-col animate-slide-in-up">
                        <header className="flex items-center px-6 py-3 border-b border-[var(--sw-rule)] bg-[var(--sw-paper-2)] flex-shrink-0 min-h-[57px]">
                            <Link
                                href="/dashboard"
                                className="hover:opacity-80 transition-opacity"
                                aria-label="Sitewise — dashboard"
                            >
                                <SitewiseWordmark
                                    size={20}
                                    color="var(--color-text-primary)"
                                    accent="var(--sw-rose)"
                                />
                            </Link>
                        </header>
                        <div className="flex-1 overflow-auto bg-[var(--sw-paper-2)] px-4 py-4">
                            <Link
                                href="/dashboard"
                                className="sitewise-button sitewise-button-muted"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Dashboard
                            </Link>
                            <div className="mt-4 grid gap-2">
                                {ACCOUNT_ITEMS.map(renderItem)}
                            </div>
                            {isSuperAdmin && (
                                <>
                                    <div className="mt-6 mb-2 px-2 sitewise-page-kicker text-[var(--sw-muted)]">
                                        Admin
                                    </div>
                                    <div className="grid gap-2">{ADMIN_ITEMS.map(renderItem)}</div>
                                </>
                            )}
                        </div>
                    </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-[var(--sw-rule)] hover:bg-[var(--sw-rose)] transition-colors cursor-col-resize h-full" />

                <Panel
                    defaultSize={panelSizes[1]}
                    minSize={40}
                    className="bg-[var(--sw-paper)]"
                >
                    <div className="h-full flex flex-col animate-slide-in-up animate-delay-100 relative">
                        <header className="flex items-center justify-end px-6 py-3 border-b border-[var(--sw-rule)] bg-[var(--sw-paper-2)] flex-shrink-0 min-h-[57px]">
                            <UserProfileDropdown />
                        </header>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/logo-mask.svg"
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none panel-watermark"
                        />
                        <div className="flex-1 min-h-0 overflow-auto relative z-10">
                            {children}
                        </div>
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}
