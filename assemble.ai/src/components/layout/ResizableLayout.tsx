'use client';

import { ReactNode, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Logo } from '@/components/brand/Logo';
import { UserProfileDropdown } from './UserProfileDropdown';

interface ResizableLayoutProps {
    leftContent: ReactNode;
    centerContent: ReactNode;
    rightContent: ReactNode;
}

const RIGHT_PANEL_DEFAULT_SIZE = 25;
const RIGHT_PANEL_EXPANDED_SIZE = 50;

export function ResizableLayout({
    leftContent,
    centerContent,
    rightContent,
}: ResizableLayoutProps) {
    const rightPanelRef = useRef<ImperativePanelHandle>(null);
    const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false);

    const handleRightPanelExpandToggle = useCallback(() => {
        const panel = rightPanelRef.current;
        if (!panel) return;

        if (isRightPanelExpanded) {
            panel.resize(RIGHT_PANEL_DEFAULT_SIZE);
        } else {
            panel.resize(RIGHT_PANEL_EXPANDED_SIZE);
        }
        setIsRightPanelExpanded(!isRightPanelExpanded);
    }, [isRightPanelExpanded]);

    return (
        <div className="h-full w-full relative">
            <PanelGroup direction="horizontal" className="h-full w-full relative">
                <Panel defaultSize={17} minSize={12} className="border-r border-[var(--color-border-accent)]">
                <div className="h-full flex flex-col animate-slide-in-up">
                    {/* Left Panel Header */}
                    <header className="flex items-center px-6 py-3 flex-shrink-0 min-h-[57px]">
                        <Link href="/" className="hover:opacity-80 transition-opacity">
                            <Logo size="md" />
                        </Link>
                    </header>
                    {/* Left Panel Content */}
                    <div className="flex-1 overflow-hidden">
                        {leftContent}
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize h-full" />
            <Panel defaultSize={58} minSize={20}>
                <div className="h-full flex flex-col animate-slide-in-up animate-delay-100">
                    {/* Center Panel Content */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        {centerContent}
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize h-full" />
            <Panel ref={rightPanelRef} defaultSize={RIGHT_PANEL_DEFAULT_SIZE} minSize={15} className="border-l border-[var(--color-border-accent)]">
                <div className="h-full flex flex-col animate-slide-in-up animate-delay-200">
                    {/* Right Panel Header */}
                    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] flex-shrink-0 min-h-[57px]">
                        <h2
                            className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3 font-[var(--font-heading)] cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={handleRightPanelExpandToggle}
                            title={isRightPanelExpanded ? 'Collapse panel' : 'Expand panel'}
                        >
                            <span className="flex items-center translate-y-[1px]" style={{ marginRight: '-4px' }}>
                                {isRightPanelExpanded ? (
                                    <>
                                        <ChevronRight className="w-6 h-6 text-[#DC2626]" style={{ marginRight: '-16px' }} />
                                        <ChevronRight className="w-6 h-6 text-[#EA580C]" style={{ marginRight: '-16px' }} />
                                        <ChevronRight className="w-6 h-6 text-[#EAB308]" />
                                    </>
                                ) : (
                                    <>
                                        <ChevronLeft className="w-6 h-6 text-[#EAB308]" style={{ marginRight: '-16px' }} />
                                        <ChevronLeft className="w-6 h-6 text-[#EA580C]" style={{ marginRight: '-16px' }} />
                                        <ChevronLeft className="w-6 h-6 text-[#DC2626]" />
                                    </>
                                )}
                            </span>
                            Documents
                        </h2>
                        <UserProfileDropdown />
                    </header>
                    {/* Right Panel Content */}
                    <div className="flex-1 overflow-hidden">
                        {rightContent}
                    </div>
                </div>
            </Panel>
        </PanelGroup>
        </div>
    );
}
