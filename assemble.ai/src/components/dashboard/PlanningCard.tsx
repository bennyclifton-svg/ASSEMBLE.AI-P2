'use client';

import { useRouter } from 'next/navigation';
import {
    Calculator,
    ChartGantt,
    DraftingCompass,
    FileSignature,
    FileStack,
    Library,
    Mails,
    Network,
    Presentation,
    Settings as SettingsIcon,
} from 'lucide-react';
import {
    SitewiseNavGroup,
    SitewiseNavItem,
    SitewiseProjectSwitcherCard,
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

const NAV_ITEMS: Array<{ tab: string; label: string }> = [
    { tab: 'brief',            label: 'Brief' },
    { tab: 'stakeholders',     label: 'Stakeholders' },
    { tab: 'cost-planning',    label: 'Cost Planning' },
    { tab: 'program',          label: 'Programme' },
    { tab: 'procurement',      label: 'Procurement' },
    { tab: 'notes',            label: 'Records' },
    { tab: 'correspondence',   label: 'Correspondence' },
    { tab: 'meetings-reports', label: 'Meet & Report' },
    { tab: 'knowledge',        label: 'Knowledge' },
];

const NAV_ICONS = {
    brief: DraftingCompass,
    'cost-planning': Calculator,
    program: ChartGantt,
    procurement: FileSignature,
    notes: FileStack,
    correspondence: Mails,
    'meetings-reports': Presentation,
    stakeholders: Network,
    knowledge: Library,
} as const;

export function PlanningCard({
    activeMainTab,
    refreshKey,
    selectedProject,
    onSelectProject,
    onMainTabChange,
}: PlanningCardProps) {
    const router = useRouter();
    return (
        <aside
            className="sitewise-left-nav flex flex-col h-full p-4 gap-4 overflow-hidden"
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
                {NAV_ITEMS.map(item => (
                    <SitewiseNavItem
                        key={item.tab}
                        label={item.label}
                        icon={NAV_ICONS[item.tab as keyof typeof NAV_ICONS]}
                        active={activeMainTab === item.tab}
                        onClick={() => onMainTabChange?.(item.tab)}
                    />
                ))}
                <SitewiseNavItem
                    label="Settings"
                    icon={SettingsIcon}
                    onClick={() => router.push('/settings')}
                />
            </SitewiseNavGroup>
        </aside>
    );
}
