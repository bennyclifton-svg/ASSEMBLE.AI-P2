'use client';

/**
 * BriefPreviewPane — right column of the Brief Building sub-tab.
 *
 * Renders four stacked sub-pieces (mirroring the wireframe at
 * `src/app/dev/brief-wireframe/page.tsx`):
 *   1. Status strip   — dark bar with regen timestamp / model / token count
 *   2. Narrative card — paragraph derived client-side from the project profile
 *   3. Inferred Objectives card — fetched from
 *      `/api/projects/[projectId]/objectives/generate` (POST, AI-backed)
 *   4. Sources footer — counts of sources contributing to the brief
 *
 * Standalone for now (Task 2). Wiring into BriefPanel happens in Task 5.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, RotateCw } from 'lucide-react';
import type { ProfileInput } from '@/types/profiler';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import type { ObjectiveRow } from '@/components/profiler/objectives/ObjectivesWorkspace';

const muted = 'var(--sw-muted)';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Loose shape used by the preview. `buildingClass` / `projectType` may be
 * `null` when the user has not yet selected them — `buildNarrative` renders
 * `[—]` placeholders in that case rather than fabricating defaults like
 * "residential" / "new". All other fields fall back to safe empties.
 */
export type BriefPreviewProfile = {
    buildingClass: ProfileInput['buildingClass'] | null;
    projectType: ProfileInput['projectType'] | null;
    subclass: ProfileInput['subclass'];
    subclassOther?: ProfileInput['subclassOther'];
    scaleData: ProfileInput['scaleData'];
    complexity: ProfileInput['complexity'];
    workScope?: ProfileInput['workScope'];
    region?: ProfileInput['region'];
};

interface BriefPreviewPaneProps {
    projectId: string;
    projectName: string;
    profile: BriefPreviewProfile;
    /**
     * Bumping this number forces the objectives effect to re-run, re-fetching
     * (or re-generating, when the project still has zero rows) the inferred
     * objectives. The Brief panel bumps it after a user-triggered
     * "Regenerate brief" POST so the right-pane reflects the fresh batch
     * without remounting the whole component tree (which would also reset
     * the narrative card's internal `generatedAt` timestamp).
     */
    refreshKey?: number;
}

type GroupedObjectives = Record<ObjectiveType, ObjectiveRow[]>;

type ViewMode = 'short' | 'long';

const SECTION_ORDER: ObjectiveType[] = ['planning', 'functional', 'quality', 'compliance'];

type ObjectivesStatus = 'loading' | 'ready' | 'error';

// API response shape used by both:
//   - GET  /api/projects/[projectId]/objectives          (existing rows)
//   - POST /api/projects/[projectId]/objectives/generate (fresh AI batch)
// Both wrap `data` keyed by objectiveType ('planning' | 'functional' |
// 'quality' | 'compliance') with arrays of projectObjectives rows. The GET
// envelope additionally carries `snapshots`, `projectType`,
// `hasAttachedDocuments`, and `attachedDocumentCount` — only the count is
// surfaced (in the Sources footer); the rest are tolerated but ignored.
interface ObjectivesResponse {
    success?: boolean;
    data?: Partial<Record<ObjectiveType, ObjectiveRow[]>>;
    attachedDocumentCount?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the narrative paragraph from a profile. Returns React nodes with
 * inline highlight spans. Missing fields render as `[—]` placeholders so the
 * narrative degrades gracefully.
 */
function buildNarrative(profile: BriefPreviewProfile, projectName: string): React.ReactNode {
    const storeys = profile?.scaleData?.storeys;
    const units = profile?.scaleData?.units;
    const subclassRaw = profile?.subclass?.[0];
    const subclassLabel = subclassRaw ? subclassRaw.replace(/_/g, ' ') : null;
    // TODO(task-3): replace buildingClass with derived NCC class once deriveNCCClass
    // (Task 3 of 2026-05-07-brief-building-tab-port plan) lands. Thread output as an
    // optional nccClass prop in Task 5.
    const buildingClass = profile?.buildingClass ?? null;

    // Lede: "{N}-storey, {U}-unit Class {NCC} {subclass}"
    // We do not have the NCC class number in ProfileInput directly; use the
    // building class label (e.g. "residential") since NCC mapping happens
    // elsewhere. If individual fields are missing, render placeholders.
    const ledeParts: React.ReactNode[] = [];
    ledeParts.push(storeys != null ? `${storeys}-storey` : <Placeholder key="ph-storeys" />);
    ledeParts.push(', ');
    ledeParts.push(units != null ? `${units}-unit` : <Placeholder key="ph-units" />);
    ledeParts.push(' ');
    ledeParts.push(buildingClass ?? <Placeholder key="ph-class" />);
    if (subclassLabel) {
        ledeParts.push(' ');
        ledeParts.push(subclassLabel);
    }

    // TODO(task-5): confirm these complexity keys against profile-templates.json when
    // wiring BriefPanel; if real keys differ (e.g. snake_case), update accordingly.
    // Today these silently render nothing on key miss, which is a UX gap.
    // Procurement route — pull from complexity.procurement_route (canonical key
    // in profile-templates.json), with camelCase / shorter-name fallbacks for
    // legacy profile data.
    const procurementValue =
        (profile?.complexity?.procurement_route as string | string[] | undefined) ??
        (profile?.complexity?.procurementRoute as string | string[] | undefined) ??
        (profile?.complexity?.procurement as string | string[] | undefined);
    const procurement = Array.isArray(procurementValue) ? procurementValue[0] : procurementValue;
    const procurementText = procurement
        ? procurement.replace(/_/g, ' ').replace(/lump\s*sum/i, 'lump-sum')
        : null;

    // Performance targets — look for sustainability/quality fields. Try both
    // snake_case (canonical in profile-templates.json) and camelCase variants.
    const targetsRaw =
        (profile?.complexity?.performance_targets as string | string[] | undefined) ??
        (profile?.complexity?.sustainability_targets as string | string[] | undefined) ??
        (profile?.complexity?.performanceTargets as string | string[] | undefined) ??
        (profile?.complexity?.sustainabilityTargets as string | string[] | undefined) ??
        (profile?.complexity?.targets as string | string[] | undefined);
    const targets = Array.isArray(targetsRaw) ? targetsRaw.join(', ') : targetsRaw ?? null;

    return (
        <>
            {projectName} is a{' '}
            <span
                style={{
                    background: 'var(--sw-rose-tint)',
                    padding: '0 4px',
                    color: 'var(--sw-rose-dk)',
                }}
            >
                {ledeParts}
            </span>{' '}
            development
            {procurementText ? (
                <>
                    , delivered as a{' '}
                    <span
                        style={{
                            background: 'rgba(168,156,217,0.15)',
                            padding: '0 4px',
                            color: 'var(--sw-lav)',
                            fontFamily: 'var(--sw-font-mono)',
                        }}
                    >
                        {procurementText}
                    </span>
                </>
            ) : null}
            {targets ? (
                <>
                    {'. The build targets '}
                    <span
                        style={{
                            background: 'rgba(122,184,194,0.15)',
                            padding: '0 4px',
                            color: 'var(--sw-cyan)',
                            fontFamily: 'var(--sw-font-mono)',
                        }}
                    >
                        {targets}
                    </span>
                </>
            ) : null}
            .
        </>
    );
}

function Placeholder() {
    return (
        <span
            style={{
                background: 'var(--sw-rose-tint)',
                padding: '0 4px',
                color: 'var(--sw-rose-dk)',
                fontFamily: 'var(--sw-font-mono)',
            }}
        >
            [—]
        </span>
    );
}

/**
 * Map an objective's category/type to its tag chip colour.
 * Order: explicit `category` value first (programme/risk/cost/quality/
 * stakeholder/authority), then fall back to `objectiveType`
 * (planning/functional/quality/compliance), then to muted.
 */
function tagAccentFor(category: string | null | undefined): string {
    const key = (category ?? '').toLowerCase().trim();
    switch (key) {
        case 'programme':
        case 'risk':
        case 'compliance':
            return 'var(--sw-rose)';
        case 'cost':
            return 'var(--sw-peach)';
        case 'quality':
        case 'stakeholder':
        case 'functional':
            return 'var(--sw-cyan)';
        case 'authority':
        case 'planning':
            return 'var(--sw-lav)';
        default:
            return muted;
    }
}

function emptyGrouped(): GroupedObjectives {
    return { planning: [], functional: [], quality: [], compliance: [] };
}

/**
 * Extract the grouped-by-section shape from the GET / generate response.
 * Defaults each section to an empty array if missing from the payload.
 */
function extractGrouped(payload: ObjectivesResponse): GroupedObjectives {
    const out = emptyGrouped();
    const data = payload?.data;
    if (!data || typeof data !== 'object') return out;
    for (const type of SECTION_ORDER) {
        const rows = data[type];
        if (Array.isArray(rows)) out[type] = rows;
    }
    return out;
}

function totalCount(grouped: GroupedObjectives): number {
    return SECTION_ORDER.reduce((n, t) => n + grouped[t].length, 0);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BriefPreviewPane({ projectId, projectName, profile, refreshKey = 0 }: BriefPreviewPaneProps) {
    // Status strip values — re-stamped each time refreshKey changes so the
    // header and the chrome's "regenerated HH:MM:SS" subtitle stay in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const { generatedAt, model, tokens } = useMemo(() => {
        return {
            generatedAt: new Date().toLocaleTimeString('en-AU', { hour12: false }),
            model: 'claude-haiku-4-5',
            tokens: 1840,
        };
    }, [refreshKey]);

    // Objectives fetch state machine.
    const [grouped, setGrouped] = useState<GroupedObjectives>(emptyGrouped);
    const [attachedDocumentCount, setAttachedDocumentCount] = useState(0);
    const [viewModes, setViewModes] = useState<Record<ObjectiveType, ViewMode>>({
        planning: 'short',
        functional: 'short',
        quality: 'short',
        compliance: 'short',
    });
    const [generatingSection, setGeneratingSection] = useState<ObjectiveType | null>(null);
    const [status, setStatus] = useState<ObjectivesStatus>('loading');
    const [retryNonce, setRetryNonce] = useState(0);

    // Sources footer — count populated profile fields client-side. Mirrors
    // what the inference engine will actually feed into objective generation.
    const profileFieldsCount = useMemo(() => {
        let n = 0;
        if (profile.buildingClass) n++;
        if (profile.projectType) n++;
        if (profile.subclass && profile.subclass.length > 0) n++;
        if (profile.region) n++;
        if (profile.scaleData) {
            for (const v of Object.values(profile.scaleData)) {
                if (v === null || v === undefined) continue;
                if (typeof v === 'string' && v === '') continue;
                n++;
            }
        }
        if (profile.complexity) {
            for (const v of Object.values(profile.complexity)) {
                if (Array.isArray(v) ? v.length > 0 : v != null && v !== '') n++;
            }
        }
        if (profile.workScope && profile.workScope.length > 0) n++;
        return n;
    }, [profile]);

    // Apply a fresh grouped payload to state and seed initial view modes:
    // any section with at least one polished row opens in Long; otherwise Short.
    const applyGrouped = useCallback((next: GroupedObjectives) => {
        setGrouped(next);
        setViewModes((prev) => {
            const updated = { ...prev };
            for (const type of SECTION_ORDER) {
                const hasPolished = next[type].some((r) => Boolean(r.textPolished));
                updated[type] = hasPolished ? 'long' : 'short';
            }
            return updated;
        });
    }, []);

    // Fetch objectives once per (projectId, retryNonce, refreshKey). Keeping
    // applyGrouped out of the dep list is intentional: it's a stable useCallback
    // and including it would re-fire fetches whenever React re-creates it.
    useEffect(() => {
        let cancelled = false;
        setStatus('loading');

        // GET-first, generate-only-if-empty.
        //
        // The /objectives/generate endpoint is destructive: it soft-deletes
        // every existing projectObjectives row for the project + section and
        // replaces them with a fresh AI batch. Auto-POSTing on mount would
        // wipe user edits on every tab switch / project switch / remount.
        //
        // Instead: fetch the non-destructive list endpoint first; only fall
        // through to generate when the project has zero objectives across
        // all four sections (i.e. a fresh project that has never been
        // populated).
        (async () => {
            try {
                const getRes = await fetch(`/api/projects/${projectId}/objectives`, {
                    method: 'GET',
                });
                if (cancelled) return;
                if (!getRes.ok) throw new Error(`GET objectives failed: ${getRes.status}`);
                const getJson: ObjectivesResponse = await getRes.json();
                if (cancelled) return;

                const existing = extractGrouped(getJson);
                if (totalCount(existing) > 0) {
                    applyGrouped(existing);
                    setAttachedDocumentCount(getJson.attachedDocumentCount ?? 0);
                    setStatus('ready');
                    return;
                }

                // No existing objectives — safe to generate the first batch.
                const postRes = await fetch(
                    `/api/projects/${projectId}/objectives/generate`,
                    { method: 'POST' }
                );
                if (cancelled) return;
                if (!postRes.ok) throw new Error(`POST generate failed: ${postRes.status}`);
                const postJson: ObjectivesResponse = await postRes.json();
                if (cancelled) return;

                applyGrouped(extractGrouped(postJson));
                // Generate response doesn't include the attached-doc count, so
                // re-use the GET payload (the source-of-truth for that field).
                setAttachedDocumentCount(getJson.attachedDocumentCount ?? 0);
                setStatus('ready');
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [projectId, retryNonce, refreshKey, applyGrouped]);

    // Per-row regenerate. Mirrors ObjectivesWorkspace.runRegenerate:
    //   short → /objectives/generate (destructive replace)
    //   long  → /objectives/polish   (polishes existing short bullets)
    // No dirty-edit confirmation here — the brief is read-only; edits live in
    // the Objectives tab.
    const handleRegenerate = useCallback(async (type: ObjectiveType) => {
        if (generatingSection) return;
        const mode = viewModes[type];
        setGeneratingSection(type);
        try {
            const url = mode === 'short'
                ? `/api/projects/${projectId}/objectives/generate`
                : `/api/projects/${projectId}/objectives/polish`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: type }),
            });
            if (!res.ok) return;
            // Re-fetch the full grouped state — the generate/polish responses
            // only cover the regenerated section, but a clean GET keeps the
            // rest in sync without juggling per-section merges.
            const getRes = await fetch(`/api/projects/${projectId}/objectives`);
            if (!getRes.ok) return;
            const getJson: ObjectivesResponse = await getRes.json();
            const next = extractGrouped(getJson);
            setGrouped(next);
            setAttachedDocumentCount(getJson.attachedDocumentCount ?? 0);
            // Long-mode regenerate produces polished content — flip the view
            // to Long so the user sees what they just generated.
            if (mode === 'long') {
                setViewModes((prev) => ({ ...prev, [type]: 'long' }));
            }
        } finally {
            setGeneratingSection(null);
        }
    }, [generatingSection, projectId, viewModes]);

    const handleViewModeChange = useCallback((type: ObjectiveType, mode: ViewMode) => {
        setViewModes((prev) => ({ ...prev, [type]: mode }));
    }, []);

    return (
        <div className="flex flex-col gap-3">
            {/* 1. Status strip ---------------------------------------------------- */}
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
                    Brief generated
                </span>
                <span
                    className="ml-auto"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'rgba(232,228,218,0.6)',
                    }}
                >
                    {generatedAt} · {model} · {tokens.toLocaleString()} tok
                </span>
            </div>

            {/* 2. Narrative card -------------------------------------------------- */}
            <section
                style={{
                    background: 'white',
                    border: '1px solid var(--sw-rule)',
                    borderLeft: '3px solid var(--sw-rose)',
                }}
            >
                <div
                    className="px-4 py-2.5"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: muted,
                        fontWeight: 600,
                        borderBottom: '1px solid var(--sw-rule-2)',
                    }}
                >
                    Narrative
                </div>
                <p
                    className="px-4 py-3 m-0"
                    style={{
                        fontFamily: 'var(--sw-font-body)',
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: 'var(--sw-ink)',
                    }}
                >
                    {buildNarrative(profile, projectName)}
                </p>
            </section>

            {/* 3. Inferred Objectives card --------------------------------------- */}
            <section
                aria-busy={status === 'loading'}
                style={{ background: 'white', border: '1px solid var(--sw-rule)' }}
            >
                {status === 'loading' ? <ObjectivesSkeleton /> : null}

                {status === 'error' ? (
                    <ObjectivesError onRetry={() => setRetryNonce((n) => n + 1)} />
                ) : null}

                {status === 'ready' ? (
                    <CategoryRows
                        grouped={grouped}
                        viewModes={viewModes}
                        generatingSection={generatingSection}
                        onViewModeChange={handleViewModeChange}
                        onRegenerate={handleRegenerate}
                    />
                ) : null}
            </section>

            {/* 4. Sources footer -------------------------------------------------
                Wired counts (attached docs, profile fields) reflect what the
                objectives generator actually consumes today. The knowledge
                library segment + view-trace link are intentional ghost
                placeholders — kept visible at reduced opacity so the user
                sees the full set of inputs that *will* feed into brief
                generation once those sources are wired.
                ------------------------------------------------------------- */}
            <div
                className="flex items-center justify-between px-3 py-2.5"
                style={{
                    background: 'var(--sw-paper-2)',
                    border: '1px solid var(--sw-rule)',
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 11,
                    color: muted,
                    letterSpacing: '0.02em',
                }}
            >
                <span>
                    <span style={{ color: 'var(--sw-rose-dk)' }}>// SOURCES</span>{' '}
                    attached docs ({attachedDocumentCount}) · profile fields ({profileFieldsCount}) ·{' '}
                    <span style={{ opacity: 0.45 }}>knowledge library (—)</span>
                </span>
                <span
                    className="inline-flex items-center gap-1"
                    style={{ color: muted, opacity: 0.45 }}
                    title="Trace view not yet available"
                >
                    view trace <ArrowUpRight className="w-3 h-3" />
                </span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-pieces for the Inferred Objectives card
// ---------------------------------------------------------------------------

function ObjectivesSkeleton() {
    return (
        <div>
            {SECTION_ORDER.map((type, i) => {
                const accent = tagAccentFor(type);
                const isLast = i === SECTION_ORDER.length - 1;
                return (
                    <div
                        key={type}
                        style={{ borderBottom: isLast ? 'none' : '1px solid var(--sw-rule-2)' }}
                    >
                        <div
                            className="flex items-center justify-between px-4 py-2"
                            style={{ borderLeft: `3px solid ${accent}` }}
                        >
                            <span
                                className="animate-pulse"
                                style={{
                                    width: 80,
                                    height: 12,
                                    background: 'var(--sw-rule-2)',
                                    opacity: 0.7,
                                }}
                            />
                            <span
                                className="animate-pulse"
                                style={{
                                    width: 110,
                                    height: 18,
                                    background: 'var(--sw-rule-2)',
                                    opacity: 0.7,
                                }}
                            />
                        </div>
                        <div className="px-4 py-2.5">
                            <span
                                className="animate-pulse block"
                                style={{
                                    height: 12,
                                    background: 'var(--sw-rule-2)',
                                    opacity: 0.7,
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ObjectivesError({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{
                background: 'var(--sw-rose-tint)',
                borderLeft: '3px solid var(--sw-rose)',
            }}
        >
            <span
                style={{
                    fontFamily: 'var(--sw-font-body)',
                    fontSize: 13,
                    color: 'var(--sw-ink)',
                }}
            >
                Failed to load objectives — retry
            </span>
            <button
                type="button"
                onClick={onRetry}
                style={{
                    background: 'transparent',
                    border: '1px solid var(--sw-rule)',
                    padding: '4px 10px',
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.05em',
                    color: 'var(--sw-ink)',
                    cursor: 'pointer',
                }}
            >
                Retry
            </button>
        </div>
    );
}

interface CategoryRowsProps {
    grouped: GroupedObjectives;
    viewModes: Record<ObjectiveType, ViewMode>;
    generatingSection: ObjectiveType | null;
    onViewModeChange: (type: ObjectiveType, mode: ViewMode) => void;
    onRegenerate: (type: ObjectiveType) => void;
}

function CategoryRows({
    grouped,
    viewModes,
    generatingSection,
    onViewModeChange,
    onRegenerate,
}: CategoryRowsProps) {
    const isAnyGenerating = generatingSection !== null;
    // Continuous numbering across sections — matches the Objectives tab's
    // global counter (Planning starts at 1; Functional continues from where
    // Planning ended; etc.).
    let runningCounter = 1;
    return (
        <div>
            {SECTION_ORDER.map((type, i) => {
                const rows = grouped[type];
                const accent = tagAccentFor(type);
                const tag = type.toUpperCase();
                const mode = viewModes[type];
                const isGenerating = generatingSection === type;
                const isLast = i === SECTION_ORDER.length - 1;
                const sectionStart = runningCounter;
                runningCounter += rows.length;
                return (
                    <div
                        key={type}
                        style={{ borderBottom: isLast ? 'none' : '1px solid var(--sw-rule-2)' }}
                    >
                        {/* Section header bar: PLANNING / FUNCTIONAL / QUALITY / COMPLIANCE
                            on the left, Short/Long/Refresh on the right. */}
                        <div
                            className="flex items-center justify-between px-4 py-2"
                            style={{ borderLeft: `3px solid ${accent}` }}
                        >
                            <span
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.18em',
                                    color: accent,
                                }}
                            >
                                {tag}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <div
                                    role="group"
                                    aria-label="View mode"
                                    className="inline-flex items-center"
                                    style={{
                                        border: '1px solid var(--sw-rule)',
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 10,
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    <ViewModeButton
                                        label="Short"
                                        active={mode === 'short'}
                                        onClick={() => onViewModeChange(type, 'short')}
                                    />
                                    <ViewModeButton
                                        label="Long"
                                        active={mode === 'long'}
                                        onClick={() => onViewModeChange(type, 'long')}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRegenerate(type)}
                                    disabled={isAnyGenerating}
                                    title={`Regenerate ${mode} ${type}`}
                                    aria-label={`Refresh ${type} objectives`}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--sw-rule)',
                                        padding: '3px 5px',
                                        color: isAnyGenerating ? muted : 'var(--sw-rose-dk)',
                                        cursor: isAnyGenerating ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <RotateCw
                                        className={isGenerating ? 'animate-spin' : ''}
                                        style={{ width: 12, height: 12 }}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Section body: rendered objectives, full width. */}
                        <div className="flex flex-col gap-1.5 px-4 py-2.5">
                            {rows.length === 0 ? (
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 11,
                                        color: muted,
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    No objectives
                                </span>
                            ) : (
                                rows.map((row, j) => {
                                    const text = mode === 'long' && row.textPolished
                                        ? row.textPolished
                                        : row.text;
                                    return (
                                        <p
                                            key={row.id}
                                            className="m-0 flex gap-2"
                                            style={{
                                                fontSize: 13,
                                                color: 'var(--sw-ink)',
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontFamily: 'var(--sw-font-mono)',
                                                    fontSize: 11,
                                                    color: muted,
                                                    flexShrink: 0,
                                                    minWidth: 18,
                                                }}
                                            >
                                                {sectionStart + j}.
                                            </span>
                                            <span>{text}</span>
                                        </p>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ViewModeButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                background: active ? 'var(--sw-rose-tint)' : 'transparent',
                color: active ? 'var(--sw-rose-dk)' : muted,
                border: 'none',
                padding: '3px 8px',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                letterSpacing: 'inherit',
                cursor: 'pointer',
                fontWeight: active ? 700 : 500,
            }}
        >
            {label}
        </button>
    );
}
