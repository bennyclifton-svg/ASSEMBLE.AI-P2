import { ScrollReveal } from './shared/ScrollReveal';
import { problemContent } from './data/landing-data';

const PROBLEM_ACCENTS: Array<{ color: string; tag: string }> = [
    { color: 'var(--sw-rose)', tag: 'ERR' },
    { color: 'var(--sw-amber)', tag: 'WARN' },
    { color: 'var(--sw-peach)', tag: 'COST' },
    { color: 'var(--sw-lav)', tag: 'TEAM' },
];

export function ProblemSection() {
    return (
        <section
            className="relative overflow-hidden py-24"
            style={{
                background: 'var(--sw-ink)',
                color: '#E8E4DA',
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            {/* warm radial vignette */}
            <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(900px 500px at 80% 0%, rgba(248,101,122,0.06), transparent 60%)',
                }}
            />

            <div className="relative max-w-[1280px] mx-auto px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <ScrollReveal>
                        <div>
                            <p
                                className="mb-3"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 11,
                                    color: 'var(--sw-rose)',
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                }}
                            >
                                // The problem
                            </p>
                            <h2
                                className="m-0 text-balance"
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 'clamp(36px, 4.5vw, 56px)',
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.03em',
                                    color: 'var(--sw-paper)',
                                    marginBottom: 24,
                                }}
                            >
                                {problemContent.headline}
                            </h2>
                            <p
                                style={{
                                    fontFamily: 'var(--sw-font-body)',
                                    fontSize: 17,
                                    lineHeight: 1.6,
                                    color: 'rgba(232,228,218,0.7)',
                                }}
                            >
                                {problemContent.description}
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="space-y-3">
                        {problemContent.problems.map((problem, index) => {
                            const accent = PROBLEM_ACCENTS[index % PROBLEM_ACCENTS.length];
                            return (
                                <ScrollReveal key={problem} delay={index * 100}>
                                    <div
                                        className="group flex items-center gap-4 p-5 transition-all hover:translate-x-1"
                                        style={{
                                            background: 'var(--sw-ink-2)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderLeft: `3px solid ${accent.color}`,
                                        }}
                                    >
                                        <span
                                            className="flex-shrink-0 px-2 py-1"
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                letterSpacing: '0.18em',
                                                color: accent.color,
                                                background: `${accent.color}15`,
                                                border: `1px solid ${accent.color}33`,
                                            }}
                                        >
                                            {accent.tag}
                                        </span>
                                        <span
                                            style={{
                                                fontFamily: 'var(--sw-font-body)',
                                                fontSize: 16,
                                                color: '#E8E4DA',
                                            }}
                                        >
                                            {problem}
                                        </span>
                                        <span
                                            className="ml-auto"
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 12,
                                                color: 'rgba(232,228,218,0.4)',
                                            }}
                                            aria-hidden="true"
                                        >
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                </ScrollReveal>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
