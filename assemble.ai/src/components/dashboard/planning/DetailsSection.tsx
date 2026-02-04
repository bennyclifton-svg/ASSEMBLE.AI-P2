'use client';

import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { ProjectSwitcher } from '@/components/dashboard/ProjectSwitcher';

interface Project {
    id: string;
    name: string;
    code: string;
    status: string;
}

interface DetailsSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
    onProjectNameChange?: () => void;
    isActive?: boolean;
    onToggle?: () => void;
    selectedProject?: Project | null;
    onSelectProject?: (project: Project | null) => void;
    refreshTrigger?: number;
}

export function DetailsSection({
    projectId,
    data,
    onUpdate,
    onProjectNameChange,
    isActive = false,
    onToggle,
    selectedProject,
    onSelectProject,
    refreshTrigger,
}: DetailsSectionProps) {
    return (
        <div className={`nav-panel-section py-3 ${isActive ? 'nav-panel-active' : ''}`}>
            <button
                onClick={onToggle}
                className="nav-panel-header w-full mb-2"
            >
                <h3 className="nav-panel-title text-sm font-semibold text-[var(--color-text-primary)] transition-colors">
                    Details
                </h3>
                <CornerBracketIcon
                    direction={isActive ? 'right' : 'left'}
                    gradient={isActive}
                    className={`nav-panel-chevron w-3.5 h-3.5 ${!isActive ? 'text-[var(--color-text-muted)]' : ''} transition-colors`}
                />
            </button>

            <div className="nav-panel-content">
                {onSelectProject ? (
                    <ProjectSwitcher
                        selectedProject={selectedProject ?? null}
                        onSelectProject={onSelectProject}
                        refreshTrigger={refreshTrigger}
                    >
                        <span className="text-lg font-bold text-[var(--color-text-primary)] truncate">
                            {data?.projectName || 'Untitled Project'}
                        </span>
                    </ProjectSwitcher>
                ) : (
                    <div className="text-lg font-bold text-[var(--color-text-primary)] truncate">
                        {data?.projectName || 'Untitled Project'}
                    </div>
                )}
            </div>
        </div>
    );
}
