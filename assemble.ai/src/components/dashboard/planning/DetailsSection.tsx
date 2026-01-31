'use client';

import { Maximize2, Minimize2 } from 'lucide-react';

interface DetailsSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
    onProjectNameChange?: () => void;
    isActive?: boolean;
    onToggle?: () => void;
}

export function DetailsSection({ projectId, data, onUpdate, onProjectNameChange, isActive = false, onToggle }: DetailsSectionProps) {
    return (
        <div className={`nav-panel-section py-3 pl-2 pr-3 ${isActive ? 'nav-panel-active' : ''}`}>
            <button
                onClick={onToggle}
                className="nav-panel-header w-full mb-2"
            >
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                    Project Name
                </span>
                {isActive ? (
                    <Minimize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-accent-copper)]" />
                ) : (
                    <Maximize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-text-muted)] transition-colors" />
                )}
            </button>

            <div className="text-lg font-bold text-[var(--color-text-primary)] pl-1.5 pr-2 truncate">
                {data?.projectName || 'Untitled Project'}
            </div>
        </div>
    );
}
