'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProfilerMiddlePanel, type ProfilerControls } from '@/components/profiler/ProfilerMiddlePanel';
import { ProjectDetailsPanel } from '@/components/dashboard/planning/ProjectDetailsPanel';
import { BriefPreviewPane, SourcesShell, type BriefPreviewProfile, type SourcesData } from './BriefPreviewPane';
import { BriefingPanel } from './BriefingPanel';
import { BriefAttachmentsSection } from './BriefAttachmentsSection';
import { CardShell } from './primitives';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { useToast } from '@/components/ui/use-toast';
import type { BuildingClass, ProjectType, Region } from '@/types/profiler';

const GENERATE_STATUS_MESSAGES = [
    'Reading project profile…',
    'Analysing attachments…',
    'Inferring objectives…',
    'Polishing brief…',
];

interface GenerateBriefErrorBody {
    error?: {
        code?: unknown;
        message?: unknown;
    };
    message?: unknown;
}

const EXPECTED_GENERATE_ERROR_CODES = new Set([
    'ATTACHED_DOCUMENT_CONTEXT_UNAVAILABLE',
    'ATTACHED_DOCUMENT_TOO_LARGE',
    'MODEL_CONTEXT_LIMIT',
    'AI_RATE_LIMIT',
]);

function generateBriefErrorTitle(code: string | null): string {
    switch (code) {
        case 'ATTACHED_DOCUMENT_CONTEXT_UNAVAILABLE':
            return 'Attached document is still processing';
        case 'ATTACHED_DOCUMENT_TOO_LARGE':
            return 'Attached document is too large';
        case 'MODEL_CONTEXT_LIMIT':
            return 'Model context limit reached';
        case 'AI_RATE_LIMIT':
            return 'AI model limit reached';
        default:
            return 'Failed to regenerate brief';
    }
}

interface BriefPanelProps {
    projectId: string;
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
    selectedDocumentIds?: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
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

// ---------------------------------------------------------------------------
// Chrome helpers — co-located so the file ports the wireframe's ChromeStrip,
// TitleBlock and SubTab meta surface in one read.
// ---------------------------------------------------------------------------

const muted = 'var(--sw-muted)';

function Breadcrumb({ projectName }: { projectName: string }) {
    // Crumb shape: `<project> / brief`. The leading workspace crumb (legacy
    // "foundry") was dropped with the rebrand; the trailing sub-tab segment
    // was dropped when the Lot / Building sub-tabs were merged into a single
    // page. Project crumb is muted; the trailing "brief" is inked.
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
            <span>{slug}</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>brief</span>
        </nav>
    );
}


export function BriefPanel({
    projectId,
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
    selectedDocumentIds = [],
    onSetSelectedDocumentIds,
    projectName,
}: BriefPanelProps) {
    const { toast } = useToast();
    // ---- Chrome state ------------------------------------------------------
    // `briefRefreshKey` is bumped after a user-triggered Regenerate brief POST
    // and threaded into `BriefPreviewPane.refreshKey` — that re-runs the
    // pane's GET-then-POST effect so the inferred objectives reflect the new
    // batch without remounting (which would reset the timestamp / lose state).
    const [briefRefreshKey, setBriefRefreshKey] = useState(0);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isBriefingOpen, setIsBriefingOpen] = useState(false);
    const [briefingAutoStartKey, setBriefingAutoStartKey] = useState(0);
    const [briefingRestartKey, setBriefingRestartKey] = useState(0);
    const [briefingRefreshKey, setBriefingRefreshKey] = useState(0);
    const [sourcesData, setSourcesData] = useState<SourcesData>({
        attachedDocumentCount: 0,
        profileFieldsCount: 0,
        generationTrace: null,
    });

    // Cycle through status messages while the brief is generating so the user
    // sees what the background pipeline is doing. Resets to step 0 each time a
    // new generate run starts; idle while !isRegenerating.
    const [generateStatusIndex, setGenerateStatusIndex] = useState(0);
    useEffect(() => {
        if (!isRegenerating) return;
        setGenerateStatusIndex(0);
        const handle = window.setInterval(() => {
            setGenerateStatusIndex((n) => (n + 1) % GENERATE_STATUS_MESSAGES.length);
        }, 1500);
        return () => window.clearInterval(handle);
    }, [isRegenerating]);

    // Profiler imperative controls — populated by ProfilerMiddlePanel each
    // render. `null` until the Building sub-tab has mounted at least once.
    const profilerControlsRef = useRef<ProfilerControls | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    const handleSaveProfile = async () => {
        const controls = profilerControlsRef.current;
        if (!controls || isSavingProfile) return;
        setIsSavingProfile(true);
        try {
            await controls.save();
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleLoadProfile = async () => {
        const controls = profilerControlsRef.current;
        if (!controls || isLoadingProfile) return;
        setIsLoadingProfile(true);
        try {
            await controls.load();
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const handleRegenerateBrief = async () => {
        if (isRegenerating) return;
        setIsRegenerating(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/objectives/generate`, {
                method: 'POST',
            });
            if (!res.ok) {
                // Surface the server's structured error envelope so 500s don't
                // collapse to a bare status code. The route returns
                // { success: false, error: { code, message } } on failure.
                let serverMessage = `Server returned ${res.status}.`;
                let serverCode: string | null = null;
                let loggedBody: unknown = null;
                try {
                    const rawBody = await res.text();
                    loggedBody = rawBody;
                    const body = rawBody ? JSON.parse(rawBody) as GenerateBriefErrorBody : null;
                    loggedBody = body ?? rawBody;
                    serverCode = typeof body?.error?.code === 'string' ? body.error.code : null;
                    const msg = body?.error?.message ?? body?.message;
                    if (typeof msg === 'string' && msg.trim()) {
                        serverMessage = `${res.status}: ${msg}`;
                    } else if (!rawBody || rawBody === '{}') {
                        serverMessage = `${res.status}: The server returned an empty error response. Check the server console for the underlying failure.`;
                    }
                } catch {
                    serverMessage = `${res.status}: The server returned an unreadable error response. Check the server console for the underlying failure.`;
                }
                const log = serverCode && EXPECTED_GENERATE_ERROR_CODES.has(serverCode)
                    ? console.warn
                    : console.error;
                log('Regenerate brief failed:', res.status, loggedBody);
                toast({
                    title: generateBriefErrorTitle(serverCode),
                    description: serverMessage,
                    variant: serverCode === 'ATTACHED_DOCUMENT_CONTEXT_UNAVAILABLE' ? 'default' : 'destructive',
                });
                return;
            }
            // Force the preview pane to re-fetch via GET (which now returns the fresh batch).
            setBriefRefreshKey((n) => n + 1);
        } catch (err) {
            console.error('Regenerate brief threw:', err);
            toast({
                title: 'Failed to regenerate brief',
                description: err instanceof Error ? err.message : 'Network error.',
                variant: 'destructive',
            });
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleOpenBriefing = useCallback(() => {
        setIsBriefingOpen(true);
        setBriefingAutoStartKey((n) => n + 1);
    }, []);

    const handleRestartBriefing = useCallback(() => {
        setIsBriefingOpen(true);
        setBriefingRestartKey((n) => n + 1);
    }, []);

    const handleBriefingChanged = useCallback(() => {
        setBriefingRefreshKey((n) => n + 1);
    }, []);

    return (
        <div className="h-full flex flex-col">
            {/* ---- Chrome strip: breadcrumb + status pills + title + actions ---- */}
            <header className="flex-shrink-0 px-2 pt-2">
                <div className="flex items-center justify-between mb-2">
                    <Breadcrumb projectName={projectName} />
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
                            Brief
                        </h1>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col min-h-0">
                {/* Button bar mirrors the content grid below (same gridTemplateColumns
                    + gap) so Load/Save end-align with the right edge of the Class shell
                    in the middle column, and Generate brief end-aligns with the right
                    column (Brief preview). */}
                <div
                    className="grid items-center border-b border-[var(--color-border)]/50 px-2 gap-4"
                    style={{
                        gridTemplateColumns: isBriefingOpen
                            ? 'minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 0.9fr)'
                            : 'minmax(0, 1.4fr) minmax(0, 1fr)',
                        // Match the scrollbar gutter reserved by the content grid below
                        // (`scrollbar-gutter: stable`) so this bar's columns end-align
                        // with the shell columns underneath.
                        paddingRight: 'calc(0.5rem + 15px)',
                        minHeight: 40,
                    }}
                >
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleLoadProfile}
                            disabled={isLoadingProfile}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--sw-rule)',
                                padding: '4px 12px',
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: 'var(--sw-ink)',
                                cursor: isLoadingProfile ? 'wait' : 'pointer',
                                opacity: isLoadingProfile ? 0.6 : 1,
                                height: 32,
                            }}
                        >
                            {isLoadingProfile ? 'Loading…' : 'Load profile'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={isSavingProfile}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--sw-rule)',
                                padding: '4px 12px',
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: 'var(--sw-ink)',
                                cursor: isSavingProfile ? 'wait' : 'pointer',
                                opacity: isSavingProfile ? 0.6 : 1,
                                height: 32,
                            }}
                        >
                            {isSavingProfile ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                    {isBriefingOpen && <div />}
                    <div className="flex items-center justify-end gap-3">
                        {isRegenerating && (
                            <span
                                key={generateStatusIndex}
                                aria-live="polite"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 11,
                                    letterSpacing: '0.05em',
                                    color: muted,
                                    animation: 'fadeIn 400ms ease-out',
                                }}
                            >
                                {GENERATE_STATUS_MESSAGES[generateStatusIndex]}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleRegenerateBrief}
                            disabled={isRegenerating}
                            style={{
                                background: 'var(--sw-cta)',
                                color: 'var(--sw-cta-fg)',
                                border: 'none',
                                padding: '4px 12px',
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                cursor: isRegenerating ? 'wait' : 'pointer',
                                opacity: isRegenerating ? 0.6 : 1,
                                height: 32,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <DiamondIcon
                                className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`}
                            />
                            {isRegenerating ? 'Generating…' : 'Generate brief'}
                        </button>
                    </div>
                </div>

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
                    className="flex-1 mt-0 min-h-0 grid gap-4 p-2 overflow-y-auto overflow-x-hidden"
                    style={{
                        gridTemplateColumns: isBriefingOpen
                            ? 'minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 0.9fr)'
                            : 'minmax(0, 1.4fr) minmax(0, 1fr)',
                        scrollbarGutter: 'stable',
                    }}
                >
                    <div className="min-h-0 min-w-0 flex flex-col gap-4">
                        {/* Lot shell — sits above Class · Type. Renders the
                            former Lot-tab fields (project name, address,
                            lot/legal address, jurisdiction, LEP data) as a
                            single flat field list inside this shell. */}
                        <CardShell label="Lot">
                            <ProjectDetailsPanel
                                projectId={projectId}
                                data={detailsData}
                                onUpdate={onDetailsUpdate}
                                onProjectNameChange={onProjectNameChange}
                            />
                        </CardShell>

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
                            controlsRef={profilerControlsRef}
                        />
                    </div>
                    {isBriefingOpen && (
                        <BriefingPanel
                            projectId={projectId}
                            autoStartKey={briefingAutoStartKey}
                            restartKey={briefingRestartKey}
                            onClose={() => setIsBriefingOpen(false)}
                            onSessionChange={handleBriefingChanged}
                            onObjectivesUpdated={() => {
                                setBriefRefreshKey((n) => n + 1);
                                handleBriefingChanged();
                            }}
                        />
                    )}
                    <aside className="self-start sticky top-0 min-w-0">
                        {/* Unified brief shell — outer border wraps the dark
                            "Brief" header strip + the content body. The left
                            accent rail is applied only to the content body so
                            it terminates at the bottom of the header rather
                            than running through it. */}
                        <div
                            className="min-w-0"
                            style={{
                                background: 'var(--sw-shell)',
                                border: '1px solid var(--sw-rule)',
                            }}
                        >
                            <div
                                className="flex items-center gap-3 px-3 py-2"
                                role="status"
                                style={{ background: 'var(--sw-ink)', color: 'var(--sw-paper)' }}
                            >
                                <span
                                    aria-hidden="true"
                                    className="inline-block"
                                    style={{
                                        width: 8,
                                        height: 8,
                                        background: 'var(--sw-rose)',
                                        borderRadius: 999,
                                    }}
                                />
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 10,
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        fontWeight: 600,
                                    }}
                                >
                                    Brief
                                </span>
                            </div>
                            <div style={{ borderLeft: '3px solid var(--sw-cta)' }}>
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
                                    briefingRefreshKey={briefingRefreshKey}
                                    onOpenBriefing={handleOpenBriefing}
                                    onRestartBriefing={handleRestartBriefing}
                                    onSourcesUpdate={setSourcesData}
                                />
                                <div style={{ borderTop: '1px solid var(--sw-rule-2)' }}>
                                    <BriefAttachmentsSection
                                        projectId={projectId}
                                        selectedDocumentIds={selectedDocumentIds}
                                        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
                                        onAttachmentsChanged={handleBriefingChanged}
                                    />
                                </div>
                                <div style={{ borderTop: '1px solid var(--sw-rule-2)' }}>
                                    <SourcesShell
                                        attachedDocumentCount={sourcesData.attachedDocumentCount}
                                        profileFieldsCount={sourcesData.profileFieldsCount}
                                        generationTrace={sourcesData.generationTrace}
                                    />
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
