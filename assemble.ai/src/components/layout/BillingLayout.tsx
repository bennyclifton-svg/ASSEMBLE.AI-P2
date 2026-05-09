'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ArrowLeft } from 'lucide-react';
import { SitewiseWordmark } from '@/components/brand/SitewiseWordmark';
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
        <div className="sitewise-control-surface h-screen w-full relative bg-[var(--sw-paper)]">
            <PanelGroup direction="horizontal" className="h-full w-full relative">
                {/* Left Panel - Logo and navigation */}
                <Panel defaultSize={17} minSize={12} className="border-r border-[var(--sw-rule)]">
                    <div className="h-full flex flex-col animate-slide-in-up">
                        <header className="flex items-center px-6 py-3 border-b border-[var(--sw-rule)] bg-[var(--sw-paper-2)] flex-shrink-0 min-h-[57px]">
                            <Link href="/dashboard" className="hover:opacity-80 transition-opacity" aria-label="Sitewise — dashboard">
                                <SitewiseWordmark size={20} color="var(--color-text-primary)" accent="var(--sw-rose)" />
                            </Link>
                        </header>
                        {/* Navigation */}
                        <div className="flex-1 overflow-hidden bg-[var(--sw-paper-2)] px-4 py-4">
                            <Link
                                href="/dashboard"
                                className="sitewise-button sitewise-button-muted"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Dashboard
                            </Link>
                        </div>
                    </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-[var(--sw-rule)] hover:bg-[var(--sw-rose)] transition-colors cursor-col-resize h-full" />

                {/* Center Panel - Main content */}
                <Panel defaultSize={58} minSize={20} className="bg-[var(--sw-paper)]">
                    <div className="h-full flex flex-col animate-slide-in-up animate-delay-100 relative">
                        {/* Watermark background */}
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

                <PanelResizeHandle className="w-1 bg-[var(--sw-rule)] hover:bg-[var(--sw-rose)] transition-colors cursor-col-resize h-full" />

                {/* Right Panel - User dropdown only */}
                <Panel defaultSize={25} minSize={15} className="border-l border-[var(--sw-rule)]">
                    <div className="h-full flex flex-col animate-slide-in-up animate-delay-200">
                        <header className="flex items-center justify-end px-6 py-3 border-b border-[var(--sw-rule)] bg-[var(--sw-paper-2)] flex-shrink-0 min-h-[57px]">
                            <UserProfileDropdown />
                        </header>
                        {/* Empty right content */}
                        <div className="flex-1 overflow-hidden bg-[var(--sw-paper-2)]" />
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}
