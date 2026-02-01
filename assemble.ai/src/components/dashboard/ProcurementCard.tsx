'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { ProcurementUIProvider } from '@/lib/contexts/procurement-ui-context';
import { ConsultantGallery } from '@/components/consultants/ConsultantGallery';
import { ContractorGallery } from '@/components/contractors/ContractorGallery';
import { CostPlanPanel } from '@/components/cost-plan/CostPlanPanel';
import { ProgramPanel } from '@/components/program/ProgramPanel';
import { ProfilerMiddlePanel } from '@/components/profiler/ProfilerMiddlePanel';
import { ObjectivesProfilerSection } from '@/components/profiler/ObjectivesProfilerSection';
import { StakeholderPanel } from '@/components/stakeholders/StakeholderPanel';
import { NotesMeetingsReportsContainer } from '@/components/notes-meetings-reports/NotesMeetingsReportsContainer';
import { ProjectDetailsPanel } from '@/components/dashboard/planning/ProjectDetailsPanel';
import { AlertCircle } from 'lucide-react';
import type { BuildingClass, ProjectType, Region } from '@/types/profiler';
import type { StakeholderWithStatus } from '@/types/stakeholder';

interface ProcurementCardProps {
    projectId: string;
    selectedDocumentIds: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    buildingClass?: BuildingClass | null;
    projectType?: ProjectType | null;
    region?: Region;
    onRegionChange?: (region: Region) => void;
    onProfileComplete?: () => void;
    onProfileLoad?: (buildingClass: BuildingClass, projectType: ProjectType) => void;
    activeMainTab?: string;
    onMainTabChange?: (tab: string) => void;
    detailsData?: any;
    onDetailsUpdate?: () => void;
    onProjectNameChange?: () => void;
}


// Profile completion status interface
interface ProfileStatus {
    hasProfile: boolean;
    buildingClass: string | null;
    projectType: string | null;
    complexityScore: number | null;
}

// Full profile data for editing
interface ProfileData {
    subclass: string[];
    subclassOther: string[] | null;
    scaleData: Record<string, number>;
    complexity: Record<string, string>;
    workScope: string[];
}

// T065: Profile completion prompt component
function ProfilePrompt({ message, description }: { message: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="max-w-md text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--color-accent-copper-tint)] flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-[var(--color-accent-copper)]" />
                </div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                    {message}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] mb-6">
                    {description}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                    Go to the Planning Card and complete the Profile section to continue.
                </p>
            </div>
        </div>
    );
}

export function ProcurementCard({
    projectId,
    selectedDocumentIds,
    onSetSelectedDocumentIds,
    buildingClass,
    projectType,
    region = 'AU',
    onRegionChange,
    onProfileComplete,
    onProfileLoad,
    activeMainTab: externalActiveMainTab,
    onMainTabChange,
    detailsData,
    onDetailsUpdate,
    onProjectNameChange,
}: ProcurementCardProps) {
    // Debug logging
    console.log('[ProcurementCard] Rendering - projectId:', projectId, 'buildingClass:', buildingClass, 'projectType:', projectType);

    // Use unified stakeholders hook instead of separate consultant/contractor hooks
    const { stakeholders, isLoading: isLoadingStakeholders, updateStakeholder } = useStakeholders({ projectId });

    // Filter stakeholders by group - consultants and contractors for procurement
    const consultantStakeholders = stakeholders.filter(
        (s): s is StakeholderWithStatus & { stakeholderGroup: 'consultant' } =>
            s.stakeholderGroup === 'consultant' && s.isEnabled
    );
    const contractorStakeholders = stakeholders.filter(
        (s): s is StakeholderWithStatus & { stakeholderGroup: 'contractor' } =>
            s.stakeholderGroup === 'contractor' && s.isEnabled
    );

    // Update brief fields for consultant stakeholders
    const updateBrief = useCallback(async (
        stakeholderId: string,
        field: 'briefServices' | 'briefFee' | 'briefProgram',
        value: string
    ) => {
        await updateStakeholder(stakeholderId, { [field]: value });
    }, [updateStakeholder]);

    // Update scope fields for contractor stakeholders
    const updateScope = useCallback(async (
        stakeholderId: string,
        field: 'scopeWorks' | 'scopePrice' | 'scopeProgram',
        value: string
    ) => {
        await updateStakeholder(stakeholderId, { [field]: value });
    }, [updateStakeholder]);

    // Track active tabs - use external value if provided, otherwise manage internally
    const [internalActiveMainTab, setInternalActiveMainTab] = useState<string>('cost-planning');
    const activeMainTab = externalActiveMainTab ?? internalActiveMainTab;
    const setActiveMainTab = (tab: string) => {
        setInternalActiveMainTab(tab);
        onMainTabChange?.(tab);
    };
    const [activeTab, setActiveTab] = useState<string | null>(null); // "consultant-{id}" or "contractor-{id}"

    // T065: Profile completion status for tab enabling
    const [profileStatus, setProfileStatus] = useState<ProfileStatus>({
        hasProfile: false,
        buildingClass: null,
        projectType: null,
        complexityScore: null,
    });

    // Full profile data for editing
    const [profileData, setProfileData] = useState<ProfileData | null>(null);

    // Debug: Log when profileData changes
    useEffect(() => {
        console.log('[ProcurementCard] profileData state changed:', profileData);
    }, [profileData]);

    // Objectives data for ObjectivesProfilerSection
    const [objectivesData, setObjectivesData] = useState<any>(null);

    // Fetch profile status only (for tab enabling)
    const fetchProfileStatusOnly = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/profile`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    setProfileStatus({
                        hasProfile: true,
                        buildingClass: json.data.buildingClass,
                        projectType: json.data.projectType,
                        complexityScore: json.data.complexityScore,
                    });
                }
            }
        } catch (error) {
            console.error('[ProcurementCard] Failed to fetch profile status:', error);
        }
    }, [projectId]);

    // Fetch profile status and data (for initial load)
    const fetchProfileStatus = useCallback(async () => {
        console.log('[ProcurementCard] fetchProfileStatus called for project:', projectId);
        try {
            const res = await fetch(`/api/projects/${projectId}/profile`);
            console.log('[ProcurementCard] Profile fetch response status:', res.status);
            if (res.ok) {
                const json = await res.json();
                console.log('[ProcurementCard] Profile data received:', json);
                if (json.success && json.data) {
                    setProfileStatus({
                        hasProfile: true,
                        buildingClass: json.data.buildingClass,
                        projectType: json.data.projectType,
                        complexityScore: json.data.complexityScore,
                    });
                    // Store full profile data for editing
                    const newProfileData = {
                        subclass: json.data.subclass || [],
                        subclassOther: json.data.subclassOther || null,
                        scaleData: json.data.scaleData || {},
                        complexity: json.data.complexity || {},
                        workScope: json.data.workScope || [],
                    };
                    console.log('[ProcurementCard] Setting profileData:', newProfileData);
                    setProfileData(newProfileData);
                } else {
                    console.log('[ProcurementCard] No profile data found in response');
                }
            }
        } catch (error) {
            console.error('[ProcurementCard] Failed to fetch profile status:', error);
        }
    }, [projectId]);

    // Fetch objectives data
    const fetchObjectivesData = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/objectives`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    setObjectivesData(json.data);
                }
            }
        } catch (error) {
            console.error('[ProcurementCard] Failed to fetch objectives:', error);
        }
    }, [projectId]);

    useEffect(() => {
        console.log('[ProcurementCard] Mount effect running, projectId:', projectId);
        fetchProfileStatus();
        fetchObjectivesData();
    }, [fetchProfileStatus, fetchObjectivesData, projectId]);

    // Check if profile is complete enough for Cost/Program tabs
    const isProfileComplete = profileStatus.hasProfile && profileStatus.buildingClass && profileStatus.projectType;

    // Initialize active tab when data loads (first consultant, or first contractor if no consultants)
    useEffect(() => {
        if (!activeTab) {
            const firstItem = consultantStakeholders[0]?.id
                ? `consultant-${consultantStakeholders[0].id}`
                : contractorStakeholders[0]?.id
                    ? `contractor-${contractorStakeholders[0].id}`
                    : null;
            if (firstItem) {
                setActiveTab(firstItem);
            }
        }
    }, [consultantStakeholders, contractorStakeholders, activeTab]);

    if (isLoadingStakeholders) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-[var(--color-text-secondary)]">Loading...</div>
            </div>
        );
    }

    // Tab styling - uses CSS class for theme-aware styling (dark: gradient, light: solid)
    // Increased py-4 for taller parent tabs so blue indicator aligns with bottom
    const tabClassName = `
        relative rounded-none px-4 py-4 text-[15px] font-medium bg-transparent
        tab-aurora-main
        transition-all duration-200 ease-out
        hover:text-[var(--color-text-primary)]
        data-[state=inactive]:text-[var(--color-text-muted)]
    `;

    return (
        <ProcurementUIProvider>
        <div className="h-full flex flex-col overflow-hidden">
            <Tabs
                value={activeMainTab}
                onValueChange={setActiveMainTab}
                className="flex-1 flex flex-col px-6 min-h-0"
            >
                <TabsList className="w-full justify-start items-end bg-transparent border-b border-[var(--color-border)] rounded-none h-auto p-0 gap-1.5">
                    <TabsTrigger value="cost-planning" className={tabClassName}>
                        Cost Planning
                    </TabsTrigger>
                    <TabsTrigger value="program" className={tabClassName}>
                        Program
                    </TabsTrigger>
                    <TabsTrigger value="procurement" className={tabClassName}>
                        Procurement
                    </TabsTrigger>
                    <TabsTrigger value="notes-meetings-reports" className={`${tabClassName} text-center !px-2 !py-2`}>
                        <span className="flex flex-col leading-none gap-0.5">
                            <span>Notes Meetings</span>
                            <span>Reports</span>
                        </span>
                    </TabsTrigger>
                </TabsList>

                {/* Profiler Tab Content - 3 column layout for Subclass/Scale/Complexity */}
                <TabsContent value="profiler" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <ProfilerMiddlePanel
                        projectId={projectId}
                        buildingClass={buildingClass}
                        projectType={projectType}
                        region={region}
                        onRegionChange={onRegionChange}
                        initialData={profileData || undefined}
                        onProfileComplete={() => {
                            onProfileComplete?.();
                            fetchProfileStatusOnly(); // Only refresh status (for tab enabling), not data
                            // Stay on profiler tab - don't auto-switch
                        }}
                        onProfileLoad={(loadedClass, loadedType) => {
                            onProfileLoad?.(loadedClass, loadedType);
                            fetchProfileStatus(); // Refresh profile status after load
                        }}
                    />
                </TabsContent>

                {/* Objectives Tab Content - AI generation from profile */}
                <TabsContent value="objectives" className="flex-1 mt-0 min-h-0 overflow-y-auto">
                    <div className="py-4">
                        <ObjectivesProfilerSection
                            projectId={projectId}
                            profileData={{
                                ...profileData,
                                buildingClass: profileStatus.buildingClass,
                                projectType: profileStatus.projectType,
                            }}
                            objectivesData={objectivesData}
                            onUpdate={() => {
                                fetchObjectivesData();
                            }}
                        />
                    </div>
                </TabsContent>

                {/* Project Details Tab Content */}
                <TabsContent value="project-details" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <ProjectDetailsPanel
                        projectId={projectId}
                        data={detailsData}
                        onUpdate={onDetailsUpdate || (() => {})}
                        onProjectNameChange={onProjectNameChange}
                    />
                </TabsContent>

                <TabsContent value="procurement" className="flex-1 mt-0 min-h-0 flex flex-col section-procurement">
                    {consultantStakeholders.length === 0 && contractorStakeholders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[var(--color-border)] rounded-lg">
                            <p className="text-sm text-[var(--color-text-muted)] text-center px-4">
                                No consultants or contractors scheduled.
                                <br />
                                Add consultants or contractors in the Stakeholders panel to create tabs here.
                            </p>
                        </div>
                    ) : (
                        <Tabs
                            value={activeTab || (consultantStakeholders[0]?.id ? `consultant-${consultantStakeholders[0].id}` : contractorStakeholders[0]?.id ? `contractor-${contractorStakeholders[0].id}` : '')}
                            onValueChange={(value) => setActiveTab(value)}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <TabsList className="w-full justify-start bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] rounded-none h-auto p-0 px-2 flex-wrap">
                                {/* Consultant tabs */}
                                {consultantStakeholders.map(s => (
                                    <TabsTrigger
                                        key={`consultant-${s.id}`}
                                        value={`consultant-${s.id}`}
                                        className="tab-aurora-sub rounded-none px-4 py-2 text-[var(--color-text-muted)] text-xs font-medium transition-all duration-200 hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/50"
                                    >
                                        {s.disciplineOrTrade || s.name}
                                    </TabsTrigger>
                                ))}

                                {/* Contractor tabs */}
                                {contractorStakeholders.map(s => (
                                    <TabsTrigger
                                        key={`contractor-${s.id}`}
                                        value={`contractor-${s.id}`}
                                        className="tab-aurora-sub rounded-none px-4 py-2 text-[var(--color-text-muted)] text-xs font-medium transition-all duration-200 hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/50"
                                    >
                                        {s.disciplineOrTrade || s.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* Consultant TabsContent */}
                            {consultantStakeholders.map(s => (
                                <TabsContent key={`consultant-${s.id}`} value={`consultant-${s.id}`} className="flex-1 mt-4 min-h-0 overflow-y-auto">
                                    <ConsultantGallery
                                        projectId={projectId}
                                        discipline={s.disciplineOrTrade || s.name}
                                        disciplineId={s.id}
                                        briefServices={s.briefServices || ''}
                                        briefFee={s.briefFee || ''}
                                        briefProgram={s.briefProgram || ''}
                                        onUpdateBrief={updateBrief}
                                        selectedDocumentIds={selectedDocumentIds}
                                        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
                                    />
                                </TabsContent>
                            ))}

                            {/* Contractor TabsContent */}
                            {contractorStakeholders.map(s => (
                                <TabsContent key={`contractor-${s.id}`} value={`contractor-${s.id}`} className="flex-1 mt-4 min-h-0 overflow-y-auto">
                                    <ContractorGallery
                                        projectId={projectId}
                                        trade={s.disciplineOrTrade || s.name}
                                        tradeId={s.id}
                                        scopeWorks={s.scopeWorks || ''}
                                        scopePrice={s.scopePrice || ''}
                                        scopeProgram={s.scopeProgram || ''}
                                        onUpdateScope={updateScope}
                                        selectedDocumentIds={selectedDocumentIds}
                                        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
                                    />
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </TabsContent>

                <TabsContent value="cost-planning" className="flex-1 mt-0 min-h-0 overflow-hidden section-cost">
                    {!isProfileComplete ? (
                        <ProfilePrompt
                            message="Complete your project profile to unlock cost planning features"
                            description="The cost plan uses your building class, project type, and complexity score to provide accurate cost benchmarks and multipliers."
                        />
                    ) : (
                        <CostPlanPanel projectId={projectId} />
                    )}
                </TabsContent>

                <TabsContent value="program" className="flex-1 mt-0 min-h-0 overflow-hidden section-planning">
                    {!isProfileComplete ? (
                        <ProfilePrompt
                            message="Complete your project profile to unlock program features"
                            description="The program uses your building class and project type to suggest appropriate programme templates and durations."
                        />
                    ) : (
                        <ProgramPanel projectId={projectId} />
                    )}
                </TabsContent>

                <TabsContent value="stakeholders" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <StakeholderPanel projectId={projectId} />
                </TabsContent>

                {/* Notes/Meetings/Reports Tab Content - T096, T099 */}
                <TabsContent value="notes-meetings-reports" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <NotesMeetingsReportsContainer
                        projectId={projectId}
                        selectedDocumentIds={selectedDocumentIds}
                        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
                    />
                </TabsContent>
            </Tabs>
        </div>
        </ProcurementUIProvider>
    );
}
