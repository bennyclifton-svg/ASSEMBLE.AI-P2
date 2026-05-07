'use client';

/**
 * Brief Wireframe — Option B (design language applied to existing rich content).
 *
 * Static mockup for design iteration. URL: /dev/brief-wireframe
 *
 * Revision notes
 * - Overview / Profile dropped from left nav (Brief is the first item)
 * - Complexity / Scope of Work shown as chip rows so the user can read the
 *   severity options inline; aggregate slider beneath each section sets a
 *   baseline that the user then fine-tunes via the chips
 */

import { useState } from 'react';
import Link from 'next/link';
import { SitewiseWordmark } from '@/components/brand/SitewiseWordmark';
import { AlertTriangle, ArrowUpRight, ChevronDown, ChevronRight } from 'lucide-react';
import { Chip, CardShell, AggregateSlider } from '@/components/brief/primitives';

const muted = 'var(--sw-muted)';

export default function BriefWireframe() {
    return (
        <div
            className="min-h-screen w-full grid"
            style={{
                gridTemplateColumns: '224px 1fr 320px',
                background: 'var(--sw-paper)',
                color: 'var(--sw-ink)',
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            <LeftNav />
            <MiddlePanel />
            <RightRail />
        </div>
    );
}

/* ============================================================
   LEFT NAV — wordmark, project switcher, vertical menu, ask card
   ============================================================ */
function LeftNav() {
    const items: Array<{ label: string; kbd: string; active?: boolean }> = [
        { label: 'Brief', kbd: '⌥1', active: true },
        { label: 'Cost Planning', kbd: '⌥2' },
        { label: 'Program', kbd: '⌥3' },
        { label: 'Procurement', kbd: '⌥4' },
        { label: 'Notes', kbd: '⌥5' },
        { label: 'Meet & Report', kbd: '⌥6' },
        { label: 'Documents', kbd: '⌥7' },
    ];

    return (
        <aside
            className="flex flex-col gap-4 p-4 h-screen sticky top-0"
            style={{
                background: 'var(--sw-paper-2)',
                borderRight: '1px solid var(--sw-rule)',
            }}
        >
            <div className="pt-1">
                <SitewiseWordmark size={20} color="var(--sw-ink)" accent="var(--sw-rose)" />
            </div>

            {/* Project switcher card */}
            <button
                type="button"
                className="flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-white"
                style={{
                    background: 'white',
                    border: '1px solid var(--sw-rule)',
                }}
            >
                <span className="flex flex-col items-start">
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: muted,
                            letterSpacing: '0.05em',
                        }}
                    >
                        foundry/
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>mosaic-apts</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5" style={{ color: muted }} />
            </button>

            {/* Nav items */}
            <nav className="flex flex-col gap-px">
                {items.map((item) => (
                    <NavItem key={item.label} {...item} />
                ))}
            </nav>

            {/* Ask card pinned to bottom */}
            <div className="mt-auto">
                <div
                    className="p-3"
                    style={{
                        background: 'white',
                        border: '1px solid var(--sw-rule)',
                    }}
                >
                    <div
                        className="mb-2"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'var(--sw-rose-dk)',
                            letterSpacing: '0.1em',
                        }}
                    >
                        // ASK
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                        What&apos;s the BCA classification?
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                        <span
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: muted,
                            }}
                        >
                            ⌘K
                        </span>
                        <span
                            style={{
                                background: 'var(--sw-rose)',
                                color: 'var(--sw-ink)',
                                padding: '2px 6px',
                                fontSize: 10,
                                fontFamily: 'var(--sw-font-mono)',
                                fontWeight: 700,
                            }}
                        >
                            ↵
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function NavItem({ label, kbd, active }: { label: string; kbd: string; active?: boolean }) {
    return (
        <div
            className="flex items-center justify-between px-2.5 py-2 transition-colors"
            style={{
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--sw-ink)' : muted,
                background: active ? 'white' : 'transparent',
                border: active ? '1px solid var(--sw-rule)' : '1px solid transparent',
                borderLeft: active ? '2px solid var(--sw-rose)' : '2px solid transparent',
                cursor: 'pointer',
            }}
        >
            <span>{label}</span>
            <span
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: muted,
                    opacity: 0.7,
                }}
            >
                {kbd}
            </span>
        </div>
    );
}

/* ============================================================
   MIDDLE PANEL — chrome (breadcrumb, title, sub-tabs) + 2-col grid
   ============================================================ */
function MiddlePanel() {
    return (
        <main className="flex flex-col min-h-screen overflow-y-auto" style={{ padding: '20px 28px 64px' }}>
            <ChromeStrip />
            <TitleBlock />
            <SubTabs />

            <div className="grid gap-5 mt-5" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
                {/* LEFT COLUMN — taxonomy + scale + complexity + scope + ncc + risks + disciplines */}
                <div className="flex flex-col gap-4">
                    <ClassTypeCard />
                    <ScaleCard />
                    <ComplexityCard />
                    <ScopeOfWorkCard />
                    <NCCEstCostStrip />
                    <RiskFlagsCard />
                    <DisciplinesCard />
                </div>

                {/* RIGHT COLUMN — AI brief preview (sticky so it stays visible) */}
                <aside className="self-start sticky top-5 flex flex-col gap-3">
                    <BriefStatusStrip />
                    <NarrativeCard />
                    <InferredObjectivesCard />
                    <SourcesFooter />
                </aside>
            </div>
        </main>
    );
}

function ChromeStrip() {
    return (
        <div className="flex items-center justify-between mb-5">
            <div
                className="flex items-center gap-2"
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 12,
                    color: muted,
                }}
            >
                <span>foundry</span>
                <span style={{ opacity: 0.5 }}>/</span>
                <span>mosaic-apts</span>
                <span style={{ opacity: 0.5 }}>/</span>
                <span style={{ color: 'var(--sw-ink)' }}>brief</span>
                <span style={{ opacity: 0.5 }}>/</span>
                <span style={{ color: 'var(--sw-ink)' }}>building</span>
            </div>
            <div className="flex gap-1.5">
                <StatusPill label="profile: 92% complete" />
                <StatusPill label="stage: detail design" tone="rose" />
            </div>
        </div>
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

function TitleBlock() {
    return (
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
                    }}
                >
                    Brief
                </h1>
                <div
                    className="mt-1"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 12,
                        color: muted,
                    }}
                >
                    residential · apartments · class 2 · 9 storeys · 87 units ·{' '}
                    <span style={{ color: 'var(--sw-rose-dk)' }}>regenerated 14:18:42</span> ·{' '}
                    <span style={{ color: 'var(--sw-rose-dk)' }}>2 fields incomplete</span>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
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
                        cursor: 'pointer',
                    }}
                >
                    Regenerate brief →
                </button>
            </div>
        </div>
    );
}

function SubTabs() {
    const tabs: Array<{ label: string; meta: string; active?: boolean }> = [
        { label: 'Lot', meta: '14-22 Macquarie St · DP 1184227' },
        { label: 'Building', meta: 'class 2 · 9 storeys · 87 units', active: true },
        { label: 'Objectives', meta: '6 generated · 4 reviewed' },
    ];

    return (
        <div
            className="flex items-end gap-12 pb-3"
            style={{ borderBottom: '1px solid var(--sw-rule)' }}
        >
            {tabs.map((t) => (
                <div key={t.label} className="flex flex-col items-start" style={{ minWidth: 0 }}>
                    <div
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: muted,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {t.label.toUpperCase()}
                    </div>
                    <div
                        className="mt-0.5 pb-1"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: t.active ? 'var(--sw-ink)' : muted,
                            fontWeight: t.active ? 600 : 400,
                            borderBottom: t.active ? '2px solid var(--sw-rose)' : '2px solid transparent',
                        }}
                    >
                        {t.meta}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ============================================================
   LEFT COLUMN CARDS
   ============================================================ */

function ClassTypeCard() {
    return (
        <CardShell label="Class · Type" meta="auto-resolved domain tags · 14">
            <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                    <div
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: muted,
                            marginBottom: 6,
                        }}
                    >
                        building class
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Chip label="residential" selected accent="var(--sw-ink)" onAccent="white" />
                        <Chip label="commercial" />
                        <Chip label="industrial" />
                        <Chip label="institution" />
                        <Chip label="mixed" />
                        <Chip label="infrastructure" />
                    </div>
                </div>
                <div>
                    <div
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: muted,
                            marginBottom: 6,
                        }}
                    >
                        project type
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Chip label="new" selected />
                        <Chip label="refurb" />
                        <Chip label="extend" />
                        <Chip label="remediation" />
                        <Chip label="advisory" />
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <div
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: muted,
                        marginBottom: 6,
                    }}
                >
                    subclass
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Chip label="house (class 1a)" />
                    <Chip label="apartments (class 2)" selected accent="var(--sw-peach)" />
                    <Chip label="townhouses" />
                    <Chip label="btr" />
                    <Chip label="student housing" />
                    <Chip label="retirement / ilus" />
                    <Chip label="aged care (9c)" />
                    <Chip label="social / affordable" />
                    <Chip label="other" />
                </div>
            </div>
        </CardShell>
    );
}

function ScaleCard() {
    const rows: Array<{ label: string; value: string; note?: string; noteColor?: string }> = [
        { label: 'storeys', value: '9', note: 'mid-rise (4–12)', noteColor: 'var(--sw-cyan)' },
        { label: 'GFA', value: '9,840 m²' },
        { label: 'units', value: '87' },
        {
            label: 'avg unit size',
            value: '108 m²',
            note: 'within typical 50–150',
            noteColor: 'var(--sw-cyan)',
        },
        {
            label: 'unit mix',
            value: '12 / 38 / 32 / 5',
            note: 'studio · 1B · 2B · 3B',
            noteColor: muted,
        },
        { label: 'parking', value: '94 bays · 2 basement levels' },
        { label: 'site area', value: '2,140 m²' },
        { label: 'plot ratio', value: '4.6:1' },
    ];
    return (
        <CardShell label="Scale" meta="per AIQS / Rawlinsons 2025">
            <div className="flex flex-col">
                {rows.map((r, i) => (
                    <div
                        key={r.label}
                        className="grid items-baseline gap-3 py-2"
                        style={{
                            gridTemplateColumns: '160px 1fr 220px',
                            borderBottom: i < rows.length - 1 ? '1px solid var(--sw-rule-2)' : 'none',
                        }}
                    >
                        <span style={{ fontSize: 13, color: muted }}>{r.label}</span>
                        <span
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 14,
                                fontWeight: 600,
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {r.value}
                        </span>
                        {r.note ? (
                            <span
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 11,
                                    color: r.noteColor ?? muted,
                                }}
                            >
                                {r.note}
                            </span>
                        ) : (
                            <span />
                        )}
                    </div>
                ))}
            </div>
        </CardShell>
    );
}

/**
 * Complexity dimensions — each with a list of options, an active index,
 * and the syntax-palette accent the active chip should adopt. The accent
 * is per-dimension because heritage/contamination/site-conditions read as
 * "hazard" (amber), procurement as "identifier" (lavender), quality as
 * "currency" (peach), etc.
 */
const COMPLEXITY_DIMS: Array<{
    label: string;
    options: string[];
    selected: number;
    accent: string;
}> = [
    {
        label: 'Quality tier',
        options: ['Project Home (1.0×)', 'Standard (1.15×)', 'Premium (1.4×)', 'Luxury (1.8×)', 'Ultra-Premium (2.0×)'],
        selected: 2,
        accent: 'var(--sw-peach)',
    },
    {
        label: 'Site conditions',
        options: ['Greenfield', 'Infill', 'Sloping (>15%)', 'Bushfire (BAL 12–29)', 'Flood Overlay', 'Coastal'],
        selected: 2,
        accent: 'var(--sw-amber)',
    },
    {
        label: 'Heritage',
        options: ['None', 'Heritage Overlay', 'Conservation Area', 'Heritage Listed (+15–40%)'],
        selected: 1,
        accent: 'var(--sw-amber)',
    },
    {
        label: 'Approval pathway',
        options: ['CDC / Exempt (4w)', 'Low-Rise Code', 'Standard DA', 'Complex DA', 'State Significant (+15%)'],
        selected: 2,
        accent: 'var(--sw-cyan)',
    },
    {
        label: 'Contamination',
        options: ['Nil / N/A', 'Minor (Fill)', 'Significant (Remediation)', 'Heavily Contaminated (+15%)'],
        selected: 1,
        accent: 'var(--sw-amber)',
    },
    {
        label: 'Access constraints',
        options: ['Unrestricted', 'Urban Constrained', 'Restricted Hours', 'Remote / Difficult'],
        selected: 0,
        accent: 'var(--sw-cyan)',
    },
    {
        label: 'Operational constraints',
        options: ['Vacant / Unoccupied', 'Partial Occupation', 'Live Environment', '24/7 Occupied (+20–40%)'],
        selected: 0,
        accent: 'var(--sw-cyan)',
    },
    {
        label: 'Procurement route',
        options: ['Traditional (lump-sum)', 'Design & Construct', 'ECI (Early Contractor)', 'Managing Contractor', 'Alliance (+10–15%)', 'PPP / Availability'],
        selected: 1,
        accent: 'var(--sw-lav)',
    },
    {
        label: 'Stakeholder complexity',
        options: ['Single Owner', 'Strata / Body Corp.', 'Government Entity', 'Multiple Agencies (+10%)'],
        selected: 1,
        accent: 'var(--sw-lav)',
    },
    {
        label: 'Environmental sensitivity',
        options: ['Standard', 'Sensitive Receiver', 'Protected Habitat (+15%)', 'Aboriginal Heritage (+20–40%)'],
        selected: 1,
        accent: 'var(--sw-amber)',
    },
];

function ComplexityCard() {
    const [aggregate, setAggregate] = useState(80);

    return (
        <CardShell label="Complexity" meta="composite · 9/10 · very high">
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
                    9
                </span>
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 11,
                        color: muted,
                        letterSpacing: '0.02em',
                    }}
                >
                    /10 · contingency band 20–35%
                </span>
            </div>

            {/* Dimension chip rows */}
            <div className="flex flex-col gap-3">
                {COMPLEXITY_DIMS.map((d) => (
                    <div
                        key={d.label}
                        className="grid items-center gap-3"
                        style={{ gridTemplateColumns: '170px 1fr' }}
                    >
                        <span style={{ fontSize: 13, color: 'var(--sw-ink)' }}>{d.label}</span>
                        <div className="flex flex-wrap gap-1">
                            {d.options.map((opt, i) => (
                                <Chip
                                    key={opt}
                                    label={opt}
                                    selected={i === d.selected}
                                    accent={d.accent}
                                    onAccent="var(--sw-ink)"
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Aggregate slider */}
            <div
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid var(--sw-rule-2)' }}
            >
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
                    value={aggregate}
                    onChange={setAggregate}
                    leftLabel="simple"
                    rightLabel="extreme"
                />
            </div>
        </CardShell>
    );
}

const SCOPE_GROUPS: Array<{ label: string; chips: Array<{ label: string; selected?: boolean }> }> = [
    {
        label: 'enabling works',
        chips: [
            { label: 'demolition', selected: true },
            { label: 'site clearance', selected: true },
            { label: 'decontamination', selected: true },
            { label: 'bulk earthworks' },
            { label: 'temporary works' },
            { label: 'utility diversion' },
        ],
    },
    {
        label: 'civil works',
        chips: [
            { label: 'detailed earthworks', selected: true },
            { label: 'site drainage' },
            { label: 'stormwater management' },
            { label: 'internal roads / paving' },
            { label: 'retaining walls' },
        ],
    },
    {
        label: 'structure',
        chips: [
            { label: 'substructure / piling', selected: true },
            { label: 'superstructure', selected: true },
            { label: 'post-tensioning' },
            { label: 'precast elements' },
            { label: 'structural steel' },
            { label: 'mass timber' },
        ],
    },
    {
        label: 'building envelope',
        chips: [
            { label: 'façade system', selected: true },
            { label: 'curtain wall' },
            { label: 'roofing system', selected: true },
            { label: 'glazing / windows', selected: true },
            { label: 'waterproofing' },
        ],
    },
    {
        label: 'building services',
        chips: [
            { label: 'mechanical', selected: true },
            { label: 'electrical', selected: true },
            { label: 'hydraulic', selected: true },
            { label: 'fire services', selected: true },
            { label: 'vertical transport' },
            { label: 'BMS / controls' },
            { label: 'security / access' },
            { label: 'ICT / structured cabling' },
        ],
    },
    {
        label: 'internal fitout',
        chips: [
            { label: 'partitions / internal walls', selected: true },
            { label: 'ceilings' },
            { label: 'flooring' },
            { label: 'joinery / cabinetry' },
            { label: 'specialist fitout' },
        ],
    },
    {
        label: 'external works',
        chips: [
            { label: 'landscaping' },
            { label: 'car parking' },
            { label: 'signage / wayfinding' },
            { label: 'external lighting' },
            { label: 'fencing / gates' },
        ],
    },
];

function ScopeOfWorkCard() {
    const [aggregate, setAggregate] = useState(55);

    return (
        <CardShell label="Scope of Work" meta="22 selected · 18 awaiting">
            <div className="flex flex-col gap-3.5">
                {SCOPE_GROUPS.map((g) => (
                    <div
                        key={g.label}
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
                            {g.label}
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {g.chips.map((c) => (
                                <Chip
                                    key={c.label}
                                    label={c.label}
                                    selected={c.selected}
                                    accent="var(--sw-cyan)"
                                    onAccent="var(--sw-ink)"
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Aggregate slider */}
            <div
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid var(--sw-rule-2)' }}
            >
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
                    value={aggregate}
                    onChange={setAggregate}
                    leftLabel="minimum"
                    rightLabel="full scope"
                    ticks={6}
                />
            </div>
        </CardShell>
    );
}

function NCCEstCostStrip() {
    return (
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
                    Class 2{' '}
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: 'var(--sw-cyan)',
                            fontWeight: 500,
                            letterSpacing: '0.05em',
                        }}
                    >
                        Type A · Vol 1
                    </span>
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
                    <span style={{ color: 'var(--sw-peach)' }}>$22M</span>{' '}
                    <span style={{ color: muted, fontWeight: 400 }}>—</span>{' '}
                    <span style={{ color: 'var(--sw-peach)' }}>$41M</span>
                </div>
            </div>
        </section>
    );
}

function RiskFlagsCard() {
    return (
        <CardShell label="Risk flags" meta="1 raised · 0 acknowledged">
            <div
                className="flex gap-3 p-3"
                style={{
                    background: 'var(--sw-rose-tint)',
                    borderLeft: '3px solid var(--sw-rose)',
                }}
            >
                <AlertTriangle
                    className="flex-shrink-0 mt-0.5"
                    style={{ width: 16, height: 16, color: 'var(--sw-rose-dk)' }}
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
                        Contaminated Land
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
                        Site contamination requires environmental assessment, remediation action plan,
                        and site audit before disturbance.
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
                        <span>flag · contamination</span>
                        <span>·</span>
                        <span>raised · profile</span>
                    </div>
                </div>
            </div>
        </CardShell>
    );
}

function DisciplinesCard() {
    const required = [
        'Architect',
        'BMS',
        'Civil',
        'Demolition',
        'Electrical',
        'Environmental',
        'Façade',
        'Fire engineer',
        'Geotech',
        'Hazmat',
        'Hydraulic',
        'Interior',
        'Landscape',
        'Mechanical',
        'Structural',
        'Surveyor',
        'Traffic',
        'Vertical transport',
    ];
    const suggested = ['Acoustic', 'BCA / NCC consultant'];

    return (
        <CardShell label="Disciplines" meta="18 required · 2 suggested">
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
                    <ul className="m-0 p-0 grid gap-1" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        {required.map((d) => (
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
                    <ul className="m-0 p-0 flex flex-col gap-1">
                        {suggested.map((d) => (
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
                </div>
            </div>
        </CardShell>
    );
}

/* ============================================================
   RIGHT COLUMN — AI Brief preview
   ============================================================ */

function BriefStatusStrip() {
    return (
        <div
            className="flex items-center gap-3 px-3 py-2"
            style={{ background: 'var(--sw-ink)', color: 'var(--sw-paper)' }}
        >
            <span
                className="inline-block"
                style={{ width: 8, height: 8, background: 'var(--sw-rose)', borderRadius: 999 }}
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
                14:18:42 · claude-haiku-4.5 · 1,840 tok
            </span>
        </div>
    );
}

function NarrativeCard() {
    return (
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
                Mosaic Apartments is a{' '}
                <span style={{ background: 'var(--sw-rose-tint)', padding: '0 4px', color: 'var(--sw-rose-dk)' }}>
                    9-storey, 87-unit Class 2 residential
                </span>{' '}
                development in Fullerton NSW, delivered as a{' '}
                <span
                    style={{
                        background: 'rgba(168,156,217,0.15)',
                        padding: '0 4px',
                        color: 'var(--sw-lav)',
                        fontFamily: 'var(--sw-font-mono)',
                    }}
                >
                    lump-sum AS 4000
                </span>{' '}
                head contract on a sloping site adjacent to a heritage façade. The build targets{' '}
                <span
                    style={{
                        background: 'rgba(122,184,194,0.15)',
                        padding: '0 4px',
                        color: 'var(--sw-cyan)',
                        fontFamily: 'var(--sw-font-mono)',
                    }}
                >
                    BASIX 40 and 5★ NABERS
                </span>
                , with two basement levels housing 94 parking bays and a programme constrained by 14
                outstanding DA conditions.
            </p>
        </section>
    );
}

function InferredObjectivesCard() {
    const objectives: Array<{ id: string; text: string; tag: string; accent: string }> = [
        { id: 'OBJ-01', text: 'Achieve PC by 12 Mar 2025 with zero LDs', tag: 'PROGRAMME', accent: 'var(--sw-rose)' },
        { id: 'OBJ-02', text: 'Deliver 87 Class 2 units within $24.83M lump-sum', tag: 'COST', accent: 'var(--sw-peach)' },
        { id: 'OBJ-03', text: 'Maintain BASIX 40 + 5★ NABERS through DD & IFC', tag: 'QUALITY', accent: 'var(--sw-cyan)' },
        { id: 'OBJ-04', text: 'Resolve 14 DA conditions before CC issue', tag: 'AUTHORITY', accent: 'var(--sw-lav)' },
        { id: 'OBJ-05', text: 'Coordinate adj. heritage façade — vibration plan', tag: 'RISK', accent: 'var(--sw-rose)' },
        { id: 'OBJ-06', text: 'Resident communication plan for 2-stage handover', tag: 'STAKEHOLDER', accent: muted },
    ];

    return (
        <section
            style={{
                background: 'white',
                border: '1px solid var(--sw-rule)',
            }}
        >
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
                    Inferred objectives · 6
                </span>
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-rose-dk)',
                        letterSpacing: '0.05em',
                    }}
                >
                    4 reviewed · 2 pending
                </span>
            </div>
            <ul className="m-0 p-0">
                {objectives.map((o, i) => (
                    <li
                        key={o.id}
                        className="grid items-baseline gap-3 px-4 py-2.5"
                        style={{
                            gridTemplateColumns: '60px 1fr 110px',
                            borderBottom:
                                i < objectives.length - 1 ? '1px solid var(--sw-rule-2)' : 'none',
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
                            {o.id}
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
                                color: o.accent,
                                background: `${o.accent}15`,
                                border: `1px solid ${o.accent}33`,
                            }}
                        >
                            <span
                                style={{ width: 6, height: 6, background: o.accent, flexShrink: 0 }}
                            />
                            {o.tag}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function SourcesFooter() {
    return (
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
    );
}

/* ============================================================
   RIGHT RAIL — Documents repository (global)
   ============================================================ */
function RightRail() {
    const docs: Array<{ id: string; name: string; rev: string; subcat: string; selected?: boolean }> = [
        { id: 'CC-47', name: 'Wet Areas — Sheet 2', rev: 'A', subcat: 'Architecture' },
        { id: 'CC-48', name: 'Wet Areas — Sheet 3', rev: 'A', subcat: 'Architecture' },
        { id: 'CC-49', name: 'Wet Areas — Sheet 4', rev: 'A', subcat: 'Architecture' },
        { id: 'CC-50', name: 'Details — AFS', rev: 'B', subcat: 'Architecture' },
        { id: 'CC-51', name: 'Details — AFS', rev: 'B', subcat: 'Architecture' },
        { id: 'CC-52', name: 'Fixtures & Finishes', rev: 'A', subcat: 'Architecture' },
        { id: 'CC-01', name: 'Site Setout Plan', rev: 'D', subcat: 'Architecture' },
        { id: 'CC-02', name: 'Basement 2 Floor Plan', rev: 'F', subcat: 'Architecture' },
        { id: 'CC-19', name: 'General Section C-C', rev: 'C', subcat: 'Architecture' },
        { id: 'CC-20', name: 'General Sections D-D', rev: 'C', subcat: 'Architecture' },
    ];

    return (
        <aside
            className="flex flex-col h-screen sticky top-0"
            style={{
                background: 'var(--sw-paper-2)',
                borderLeft: '1px solid var(--sw-rule)',
            }}
        >
            <header
                className="flex items-center justify-between px-5 py-3"
                style={{
                    borderBottom: '1px solid var(--sw-rule)',
                    minHeight: 57,
                }}
            >
                <div className="flex items-center gap-2.5">
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--sw-rose)' }} />
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 18,
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Documents
                    </span>
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: muted,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            marginLeft: 4,
                        }}
                    >
                        /repo
                    </span>
                </div>
                <div
                    className="flex items-center justify-center"
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: 'var(--sw-ink)',
                        color: 'var(--sw-paper)',
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 11,
                        fontWeight: 700,
                    }}
                >
                    BC
                </div>
            </header>

            <div
                className="flex gap-1.5 px-3 py-2.5"
                style={{ borderBottom: '1px solid var(--sw-rule)' }}
            >
                {[
                    { label: 'Ingest', active: true },
                    { label: 'Planning' },
                    { label: 'Scheme Design' },
                    { label: 'Detail Design' },
                ].map((s) => (
                    <span
                        key={s.label}
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            padding: '4px 8px',
                            background: s.active ? 'white' : 'transparent',
                            border: s.active ? '1px solid var(--sw-cyan)' : '1px solid var(--sw-rule)',
                            color: s.active ? 'var(--sw-cyan)' : muted,
                            letterSpacing: '0.05em',
                            fontWeight: s.active ? 600 : 400,
                        }}
                    >
                        {s.active ? '◆ ' : ''}
                        {s.label}
                    </span>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto">
                <div
                    className="grid items-center gap-2 px-4 py-2"
                    style={{
                        gridTemplateColumns: '60px 1fr 30px 90px',
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: muted,
                        borderBottom: '1px solid var(--sw-rule-2)',
                    }}
                >
                    <span>#</span>
                    <span>name (151)</span>
                    <span>rev</span>
                    <span>subcat</span>
                </div>
                {docs.map((d) => (
                    <div
                        key={d.id}
                        className="grid items-center gap-2 px-4 py-2"
                        style={{
                            gridTemplateColumns: '60px 1fr 30px 90px',
                            fontSize: 12,
                            borderBottom: '1px solid var(--sw-rule-2)',
                            cursor: 'pointer',
                        }}
                    >
                        <span style={{ fontFamily: 'var(--sw-font-mono)', color: muted }}>{d.id}</span>
                        <span style={{ color: 'var(--sw-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.name}
                        </span>
                        <span
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                color: 'var(--sw-cyan)',
                                fontWeight: 600,
                            }}
                        >
                            {d.rev}
                        </span>
                        <span
                            className="inline-flex items-center gap-1"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: muted,
                            }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    background: 'var(--sw-rule)',
                                    flexShrink: 0,
                                }}
                            />
                            {d.subcat}
                        </span>
                    </div>
                ))}
            </div>
        </aside>
    );
}
