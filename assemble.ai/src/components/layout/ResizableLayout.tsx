'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ProjectSwitcher } from '@/components/dashboard/ProjectSwitcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Logo } from '@/components/brand/Logo';

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface ResizableLayoutProps {
    selectedProject: Project | null;
    onSelectProject: (project: Project | null) => void;
    leftContent: ReactNode;
    centerContent: ReactNode;
    rightContent: ReactNode;
    refreshTrigger?: number;
}

export function ResizableLayout({
    selectedProject,
    onSelectProject,
    leftContent,
    centerContent,
    rightContent,
    refreshTrigger
}: ResizableLayoutProps) {
    return (
        <div className="h-full w-full relative">
            <PanelGroup direction="horizontal" className="h-full w-full relative">
                <Panel defaultSize={17} minSize={12} className="border-r border-[var(--color-border-accent)]">
                <div className="h-full flex flex-col animate-slide-in-up">
                    {/* Left Panel Header */}
                    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0 min-h-[57px]">
                        <Link href="/" className="hover:opacity-80 transition-opacity">
                            <Logo size="md" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <ProjectSwitcher
                                selectedProject={selectedProject}
                                onSelectProject={onSelectProject}
                                refreshTrigger={refreshTrigger}
                            />
                        </div>
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
            <Panel defaultSize={25} minSize={15} className="border-l border-[var(--color-border-accent)]">
                <div className="h-full flex flex-col animate-slide-in-up animate-delay-200">
                    {/* Right Panel Header */}
                    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0 min-h-[57px]">
                        {/* Empty header for consistent height */}
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
