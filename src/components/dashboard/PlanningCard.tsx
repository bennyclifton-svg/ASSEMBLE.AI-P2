'use client';

import { useState, useEffect } from 'react';
import { DetailsSection } from './planning/DetailsSection';
import { ObjectivesSection } from './planning/ObjectivesSection';
import { StagingSection } from './planning/StagingSection';
import { RiskSection } from './planning/RiskSection';
import { StakeholdersSection } from './planning/StakeholdersSection';

interface PlanningCardProps {
    projectId: string;
}

export function PlanningCard({ projectId }: PlanningCardProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPlanningData();
    }, [projectId]);

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
            <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="text-[#cccccc]">Loading planning data...</div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-[#1e1e1e] p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-[#cccccc] mb-6">Planning</h2>

                <DetailsSection
                    projectId={projectId}
                    data={data?.details}
                    onUpdate={fetchPlanningData}
                />

                <ObjectivesSection
                    projectId={projectId}
                    data={data?.objectives}
                    onUpdate={fetchPlanningData}
                />

                <StagingSection
                    projectId={projectId}
                    data={data?.stages || []}
                    onUpdate={fetchPlanningData}
                />

                <RiskSection
                    projectId={projectId}
                    data={data?.risks || []}
                    onUpdate={fetchPlanningData}
                />

                <StakeholdersSection
                    projectId={projectId}
                    data={data?.stakeholders || []}
                    onUpdate={fetchPlanningData}
                />
            </div>
        </div>
    );
}
