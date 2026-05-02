'use client';

import { ClipboardList } from 'lucide-react';

interface BriefSectionProps {
    isActive?: boolean;
    onShowBrief?: () => void;
}

export function BriefSection({ isActive = false, onShowBrief }: BriefSectionProps) {
    return (
        <div className={`nav-panel-section py-3 ${isActive ? 'nav-panel-active' : ''}`}>
            <button
                onClick={onShowBrief}
                className="nav-panel-header w-full"
            >
                <div className="flex items-center gap-1.5">
                    <ClipboardList className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
                        Brief
                    </h3>
                </div>
            </button>
        </div>
    );
}
