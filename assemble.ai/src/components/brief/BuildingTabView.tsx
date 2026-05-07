'use client';

/**
 * BuildingTabView — pure controlled component rendering the seven Building-tab
 * cards from the wireframe. Consumes live state + handlers via props; no
 * internal state for selections. The wireframe at /dev/brief-wireframe is the
 * visual ground truth for spacing, borders, colours, and font weights.
 *
 * The seven cards (top-to-bottom):
 *   1. Class · Type
 *   2. Scale
 *   3. Complexity
 *   4. Scope of Work
 *   5. NCC + Est. Cost strip
 *   6. Risk flags
 *   7. Disciplines
 */

import { AlertTriangle } from 'lucide-react';
import { AggregateSlider, CardShell, Chip } from '@/components/brief/primitives';
import type {
    BuildingClass,
    ComplexityOption,
    ProjectType,
    WorkScopeItem,
} from '@/types/profiler';

const muted = 'var(--sw-muted)';

export interface BuildingTabTemplates {
    buildingClasses: Array<{ value: BuildingClass; label: string }>;
    projectTypes: Array<{ value: ProjectType; label: string }>;
    subclassOptions: Array<{ value: string; label: string }>;
    complexityDimensions: Array<{
        key: string;
        label: string;
        options: ComplexityOption[];
        accent: string;
    }>;
    scopeGroups: Array<{
        categoryLabel: string;
        items: WorkScopeItem[];
    }>;
    scaleFields: Array<{
        key: string;
        label: string;
        unit?: string;
        note?: string;
        noteAccent?: string;
    }>;
}

// TODO(task-5): add onScaleChange when Scale rows become editable.
export interface BuildingTabViewProps {
    // Identity
    buildingClass: BuildingClass | null;
    projectType: ProjectType | null;

    // Selections
    subclasses: string[];
    scaleData: Record<string, number | string>;
    complexity: Record<string, string | string[]>;
    workScope: string[];

    // Aggregates
    complexityLevel: number; // 0-100 for slider
    scopeLevel: number; // 0-100 for slider

    // Setters
    onClassChange: (cls: BuildingClass) => void;
    onTypeChange: (type: ProjectType) => void;
    onSubclassToggle: (subclassValue: string) => void;
    /**
     * Called when a user clicks a complexity chip.
     * For SINGLE-select dimensions (most), the parent should set
     * `complexity[dimension] = value`. For MULTI-select dimensions
     * (e.g. site_conditions), the parent should toggle membership in
     * `complexity[dimension]: string[]`. The decision lives at the
     * parent (typically ProfilerMiddlePanel) — this view does not
     * track which dimensions are multi-select.
     */
    onComplexityChange: (dimension: string, value: string) => void;
    onScopeToggle: (scopeValue: string) => void;
    onComplexityLevelChange: (level: number) => void;
    onScopeLevelChange: (level: number) => void;

    // Template-driven option lists — keep this component template-agnostic
    templates: BuildingTabTemplates;

    // Optional derived values — defaults provided
    complexityScore?: number | null;
    complexityBand?: string | null;
    contingencyBand?: string | null;
    nccClass?: { classCode: string; typeAndVolume?: string } | null;
    estCostBand?: { lowAUD: number; highAUD: number } | null;
    riskFlags?: Array<{ label: string; description: string; tag: string }>;
    disciplines?: { required: string[]; suggested: string[] };
}

/* ============================================================
   Helpers
   ============================================================ */

/** Format an AUD figure compactly (e.g. 22000000 → "$22M"). */
function formatAUDCompact(value: number): string {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) >= 1_000_000_000) {
        return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    }
    if (Math.abs(value) >= 1_000_000) {
        return `$${Math.round(value / 1_000_000)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `$${Math.round(value / 1_000)}k`;
    }
    return `$${Math.round(value)}`;
}

function MetaLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 10,
                color: muted,
                marginBottom: 6,
            }}
        >
            {children}
        </div>
    );
}

/* ============================================================
   Component
   ============================================================ */

export function BuildingTabView({
    buildingClass,
    projectType,
    subclasses,
    scaleData,
    complexity,
    workScope,
    complexityLevel,
    scopeLevel,
    onClassChange,
    onTypeChange,
    onSubclassToggle,
    onComplexityChange,
    onScopeToggle,
    onComplexityLevelChange,
    onScopeLevelChange,
    templates,
    complexityScore = null,
    complexityBand = null,
    contingencyBand = null,
    nccClass = null,
    estCostBand = null,
    riskFlags = [],
    disciplines = { required: [], suggested: [] },
}: BuildingTabViewProps) {
    // ---- Derived counts ------------------------------------------------
    const totalScopeItems = templates.scopeGroups.reduce(
        (acc, g) => acc + g.items.length,
        0,
    );
    const scopeSelectedCount = workScope.length;
    const scopeRemaining = Math.max(0, totalScopeItems - scopeSelectedCount);

    const complexityMeta = `composite · ${complexityScore ?? '—'}/10${
        complexityBand ? ` · ${complexityBand}` : ''
    }`;

    const classTypeMetaCount =
        templates.buildingClasses.length +
        templates.projectTypes.length +
        templates.subclassOptions.length;

    return (
        <div className="flex flex-col gap-4">
            {/* ============================================================
                1. CLASS · TYPE
                ============================================================ */}
            <CardShell
                label="Class · Type"
                meta={`auto-resolved domain tags · ${classTypeMetaCount}`}
            >
                <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                        <MetaLabel>building class</MetaLabel>
                        <div className="flex flex-wrap gap-1.5">
                            {templates.buildingClasses.map((cls) => (
                                <Chip
                                    key={cls.value}
                                    label={cls.label}
                                    selected={buildingClass === cls.value}
                                    accent="var(--sw-ink)"
                                    onAccent="white"
                                    onClick={() => onClassChange(cls.value)}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <MetaLabel>project type</MetaLabel>
                        <div className="flex flex-wrap gap-1.5">
                            {templates.projectTypes.map((t) => (
                                <Chip
                                    key={t.value}
                                    label={t.label}
                                    selected={projectType === t.value}
                                    onClick={() => onTypeChange(t.value)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {templates.subclassOptions.length > 0 && (
                    <div className="mt-4">
                        <MetaLabel>subclass</MetaLabel>
                        <div className="flex flex-wrap gap-1.5">
                            {templates.subclassOptions.map((sc) => (
                                <Chip
                                    key={sc.value}
                                    label={sc.label}
                                    selected={subclasses.includes(sc.value)}
                                    accent="var(--sw-peach)"
                                    onAccent="var(--sw-ink)"
                                    onClick={() => onSubclassToggle(sc.value)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </CardShell>

            {/* ============================================================
                2. SCALE
                ============================================================ */}
            <CardShell label="Scale" meta="per AIQS / Rawlinsons 2025">
                <div className="flex flex-col">
                    {templates.scaleFields.length === 0 ? (
                        <div style={{ fontSize: 13, color: muted }}>
                            Select a building class to see scale fields.
                        </div>
                    ) : (
                        templates.scaleFields.map((field, i) => {
                            const raw = scaleData[field.key];
                            const valueDisplay =
                                raw === undefined || raw === ''
                                    ? '—'
                                    : field.unit
                                      ? `${raw} ${field.unit}`
                                      : String(raw);
                            return (
                                <div
                                    key={field.key}
                                    className="grid items-baseline gap-3 py-2"
                                    style={{
                                        gridTemplateColumns: '160px 1fr 220px',
                                        borderBottom:
                                            i < templates.scaleFields.length - 1
                                                ? '1px solid var(--sw-rule-2)'
                                                : 'none',
                                    }}
                                >
                                    <span style={{ fontSize: 13, color: muted }}>
                                        {field.label}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {valueDisplay}
                                    </span>
                                    {field.note ? (
                                        <span
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 11,
                                                color: field.noteAccent ?? muted,
                                            }}
                                        >
                                            {field.note}
                                        </span>
                                    ) : (
                                        <span />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </CardShell>

            {/* ============================================================
                3. COMPLEXITY
                ============================================================ */}
            <CardShell label="Complexity" meta={complexityMeta}>
                {/* Composite score header */}
                <div
                    className="flex items-baseline gap-3 mb-4 pb-4"
                    style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                >
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 36,
                            fontWeight: 800,
                            color: 'var(--sw-rose-dk)',
                            letterSpacing: '-0.04em',
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                        }}
                    >
                        {complexityScore ?? '—'}
                    </span>
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: muted,
                            letterSpacing: '0.02em',
                        }}
                    >
                        /10 · contingency band {contingencyBand ?? '—'}
                    </span>
                </div>

                {/* Dimension chip rows */}
                <div className="flex flex-col gap-3">
                    {templates.complexityDimensions.length === 0 ? (
                        <div style={{ fontSize: 13, color: muted }}>
                            Select a building class to see complexity dimensions.
                        </div>
                    ) : (
                        templates.complexityDimensions.map((dim) => {
                            const current = complexity[dim.key];
                            const isMatch = (optValue: string) =>
                                Array.isArray(current)
                                    ? current.includes(optValue)
                                    : current === optValue;
                            return (
                                <div
                                    key={dim.key}
                                    className="grid items-center gap-3"
                                    style={{ gridTemplateColumns: '170px 1fr' }}
                                >
                                    <span style={{ fontSize: 13, color: 'var(--sw-ink)' }}>
                                        {dim.label}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {dim.options.map((opt) => (
                                            <Chip
                                                key={opt.value}
                                                label={opt.label}
                                                selected={isMatch(opt.value)}
                                                accent={dim.accent}
                                                onAccent="var(--sw-ink)"
                                                onClick={() =>
                                                    onComplexityChange(dim.key, opt.value)
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Aggregate slider */}
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--sw-rule-2)' }}>
                    <div
                        className="mb-2"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: muted,
                        }}
                    >
                        aggregate · drag to set baseline, fine-tune above
                    </div>
                    <AggregateSlider
                        value={complexityLevel}
                        onChange={onComplexityLevelChange}
                        leftLabel="simple"
                        rightLabel="extreme"
                    />
                </div>
            </CardShell>

            {/* ============================================================
                4. SCOPE OF WORK
                ============================================================ */}
            <CardShell
                label="Scope of Work"
                meta={`${scopeSelectedCount} selected · ${scopeRemaining} awaiting`}
            >
                <div className="flex flex-col gap-3.5">
                    {templates.scopeGroups.length === 0 ? (
                        <div style={{ fontSize: 13, color: muted }}>
                            Select a project type to see scope groups.
                        </div>
                    ) : (
                        templates.scopeGroups.map((g) => (
                            <div
                                key={g.categoryLabel}
                                className="grid items-start gap-3"
                                style={{ gridTemplateColumns: '170px 1fr' }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 10,
                                        color: muted,
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        paddingTop: 5,
                                    }}
                                >
                                    {g.categoryLabel}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {g.items.map((item) => (
                                        <Chip
                                            key={item.value}
                                            label={item.label}
                                            selected={workScope.includes(item.value)}
                                            accent="var(--sw-cyan)"
                                            onAccent="var(--sw-ink)"
                                            onClick={() => onScopeToggle(item.value)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Aggregate slider */}
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--sw-rule-2)' }}>
                    <div
                        className="mb-2"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: muted,
                        }}
                    >
                        aggregate · drag to broaden / narrow scope, fine-tune above
                    </div>
                    <AggregateSlider
                        value={scopeLevel}
                        onChange={onScopeLevelChange}
                        leftLabel="minimum"
                        rightLabel="full scope"
                        ticks={6}
                    />
                </div>
            </CardShell>

            {/* ============================================================
                5. NCC + EST. COST STRIP
                ============================================================ */}
            <section
                className="grid"
                style={{
                    gridTemplateColumns: '1fr 1fr',
                    background: 'white',
                    border: '1px solid var(--sw-rule)',
                }}
            >
                <div className="p-4" style={{ borderRight: '1px solid var(--sw-rule)' }}>
                    <div
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: muted,
                        }}
                    >
                        NCC class
                    </div>
                    <div
                        className="mt-1"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: '-0.025em',
                        }}
                    >
                        {nccClass == null ? (
                            '—'
                        ) : (
                            <>
                                {nccClass.classCode}
                                {nccClass.typeAndVolume ? (
                                    <>
                                        {' '}
                                        <span
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 11,
                                                color: 'var(--sw-cyan)',
                                                fontWeight: 500,
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            {nccClass.typeAndVolume}
                                        </span>
                                    </>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
                <div className="p-4">
                    <div
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: muted,
                        }}
                    >
                        Est. cost band
                    </div>
                    <div
                        className="mt-1"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: '-0.025em',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {estCostBand ? (
                            <>
                                <span style={{ color: 'var(--sw-peach)' }}>
                                    {formatAUDCompact(estCostBand.lowAUD)}
                                </span>{' '}
                                <span style={{ color: muted, fontWeight: 400 }}>—</span>{' '}
                                <span style={{ color: 'var(--sw-peach)' }}>
                                    {formatAUDCompact(estCostBand.highAUD)}
                                </span>
                            </>
                        ) : (
                            <span style={{ color: muted }}>—</span>
                        )}
                    </div>
                </div>
            </section>

            {/* ============================================================
                6. RISK FLAGS
                ============================================================ */}
            <CardShell
                label="Risk flags"
                meta={`${riskFlags.length} raised · 0 acknowledged`}
            >
                {riskFlags.length === 0 ? (
                    <div style={{ fontSize: 13, color: muted }}>No risks raised</div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {riskFlags.map((flag, i) => (
                            <div
                                key={`${flag.tag}-${i}`}
                                className="flex gap-3 p-3"
                                style={{
                                    background: 'var(--sw-rose-tint)',
                                    borderLeft: '3px solid var(--sw-rose)',
                                }}
                            >
                                <AlertTriangle
                                    className="flex-shrink-0 mt-0.5"
                                    style={{
                                        width: 16,
                                        height: 16,
                                        color: 'var(--sw-rose-dk)',
                                    }}
                                />
                                <div>
                                    <div
                                        style={{
                                            fontFamily: 'var(--sw-font-sans)',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: 'var(--sw-ink)',
                                            marginBottom: 2,
                                        }}
                                    >
                                        {flag.label}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: 'var(--sw-font-body)',
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            color: 'var(--sw-ink)',
                                            opacity: 0.85,
                                        }}
                                    >
                                        {flag.description}
                                    </div>
                                    <div
                                        className="mt-2 flex gap-2"
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 10,
                                            color: 'var(--sw-rose-dk)',
                                            letterSpacing: '0.05em',
                                        }}
                                    >
                                        <span>flag · {flag.tag}</span>
                                        <span>·</span>
                                        <span>raised · profile</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardShell>

            {/* ============================================================
                7. DISCIPLINES
                ============================================================ */}
            <CardShell
                label="Disciplines"
                meta={`${disciplines.required.length} required · ${disciplines.suggested.length} suggested`}
            >
                <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                        <div
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: muted,
                                marginBottom: 8,
                            }}
                        >
                            required
                        </div>
                        {disciplines.required.length === 0 ? (
                            <div style={{ fontSize: 13, color: muted }}>—</div>
                        ) : (
                            <ul
                                className="m-0 p-0 grid gap-1"
                                style={{ gridTemplateColumns: '1fr 1fr' }}
                            >
                                {disciplines.required.map((d) => (
                                    <li
                                        key={d}
                                        className="flex items-center gap-2"
                                        style={{ fontSize: 13, color: 'var(--sw-ink)' }}
                                    >
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                background: 'var(--sw-cyan)',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span>{d}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <div
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: muted,
                                marginBottom: 8,
                            }}
                        >
                            suggested
                        </div>
                        {disciplines.suggested.length === 0 ? (
                            <div style={{ fontSize: 13, color: muted }}>—</div>
                        ) : (
                            <ul className="m-0 p-0 flex flex-col gap-1">
                                {disciplines.suggested.map((d) => (
                                    <li
                                        key={d}
                                        className="flex items-center gap-2"
                                        style={{ fontSize: 13, color: 'var(--sw-ink)' }}
                                    >
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                background: 'var(--sw-lav)',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span>{d}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </CardShell>
        </div>
    );
}
