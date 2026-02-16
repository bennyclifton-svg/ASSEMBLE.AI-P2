'use client';

import { ReactNode, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Logo } from '@/components/brand/Logo';
import { UserProfileDropdown } from './UserProfileDropdown';
import { cn } from '@/lib/utils';

interface ResizableLayoutProps {
    leftContent: ReactNode;
    centerContent: ReactNode;
    rightContent: ReactNode;
}

const LEFT_PANEL_DEFAULT_SIZE = 8;
const LEFT_PANEL_COLLAPSED_SIZE = 3;
const RIGHT_PANEL_DEFAULT_SIZE = 25;
const RIGHT_PANEL_EXPANDED_SIZE = 50;

export function ResizableLayout({
    leftContent,
    centerContent,
    rightContent,
}: ResizableLayoutProps) {
    const leftPanelRef = useRef<ImperativePanelHandle>(null);
    const rightPanelRef = useRef<ImperativePanelHandle>(null);
    const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false);

    const handleRightPanelExpandToggle = useCallback(() => {
        const rightPanel = rightPanelRef.current;
        const leftPanel = leftPanelRef.current;
        if (!rightPanel) return;

        if (isRightPanelExpanded) {
            rightPanel.resize(RIGHT_PANEL_DEFAULT_SIZE);
            leftPanel?.resize(LEFT_PANEL_DEFAULT_SIZE);
        } else {
            rightPanel.resize(RIGHT_PANEL_EXPANDED_SIZE);
            leftPanel?.resize(LEFT_PANEL_COLLAPSED_SIZE);
        }
        setIsRightPanelExpanded(!isRightPanelExpanded);
    }, [isRightPanelExpanded]);

    return (
        <div className="h-full w-full relative">
            <PanelGroup direction="horizontal" className="h-full w-full relative">
                <Panel ref={leftPanelRef} defaultSize={LEFT_PANEL_DEFAULT_SIZE} minSize={LEFT_PANEL_COLLAPSED_SIZE} className="shadow-xl z-10">
                <div className={cn(
                    'h-full flex flex-col animate-slide-in-up bg-[var(--color-bg-primary)] transition-all duration-200',
                    isRightPanelExpanded && 'left-panel-collapsed'
                )}>
                    {/* Left Panel Header */}
                    <header className={cn(
                        'flex items-center py-3 flex-shrink-0 transition-all duration-200',
                        isRightPanelExpanded ? 'px-0 justify-center' : 'px-4'
                    )}>
                        <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
                            <Logo size="md" showText={!isRightPanelExpanded} />
                        </Link>
                    </header>
                    {/* Left Panel Content */}
                    <div className="flex-1 overflow-hidden">
                        {leftContent}
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize h-full" />
            <Panel defaultSize={62} minSize={20} className="bg-[var(--color-bg-tertiary)]">
                <div className="h-full flex flex-col animate-slide-in-up animate-delay-100 relative">
                    {/* Watermark background */}
                    <img
                        src="/images/logo-mask.svg"
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none panel-watermark"
                    />
                    {/* Center Panel Content */}
                    <div className="flex-1 min-h-0 overflow-hidden relative z-10">
                        {centerContent}
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize h-full" />
            <Panel ref={rightPanelRef} defaultSize={RIGHT_PANEL_DEFAULT_SIZE} minSize={15} className="border-l border-[var(--color-border-accent)] bg-[var(--color-bg-tertiary)]">
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
