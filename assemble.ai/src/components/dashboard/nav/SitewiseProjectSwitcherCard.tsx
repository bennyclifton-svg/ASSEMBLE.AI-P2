'use client';

import { FolderKanban } from 'lucide-react';
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
            className="sitewise-project-switcher-card px-3 py-2 transition-colors hover:bg-white"
            style={{ background: 'white', border: '1px solid var(--sw-rule)' }}
        >
            <ProjectSwitcher
                selectedProject={selectedProject}
                onSelectProject={onSelectProject}
                refreshTrigger={refreshTrigger}
            >
                <span
                    className="sitewise-project-icon-grid flex h-7 w-7 shrink-0 items-center justify-center border"
                    style={{
                        color: '#0891B2',
                        background: 'rgba(8, 145, 178, 0.12)',
                        borderColor: '#0891B2',
                    }}
                >
                    <FolderKanban className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <span className="sitewise-project-label flex flex-col items-start min-w-0 flex-1">
                    <span
                        className="truncate"
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--sw-ink)',
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
