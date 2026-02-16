'use client';

import { MapPin } from 'lucide-react';

interface DetailsSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
    onProjectNameChange?: () => void;
    isActive?: boolean;
    onToggle?: () => void;
}

export function DetailsSection({
    projectId,
    data,
    onUpdate,
    onProjectNameChange,
    isActive = false,
    onToggle,
}: DetailsSectionProps) {
    return (
        <div className={`nav-panel-section py-3 ${isActive ? 'nav-panel-active' : ''}`}>
            <button
                onClick={onToggle}
                className="nav-panel-header w-full"
            >
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
                        Lot
                    </h3>
                </div>
            </button>
        </div>
    );
}
