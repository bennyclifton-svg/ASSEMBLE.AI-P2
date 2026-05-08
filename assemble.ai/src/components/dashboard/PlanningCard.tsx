'use client';

import {
    SitewiseNavGroup,
    SitewiseNavItem,
    SitewiseProjectSwitcherCard,
    SitewiseAskCard,
} from './nav';

interface Project {
    id: string;
    name: string;
    code: string;
    status: string;
}

interface PlanningCardProps {
    activeMainTab?: string;
    refreshKey?: number;
    selectedProject?: Project | null;
    onSelectProject?: (project: Project | null) => void;
    onMainTabChange?: (tab: string) => void;
    // Retained for API compatibility with existing callers; the wireframe
    // routes navigation exclusively through onMainTabChange.
    projectId?: string;
    onStakeholderNavigate?: () => void;
    onKnowledgeNavigate?: () => void;
    onShowBrief?: () => void;
}

const WORKFLOW_ITEMS: Array<{ tab: string; label: string; kbd: string }> = [
    { tab: 'brief',            label: 'Brief',          kbd: '⌥1' },
    { tab: 'cost-planning',    label: 'Cost Planning',  kbd: '⌥2' },
    { tab: 'program',          label: 'Program',        kbd: '⌥3' },
    { tab: 'procurement',      label: 'Procurement',    kbd: '⌥4' },
    { tab: 'notes',            label: 'Notes',          kbd: '⌥5' },
    { tab: 'correspondence',   label: 'Correspondence', kbd: '⌥6' },
    { tab: 'meetings-reports', label: 'Meet & Report',  kbd: '⌥7' },
];

const REFERENCE_ITEMS: Array<{ tab: string; label: string; kbd: string }> = [
    { tab: 'stakeholders', label: 'Stakeholders', kbd: '⌥8' },
    { tab: 'knowledge',    label: 'Knowledge',    kbd: '⌥9' },
];

export function PlanningCard({
    activeMainTab,
    refreshKey,
    selectedProject,
    onSelectProject,
    onMainTabChange,
}: PlanningCardProps) {
    return (
        <aside
            className="flex flex-col h-full p-4 gap-4 overflow-hidden"
            style={{ background: 'var(--sw-paper-2)', borderRight: '1px solid var(--sw-rule)' }}
        >
            {selectedProject && onSelectProject && (
                <SitewiseProjectSwitcherCard
                    selectedProject={selectedProject}
                    onSelectProject={onSelectProject}
                    refreshTrigger={refreshKey}
                />
            )}

            <SitewiseNavGroup>
                {WORKFLOW_ITEMS.map(item => (
                    <SitewiseNavItem
                        key={item.tab}
                        label={item.label}
                        kbd={item.kbd}
                        active={activeMainTab === item.tab}
                        onClick={() => onMainTabChange?.(item.tab)}
                    />
                ))}
            </SitewiseNavGroup>

            <SitewiseNavGroup label="Reference" showDivider>
                {REFERENCE_ITEMS.map(item => (
                    <SitewiseNavItem
                        key={item.tab}
                        label={item.label}
                        kbd={item.kbd}
                        active={activeMainTab === item.tab}
                        onClick={() => onMainTabChange?.(item.tab)}
                    />
                ))}
            </SitewiseNavGroup>

            <div className="mt-auto">
                <SitewiseAskCard onActivate={() => { /* TODO: focus ChatDock */ }} />
            </div>
        </aside>
    );
}
