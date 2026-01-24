'use client';

import { useState, useEffect } from 'react';
import { DetailsSection } from './planning/DetailsSection';
import { ObjectivesNav } from './planning/ObjectivesNav';
import { ProfileSection } from '@/components/profiler/ProfileSection';
import { StakeholderNav } from '@/components/stakeholders/StakeholderNav';

interface PlanningCardProps {
    projectId: string;
    selectedDocumentIds?: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    onProjectNameChange?: () => void;
    onProfileChange?: (buildingClass: string | null, projectType: string | null) => void;
    onStakeholderNavigate?: () => void;
    onShowProfiler?: () => void;
    onShowObjectives?: () => void;
    activeMainTab?: string;
    refreshKey?: number;
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
    activeMainTab,
    refreshKey,
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
        <div className="h-full overflow-y-auto p-3 section-planning" style={{ scrollbarGutter: 'stable both-edges' }}>
            <div className="space-y-3">
                <DetailsSection
                    key={projectId}
                    projectId={projectId}
                    data={data?.details}
                    onUpdate={fetchPlanningData}
                    onProjectNameChange={onProjectNameChange}
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
            </div>
        </div>
    );
}
