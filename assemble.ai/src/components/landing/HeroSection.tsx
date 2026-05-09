'use client';

import Link from 'next/link';

/**
 * HeroSection — Sitewise / Field Console (Devtools Rose).
 *
 * Recreates the SWDevHero artboard from the Sitewise design canvas:
 * dark warm-ink surface, code-styled query card, syntax-coloured headline.
 */
export function HeroSection() {
    const muted = 'rgba(232,228,218,0.55)';

    return (
        <section
            className="relative overflow-hidden"
            style={{
                background: 'var(--sw-ink)',
                color: '#E8E4DA',
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            {/* Subtle warmth — radial vignettes pulling rose + lavender into the void */}
            <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(1100px 600px at 80% -10%, rgba(248,101,122,0.06), transparent 60%),' +
                        'radial-gradient(900px 500px at -10% 110%, rgba(168,156,217,0.05), transparent 60%)',
                }}
            />

            <div className="relative max-w-[1280px] mx-auto px-8 pt-[120px] pb-[80px]">
                <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.1fr] gap-12 items-center">
                    {/* ---- LEFT: pitch ---- */}
                    <div>
                        <div
                            className="inline-flex items-center gap-2 px-2.5 py-1 mb-6 font-semibold"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose)',
                                background: 'rgba(248,101,122,0.10)',
                                border: '1px solid rgba(248,101,122,0.25)',
                            }}
                        >
                            New · Drawing extraction
                        </div>

                        <h1
                            className="m-0 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(40px, 5.5vw, 64px)',
                                fontWeight: 800,
                                lineHeight: 1.05,
                                letterSpacing: '-0.035em',
                                color: 'var(--sw-paper)',
                            }}
                        >
                            Frustrated that your tenders go out{' '}
                            <span style={{ color: 'var(--sw-rose)' }}>rushed</span>
                            {' '}— and come back{' '}
                            <span style={{ color: 'var(--sw-peach)' }}>priced for it</span>?
                        </h1>

                        <p
                            className="mt-6 max-w-[520px]"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 16,
                                lineHeight: 1.6,
                                color: 'rgba(232,228,218,0.7)',
                            }}
                        >
                            Sitewise is the runtime for construction projects. Sharp scopes, the right firms,
                            proper process — every tender to standard, at speed.
                        </p>

                        <div className="flex flex-wrap gap-2.5 mt-7">
                            <Link
                                href="/register"
                                className="inline-flex items-center gap-2 px-[18px] py-3 font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    background: 'var(--sw-rose)',
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                Start free trial →
                            </Link>
                            <Link
                                href="/assessment"
                                className="inline-flex items-center gap-2 px-[18px] py-3 font-bold uppercase tracking-[0.12em] transition-colors hover:bg-white/5"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    color: '#E8E4DA',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                    background: 'transparent',
                                }}
                            >
                                Take the 3-min Health Check →
                            </Link>
                        </div>

                        <div
                            className="mt-10 flex flex-wrap gap-8"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: muted,
                            }}
                        >
                            <Stat color="var(--sw-peach)" value="$2.4B" label="under management" />
                            <Stat color="var(--sw-lav)" value="340" label="active projects" />
                            <Stat color="var(--sw-cyan)" value="4.1M" label="documents indexed" />
                        </div>
                    </div>

                    {/* ---- RIGHT: code-styled query card ---- */}
                    <QueryCard muted={muted} />
                </div>

                {/* Footer rule — keeps the spec-sheet beat */}
                <div
                    className="mt-16 pt-4 border-t flex items-center justify-between"
                    style={{
                        borderColor: 'rgba(255,255,255,0.07)',
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'rgba(232,228,218,0.4)',
                    }}
                >
                    <span>SITEWISE · FIELD CONSOLE</span>
                    <span className="hidden sm:inline" style={{ color: 'var(--sw-rose)' }}>
                        ACCENT — DEVTOOLS ROSE
                    </span>
                    <span>REV — A</span>
                </div>
            </div>
        </section>
    );
}

function Stat({ color, value, label }: { color: string; value: string; label: string }) {
    return (
        <div>
            <div
                style={{
                    fontFamily: 'var(--sw-font-sans)',
                    fontSize: 22,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                    color,
                }}
            >
                {value}
            </div>
            <div className="mt-1">{label}</div>
        </div>
    );
}

function QueryCard({ muted }: { muted: string }) {
    const sources: Array<{ color: string; text: string }> = [
        { color: 'var(--sw-cyan)', text: 'CC-51 · Façade detail pack' },
        { color: 'var(--sw-lav)', text: 'VAR-014 · Stone cladding' },
        { color: 'var(--sw-lav)', text: 'VAR-019 · Window framing' },
        { color: 'var(--sw-peach)', text: 'TEND-003 · PTW evaluation' },
    ];

    return (
        <div
            className="overflow-hidden rounded-[4px]"
            style={{
                background: 'var(--sw-ink-2)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6)',
            }}
        >
            {/* Title bar */}
            <div
                className="flex items-center justify-between px-3.5 py-2.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div className="flex gap-1.5" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--sw-rose)', opacity: 0.7 }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--sw-amber)', opacity: 0.7 }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--sw-cyan)', opacity: 0.6 }} />
                </div>
                <div style={{ fontFamily: 'var(--sw-font-mono)', fontSize: 11, color: muted }}>
                    <span style={{ color: 'var(--sw-lav)' }}>~/</span>
                    <span>sitewise/mosaic-apts</span>
                </div>
                <div style={{ fontFamily: 'var(--sw-font-mono)', fontSize: 10, color: 'var(--sw-amber)' }}>● live</div>
            </div>

            {/* Query line */}
            <div className="px-[18px] py-4" style={{ fontFamily: 'var(--sw-font-mono)', fontSize: 13, lineHeight: 1.7 }}>
                <div style={{ color: muted, fontSize: 11, marginBottom: 6 }}>// Ask Sitewise</div>
                <div>
                    <span style={{ color: 'var(--sw-lav)' }}>sitewise</span>
                    <span style={{ color: muted }}>.</span>
                    <span style={{ color: 'var(--sw-cyan)' }}>ask</span>
                    <span style={{ color: muted }}>(</span>
                    <span style={{ color: 'var(--sw-peach)' }}>
                        &quot;What&apos;s our exposure on the façade trade?&quot;
                    </span>
                    <span style={{ color: muted }}>)</span>
                </div>
            </div>

            {/* Result panel */}
            <div className="px-[18px] py-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                    className="mb-2"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-rose)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                    }}
                >
                    ↳ Answer · grounded
                </div>
                <div
                    style={{
                        fontFamily: 'var(--sw-font-body)',
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: 'var(--sw-paper)',
                    }}
                >
                    Façade trade exposure is{' '}
                    <Tok color="var(--sw-peach)" bold>
                        $3.05M
                    </Tok>{' '}
                    forecast vs <Tok color={muted}>$3.18M</Tok> budget. Two open variations{' '}
                    <Tok color="var(--sw-lav)">(VAR-014, VAR-019)</Tok> totalling{' '}
                    <Tok color="var(--sw-peach)" bold>
                        +$210K
                    </Tok>{' '}
                    would push it{' '}
                    <span style={{ color: 'var(--sw-rose)', fontWeight: 600 }}>+2.6% over</span>.
                </div>
            </div>

            {/* Sources strip */}
            <div
                className="px-[18px] pt-3 pb-4 flex flex-wrap gap-1.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div
                    className="w-full mb-1.5"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: muted,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                    }}
                >
                    sources · {sources.length}
                </div>
                {sources.map((src) => (
                    <span
                        key={src.text}
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            padding: '4px 8px',
                            border: `1px solid ${src.color}33`,
                            color: src.color,
                            background: `${src.color}10`,
                        }}
                    >
                        {src.text}
                    </span>
                ))}
            </div>
        </div>
    );
}

function Tok({
    color,
    bold,
    children,
}: {
    color: string;
    bold?: boolean;
    children: React.ReactNode;
}) {
    return (
        <span
            style={{
                fontFamily: 'var(--sw-font-mono)',
                color,
                fontWeight: bold ? 600 : undefined,
            }}
        >
            {children}
        </span>
    );
}
