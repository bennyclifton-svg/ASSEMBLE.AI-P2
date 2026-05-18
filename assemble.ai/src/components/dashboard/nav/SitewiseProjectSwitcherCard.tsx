'use client';

import { Folder } from 'lucide-react';
import { ProjectSwitcher } from '../ProjectSwitcher';

interface Project {
    id: string;
    name: string;
    code: string;
    status: string;
}

interface SitewiseProjectSwitcherCardProps {
    selectedProject: Project | null;
    onSelectProject: (project: Project | null) => void;
    refreshTrigger?: number;
}

export function SitewiseProjectSwitcherCard({
    selectedProject,
    onSelectProject,
    refreshTrigger,
}: SitewiseProjectSwitcherCardProps) {
    if (!selectedProject) return null;
    return (
        <div
            className="sitewise-project-switcher-card px-3 py-2 transition-colors"
            style={{
                background: '#2F363E',
                border: '1px solid transparent',
                borderLeft: '2px solid var(--sw-rose)',
            }}
        >
            <ProjectSwitcher
                selectedProject={selectedProject}
                onSelectProject={onSelectProject}
                refreshTrigger={refreshTrigger}
            >
                <span
                    className="sitewise-project-icon-grid flex h-7 w-7 shrink-0 items-center justify-center"
                    style={{ color: 'var(--sw-paper)' }}
                >
                    <Folder className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className="sitewise-project-label flex flex-col items-start min-w-0 flex-1">
                    <span
                        className="truncate"
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--sw-paper)',
                            textTransform: 'lowercase',
                        }}
                    >
                        {selectedProject.name}
                    </span>
                </span>
            </ProjectSwitcher>
        </div>
    );
}
