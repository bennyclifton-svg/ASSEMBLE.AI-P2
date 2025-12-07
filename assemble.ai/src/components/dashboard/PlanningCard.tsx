'use client';

import { useState, useEffect } from 'react';
import { DetailsSection } from './planning/DetailsSection';
import { ObjectivesSection } from './planning/ObjectivesSection';
import { StagingSection } from './planning/StagingSection';
import { RiskSection } from './planning/RiskSection';
import { StakeholdersSection } from './planning/StakeholdersSection';
import { ConsultantListSection } from './planning/ConsultantListSection';
import { ContractorListSection } from './planning/ContractorListSection';
import { KnowledgeLibrariesSection } from '@/components/planning/KnowledgeLibrariesSection';

// Default organization ID until organization management is implemented
const DEFAULT_ORGANIZATION_ID = 'default-org';

interface PlanningCardProps {
    projectId: string;
    selectedDocumentIds?: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
}

export function PlanningCard({
    projectId,
    selectedDocumentIds = [],
    onSetSelectedDocumentIds,
}: PlanningCardProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Reset state when projectId changes
        setIsLoading(true);
        setData(null);
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
        <div className="h-full overflow-y-auto bg-[#1e1e1e] p-6" style={{ scrollbarGutter: 'stable both-edges' }}>
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

                <KnowledgeLibrariesSection
                    projectId={projectId}
                    organizationId={DEFAULT_ORGANIZATION_ID}
                    selectedDocumentIds={selectedDocumentIds}
                    onLoadDocuments={onSetSelectedDocumentIds}
                />

                <ConsultantListSection projectId={projectId} />

                <ContractorListSection projectId={projectId} />
            </div>
        </div>
    );
}
