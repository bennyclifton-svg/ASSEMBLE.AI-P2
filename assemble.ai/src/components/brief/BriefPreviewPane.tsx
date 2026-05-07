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

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ProfileInput } from '@/types/profiler';

const muted = 'var(--sw-muted)';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BriefPreviewPaneProps {
    projectId: string;
    projectName: string;
    profile: ProfileInput;
}

interface NormalizedObjective {
    id: string;
    text: string;
    category: string;
}

type ObjectivesStatus = 'loading' | 'ready' | 'error';

// API response shape from POST /api/projects/[projectId]/objectives/generate.
// The route returns `data` keyed by objectiveType ('planning' | 'functional' |
// 'quality' | 'compliance') with arrays of inserted projectObjectives rows.
interface GenerateObjectivesResponse {
    success?: boolean;
    data?: Record<string, Array<{ id?: string; text?: string; category?: string | null; objectiveType?: string }>>;
    // Defensive: some shapes may return a flat `objectives` array.
    objectives?: Array<{ id?: string; text?: string; category?: string | null; objectiveType?: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the narrative paragraph from a profile. Returns React nodes with
 * inline highlight spans. Missing fields render as `[—]` placeholders so the
 * narrative degrades gracefully.
 */
function buildNarrative(profile: ProfileInput, projectName: string): React.ReactNode {
    const storeys = profile?.scaleData?.storeys;
    const units = profile?.scaleData?.units;
    const subclassRaw = profile?.subclass?.[0];
    const subclassLabel = subclassRaw ? subclassRaw.replace(/_/g, ' ') : null;
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

    // Procurement route — pull from complexity.procurement if present.
    const procurementValue =
        (profile?.complexity?.procurement as string | string[] | undefined) ??
        (profile?.complexity?.procurementRoute as string | string[] | undefined);
    const procurement = Array.isArray(procurementValue) ? procurementValue[0] : procurementValue;
    const procurementText = procurement
        ? procurement.replace(/_/g, ' ').replace(/lump\s*sum/i, 'lump-sum')
        : null;

    // Performance targets — look for sustainability/quality fields.
    const targetsRaw =
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

/**
 * Normalize the generate-objectives API response into a flat array.
 * Handles both the actual shape (`data: { planning: [], functional: [], ... }`)
 * and a defensive fallback (`objectives: []`).
 */
function normalizeObjectives(payload: GenerateObjectivesResponse): NormalizedObjective[] {
    const out: NormalizedObjective[] = [];

    if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
        for (const [type, rows] of Object.entries(payload.data)) {
            if (!Array.isArray(rows)) continue;
            for (const row of rows) {
                if (!row?.text) continue;
                out.push({
                    id: row.id ?? '',
                    text: String(row.text),
                    // Prefer the row's category field; fall back to the section key.
                    category: (row.category ?? row.objectiveType ?? type) || '',
                });
            }
        }
    } else if (Array.isArray(payload?.objectives)) {
        for (const row of payload.objectives) {
            if (!row?.text) continue;
            out.push({
                id: row.id ?? '',
                text: String(row.text),
                category: (row.category ?? row.objectiveType ?? '') || '',
            });
        }
    }

    return out;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BriefPreviewPane({ projectId, projectName, profile }: BriefPreviewPaneProps) {
    // Status strip values — frozen at mount so the timestamp doesn't tick.
    const { generatedAt, model, tokens } = useMemo(() => {
        return {
            generatedAt: new Date().toLocaleTimeString('en-AU', { hour12: false }),
            model: 'claude-haiku-4-5',
            tokens: 1840,
        };
    }, []);

    // Objectives fetch state machine.
    const [objectives, setObjectives] = useState<NormalizedObjective[]>([]);
    const [status, setStatus] = useState<ObjectivesStatus>('loading');
    const [retryNonce, setRetryNonce] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');

        fetch(`/api/projects/${projectId}/objectives/generate`, { method: 'POST' })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((data: GenerateObjectivesResponse) => {
                if (cancelled) return;
                setObjectives(normalizeObjectives(data));
                setStatus('ready');
            })
            .catch(() => {
                if (!cancelled) setStatus('error');
            });

        return () => {
            cancelled = true;
        };
    }, [projectId, retryNonce]);

    return (
        <div className="flex flex-col gap-3">
            {/* 1. Status strip ---------------------------------------------------- */}
            <div
                className="flex items-center gap-3 px-3 py-2"
                style={{ background: 'var(--sw-ink)', color: 'var(--sw-paper)' }}
            >
                <span
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
                    // Narrative
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
            <section style={{ background: 'white', border: '1px solid var(--sw-rule)' }}>
                <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
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
                        // Inferred objectives · {status === 'ready' ? Math.min(objectives.length, 6) : 6}
                    </span>
                    {status === 'ready' && objectives.length > 0 ? (
                        <span
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: 'var(--sw-rose-dk)',
                                letterSpacing: '0.05em',
                            }}
                        >
                            0 reviewed · {Math.min(objectives.length, 6)} pending
                        </span>
                    ) : null}
                </div>

                {status === 'loading' ? <ObjectivesSkeleton /> : null}

                {status === 'error' ? (
                    <ObjectivesError onRetry={() => setRetryNonce((n) => n + 1)} />
                ) : null}

                {status === 'ready' ? (
                    <ObjectivesList items={objectives.slice(0, 6)} />
                ) : null}
            </section>

            {/* 4. Sources footer ------------------------------------------------- */}
            {/* TODO: replace with real source counts when /api/projects/[id]/brief/generate lands */}
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
                    attached docs (3) · profile fields (12) · knowledge library (6)
                </span>
                <Link
                    href="#"
                    className="inline-flex items-center gap-1"
                    style={{ color: 'var(--sw-ink)' }}
                >
                    view trace <ArrowUpRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-pieces for the Inferred Objectives card
// ---------------------------------------------------------------------------

function ObjectivesSkeleton() {
    return (
        <ul className="m-0 p-0">
            {Array.from({ length: 6 }).map((_, i) => (
                <li
                    key={i}
                    className="grid items-center gap-3 px-4 py-2.5"
                    style={{
                        gridTemplateColumns: '60px 1fr 110px',
                        borderBottom: i < 5 ? '1px solid var(--sw-rule-2)' : 'none',
                    }}
                >
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: muted,
                            letterSpacing: '0.02em',
                        }}
                    >
                        OBJ-0{i + 1}
                    </span>
                    <span
                        className="animate-pulse"
                        style={{
                            height: 12,
                            background: 'var(--sw-rule-2)',
                            opacity: 0.7,
                        }}
                    />
                    <span
                        className="animate-pulse justify-self-end"
                        style={{
                            width: 80,
                            height: 14,
                            background: 'var(--sw-rule-2)',
                            opacity: 0.7,
                        }}
                    />
                </li>
            ))}
        </ul>
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

function ObjectivesList({ items }: { items: NormalizedObjective[] }) {
    if (items.length === 0) {
        return (
            <div
                className="px-4 py-3"
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 11,
                    color: muted,
                    letterSpacing: '0.02em',
                }}
            >
                No objectives generated yet.
            </div>
        );
    }
    return (
        <ul className="m-0 p-0">
            {items.map((o, i) => {
                const accent = tagAccentFor(o.category);
                const code = `OBJ-${String(i + 1).padStart(2, '0')}`;
                const tag = (o.category || 'OBJECTIVE').toUpperCase();
                return (
                    <li
                        key={o.id || `${i}-${code}`}
                        className="grid items-baseline gap-3 px-4 py-2.5"
                        style={{
                            gridTemplateColumns: '60px 1fr 110px',
                            borderBottom: i < items.length - 1 ? '1px solid var(--sw-rule-2)' : 'none',
                        }}
                    >
                        <span
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: muted,
                                letterSpacing: '0.02em',
                            }}
                        >
                            {code}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--sw-ink)', lineHeight: 1.4 }}>
                            {o.text}
                        </span>
                        <span
                            className="justify-self-end inline-flex items-center gap-1.5 px-1.5 py-0.5"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: '0.18em',
                                color: accent,
                                background: `${accent}15`,
                                border: `1px solid ${accent}33`,
                            }}
                        >
                            <span style={{ width: 6, height: 6, background: accent, flexShrink: 0 }} />
                            {tag}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
