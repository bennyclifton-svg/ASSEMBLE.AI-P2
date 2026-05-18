'use client';

/**
 * BuildingTabView — pure controlled component rendering the Building-tab
 * cards from the wireframe. Consumes live state + handlers via props; no
 * internal state for selections. The wireframe at /dev/brief-wireframe is the
 * visual ground truth for spacing, borders, colours, and font weights.
 *
 * Cards (top-to-bottom):
 *   1. Class · Type
 *   2. Scale
 *   3. Complexity
 *   4. Scope of Work
 *   5. Disciplines
 *   6. Risk flags (collapsed by default)
 */

import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
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
        type?: 'integer' | 'decimal' | 'composite';
        min?: number;
        max?: number;
        placeholder?: string;
        parts?: Array<{
            key: string;
            placeholder?: string;
            min?: number;
            max?: number;
            type?: 'integer' | 'decimal';
        }>;
        partsSeparator?: string;
        partsLabel?: string;
    }>;
}

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
    onScaleChange: (key: string, value: number | null) => void;
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
    riskFlags?: Array<{ label: string; description: string; tag: string }>;
    disciplines?: string[];
}

/* ============================================================
   Helpers
   ============================================================ */

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

type ScaleFieldShape = BuildingTabTemplates['scaleFields'][number];
type ScalePartShape = NonNullable<ScaleFieldShape['parts']>[number];

const scaleInputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--sw-rule-2)',
    padding: '2px 0',
    fontFamily: 'var(--sw-font-mono)',
    fontSize: 14,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--sw-ink)',
    outline: 'none',
};

function parseNumeric(raw: string, type: 'integer' | 'decimal' | undefined) {
    if (raw === '') return null;
    const n = type === 'decimal' ? parseFloat(raw) : parseInt(raw, 10);
    return Number.isFinite(n) ? n : undefined;
}

function ScaleNumberInput({
    id,
    value,
    type,
    min,
    max,
    placeholder,
    onCommit,
    width,
    align,
}: {
    id: string;
    value: string;
    type: 'integer' | 'decimal' | undefined;
    min?: number;
    max?: number;
    placeholder?: string;
    onCommit: (n: number | null) => void;
    width?: number | string;
    align?: 'left' | 'center';
}) {
    const step = type === 'decimal' ? '0.01' : '1';
    return (
        <input
            id={id}
            type="number"
            inputMode={type === 'decimal' ? 'decimal' : 'numeric'}
            value={value}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder ?? '—'}
            // Suppress native spinner buttons (Firefox + WebKit) so the chevron
            // buttons are the only stepper UI; also block mouse-wheel from
            // changing the value when the input has focus.
            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => {
                const parsed = parseNumeric(e.target.value, type);
                if (parsed === undefined) return;
                onCommit(parsed);
            }}
            style={{
                ...scaleInputStyle,
                width: width ?? '100%',
                textAlign: align ?? 'left',
            }}
            onFocus={(e) => {
                e.currentTarget.style.borderBottomColor = 'var(--sw-ink)';
            }}
            onBlur={(e) => {
                e.currentTarget.style.borderBottomColor = 'var(--sw-rule-2)';
            }}
        />
    );
}

function StepperButton({
    direction,
    onClick,
    disabled,
}: {
    direction: 'down' | 'up';
    onClick: () => void;
    disabled?: boolean;
}) {
    const Icon = direction === 'up' ? ChevronRight : ChevronLeft;
    return (
        <button
            type="button"
            tabIndex={-1}
            onClick={onClick}
            disabled={disabled}
            aria-label={direction === 'up' ? 'Increase' : 'Decrease'}
            style={{
                width: 22,
                height: 22,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: 3,
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: 'var(--sw-muted)',
                opacity: disabled ? 0.4 : 1,
                flexShrink: 0,
                padding: 0,
                transition: 'color 100ms',
            }}
            onMouseEnter={(e) => {
                if (disabled) return;
                e.currentTarget.style.color = 'var(--sw-ink)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--sw-muted)';
            }}
        >
            <Icon size={16} strokeWidth={2} />
        </button>
    );
}

function ScaleStepper({
    id,
    value,
    type,
    min,
    max,
    step,
    placeholder,
    onCommit,
    width,
}: {
    id: string;
    value: string;
    type: 'integer' | 'decimal' | undefined;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    onCommit: (n: number | null) => void;
    width?: number;
}) {
    const numeric = value === ''
        ? null
        : type === 'decimal'
            ? parseFloat(value)
            : parseInt(value, 10);
    const stepBy = step ?? 1;

    const bump = (delta: number) => {
        const current = numeric ?? 0;
        let next = current + delta;
        if (min !== undefined && next < min) next = min;
        if (max !== undefined && next > max) next = max;
        onCommit(next);
    };

    const atMin = numeric !== null && min !== undefined && numeric <= min;
    const atMax = numeric !== null && max !== undefined && numeric >= max;

    return (
        <div
            className="flex items-center gap-1.5"
            style={{ flexShrink: 0 }}
        >
            <StepperButton
                direction="down"
                onClick={() => bump(-stepBy)}
                disabled={atMin}
            />
            <ScaleNumberInput
                id={id}
                value={value}
                type={type}
                min={min}
                max={max}
                placeholder={placeholder}
                onCommit={onCommit}
                width={width ?? 64}
                align="center"
            />
            <StepperButton
                direction="up"
                onClick={() => bump(stepBy)}
                disabled={atMax}
            />
        </div>
    );
}

const SCALE_LABEL_WIDTH = 88;

function ScaleFieldCell({
    field,
    scaleData,
    onScaleChange,
}: {
    field: ScaleFieldShape;
    scaleData: Record<string, number | string>;
    onScaleChange: (key: string, value: number | null) => void;
}) {
    const isComposite = field.type === 'composite' && field.parts && field.parts.length > 0;
    const separator = field.partsSeparator ?? '/';

    const labelEl = (
        <label
            htmlFor={`scale-${field.key}`}
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 10,
                color: muted,
                flexShrink: 0,
                width: SCALE_LABEL_WIDTH,
            }}
        >
            {field.label}
        </label>
    );

    if (isComposite) {
        return (
            <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    {labelEl}
                    <div
                        className="flex items-center gap-1"
                        style={{ flexShrink: 0 }}
                    >
                        {field.parts!.map((part: ScalePartShape, i: number) => {
                            const storageKey = `${field.key}_${part.key}`;
                            const raw = scaleData[storageKey];
                            const value =
                                raw === undefined || raw === '' ? '' : String(raw);
                            return (
                                <span
                                    key={part.key}
                                    className="flex items-center gap-1"
                                >
                                    <ScaleNumberInput
                                        id={`scale-${storageKey}`}
                                        value={value}
                                        type={part.type ?? 'integer'}
                                        min={part.min}
                                        max={part.max}
                                        placeholder={part.placeholder}
                                        onCommit={(n) =>
                                            onScaleChange(storageKey, n)
                                        }
                                        width={field.parts!.length >= 4 ? 32 : 48}
                                        align="center"
                                    />
                                    {i < field.parts!.length - 1 ? (
                                        <span
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 14,
                                                color: muted,
                                            }}
                                        >
                                            {separator}
                                        </span>
                                    ) : null}
                                </span>
                            );
                        })}
                    </div>
                </div>
                {field.partsLabel ? (
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: muted,
                            paddingLeft: SCALE_LABEL_WIDTH + 8,
                        }}
                    >
                        {field.partsLabel}
                    </span>
                ) : null}
            </div>
        );
    }

    const raw = scaleData[field.key];
    const value = raw === undefined || raw === '' ? '' : String(raw);

    return (
        <div className="flex items-center gap-2">
            {labelEl}
            <ScaleStepper
                id={`scale-${field.key}`}
                value={value}
                type={field.type === 'composite' ? 'integer' : field.type}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder}
                onCommit={(n) => onScaleChange(field.key, n)}
                width={88}
            />
            {field.unit ? (
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: muted,
                        flexShrink: 0,
                    }}
                >
                    {field.unit}
                </span>
            ) : null}
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
    onScaleChange,
    onComplexityChange,
    onScopeToggle,
    onComplexityLevelChange,
    onScopeLevelChange,
    templates,
    complexityScore = null,
    complexityBand = null,
    riskFlags = [],
    disciplines = [],
}: BuildingTabViewProps) {
    return (
        <div className="flex flex-col gap-4">
            {/* ============================================================
                1. CLASS · TYPE
                ============================================================ */}
            <CardShell label="Class · Type">
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
                                    accent="#236A8B"
                                    onAccent="white"
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
            <CardShell label="Scale">
                {templates.scaleFields.length === 0 ? (
                    <div
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: muted,
                        }}
                    >
                        Select a building class to see scale fields.
                    </div>
                ) : (
                    <div
                        className="grid gap-x-6 gap-y-2"
                        style={{ gridTemplateColumns: '1fr 1fr' }}
                    >
                        {templates.scaleFields.map((field) => (
                            <ScaleFieldCell
                                key={field.key}
                                field={field}
                                scaleData={scaleData}
                                onScaleChange={onScaleChange}
                            />
                        ))}
                    </div>
                )}
            </CardShell>

            {/* ============================================================
                3. COMPLEXITY
                ============================================================ */}
            <CardShell label="Complexity">
                {/* Slider row — left edge aligns with chip column below */}
                <div
                    className="grid items-center gap-3 mb-2"
                    style={{ gridTemplateColumns: '96px 1fr' }}
                >
                    <span />
                    <div style={{ width: '30%' }}>
                        <AggregateSlider
                            value={complexityLevel}
                            onChange={onComplexityLevelChange}
                            leftLabel=""
                            rightLabel=""
                            thumbColor="var(--sw-peach)"
                        />
                    </div>
                </div>
                {/* Dimension chip rows */}
                <div className="flex flex-col gap-2">
                    {templates.complexityDimensions.length === 0 ? (
                        <div
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: muted,
                            }}
                        >
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
                                    style={{ gridTemplateColumns: '96px 1fr' }}
                                >
                                    <span
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 10,
                                            color: muted,
                                        }}
                                    >
                                        {dim.label}
                                    </span>
                                    <div className="flex flex-nowrap gap-1 min-w-0 overflow-hidden">
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
            </CardShell>

            {/* ============================================================
                4. SCOPE OF WORK
                ============================================================ */}
            <CardShell label="Scope">
                {/* Slider row — left edge aligns with chip column below */}
                <div
                    className="grid items-center gap-3 mb-2"
                    style={{ gridTemplateColumns: '96px 1fr' }}
                >
                    <span />
                    <div style={{ width: '30%' }}>
                        <AggregateSlider
                            value={scopeLevel}
                            onChange={onScopeLevelChange}
                            leftLabel=""
                            rightLabel=""
                            ticks={6}
                            thumbColor="var(--sw-cyan)"
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    {templates.scopeGroups.length === 0 ? (
                        <div
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: muted,
                            }}
                        >
                            Select a project type to see scope groups.
                        </div>
                    ) : (
                        templates.scopeGroups.map((g) => (
                            <div
                                key={g.categoryLabel}
                                className="grid items-start gap-3"
                                style={{ gridTemplateColumns: '96px 1fr' }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 10,
                                        color: muted,
                                        paddingTop: 3,
                                    }}
                                >
                                    {g.categoryLabel}
                                </span>
                                <div className="flex flex-nowrap gap-1 min-w-0 overflow-hidden">
                                    {g.items.map((item) => (
                                        <Chip
                                            key={item.value}
                                            label={item.label}
                                            selected={workScope.includes(item.value)}
                                            accent="#1f6486"
                                            onAccent="var(--sw-paper)"
                                            onClick={() => onScopeToggle(item.value)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardShell>

            {/* ============================================================
                5. DISCIPLINES
                ============================================================ */}
            <CardShell label="Disciplines">
                {disciplines.length === 0 ? (
                    <div style={{ fontSize: 13, color: muted }}>—</div>
                ) : (
                    <ul
                        className="m-0 p-0 grid gap-1"
                        style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
                    >
                        {disciplines.map((d) => (
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
            </CardShell>

            {/* ============================================================
                6. RISK FLAGS — collapsed by default; user opts in
                ============================================================ */}
            <CardShell
                label="risk flags"
                meta={riskFlags.length > 0 ? `${riskFlags.length} raised` : 'none raised'}
                collapsible
                defaultCollapsed
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
        </div>
    );
}
