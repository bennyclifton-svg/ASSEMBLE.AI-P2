'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfilerMiddlePanel } from '@/components/profiler/ProfilerMiddlePanel';
import { ObjectivesWorkspace } from '@/components/profiler/objectives/ObjectivesWorkspace';
import { ProjectDetailsPanel } from '@/components/dashboard/planning/ProjectDetailsPanel';
import type { BuildingClass, ProjectType, Region } from '@/types/profiler';

interface BriefPanelProps {
    projectId: string;
    activeSubTab: string;
    onSubTabChange: (sub: string) => void;
    // Lot
    detailsData: unknown;
    onDetailsUpdate: () => void;
    onProjectNameChange?: () => void;
    // Building
    buildingClass: BuildingClass | null;
    projectType: ProjectType | null;
    region: Region;
    onClassChange?: (cls: BuildingClass) => void;
    onTypeChange?: (type: ProjectType) => void;
    onRegionChange?: (region: Region) => void;
    profileData?: {
        subclass?: string[];
        subclassOther?: string[];
        scaleData?: Record<string, number>;
        complexity?: Record<string, string | string[]>;
        workScope?: string[];
    };
    onProfileComplete?: () => void;
    onProfileLoad?: (buildingClass: BuildingClass, projectType: ProjectType) => void;
}

const subTabClassName =
    'tab-aurora-sub rounded-none px-4 py-2 text-[var(--color-text-muted)] text-xs font-medium transition-all duration-200 hover:text-[var(--color-text-primary)] hover:bg-white/10 data-[state=active]:bg-transparent data-[state=active]:text-[var(--color-text-primary)]';

export function BriefPanel({
    projectId,
    activeSubTab,
    onSubTabChange,
    detailsData,
    onDetailsUpdate,
    onProjectNameChange,
    buildingClass,
    projectType,
    region,
    onClassChange,
    onTypeChange,
    onRegionChange,
    profileData,
    onProfileComplete,
    onProfileLoad,
}: BriefPanelProps) {
    return (
        <div className="h-full flex flex-col">
            <Tabs
                value={activeSubTab}
                onValueChange={onSubTabChange}
                className="flex-1 flex flex-col min-h-0"
            >
                <TabsList className="w-full justify-start bg-transparent border-b border-[var(--color-border)]/50 rounded-none h-auto p-0 pl-[20%]">
                    <TabsTrigger value="lot" className={subTabClassName}>
                        Lot
                    </TabsTrigger>
                    <TabsTrigger value="building" className={subTabClassName}>
                        Building
                    </TabsTrigger>
                    <TabsTrigger value="objectives" className={subTabClassName}>
                        Objectives
                    </TabsTrigger>
                </TabsList>

                {/* Lot - forceMount preserves LEPDataCard fetch state across sub-tab switches */}
                <TabsContent
                    value="lot"
                    forceMount
                    className="flex-1 mt-0 min-h-0 overflow-hidden data-[state=inactive]:hidden"
                >
                    <ProjectDetailsPanel
                        projectId={projectId}
                        data={detailsData}
                        onUpdate={onDetailsUpdate}
                        onProjectNameChange={onProjectNameChange}
                    />
                </TabsContent>

                <TabsContent value="building" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <ProfilerMiddlePanel
                        projectId={projectId}
                        buildingClass={buildingClass}
                        projectType={projectType}
                        onClassChange={onClassChange}
                        onTypeChange={onTypeChange}
                        region={region}
                        onRegionChange={onRegionChange}
                        initialData={profileData}
                        onProfileComplete={onProfileComplete}
                        onProfileLoad={onProfileLoad}
                    />
                </TabsContent>

                <TabsContent value="objectives" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <ObjectivesWorkspace projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
