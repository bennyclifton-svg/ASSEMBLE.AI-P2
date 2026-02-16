'use client';

import { useState, useEffect } from 'react';
import { Box } from 'lucide-react';
import { DetailsSection } from './planning/DetailsSection';
import { ObjectivesNav } from './planning/ObjectivesNav';
import { ProfileSection } from '@/components/profiler/ProfileSection';
import { StakeholderNav } from '@/components/stakeholders/StakeholderNav';
import { ProjectSwitcher } from './ProjectSwitcher';

interface Project {
    id: string;
    name: string;
    code: string;
    status: string;
}

interface PlanningCardProps {
    projectId: string;
    selectedDocumentIds?: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    onProjectNameChange?: () => void;
    onProfileChange?: (buildingClass: string | null, projectType: string | null) => void;
    onStakeholderNavigate?: () => void;
    onShowProfiler?: () => void;
    onShowObjectives?: () => void;
    onShowProjectDetails?: () => void;
    activeMainTab?: string;
    refreshKey?: number;
    selectedProject?: Project | null;
    onSelectProject?: (project: Project | null) => void;
}

export function PlanningCard({
    projectId,
    selectedDocumentIds = [],
    onSetSelectedDocumentIds,
    onProjectNameChange,
    onProfileChange,
    onStakeholderNavigate,
    onShowProfiler,
    onShowObjectives,
    onShowProjectDetails,
    activeMainTab,
    refreshKey,
    selectedProject,
    onSelectProject,
}: PlanningCardProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Reset state when projectId changes or refreshKey triggers re-fetch
        setIsLoading(true);
        setData(null);
        fetchPlanningData();
    }, [projectId, refreshKey]);

    const fetchPlanningData = async () => {
        try {
            const response = await fetch(`/api/planning/${projectId}`);
            const planningData = await response.json();
            setData(planningData);
        } catch (error) {
            console.error('Error fetching planning data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-[var(--color-text-secondary)]">Loading planning data...</div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto section-planning">
            <div className="nav-panel-unified pt-[60px]">
                <DetailsSection
                    key={projectId}
                    projectId={projectId}
                    data={data?.details}
                    onUpdate={fetchPlanningData}
                    onProjectNameChange={onProjectNameChange}
                    isActive={activeMainTab === 'project-details'}
                    onToggle={onShowProjectDetails}
                />

                <ProfileSection
                    projectId={projectId}
                    data={data?.profile}
                    onUpdate={fetchPlanningData}
                    onProfileChange={onProfileChange}
                    onShowProfiler={onShowProfiler}
                    isActive={activeMainTab === 'profiler'}
                />

                <ObjectivesNav
                    projectId={projectId}
                    data={data?.objectives}
                    profileData={data?.profile}
                    onShowObjectives={onShowObjectives}
                    isActive={activeMainTab === 'objectives'}
                />

                <StakeholderNav
                    projectId={projectId}
                    onNavigate={onStakeholderNavigate}
                    isActive={activeMainTab === 'stakeholders'}
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
