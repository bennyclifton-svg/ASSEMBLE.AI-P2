'use client';

import { ReactNode, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { SitewiseWordmark } from '@/components/brand/SitewiseWordmark';
import { UserProfileDropdown } from './UserProfileDropdown';
import { cn } from '@/lib/utils';

interface ResizableLayoutProps {
    leftContent: ReactNode;
    centerContent: ReactNode;
    rightContent: ReactNode;
}

const LEFT_PANEL_DEFAULT_SIZE = 16;
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
                <div
                    className={cn(
                        'h-full flex flex-col animate-slide-in-up transition-all duration-200',
                        isRightPanelExpanded && 'left-panel-collapsed'
                    )}
                    style={{ background: 'var(--sw-paper-2)' }}
                >
                    {/* Left Panel Header — Sitewise wordmark */}
                    <header
                        className={cn(
                            'flex items-center py-3 flex-shrink-0 transition-all duration-200',
                            isRightPanelExpanded ? 'px-0 justify-center' : 'px-4'
                        )}
                        style={{ background: 'var(--sw-paper-2)' }}
                    >
                        <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0" aria-label="Sitewise — home">
                            {isRightPanelExpanded ? (
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-sans)',
                                        fontWeight: 800,
                                        fontSize: 18,
                                        letterSpacing: '-0.04em',
                                        color: 'var(--sw-rose)',
                                        lineHeight: 1,
                                    }}
                                >
                                    sw
                                </span>
                            ) : (
                                <SitewiseWordmark size={20} color="var(--color-text-primary)" accent="var(--sw-rose)" />
                            )}
                        </Link>
                    </header>
                    {/* Left Panel Content */}
                    <div className="flex-1 overflow-hidden">
                        {leftContent}
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize h-full" />
            <Panel defaultSize={62} minSize={20} className="bg-[var(--sw-paper)]">
                <div
                    data-chat-dock-anchor="center"
                    className="h-full flex flex-col animate-slide-in-up animate-delay-100 relative"
                >
                    {/* Center Panel Content */}
                    <div className="flex-1 min-h-0 overflow-hidden relative z-10">
                        {centerContent}
                    </div>
                    {/* Spacer so the ChatDock doesn't cover content */}
                    <div className="flex-shrink-0" style={{ height: 'var(--chat-dock-height, 0px)', transition: 'height 0.15s ease' }} />
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize h-full" />
            <Panel ref={rightPanelRef} defaultSize={RIGHT_PANEL_DEFAULT_SIZE} minSize={15} className="border-l border-[var(--color-border-accent)] bg-[var(--sw-paper)]">
                <div className="h-full flex flex-col animate-slide-in-up animate-delay-200">
                    {/* Right Panel Header — Sitewise dialect */}
                    <header
                        className="flex items-center justify-between px-5 py-4 flex-shrink-0 min-h-[64px]"
                        style={{ background: 'var(--sw-paper-2)' }}
                    >
                        <button
                            type="button"
                            onClick={handleRightPanelExpandToggle}
                            title={isRightPanelExpanded ? 'Collapse panel' : 'Expand panel'}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                            {isRightPanelExpanded
                                ? <ChevronsRight className="w-5 h-5" style={{ color: 'var(--sw-rose)' }} />
                                : <ChevronsLeft className="w-5 h-5" style={{ color: 'var(--sw-rose)' }} />}
                            <span
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 22,
                                    fontWeight: 700,
                                    letterSpacing: 0,
                                    color: 'var(--color-text-primary)',
                                    lineHeight: 1,
                                }}
                            >
                                Documents
                            </span>
                        </button>
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
