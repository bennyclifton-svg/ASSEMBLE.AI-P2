'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfilerMiddlePanel } from '@/components/profiler/ProfilerMiddlePanel';
import { ObjectivesWorkspace } from '@/components/profiler/objectives/ObjectivesWorkspace';
import { ProjectDetailsPanel } from '@/components/dashboard/planning/ProjectDetailsPanel';
import { BriefPreviewPane, type BriefPreviewProfile } from './BriefPreviewPane';
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
    // Project display name for the BriefPreviewPane narrative. Required —
    // every caller (currently only ProcurementCard via ProjectWorkspace) has
    // a non-null project name available before render (the workspace
    // null-guards `project` before mounting ProcurementCard).
    projectName: string;
}

/**
 * Build a `BriefPreviewProfile` for `BriefPreviewPane` from the partial
 * profile data threaded through `BriefPanel`. `BriefPanelProps.profileData`
 * does not include `buildingClass` / `projectType` / `region` (those live as
 * separate props on the panel), so we recombine them here.
 *
 * `buildingClass` and `projectType` are passed through verbatim — including
 * `null`. `BriefPreviewPane.buildNarrative` renders `[—]` placeholders for
 * `null` values rather than fabricating identity (e.g. defaulting to
 * "residential" / "new" before the user has selected anything would mislead).
 */
function buildProfileForPreview(args: {
    profileData?: BriefPanelProps['profileData'];
    buildingClass: BuildingClass | null;
    projectType: ProjectType | null;
    region?: Region;
}): BriefPreviewProfile {
    return {
        buildingClass: args.buildingClass,
        projectType: args.projectType,
        subclass: args.profileData?.subclass ?? [],
        subclassOther: args.profileData?.subclassOther ?? [],
        scaleData: args.profileData?.scaleData ?? {},
        complexity: args.profileData?.complexity ?? {},
        workScope: args.profileData?.workScope ?? [],
        region: args.region,
    };
}

const subTabClassName =
    'tab-aurora-sub rounded-none px-4 py-2 text-[var(--color-text-muted)] text-xs font-medium transition-all duration-200 hover:text-[var(--color-text-primary)] hover:bg-white/10 data-[state=active]:bg-transparent data-[state=active]:text-[var(--color-text-primary)]';

// ---------------------------------------------------------------------------
// Chrome helpers — co-located so the file ports the wireframe's ChromeStrip,
// TitleBlock and SubTab meta surface in one read.
// ---------------------------------------------------------------------------

const muted = 'var(--sw-muted)';

function Breadcrumb({
    projectName,
    activeSubTab,
}: {
    projectName: string;
    activeSubTab: string;
}) {
    // Match the wireframe's `foundry / mosaic-apts / brief / building` shape.
    // The first two crumbs (workspace + project) are muted; the last two
    // (top-tab "brief" + active sub-tab) are inked.
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
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
            <span>foundry</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span>{slug}</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>brief</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>{activeSubTab}</span>
        </nav>
    );
}

function StatusPill({ label, tone }: { label: string; tone?: 'rose' }) {
    return (
        <span
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 11,
                padding: '4px 10px',
                background: 'white',
                border: tone === 'rose' ? '1px solid var(--sw-rose)' : '1px solid var(--sw-rule)',
                color: tone === 'rose' ? 'var(--sw-rose-dk)' : 'var(--sw-ink)',
                letterSpacing: '0.02em',
            }}
        >
            {label}
        </span>
    );
}

/**
 * Rough profile completion percentage out of 8 weighted fields. Returns an
 * integer 0–100. Used to feed the `profile: NN% complete` chrome pill until a
 * dedicated profile completion endpoint exists.
 *
 * TODO: prefer `profileStatus.profileCompletionPct` from the profile API
 * envelope when that field is added.
 */
function deriveProfileCompletion(args: {
    buildingClass: BuildingClass | null;
    projectType: ProjectType | null;
    profile?: BriefPanelProps['profileData'];
}): number {
    const { buildingClass, projectType, profile } = args;
    let filled = 0;
    if (buildingClass) filled++;
    if (projectType) filled++;
    if ((profile?.subclass?.length ?? 0) > 0) filled++;
    if (profile?.scaleData?.gfa_sqm != null) filled++;
    if (profile?.scaleData?.storeys != null) filled++;
    if (profile?.scaleData?.units != null) filled++;
    if (profile?.complexity && Object.keys(profile.complexity).length >= 5) filled++;
    if ((profile?.workScope?.length ?? 0) > 0) filled++;
    return Math.round((filled / 8) * 100);
}

/**
 * Build the mono subtitle under the H1: e.g.
 *   "residential · apartments · class 2 · 9 storeys · 87 units · regenerated 14:18:42"
 * Skips parts when data is missing rather than rendering placeholders, since
 * the chrome already shows a profile completion percentage above.
 */
function deriveSubtitle(args: {
    buildingClass: BuildingClass | null;
    projectType: ProjectType | null;
    profile?: BriefPanelProps['profileData'];
    regeneratedAt: string | null;
}): string {
    const { buildingClass, projectType, profile, regeneratedAt } = args;
    const parts: string[] = [];
    if (buildingClass) parts.push(String(buildingClass));
    if (projectType) parts.push(String(projectType));
    const subclass = profile?.subclass?.[0];
    if (subclass) parts.push(subclass.replace(/_/g, ' '));
    const storeys = profile?.scaleData?.storeys;
    if (storeys != null) parts.push(`${storeys} storeys`);
    const units = profile?.scaleData?.units;
    if (units != null) parts.push(`${units} units`);
    if (regeneratedAt) parts.push(`regenerated ${regeneratedAt}`);
    // TODO: append "N fields incomplete" once a clean source is wired.
    return parts.join(' · ');
}

/** Sub-tab meta line: "{subclass} · {storeys} storeys · {units} units" */
function deriveBuildingMeta(profile?: BriefPanelProps['profileData']): string {
    const parts: string[] = [];
    const subclass = profile?.subclass?.[0];
    if (subclass) parts.push(subclass.replace(/_/g, ' '));
    const storeys = profile?.scaleData?.storeys;
    if (storeys != null) parts.push(`${storeys} storeys`);
    const units = profile?.scaleData?.units;
    if (units != null) parts.push(`${units} units`);
    return parts.length > 0 ? parts.join(' · ') : 'class · storeys · units';
}

/** Sub-tab meta line for Lot: prefer the address from `detailsData`. */
function deriveLotMeta(detailsData: unknown): string {
    const d = detailsData as { address?: string; formattedAddress?: string } | null | undefined;
    return d?.formattedAddress || d?.address || '—';
}

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
    projectName,
}: BriefPanelProps) {
    // ---- Chrome state ------------------------------------------------------
    // `briefRefreshKey` is bumped after a user-triggered Regenerate brief POST
    // and threaded into `BriefPreviewPane.refreshKey` — that re-runs the
    // pane's GET-then-POST effect so the inferred objectives reflect the new
    // batch without remounting (which would reset the timestamp / lose state).
    const [briefRefreshKey, setBriefRefreshKey] = useState(0);
    const [regeneratedAt, setRegeneratedAt] = useState<string | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleRegenerateBrief = async () => {
        if (isRegenerating) return;
        setIsRegenerating(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/objectives/generate`, {
                method: 'POST',
            });
            if (!res.ok) {
                console.error(`Regenerate brief failed: ${res.status}`);
                return;
            }
            // Stamp the regenerate timestamp into the subtitle and force the
            // preview pane to re-fetch via GET (which now returns the fresh batch).
            setRegeneratedAt(new Date().toLocaleTimeString('en-AU', { hour12: false }));
            setBriefRefreshKey((n) => n + 1);
        } catch (err) {
            console.error('Regenerate brief threw:', err);
        } finally {
            setIsRegenerating(false);
        }
    };

    const profileCompletionPct = useMemo(
        () => deriveProfileCompletion({ buildingClass, projectType, profile: profileData }),
        [buildingClass, projectType, profileData]
    );
    const profileCompletionLabel = `profile: ${profileCompletionPct}% complete`;
    // TODO: derive from project.stage once the schema exposes it.
    const stageLabel = 'detail design';

    const subtitle = useMemo(
        () =>
            deriveSubtitle({
                buildingClass,
                projectType,
                profile: profileData,
                regeneratedAt,
            }),
        [buildingClass, projectType, profileData, regeneratedAt]
    );

    const lotMeta = deriveLotMeta(detailsData);
    const buildingMeta = deriveBuildingMeta(profileData);
    // TODO: wire to live counts via a `BriefPreviewPane.onObjectivesCount`
    // callback once Objectives sub-tab redesign lands. Hardcoded for now so
    // the chrome reads as designed.
    const objectivesMeta = '6 generated · 4 reviewed';

    return (
        <div className="h-full flex flex-col">
            {/* ---- Chrome strip: breadcrumb + status pills + title + actions ---- */}
            <header className="flex-shrink-0 px-5 pt-5">
                <div className="flex items-center justify-between mb-5">
                    <Breadcrumb projectName={projectName} activeSubTab={activeSubTab} />
                    <div className="flex gap-1.5">
                        <StatusPill label={profileCompletionLabel} />
                        <StatusPill label={`stage: ${stageLabel}`} tone="rose" />
                    </div>
                </div>

                <div className="flex items-end justify-between mb-5">
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
                            Brief
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
                            {subtitle}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => console.log('Export PDF clicked')}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--sw-rule)',
                                padding: '8px 14px',
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: 'var(--sw-ink)',
                                cursor: 'pointer',
                            }}
                        >
                            Export PDF
                        </button>
                        <button
                            type="button"
                            onClick={handleRegenerateBrief}
                            disabled={isRegenerating}
                            style={{
                                background: 'var(--sw-rose)',
                                color: 'var(--sw-ink)',
                                border: 'none',
                                padding: '8px 14px',
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                cursor: isRegenerating ? 'wait' : 'pointer',
                                opacity: isRegenerating ? 0.6 : 1,
                            }}
                        >
                            {isRegenerating ? 'Regenerating…' : 'Regenerate brief →'}
                        </button>
                    </div>
                </div>
            </header>

            <Tabs
                value={activeSubTab}
                onValueChange={onSubTabChange}
                className="flex-1 flex flex-col min-h-0"
            >
                <TabsList className="w-full justify-start bg-transparent border-b border-[var(--color-border)]/50 rounded-none h-auto p-0 pl-[20%]">
                    <TabsTrigger value="lot" className={subTabClassName}>
                        <SubTabContent
                            label="LOT"
                            meta={lotMeta}
                            active={activeSubTab === 'lot'}
                        />
                    </TabsTrigger>
                    <TabsTrigger value="building" className={subTabClassName}>
                        <SubTabContent
                            label="BUILDING"
                            meta={buildingMeta}
                            active={activeSubTab === 'building'}
                        />
                    </TabsTrigger>
                    <TabsTrigger value="objectives" className={subTabClassName}>
                        <SubTabContent
                            label="OBJECTIVES"
                            meta={objectivesMeta}
                            active={activeSubTab === 'objectives'}
                        />
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

                {/* Building - forceMount preserves BriefPreviewPane's GET-then-POST
                    objectives fetch state across sub-tab switches, so revisiting
                    Building does not re-run the fetch. */}
                <TabsContent
                    value="building"
                    forceMount
                    className="flex-1 mt-0 min-h-0 overflow-hidden data-[state=inactive]:hidden"
                >
                    {/*
                      Sticky preview pane requires the OUTER wrapper to own the
                      page-level scroll context. We pass `layout="natural"` to
                      ProfilerMiddlePanel so it renders at its content height
                      (no internal `h-full overflow-y-auto`) — otherwise this
                      wrapper never overflows and `sticky top-5` is a no-op.
                      The `min-h-0` wrapper around ProfilerMiddlePanel is a
                      flex/grid escape hatch in case any descendant still
                      claims `h-full`.
                    */}
                    <div
                        className="grid gap-5 p-5 h-full overflow-y-auto"
                        style={{ gridTemplateColumns: '1.4fr 1fr' }}
                    >
                        <div className="min-h-0">
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
                                layout="natural"
                            />
                        </div>
                        <aside className="self-start sticky top-5">
                            <BriefPreviewPane
                                projectId={projectId}
                                projectName={projectName}
                                profile={buildProfileForPreview({
                                    profileData,
                                    buildingClass,
                                    projectType,
                                    region,
                                })}
                                refreshKey={briefRefreshKey}
                            />
                        </aside>
                    </div>
                </TabsContent>

                <TabsContent value="objectives" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <ObjectivesWorkspace projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

/**
 * Sub-tab trigger content: small uppercase label on top, mono meta line
 * beneath. The active sub-tab inks the meta line; inactive tabs render it
 * muted. Mirrors the wireframe's `SubTabs` function.
 */
function SubTabContent({
    label,
    meta,
    active,
}: {
    label: string;
    meta: string;
    active: boolean;
}) {
    return (
        <div className="flex flex-col items-start py-1">
            <span
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: muted,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 11,
                    color: active ? 'var(--sw-ink)' : muted,
                    fontWeight: active ? 600 : 400,
                    marginTop: 2,
                }}
            >
                {meta}
            </span>
        </div>
    );
}
