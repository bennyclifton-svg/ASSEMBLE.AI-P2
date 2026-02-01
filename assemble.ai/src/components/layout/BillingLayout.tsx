'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { UserProfileDropdown } from './UserProfileDropdown';

interface BillingLayoutProps {
    children: ReactNode;
}

/**
 * BillingLayout - Simplified 3-panel layout for billing/settings pages
 *
 * - Left panel: App logo only (no project switcher)
 * - Center panel: Main content (billing, settings, etc.)
 * - Right panel: User profile dropdown only (no documents)
 */
export function BillingLayout({ children }: BillingLayoutProps) {
    return (
        <div className="h-screen w-full relative bg-[var(--color-bg-primary)]">
            <PanelGroup direction="horizontal" className="h-full w-full relative">
                {/* Left Panel - Logo and navigation */}
                <Panel defaultSize={17} minSize={12} className="border-r border-[var(--color-border-accent)]">
                    <div className="h-full flex flex-col animate-slide-in-up">
                        <header className="flex items-center px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0 min-h-[57px]">
                            <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
                                <Logo size="md" />
                            </Link>
                        </header>
                        {/* Navigation */}
                        <div className="flex-1 overflow-hidden bg-[var(--color-bg-secondary)] px-4 py-4">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize h-full" />

                {/* Center Panel - Main content */}
                <Panel defaultSize={58} minSize={20}>
                    <div className="h-full flex flex-col animate-slide-in-up animate-delay-100">
                        <div className="flex-1 min-h-0 overflow-auto">
                            {children}
                        </div>
                    </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize h-full" />

                {/* Right Panel - User dropdown only */}
                <Panel defaultSize={25} minSize={15} className="border-l border-[var(--color-border-accent)]">
                    <div className="h-full flex flex-col animate-slide-in-up animate-delay-200">
                        <header className="flex items-center justify-end px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0 min-h-[57px]">
                            <UserProfileDropdown />
                        </header>
                        {/* Empty right content */}
                        <div className="flex-1 overflow-hidden bg-[var(--color-bg-secondary)]" />
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}
