'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ProjectSwitcher } from '@/components/dashboard/ProjectSwitcher';

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
        <PanelGroup direction="horizontal" className="h-full w-full">
            <Panel defaultSize={25} minSize={15} className="bg-[#1e1e1e]">
                <div className="h-full flex flex-col">
                    {/* Left Panel Header */}
                    <header className="flex items-center justify-between px-6 py-3 border-b border-[#3e3e42] bg-[#252526] flex-shrink-0 min-h-[57px]">
                        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-[#0e639c] flex items-center justify-center">
                                <span className="text-white font-bold text-sm">A</span>
                            </div>
                            <h1 className="text-lg font-semibold text-[#cccccc]">assemble.ai</h1>
                        </Link>
                        <ProjectSwitcher
                            selectedProject={selectedProject}
                            onSelectProject={onSelectProject}
                            refreshTrigger={refreshTrigger}
                        />
                    </header>
                    {/* Left Panel Content */}
                    <div className="flex-1 overflow-hidden">
                        {leftContent}
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[#3e3e42] hover:bg-[#0e639c] transition-colors cursor-col-resize h-full" />
            <Panel defaultSize={50} minSize={20} className="bg-[#252526]">
                <div className="h-full flex flex-col">
                    {/* Center Panel Header */}
                    <header className="flex items-center justify-between px-6 py-3 border-b border-[#3e3e42] bg-[#252526] flex-shrink-0 min-h-[57px]">
                        {/* Empty header for consistent height */}
                    </header>
                    {/* Center Panel Content */}
                    <div className="flex-1 overflow-hidden">
                        {centerContent}
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-[#3e3e42] hover:bg-[#0e639c] transition-colors cursor-col-resize h-full" />
            <Panel defaultSize={25} minSize={15} className="bg-[#1e1e1e]">
                <div className="h-full flex flex-col">
                    {/* Right Panel Header */}
                    <header className="flex items-center justify-between px-6 py-3 border-b border-[#3e3e42] bg-[#252526] flex-shrink-0 min-h-[57px]">
                        {/* Empty header for consistent height */}
                    </header>
                    {/* Right Panel Content */}
                    <div className="flex-1 overflow-hidden">
                        {rightContent}
                    </div>
                </div>
            </Panel>
        </PanelGroup>
    );
}
