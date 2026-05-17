'use client';

import { ReactNode, useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ArrowLeft, Brain, CreditCard, Cpu, HardDrive, Package, User, Users } from 'lucide-react';
import { SitewiseNavGroup, SitewiseNavItem } from '@/components/dashboard/nav';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useIsSuperAdmin } from '@/lib/auth-client';

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
    { href: '/settings/memory', label: 'AI Memory', icon: Brain },
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

export function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const isSuperAdmin = useIsSuperAdmin();

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

    const renderNavItem = (item: NavItem) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
            <SitewiseNavItem
                key={item.href}
                label={item.label}
                icon={item.icon}
                active={active}
                onClick={() => router.push(item.href)}
            />
        );
    };

    return (
        <div className="h-screen w-full bg-[var(--sw-paper)]">
            <PanelGroup
                direction="horizontal"
                className="h-full w-full"
                onLayout={handlePanelResize}
            >
                <Panel
                    defaultSize={panelSizes[0]}
                    minSize={12}
                    className="shadow-xl z-10"
                >
                    <aside
                        className="h-full flex flex-col animate-slide-in-up overflow-hidden"
                        style={{ background: 'var(--sw-paper-2)' }}
                    >
                        <Link
                            href="/dashboard"
                            className="hover:opacity-80 transition-opacity flex-shrink-0 py-3 px-4"
                            aria-label="Sitewise — dashboard"
                        >
                            <Image
                                src="/images/sitewise-logo-light.png"
                                alt="Sitewise"
                                width={1038}
                                height={554}
                                priority
                                style={{ height: 67, width: 'auto', display: 'block', marginLeft: 24 }}
                            />
                        </Link>
                        <div className="flex flex-col flex-1 p-4 gap-4 overflow-auto">
                            <Link
                                href="/dashboard"
                                aria-label="Back to dashboard"
                                className="flex items-center gap-2 px-3 py-2 text-left transition-colors"
                                style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: 'var(--sw-muted)',
                                    border: '1px solid transparent',
                                    borderLeft: '2px solid transparent',
                                }}
                            >
                                <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                <span>Dashboard</span>
                            </Link>
                            <SitewiseNavGroup>
                                {ACCOUNT_ITEMS.map(renderNavItem)}
                            </SitewiseNavGroup>
                            {isSuperAdmin && (
                                <SitewiseNavGroup label="Admin" showDivider>
                                    {ADMIN_ITEMS.map(renderNavItem)}
                                </SitewiseNavGroup>
                            )}
                        </div>
                    </aside>
                </Panel>

                <PanelResizeHandle className="w-1 bg-[var(--sw-canvas)] hover:bg-[var(--sw-cta)] data-[resize-handle-state=drag]:bg-[var(--sw-cta)] transition-colors cursor-col-resize h-full" />

                <Panel
                    defaultSize={panelSizes[1]}
                    minSize={40}
                    className="bg-[var(--sw-paper)]"
                >
                    <div className="h-full flex flex-col animate-slide-in-up animate-delay-100 relative">
                        <div className="absolute top-3 right-5 z-20">
                            <UserProfileDropdown />
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto">
                            {children}
                        </div>
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}
