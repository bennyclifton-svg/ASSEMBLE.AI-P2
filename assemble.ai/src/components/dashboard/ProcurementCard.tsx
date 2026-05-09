'use client';

import { useState, useEffect, useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { ProcurementUIProvider } from '@/lib/contexts/procurement-ui-context';
import { ConsultantGallery } from '@/components/consultants/ConsultantGallery';
import { ContractorGallery } from '@/components/contractors/ContractorGallery';
import { CostPlanPanel } from '@/components/cost-plan/CostPlanPanel';
import { ProgramPanel } from '@/components/program/ProgramPanel';
import { BriefPanel } from '@/components/brief/BriefPanel';
import { StakeholderPanel } from '@/components/stakeholders/StakeholderPanel';
import { KnowledgePanel } from '@/components/knowledge/KnowledgePanel';
import { CorrespondencePanel } from '@/components/correspondence/CorrespondencePanel';
import { MeetingsReportsContainer } from '@/components/notes-meetings-reports/MeetingsReportsContainer';
import { NotesPanel } from '@/components/notes-meetings-reports/NotesPanel';
import { ProcurementCardShell } from '@/components/procurement';
import { AlertCircle } from 'lucide-react';
import type { BuildingClass, ProjectType, Region } from '@/types/profiler';
import type { StakeholderWithStatus } from '@/types/stakeholder';

interface ProcurementCardProps {
    projectId: string;
    projectName: string;
    selectedDocumentIds: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    buildingClass?: BuildingClass | null;
    projectType?: ProjectType | null;
    onClassChange?: (cls: BuildingClass) => void;
    onTypeChange?: (type: ProjectType) => void;
    region?: Region;
    onRegionChange?: (region: Region) => void;
    onProfileComplete?: () => void;
    onProfileLoad?: (buildingClass: BuildingClass, projectType: ProjectType) => void;
    activeMainTab?: string;
    onMainTabChange?: (tab: string) => void;
    activeSubTab?: string;
    onSubTabChange?: (sub: string) => void;
    detailsData?: unknown;
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
    complexity: Record<string, string | string[]>;
    workScope: string[];
}

// T065: Profile completion prompt component
function ProfilePrompt({ message, description }: { message: string; description: string }) {
    return (
        <div
            className="flex h-full flex-col items-center justify-center p-8"
            style={{ background: 'var(--sw-paper)' }}
        >
            <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-[var(--sw-rule)] bg-white">
                    <AlertCircle className="h-6 w-6 text-[var(--sw-rose-dk)]" />
                </div>
                <h3
                    className="mb-2 text-lg font-semibold text-[var(--sw-ink)]"
                    style={{ fontFamily: 'var(--sw-font-sans)' }}
                >
                    {message}
                </h3>
                <p className="mb-6 text-sm text-[var(--sw-muted)]">
                    {description}
                </p>
                <p
                    className="text-xs text-[var(--sw-muted)]"
                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                >
                    Go to the Planning Card and complete the Profile section to continue.
                </p>
            </div>
        </div>
    );
}

const muted = 'var(--sw-muted)';

const procurementSubTabClassName =
    'tab-aurora-sub h-10 shrink-0 rounded-none px-4 py-2 text-[var(--sw-muted)] text-xs font-medium whitespace-nowrap transition-all duration-200 hover:text-[var(--sw-ink)] hover:bg-white/10 data-[state=active]:bg-transparent data-[state=active]:text-[var(--sw-ink)]';

function slugifyProjectName(projectName: string): string {
    return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function ProcurementBreadcrumb({
    projectName,
    activeLabel,
}: {
    projectName: string;
    activeLabel: string;
}) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2"
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 12,
                color: muted,
            }}
        >
            <span>{slugifyProjectName(projectName)}</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>procurement</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>{activeLabel}</span>
        </nav>
    );
}

function ProcurementStatusPill({ label, tone }: { label: string; tone?: 'dark' }) {
    const isDark = tone === 'dark';
    return (
        <span
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 11,
                padding: '4px 10px',
                background: isDark ? 'var(--sw-ink)' : 'var(--sw-paper)',
                border: isDark ? '1px solid var(--sw-ink)' : '1px solid var(--sw-rule)',
                color: isDark ? 'var(--sw-paper)' : 'var(--sw-ink)',
                letterSpacing: '0.02em',
            }}
        >
            {label}
        </span>
    );
}

function ProcurementTabLabel({ children }: { children: React.ReactNode }) {
    return (
        <span
            className="block max-w-[180px] truncate"
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'lowercase',
            }}
        >
            {children}
        </span>
    );
}

export function ProcurementCard({
    projectId,
    projectName,
    selectedDocumentIds,
    onSetSelectedDocumentIds,
    buildingClass,
    projectType,
    onClassChange,
    onTypeChange,
    region = 'AU',
    onRegionChange,
    onProfileComplete,
    onProfileLoad,
    activeMainTab: externalActiveMainTab,
    onMainTabChange,
    activeSubTab,
    onSubTabChange,
    detailsData,
    onDetailsUpdate,
    onProjectNameChange,
}: ProcurementCardProps) {
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
    const [internalActiveMainTab, setInternalActiveMainTab] = useState<string>('brief');
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
                    // Store full profile data for editing
                    setProfileData({
                        subclass: json.data.subclass || [],
                        subclassOther: json.data.subclassOther || null,
                        scaleData: json.data.scaleData || {},
                        complexity: json.data.complexity || {},
                        workScope: json.data.workScope || [],
                    });
                    // Propagate buildingClass/projectType up to the page-level state
                    // so saved selections render immediately on visit (without
                    // requiring a Load Profile click).
                    if (json.data.buildingClass) {
                        onClassChange?.(json.data.buildingClass as BuildingClass);
                    }
                    if (json.data.projectType) {
                        onTypeChange?.(json.data.projectType as ProjectType);
                    }
                }
            }
        } catch (error) {
            console.error('[ProcurementCard] Failed to fetch profile status:', error);
        }
    }, [projectId, onClassChange, onTypeChange]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchProfileStatus();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchProfileStatus, projectId]);

    // Re-fetch profile data when navigating to the Building sub-tab of the Brief tab
    useEffect(() => {
        if (activeMainTab === 'brief' && activeSubTab === 'building') {
            const timeoutId = window.setTimeout(() => {
                void fetchProfileStatus();
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }
    }, [activeMainTab, activeSubTab, fetchProfileStatus]);

    // Check if profile is complete enough for Cost/Program tabs
    const isProfileComplete = profileStatus.hasProfile && profileStatus.buildingClass && profileStatus.projectType;

    // Handlers for note transmittals (Save/Load document attachments)
    const handleSaveNoteTransmittal = useCallback(async (noteId: string) => {
        if (!selectedDocumentIds) return;
        try {
            const endpoint = `/api/notes/${noteId}/transmittal`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds: selectedDocumentIds }),
            });
            if (response.ok) {
                globalMutate(endpoint);
            }
        } catch (err) {
            console.error('[ProcurementCard] Error saving note transmittal:', err);
        }
    }, [selectedDocumentIds]);

    const handleLoadNoteTransmittal = useCallback(async (noteId: string) => {
        try {
            const endpoint = `/api/notes/${noteId}/transmittal`;
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                const documentIds = data.documents?.map((doc: { documentId: string }) => doc.documentId) || [];
                onSetSelectedDocumentIds?.(documentIds);
            }
        } catch (err) {
            console.error('[ProcurementCard] Error loading note transmittal:', err);
        }
    }, [onSetSelectedDocumentIds]);

    const firstProcurementTab =
        consultantStakeholders[0]?.id
            ? `consultant-${consultantStakeholders[0].id}`
            : contractorStakeholders[0]?.id
                ? `contractor-${contractorStakeholders[0].id}`
                : '';
    const activeTabIsAvailable = Boolean(
        activeTab &&
        (
            consultantStakeholders.some((s) => `consultant-${s.id}` === activeTab) ||
            contractorStakeholders.some((s) => `contractor-${s.id}` === activeTab)
        )
    );
    const activeProcurementTab = activeTabIsAvailable ? activeTab! : firstProcurementTab;
    const activeConsultant = consultantStakeholders.find((s) => `consultant-${s.id}` === activeProcurementTab);
    const activeContractor = contractorStakeholders.find((s) => `contractor-${s.id}` === activeProcurementTab);
    const activeProcurementKind = activeConsultant ? 'consultant' : activeContractor ? 'contractor' : 'none';
    const activeProcurementName =
        activeConsultant?.disciplineOrTrade ||
        activeConsultant?.name ||
        activeContractor?.disciplineOrTrade ||
        activeContractor?.name ||
        'register';
    const procurementSubtitle = [
        `${consultantStakeholders.length} consultants`,
        `${contractorStakeholders.length} contractors`,
        activeProcurementKind !== 'none' ? `active · ${activeProcurementName}` : null,
    ].filter(Boolean).join(' · ');

    const handleProcurementTabsWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        const el = event.currentTarget;
        if (el.scrollWidth <= el.clientWidth) return;

        const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
            ? event.deltaY
            : event.deltaX;
        if (delta === 0) return;

        event.preventDefault();
        el.scrollLeft += delta;
    }, []);

    if (isLoadingStakeholders) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-[var(--sw-muted)]">Loading...</div>
            </div>
        );
    }

    return (
        <ProcurementUIProvider>
        <div className="h-full flex flex-col overflow-hidden">
            <Tabs
                value={activeMainTab}
                onValueChange={setActiveMainTab}
                className="flex-1 flex flex-col px-6 min-h-0"
            >
                {/* Brief Tab Content - sub-tabs: Lot | Building | Objectives.
                    forceMount preserves LEPDataCard fetch state when switching to other top tabs. */}
                <TabsContent value="brief" forceMount className="flex-1 mt-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
                    <BriefPanel
                        projectId={projectId}
                        projectName={projectName}
                        activeSubTab={activeSubTab ?? 'lot'}
                        onSubTabChange={onSubTabChange ?? (() => {})}
                        detailsData={detailsData}
                        onDetailsUpdate={onDetailsUpdate ?? (() => {})}
                        onProjectNameChange={onProjectNameChange}
                        buildingClass={buildingClass ?? null}
                        projectType={projectType ?? null}
                        region={region}
                        onClassChange={onClassChange}
                        onTypeChange={onTypeChange}
                        onRegionChange={onRegionChange}
                        profileData={profileData || undefined}
                        onProfileComplete={() => {
                            onProfileComplete?.();
                            fetchProfileStatusOnly(); // Only refresh status (for tab enabling), not data
                        }}
                        onProfileLoad={(loadedClass, loadedType) => {
                            onProfileLoad?.(loadedClass, loadedType);
                            fetchProfileStatus(); // Refresh profile status after load
                        }}
                    />
                </TabsContent>

                <TabsContent value="procurement" className="flex-1 mt-0 min-h-0 overflow-hidden section-procurement procurement-workspace">
                    <div className="h-full flex flex-col">
                        <header className="flex-shrink-0 px-2 pt-2">
                            <div className="flex items-center justify-between mb-2">
                                <ProcurementBreadcrumb
                                    projectName={projectName}
                                    activeLabel={activeProcurementName.toLowerCase()}
                                />
                                <div className="flex gap-1.5">
                                    <ProcurementStatusPill label={`consultants: ${consultantStakeholders.length}`} />
                                    <ProcurementStatusPill label={`contractors: ${contractorStakeholders.length}`} />
                                    <ProcurementStatusPill label={`active: ${activeProcurementName}`} tone="dark" />
                                </div>
                            </div>

                            <div className="flex items-end justify-between mb-2">
                                <div>
                                    <h1
                                        style={{
                                            fontFamily: 'var(--sw-font-sans)',
                                            fontSize: 30,
                                            fontWeight: 700,
                                            letterSpacing: '-0.025em',
                                            margin: 0,
                                            lineHeight: 1.1,
                                            color: 'var(--sw-ink)',
                                        }}
                                    >
                                        Procurement
                                    </h1>
                                    <div
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 12,
                                            color: muted,
                                            marginTop: 4,
                                            minHeight: 18,
                                        }}
                                    >
                                        {procurementSubtitle || 'consultants · contractors · tender workflow'}
                                    </div>
                                </div>
                            </div>
                        </header>

                        {consultantStakeholders.length === 0 && contractorStakeholders.length === 0 ? (
                            <div className="p-2">
                                <ProcurementCardShell label="stakeholders" meta="0 scheduled">
                                    <div className="flex h-48 flex-col items-center justify-center border border-dashed border-[var(--sw-rule)]">
                                        <p className="px-4 text-center text-sm text-[var(--sw-muted)]">
                                            No consultants or contractors scheduled.
                                            <br />
                                            Add consultants or contractors in the Stakeholders panel to create tabs here.
                                        </p>
                                    </div>
                                </ProcurementCardShell>
                            </div>
                        ) : (
                            <Tabs
                                value={activeProcurementTab}
                                onValueChange={(value) => setActiveTab(value)}
                                className="flex-1 flex flex-col min-h-0"
                            >
                                <TabsList
                                    onWheel={handleProcurementTabsWheel}
                                    className="firms-scrollbar w-full max-w-full justify-start bg-transparent border-b border-[var(--sw-rule)] rounded-none h-auto p-0 flex-nowrap overflow-x-auto overflow-y-hidden whitespace-nowrap"
                                >
                                    {/* Consultant tabs */}
                                    {consultantStakeholders.map(s => {
                                        const value = `consultant-${s.id}`;
                                        const label = s.disciplineOrTrade || s.name;
                                        return (
                                            <TabsTrigger
                                                key={value}
                                                value={value}
                                                className={procurementSubTabClassName}
                                                aria-label={`${label} consultant`}
                                                title={label}
                                            >
                                                <ProcurementTabLabel>{label}</ProcurementTabLabel>
                                            </TabsTrigger>
                                        );
                                    })}

                                    {/* Contractor tabs */}
                                    {contractorStakeholders.map(s => {
                                        const value = `contractor-${s.id}`;
                                        const label = s.disciplineOrTrade || s.name;
                                        return (
                                            <TabsTrigger
                                                key={value}
                                                value={value}
                                                className={procurementSubTabClassName}
                                                aria-label={`${label} contractor`}
                                                title={label}
                                            >
                                                <ProcurementTabLabel>{label}</ProcurementTabLabel>
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>

                                {/* Consultant TabsContent */}
                                {consultantStakeholders.map(s => (
                                    <TabsContent key={`consultant-${s.id}`} value={`consultant-${s.id}`} className="flex-1 mt-0 min-h-0 overflow-y-auto p-2">
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
                                    <TabsContent key={`contractor-${s.id}`} value={`contractor-${s.id}`} className="flex-1 mt-0 min-h-0 overflow-y-auto p-2">
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
                    </div>
                </TabsContent>

                <TabsContent value="cost-planning" className="flex-1 mt-0 min-h-0 overflow-hidden section-cost">
                    {!isProfileComplete ? (
                        <ProfilePrompt
                            message="Complete your project profile to unlock cost planning features"
                            description="The cost plan uses your building class, project type, and complexity score to provide accurate cost benchmarks and multipliers."
                        />
                    ) : (
                        <CostPlanPanel
                            projectId={projectId}
                            projectName={projectName}
                            buildingClass={buildingClass ?? null}
                            projectType={projectType ?? null}
                            profileData={profileData || undefined}
                        />
                    )}
                </TabsContent>

                <TabsContent value="program" className="flex-1 mt-0 min-h-0 overflow-hidden section-planning">
                    {!isProfileComplete ? (
                        <ProfilePrompt
                            message="Complete your project profile to unlock programme features"
                            description="The programme uses your building class and project type to suggest appropriate templates and durations."
                        />
                    ) : (
                        <ProgramPanel
                            projectId={projectId}
                            projectName={projectName}
                            buildingClass={buildingClass ?? null}
                            projectType={projectType ?? null}
                            profileData={profileData || undefined}
                        />
                    )}
                </TabsContent>

                <TabsContent value="stakeholders" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <StakeholderPanel
                        projectId={projectId}
                        projectName={projectName}
                        buildingClass={buildingClass ?? null}
                        projectType={projectType ?? null}
                        profileData={profileData || undefined}
                    />
                </TabsContent>

                <TabsContent value="knowledge" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <KnowledgePanel
                        projectId={projectId}
                        projectName={projectName}
                        buildingClass={buildingClass ?? null}
                        projectType={projectType ?? null}
                        profileData={profileData || undefined}
                    />
                </TabsContent>

                {/* Notes Tab Content */}
                <TabsContent value="notes" className="flex-1 mt-0 min-h-0 overflow-y-auto">
                    <NotesPanel
                        projectId={projectId}
                        projectName={projectName}
                        buildingClass={buildingClass ?? null}
                        projectType={projectType ?? null}
                        profileData={profileData || undefined}
                        onSaveTransmittal={handleSaveNoteTransmittal}
                        onLoadTransmittal={handleLoadNoteTransmittal}
                    />
                </TabsContent>

                <TabsContent value="correspondence" className="flex-1 mt-0 min-h-0 overflow-hidden section-procurement procurement-workspace">
                    <CorrespondencePanel projectId={projectId} projectName={projectName} />
                </TabsContent>

                {/* Meetings/Reports Tab Content - T096, T099 */}
                <TabsContent value="meetings-reports" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <MeetingsReportsContainer
                        projectId={projectId}
                        projectName={projectName}
                        buildingClass={buildingClass ?? null}
                        projectType={projectType ?? null}
                        profileData={profileData || undefined}
                        selectedDocumentIds={selectedDocumentIds}
                        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
                    />
                </TabsContent>
            </Tabs>

        </div>
        </ProcurementUIProvider>
    );
}
