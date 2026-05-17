'use client';

import { ReactNode, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';

interface ResizableLayoutProps {
    leftContent: ReactNode;
    centerContent: ReactNode;
    rightContent: ReactNode;
}

const LEFT_PANEL_DEFAULT_SIZE = 13;
const LEFT_PANEL_COLLAPSED_SIZE = 5;
const RIGHT_PANEL_DEFAULT_SIZE = 25;
const RIGHT_PANEL_EXPANDED_SIZE = 50;
const RIGHT_PANEL_COLLAPSED_SIZE = 15;

export function ResizableLayout({
    leftContent,
    centerContent,
    rightContent,
}: ResizableLayoutProps) {
    const leftPanelRef = useRef<ImperativePanelHandle>(null);
    const rightPanelRef = useRef<ImperativePanelHandle>(null);
    const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false);
    const [isCenterMaximized, setIsCenterMaximized] = useState(false);

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
        setIsCenterMaximized(false);
    }, [isRightPanelExpanded]);

    const handleCenterMaximizeToggle = useCallback(() => {
        const leftPanel = leftPanelRef.current;
        const rightPanel = rightPanelRef.current;
        if (!leftPanel || !rightPanel) return;

        if (isCenterMaximized) {
            leftPanel.resize(LEFT_PANEL_DEFAULT_SIZE);
            rightPanel.resize(RIGHT_PANEL_DEFAULT_SIZE);
        } else {
            leftPanel.resize(LEFT_PANEL_COLLAPSED_SIZE);
            rightPanel.resize(RIGHT_PANEL_COLLAPSED_SIZE);
        }
        setIsCenterMaximized(!isCenterMaximized);
        setIsRightPanelExpanded(false);
    }, [isCenterMaximized]);

    return (
        <div className="h-full w-full relative">
            <PanelGroup direction="horizontal" className="h-full w-full relative">
                <Panel ref={leftPanelRef} defaultSize={LEFT_PANEL_DEFAULT_SIZE} minSize={LEFT_PANEL_COLLAPSED_SIZE} className="shadow-xl z-10">
                <div
                    className={cn(
                        'h-full flex flex-col animate-slide-in-up transition-all duration-200',
                        (isRightPanelExpanded || isCenterMaximized) && 'left-panel-collapsed'
                    )}
                    style={{ background: 'var(--sw-paper-2)' }}
                >
                    {/* Left Panel Header — Sitewise wordmark */}
                    <header
                        className={cn(
                            'flex items-center py-3 flex-shrink-0 transition-all duration-200',
                            (isRightPanelExpanded || isCenterMaximized) ? 'px-0 justify-center' : 'px-4'
                        )}
                        style={{ background: 'var(--sw-paper-2)' }}
                    >
                        <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0" aria-label="Sitewise — home">
                            {(isRightPanelExpanded || isCenterMaximized) ? (
                                <Image
                                    src="/images/sitewise-logo-mini.png"
                                    alt="Sitewise"
                                    width={672}
                                    height={665}
                                    priority
                                    style={{ height: 56, width: 'auto', display: 'block', marginTop: 11 }}
                                />
                            ) : (
                                <Image
                                    src="/images/sitewise-logo-light.png"
                                    alt="Sitewise"
                                    width={1038}
                                    height={554}
                                    priority
                                    style={{ height: 67, width: 'auto', display: 'block', marginLeft: 24 }}
                                />
                            )}
                        </Link>
                    </header>
                    {/* Left Panel Content */}
                    <div className="flex-1 overflow-hidden">
                        {leftContent}
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[var(--sw-canvas)] hover:bg-[var(--sw-cta)] data-[resize-handle-state=drag]:bg-[var(--sw-cta)] transition-colors cursor-col-resize h-full" />
            <Panel defaultSize={62} minSize={20} className="bg-[var(--sw-canvas)]">
                <div
                    data-chat-dock-anchor="center"
                    className="h-full flex flex-col animate-slide-in-up animate-delay-100 relative"
                >
                    {/* Maximize / restore center panel — height matches the Documents header (88px). pt-[37px] places the chevron centre at ~y=49 from the strip top, matching the right-panel chevron which centres on the 30px "Documents" text (text top at y=32, height 33, centre at y=48.5). */}
                    <div className="absolute top-0 right-0 z-20 flex items-start px-5 pt-[37px] h-[88px] pointer-events-none">
                        <button
                            type="button"
                            onClick={handleCenterMaximizeToggle}
                            title={isCenterMaximized ? 'Restore side panels' : 'Maximize centre panel'}
                            aria-label={isCenterMaximized ? 'Restore side panels' : 'Maximize centre panel'}
                            className="flex items-center hover:opacity-80 transition-opacity pointer-events-auto"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#1F6B8A' }}
                        >
                            {isCenterMaximized ? (
                                <>
                                    <ChevronsRight className="w-6 h-6" strokeWidth={2.5} style={{ marginRight: -4 }} />
                                    <ChevronsLeft className="w-6 h-6" strokeWidth={2.5} />
                                </>
                            ) : (
                                <>
                                    <ChevronsLeft className="w-6 h-6" strokeWidth={2.5} style={{ marginRight: -4 }} />
                                    <ChevronsRight className="w-6 h-6" strokeWidth={2.5} />
                                </>
                            )}
                        </button>
                    </div>
                    {/* Center Panel Content */}
                    <div className="flex-1 min-h-0 overflow-hidden relative z-10">
                        {centerContent}
                    </div>
                    {/* Spacer so the ChatDock doesn't cover content */}
                    <div className="flex-shrink-0" style={{ height: 'var(--chat-dock-height, 0px)', transition: 'height 0.15s ease' }} />
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[var(--sw-canvas)] hover:bg-[var(--sw-cta)] data-[resize-handle-state=drag]:bg-[var(--sw-cta)] transition-colors cursor-col-resize h-full" />
            <Panel ref={rightPanelRef} defaultSize={RIGHT_PANEL_DEFAULT_SIZE} minSize={15} className="bg-[var(--sw-paper)]">
                <div className="h-full flex flex-col animate-slide-in-up animate-delay-200">
                    {/* Right Panel Header — Sitewise dialect. Fixed 88px height keeps the chevron on the same horizontal plane as the centre panel's maximize chevrons.
                        items-start + pt-8 lifts "Documents" + chevron to ~32px from the top, matching the H1 "Brief" inside BriefPanel (pt-2 + breadcrumb + mb-2 stacks above its title row). The 88px height also pushes the category tiles below into the same horizontal band as GENERATE BRIEF. */}
                    <header
                        className="flex items-start justify-between px-5 pt-8 flex-shrink-0 h-[88px]"
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
                                ? <ChevronsRight className="w-6 h-6" strokeWidth={2.5} style={{ color: '#1F6B8A' }} />
                                : <ChevronsLeft className="w-6 h-6" strokeWidth={2.5} style={{ color: '#1F6B8A' }} />}
                            <span
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 30,
                                    fontWeight: 500,
                                    letterSpacing: '-0.025em',
                                    color: '#C0C5CC',
                                    lineHeight: 1.1,
                                }}
                            >
                                Documents
                            </span>
                        </button>
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
