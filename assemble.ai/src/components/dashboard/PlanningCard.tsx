'use client';

import {
    BadgeDollarSign,
    Brain,
    CalendarClock,
    ClipboardList,
    Handshake,
    Mail,
    StickyNote,
    UsersRound,
    WandSparkles,
} from 'lucide-react';
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
    { tab: 'program',          label: 'Programme',        kbd: '⌥3' },
    { tab: 'procurement',      label: 'Procurement',    kbd: '⌥4' },
    { tab: 'notes',            label: 'Records',        kbd: '⌥5' },
    { tab: 'correspondence',   label: 'Correspondence', kbd: '⌥6' },
    { tab: 'meetings-reports', label: 'Meet & Report',  kbd: '⌥7' },
];

const REFERENCE_ITEMS: Array<{ tab: string; label: string; kbd: string }> = [
    { tab: 'stakeholders', label: 'Stakeholders', kbd: '⌥8' },
    { tab: 'knowledge',    label: 'Knowledge',    kbd: '⌥9' },
];

const NAV_VISUALS = {
    brief: { icon: WandSparkles, color: '#C93F6A', bg: 'rgba(201, 63, 106, 0.14)' },
    'cost-planning': { icon: BadgeDollarSign, color: '#0F9F6E', bg: 'rgba(15, 159, 110, 0.14)' },
    program: { icon: CalendarClock, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.13)' },
    procurement: { icon: Handshake, color: '#D97706', bg: 'rgba(217, 119, 6, 0.15)' },
    notes: { icon: StickyNote, color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.13)' },
    correspondence: { icon: Mail, color: '#0891B2', bg: 'rgba(8, 145, 178, 0.14)' },
    'meetings-reports': { icon: ClipboardList, color: '#E11D48', bg: 'rgba(225, 29, 72, 0.12)' },
    stakeholders: { icon: UsersRound, color: '#0E7490', bg: 'rgba(14, 116, 144, 0.14)' },
    knowledge: { icon: Brain, color: '#9333EA', bg: 'rgba(147, 51, 234, 0.13)' },
} as const;

export function PlanningCard({
    activeMainTab,
    refreshKey,
    selectedProject,
    onSelectProject,
    onMainTabChange,
}: PlanningCardProps) {
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
                {WORKFLOW_ITEMS.map(item => (
                    <SitewiseNavItem
                        key={item.tab}
                        label={item.label}
                        kbd={item.kbd}
                        icon={NAV_VISUALS[item.tab as keyof typeof NAV_VISUALS].icon}
                        iconColor={NAV_VISUALS[item.tab as keyof typeof NAV_VISUALS].color}
                        iconBackground={NAV_VISUALS[item.tab as keyof typeof NAV_VISUALS].bg}
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
                        icon={NAV_VISUALS[item.tab as keyof typeof NAV_VISUALS].icon}
                        iconColor={NAV_VISUALS[item.tab as keyof typeof NAV_VISUALS].color}
                        iconBackground={NAV_VISUALS[item.tab as keyof typeof NAV_VISUALS].bg}
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

