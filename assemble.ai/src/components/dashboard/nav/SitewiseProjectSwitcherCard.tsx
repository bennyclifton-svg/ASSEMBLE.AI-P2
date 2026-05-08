'use client';

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
            className="px-3 py-2 transition-colors hover:bg-white"
            style={{ background: 'white', border: '1px solid var(--sw-rule)' }}
        >
            <ProjectSwitcher
                selectedProject={selectedProject}
                onSelectProject={onSelectProject}
                refreshTrigger={refreshTrigger}
            >
                <span className="flex flex-col items-start min-w-0 flex-1">
                    <span style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-muted)',
                        letterSpacing: '0.05em',
                    }}>
                        foundry/
                    </span>
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
