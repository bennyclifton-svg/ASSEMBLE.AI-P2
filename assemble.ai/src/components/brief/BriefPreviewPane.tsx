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
import { ArrowUpRight, MessageSquareText, RotateCw } from 'lucide-react';
import type { ProfileInput } from '@/types/profiler';
import type { ObjectiveSource, ObjectiveType } from '@/lib/db/objectives-schema';
import type { ObjectiveRow } from '@/components/profiler/objectives/ObjectivesWorkspace';
import { Modal } from '@/components/ui/modal';
import { CardShell } from './primitives/CardShell';

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
    briefingRefreshKey?: number;
    onOpenBriefing?: () => void;
    onRestartBriefing?: () => void;
    /**
     * Forwarded to the parent so the Sources shell (rendered below the
     * Attached Documents shell) can show the same counts/trace without
     * re-fetching the objectives envelope.
     */
    onSourcesUpdate?: (data: SourcesData) => void;
}

export interface SourcesData {
    attachedDocumentCount: number;
    profileFieldsCount: number;
    generationTrace: GenerationTrace | null;
}

interface BriefingState {
    enabled: boolean;
    status: 'none' | 'active' | 'completed' | 'abandoned';
    answeredCount: number;
}

type GroupedObjectives = Record<ObjectiveType, ObjectiveRow[]>;

type ViewMode = 'short' | 'long';

const SECTION_ORDER: ObjectiveType[] = ['planning', 'functional', 'quality', 'compliance'];

type ObjectivesStatus = 'loading' | 'ready' | 'error';

type TraceKnowledgeSource = {
    source: 'domain_rag' | 'local_seed';
    domainName: string;
    sectionTitle: string | null;
    relevanceScore: number;
    sourceVersion?: string;
};

type TraceGeneratedItem = {
    text: string;
    source: ObjectiveSource;
    sourceDetail?: string;
};

type GenerationTraceSection = {
    createdAt: string | null;
    profileFacts: string[];
    rules: { ruleId: string; text: string; source: string }[];
    knowledgeSources: TraceKnowledgeSource[];
    items: TraceGeneratedItem[];
};

type GenerationTrace = {
    counts: {
        sections: number;
        inferenceRules: number;
        knowledgeSources: number;
        seedKnowledgeSources: number;
        domainKnowledgeSources: number;
        objectivesBySource: Partial<Record<ObjectiveSource, number>>;
    };
    sections: Record<ObjectiveType, GenerationTraceSection | null>;
};

// API response shape used by both:
//   - GET  /api/projects/[projectId]/objectives          (existing rows)
//   - POST /api/projects/[projectId]/objectives/generate (fresh AI batch)
// Both wrap `data` keyed by objectiveType ('planning' | 'functional' |
// 'quality' | 'compliance') with arrays of projectObjectives rows. The GET
// envelope additionally carries `snapshots`, `projectType`,
// `hasAttachedDocuments`, `attachedDocumentCount`, and `generationTrace`.
interface ObjectivesResponse {
    success?: boolean;
    data?: Partial<Record<ObjectiveType, ObjectiveRow[]>>;
    attachedDocumentCount?: number;
    generationTrace?: GenerationTrace;
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
                    background: '#BEE0E9',
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
                            background: '#BEE0E9',
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
                            background: '#BEE0E9',
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
                background: '#BEE0E9',
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

const SOURCE_LABELS: Record<ObjectiveSource, string> = {
    explicit: 'Attached document',
    inferred: 'Inferred',
    ai_added: 'AI drafted',
    profile_fact: 'Profile fact',
    inference_rule: 'Inference rule',
    seed_knowledge: 'Seed knowledge',
    llm_common: 'General model',
    user_added: 'User added',
    manual: 'Manual',
    inference: 'Inference',
    briefing: 'Briefing',
};

function hasTrace(trace: GenerationTrace | null): boolean {
    if (!trace) return false;
    return (
        trace.counts.sections > 0 ||
        trace.counts.knowledgeSources > 0 ||
        trace.counts.inferenceRules > 0 ||
        Object.values(trace.counts.objectivesBySource).some((count) => (count ?? 0) > 0)
    );
}

function formatPercent(score: number): string {
    return `${Math.round(score * 100)}%`;
}

function nonZeroSourceCounts(trace: GenerationTrace | null): Array<[ObjectiveSource, number]> {
    if (!trace) return [];
    return Object.entries(trace.counts.objectivesBySource)
        .filter((entry): entry is [ObjectiveSource, number] => Number(entry[1]) > 0)
        .sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BriefPreviewPane({
    projectId,
    projectName,
    profile,
    refreshKey = 0,
    briefingRefreshKey = 0,
    onOpenBriefing,
    onRestartBriefing,
    onSourcesUpdate,
}: BriefPreviewPaneProps) {
    // Objectives fetch state machine.
    const [grouped, setGrouped] = useState<GroupedObjectives>(emptyGrouped);
    const [attachedDocumentCount, setAttachedDocumentCount] = useState(0);
    const [generationTrace, setGenerationTrace] = useState<GenerationTrace | null>(null);
    const [viewModes, setViewModes] = useState<Record<ObjectiveType, ViewMode>>({
        planning: 'short',
        functional: 'short',
        quality: 'short',
        compliance: 'short',
    });
    const [generatingSection, setGeneratingSection] = useState<ObjectiveType | null>(null);
    const [status, setStatus] = useState<ObjectivesStatus>('loading');
    const [retryNonce, setRetryNonce] = useState(0);
    const [briefingState, setBriefingState] = useState<BriefingState>({
        enabled: false,
        status: 'none',
        answeredCount: 0,
    });

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
        setGenerationTrace(null);

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
                    setGenerationTrace(getJson.generationTrace ?? null);
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
                await postRes.json();
                if (cancelled) return;

                const refreshedRes = await fetch(`/api/projects/${projectId}/objectives`, {
                    method: 'GET',
                });
                if (cancelled) return;
                if (!refreshedRes.ok) throw new Error(`GET objectives failed: ${refreshedRes.status}`);
                const refreshedJson: ObjectivesResponse = await refreshedRes.json();
                if (cancelled) return;

                applyGrouped(extractGrouped(refreshedJson));
                setAttachedDocumentCount(refreshedJson.attachedDocumentCount ?? 0);
                setGenerationTrace(refreshedJson.generationTrace ?? null);
                setStatus('ready');
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [projectId, retryNonce, refreshKey, applyGrouped]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}/briefing`);
                if (!res.ok) return;
                const json = await res.json();
                if (cancelled) return;
                const userMessages = Array.isArray(json.messages)
                    ? json.messages.filter((message: { role?: string }) => message.role === 'user').length
                    : 0;
                setBriefingState({
                    enabled: Boolean(json.enabled),
                    status: json.session?.status ?? 'none',
                    answeredCount: userMessages,
                });
            } catch {
                if (!cancelled) {
                    setBriefingState({ enabled: false, status: 'none', answeredCount: 0 });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [briefingRefreshKey, projectId]);

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
            setGenerationTrace(getJson.generationTrace ?? null);
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

    useEffect(() => {
        onSourcesUpdate?.({
            attachedDocumentCount,
            profileFieldsCount,
            generationTrace,
        });
    }, [attachedDocumentCount, profileFieldsCount, generationTrace, onSourcesUpdate]);

    return (
        <div className="flex flex-col">
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
                    Brief
                </span>
            </div>

            {/* Brief content — wrapped externally by the unified shell in
                BriefPanel (which owns the outer border + accent rail and
                stitches in Attachments + Sources below). */}
            <section aria-busy={status === 'loading'}>
                {/* Narrative header */}
                <div
                    className="flex items-center justify-between gap-3 px-4 py-2"
                    style={{
                        borderBottom: '1px solid var(--sw-rule-2)',
                    }}
                >
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: muted,
                            fontWeight: 600,
                        }}
                    >
                        Narrative
                    </span>
                </div>
                <p
                    className="px-4 py-3 m-0"
                    style={{
                        fontFamily: 'var(--sw-font-body)',
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: 'var(--sw-ink)',
                        borderBottom: '1px solid var(--sw-rule-2)',
                    }}
                >
                    {buildNarrative(profile, projectName)}
                </p>

                {/* Inferred objectives by section */}
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

        </div>
    );
}

// ---------------------------------------------------------------------------
// SourcesShell — collapsed-by-default tile rendered below the Attached
// Documents shell. The "view trace" action opens the generation-trace modal;
// expanding the chevron reveals the per-source counts inline.
// ---------------------------------------------------------------------------

export function SourcesShell({
    attachedDocumentCount,
    profileFieldsCount,
    generationTrace,
}: SourcesData) {
    const [isTraceOpen, setIsTraceOpen] = useState(false);
    const traceAvailable = hasTrace(generationTrace);

    return (
        <>
            <CardShell
                label="sources"
                collapsible
                defaultCollapsed
                bordered={false}
                action={
                    <button
                        type="button"
                        onClick={() => setIsTraceOpen(true)}
                        disabled={!traceAvailable}
                        className="inline-flex items-center gap-1"
                        style={{
                            color: traceAvailable ? 'var(--sw-rose-dk)' : muted,
                            opacity: traceAvailable ? 1 : 0.45,
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.05em',
                            textTransform: 'lowercase',
                            cursor: traceAvailable ? 'pointer' : 'not-allowed',
                        }}
                    >
                        view trace <ArrowUpRight className="w-3 h-3" />
                    </button>
                }
            >
                <div
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 11,
                        color: muted,
                        letterSpacing: '0.02em',
                    }}
                >
                    attached docs ({attachedDocumentCount}) / profile fields ({profileFieldsCount}) /{' '}
                    knowledge library ({generationTrace?.counts.knowledgeSources ?? 0}) / rules ({generationTrace?.counts.inferenceRules ?? 0})
                </div>
            </CardShell>
            <GenerationTraceModal
                isOpen={isTraceOpen}
                onClose={() => setIsTraceOpen(false)}
                trace={generationTrace}
                attachedDocumentCount={attachedDocumentCount}
                profileFieldsCount={profileFieldsCount}
            />
        </>
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
                        style={{
                            borderBottom: isLast ? 'none' : '1px solid var(--sw-rule-2)',
                        }}
                    >
                        <div className="flex items-center justify-between px-4 py-2">
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

function GenerationTraceModal({
    isOpen,
    onClose,
    trace,
    attachedDocumentCount,
    profileFieldsCount,
}: {
    isOpen: boolean;
    onClose: () => void;
    trace: GenerationTrace | null;
    attachedDocumentCount: number;
    profileFieldsCount: number;
}) {
    const sourceCounts = nonZeroSourceCounts(trace);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Generation Trace"
            className="max-h-[82vh] max-w-4xl overflow-y-auto bg-[var(--sw-paper)] text-[var(--sw-ink)] border-[var(--sw-rule)]"
        >
            {!trace ? (
                <p className="m-0 text-sm text-[var(--sw-muted)]">
                    No generation trace has been recorded for this brief yet.
                </p>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                        <TraceMetric label="Attached docs" value={attachedDocumentCount} />
                        <TraceMetric label="Profile fields" value={profileFieldsCount} />
                        <TraceMetric label="Knowledge" value={trace.counts.knowledgeSources} />
                        <TraceMetric label="Seed snippets" value={trace.counts.seedKnowledgeSources} />
                        <TraceMetric label="Rules" value={trace.counts.inferenceRules} />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {sourceCounts.length > 0 ? (
                            sourceCounts.map(([source, count]) => (
                                <span
                                    key={source}
                                    className="border border-[var(--sw-rule)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--sw-ink)]"
                                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                                >
                                    {SOURCE_LABELS[source] ?? source}: {count}
                                </span>
                            ))
                        ) : (
                            <span
                                className="text-[12px] text-[var(--sw-muted)]"
                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                            >
                                No per-objective source mix recorded.
                            </span>
                        )}
                    </div>

                    <div className="space-y-3">
                        {SECTION_ORDER.map((type) => (
                            <TraceSection key={type} type={type} section={trace.sections[type]} />
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
}

function TraceMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="border border-[var(--sw-rule)] bg-[var(--sw-paper)] px-3 py-2">
            <div
                className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sw-muted)]"
                style={{ fontFamily: 'var(--sw-font-mono)' }}
            >
                {label}
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--sw-ink)]">{value}</div>
        </div>
    );
}

function TraceSection({
    type,
    section,
}: {
    type: ObjectiveType;
    section: GenerationTraceSection | null;
}) {
    const accent = tagAccentFor(type);

    if (!section) {
        return (
            <section className="border border-[var(--sw-rule)] bg-white p-3">
                <h3
                    className="m-0 text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: accent, fontFamily: 'var(--sw-font-mono)' }}
                >
                    {type}
                </h3>
                <p className="mt-2 mb-0 text-sm text-[var(--sw-muted)]">
                    No latest generation session recorded for this section.
                </p>
            </section>
        );
    }

    const knowledgeLines = section.knowledgeSources.map((source) => {
        const sourceKind = source.source === 'local_seed' ? 'Seed' : 'RAG';
        const sectionTitle = source.sectionTitle ? ` / ${source.sectionTitle}` : '';
        return `${sourceKind}: ${source.domainName}${sectionTitle} (${formatPercent(source.relevanceScore)})`;
    });
    const ruleLines = section.rules.map((rule) => `${rule.ruleId}: ${rule.text}`);

    return (
        <section className="border border-[var(--sw-rule)] bg-white p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h3
                    className="m-0 text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: accent, fontFamily: 'var(--sw-font-mono)' }}
                >
                    {type}
                </h3>
                {section.createdAt ? (
                    <span
                        className="text-[11px] text-[var(--sw-muted)]"
                        style={{ fontFamily: 'var(--sw-font-mono)' }}
                    >
                        {new Date(section.createdAt).toLocaleString()}
                    </span>
                ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <TraceList
                    title={`Profile facts (${section.profileFacts.length})`}
                    items={section.profileFacts}
                    empty="No profile facts recorded."
                />
                <TraceList
                    title={`Knowledge sources (${knowledgeLines.length})`}
                    items={knowledgeLines}
                    empty="No knowledge snippets retrieved."
                />
                <TraceList
                    title={`Inference rules (${ruleLines.length})`}
                    items={ruleLines}
                    empty="No inference rules matched."
                />
                <TraceGeneratedList items={section.items} />
            </div>
        </section>
    );
}

function TraceList({
    title,
    items,
    empty,
}: {
    title: string;
    items: string[];
    empty: string;
}) {
    return (
        <div>
            <h4
                className="m-0 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sw-muted)]"
                style={{ fontFamily: 'var(--sw-font-mono)' }}
            >
                {title}
            </h4>
            {items.length === 0 ? (
                <p className="m-0 text-[12px] text-[var(--sw-muted)]">{empty}</p>
            ) : (
                <ul className="m-0 max-h-28 space-y-1 overflow-y-auto pl-4 text-[12px] leading-snug text-[var(--sw-ink)]">
                    {items.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function TraceGeneratedList({ items }: { items: TraceGeneratedItem[] }) {
    return (
        <div>
            <h4
                className="m-0 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sw-muted)]"
                style={{ fontFamily: 'var(--sw-font-mono)' }}
            >
                Generated objectives ({items.length})
            </h4>
            {items.length === 0 ? (
                <p className="m-0 text-[12px] text-[var(--sw-muted)]">
                    No generated objective details recorded.
                </p>
            ) : (
                <ul className="m-0 max-h-36 space-y-1.5 overflow-y-auto pl-0 text-[12px] leading-snug text-[var(--sw-ink)]">
                    {items.map((item, index) => (
                        <li key={`${item.text}-${index}`} className="list-none">
                            <span
                                className="mr-1.5 inline-flex border border-[var(--sw-rule)] bg-[var(--sw-paper-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--sw-muted)]"
                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                            >
                                {SOURCE_LABELS[item.source] ?? item.source}
                            </span>
                            {item.text}
                            {item.sourceDetail ? (
                                <span className="block pl-1.5 pt-0.5 text-[11px] text-[var(--sw-muted)]">
                                    {item.sourceDetail}
                                </span>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function BriefingActions({
    state,
    onOpenBriefing,
    onRestartBriefing,
}: {
    state: BriefingState;
    onOpenBriefing?: () => void;
    onRestartBriefing?: () => void;
}) {
    if (!state.enabled || !onOpenBriefing) return null;

    const isCompleted = state.status === 'completed';
    const label =
        state.status === 'active'
            ? 'Resume Briefing'
            : isCompleted
                ? 'Review Briefing'
                : 'Start Briefing';

    return (
        <div className="flex items-center gap-2">
            {isCompleted && onRestartBriefing ? (
                <button
                    type="button"
                    onClick={onRestartBriefing}
                    className="inline-flex items-center gap-1.5 border border-[var(--sw-rule)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--sw-ink)] hover:bg-[var(--sw-paper-2)]"
                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                >
                    <RotateCw className="h-3 w-3" />
                    Restart
                </button>
            ) : null}
            <button
                type="button"
                onClick={onOpenBriefing}
                className="inline-flex items-center gap-1.5 border border-[var(--sw-rule)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--sw-ink)] hover:bg-[var(--sw-paper-2)]"
                style={{ fontFamily: 'var(--sw-font-mono)' }}
            >
                <MessageSquareText className="h-3 w-3" />
                {label}
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
    const sectionStarts = useMemo(() => (
        SECTION_ORDER.reduce((starts, section, index) => ({
            ...starts,
            [section]: 1 + SECTION_ORDER
                .slice(0, index)
                .reduce((sum, previousSection) => sum + grouped[previousSection].length, 0),
        }), {} as Record<ObjectiveType, number>)
    ), [grouped]);
    return (
        <div>
            {SECTION_ORDER.map((type, i) => {
                const rows = grouped[type];
                const accent = tagAccentFor(type);
                const tag = type.toUpperCase();
                const mode = viewModes[type];
                const isGenerating = generatingSection === type;
                const isLast = i === SECTION_ORDER.length - 1;
                const sectionStart = sectionStarts[type];
                return (
                    <div
                        key={type}
                        style={{
                            borderBottom: isLast ? 'none' : '1px solid var(--sw-rule-2)',
                        }}
                    >
                        {/* Section header bar: PLANNING / FUNCTIONAL / QUALITY / COMPLIANCE
                            on the left, Short/Long/Refresh on the right. */}
                        <div className="flex items-center justify-between px-4 py-2">
                            <span
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.18em',
                                    color: 'var(--sw-cta)',
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
                background: active ? '#C5DCE8' : 'transparent',
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
