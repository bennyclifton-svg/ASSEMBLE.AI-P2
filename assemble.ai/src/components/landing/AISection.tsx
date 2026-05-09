import { ScrollReveal } from './shared/ScrollReveal';
import { aiSectionContent } from './data/landing-data';

/**
 * AISection — Devtools Rose dialect.
 *
 * Replaces the old CircuitBoardGraphic with a code-styled "construction
 * intelligence" panel that speaks the same language as the Hero query card.
 */
export function AISection() {
    return (
        <section
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <ScrollReveal>
                        <div>
                            <p
                                className="mb-3"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 11,
                                    color: 'var(--sw-rose-dk)',
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                }}
                            >
                                // {aiSectionContent.label}
                            </p>
                            <h2
                                className="m-0 text-balance"
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 'clamp(36px, 4.5vw, 56px)',
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.03em',
                                    color: 'var(--sw-ink)',
                                    marginBottom: 24,
                                }}
                            >
                                {aiSectionContent.headline}
                            </h2>
                            <p
                                className="max-w-lg"
                                style={{
                                    fontFamily: 'var(--sw-font-body)',
                                    fontSize: 17,
                                    lineHeight: 1.6,
                                    color: 'var(--sw-muted)',
                                }}
                            >
                                {aiSectionContent.description}
                            </p>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal delay={200} className="w-full">
                        <KnowledgeStackPanel />
                    </ScrollReveal>
                </div>
            </div>
        </section>
    );
}

function KnowledgeStackPanel() {
    const sources: Array<{ id: string; label: string; color: string; meta: string }> = [
        { id: 'NCC-2022', label: 'National Construction Code', color: 'var(--sw-cyan)', meta: 'A1 · Vol 1 · Performance' },
        { id: 'AS-4000', label: 'AS 4000-1997 General Conditions', color: 'var(--sw-cyan)', meta: 'cl. 1–46 · variations · EOT' },
        { id: 'AIQS', label: 'AIQS cost-plan elements', color: 'var(--sw-peach)', meta: 'AS-4536 · 1.0–9.0' },
        { id: 'RAW', label: 'Rawlinsons handbook', color: 'var(--sw-peach)', meta: '2026 ed. · NSW rates' },
        { id: 'LGA', label: 'Local DCPs · selected LGAs', color: 'var(--sw-lav)', meta: 'Sydney · North Sydney · Inner West' },
        { id: 'ABIC', label: 'ABIC MW-1 contract', color: 'var(--sw-lav)', meta: 'cl. A–U · standard amendments' },
    ];

    return (
        <div
            className="overflow-hidden"
            style={{
                background: 'var(--sw-ink)',
                color: '#E8E4DA',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 30px 80px -20px rgba(0,0,0,0.45)',
            }}
        >
            <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'rgba(232,228,218,0.55)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                    }}
                >
                    knowledge.stack
                </div>
                <div
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-amber)',
                    }}
                >
                    ● 6 sources · live
                </div>
            </div>

            <ul className="m-0 p-0">
                {sources.map((s, i) => (
                    <li
                        key={s.id}
                        className="grid items-center gap-4 px-4 py-3.5"
                        style={{
                            gridTemplateColumns: '120px 1fr 200px',
                            borderBottom:
                                i < sources.length - 1
                                    ? '1px solid rgba(255,255,255,0.05)'
                                    : 'none',
                        }}
                    >
                        <span
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: s.color,
                                letterSpacing: '0.02em',
                            }}
                        >
                            {s.id}
                        </span>
                        <span
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#E8E4DA',
                            }}
                        >
                            {s.label}
                        </span>
                        <span
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'rgba(232,228,218,0.55)',
                                textAlign: 'right',
                            }}
                        >
                            {s.meta}
                        </span>
                    </li>
                ))}
            </ul>

            <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'var(--sw-ink-2)',
                }}
            >
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 11,
                        color: 'rgba(232,228,218,0.7)',
                    }}
                >
                    <span style={{ color: 'var(--sw-rose)' }}>↳</span> grounded · cited · reviewable
                </span>
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'rgba(232,228,218,0.4)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                    }}
                >
                    NSW · v2.4
                </span>
            </div>
        </div>
    );
}
