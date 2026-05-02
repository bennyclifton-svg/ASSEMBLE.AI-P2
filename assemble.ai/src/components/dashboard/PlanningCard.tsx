'use client';

import { Box } from 'lucide-react';
import { BriefSection } from './planning/BriefSection';
import { StakeholderNav } from '@/components/stakeholders/StakeholderNav';
import { KnowledgeNav } from '@/components/knowledge/KnowledgeNav';
import { ProjectSwitcher } from './ProjectSwitcher';


interface Project {
    id: string;
    name: string;
    code: string;
    status: string;
}

interface PlanningCardProps {
    projectId: string;
    onStakeholderNavigate?: () => void;
    onKnowledgeNavigate?: () => void;
    onShowBrief?: () => void;
    activeMainTab?: string;
    refreshKey?: number;
    selectedProject?: Project | null;
    onSelectProject?: (project: Project | null) => void;
}

export function PlanningCard({
    projectId,
    onStakeholderNavigate,
    onKnowledgeNavigate,
    onShowBrief,
    activeMainTab,
    refreshKey,
    selectedProject,
    onSelectProject,
}: PlanningCardProps) {
    return (
        <div className="h-full overflow-y-auto section-planning">
            <div className="nav-panel-unified pt-[60px]">
                <BriefSection
                    isActive={activeMainTab === 'brief'}
                    onShowBrief={onShowBrief}
                />

                <StakeholderNav
                    projectId={projectId}
                    onNavigate={onStakeholderNavigate}
                    isActive={activeMainTab === 'stakeholders'}
                />

                <KnowledgeNav
                    projectId={projectId}
                    onNavigate={onKnowledgeNavigate}
                    isActive={activeMainTab === 'knowledge'}
                />

                {/* Project Switcher */}
                {onSelectProject && selectedProject && (
                    <div className="nav-panel-section py-3 overflow-hidden">
                        <div className="nav-panel-header w-full overflow-hidden">
                            <ProjectSwitcher
                                selectedProject={selectedProject}
                                onSelectProject={onSelectProject}
                                refreshTrigger={refreshKey}
                            >
                                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                    <Box className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0" />
                                    <span className="text-base font-medium text-[var(--color-text-primary)] truncate">
                                        {selectedProject.name}
                                    </span>
                                </div>
                            </ProjectSwitcher>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
