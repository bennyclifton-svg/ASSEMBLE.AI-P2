import { BookOpenCheck, DatabaseZap, FileStack, ShieldCheck } from 'lucide-react';
import { ScrollReveal } from './shared/ScrollReveal';

const SIGNALS = [
    {
        title: 'Project documents',
        body: 'Drawings, briefs, addenda, RFIs, schedules and correspondence stay connected to the tender package.',
        icon: FileStack,
        accent: 'var(--sw-cyan)',
    },
    {
        title: 'Construction standards',
        body: 'Australian construction language, procurement logic and standards context are built into the workflow.',
        icon: BookOpenCheck,
        accent: 'var(--sw-peach)',
    },
    {
        title: 'Package memory',
        body: 'Every tender improves the next one because scope, firms, decisions and reports remain searchable.',
        icon: DatabaseZap,
        accent: 'var(--sw-lav)',
    },
    {
        title: 'Human control',
        body: 'AI drafts and checks. Your team reviews, edits, approves and keeps the commercial judgement.',
        icon: ShieldCheck,
        accent: 'var(--sw-rose)',
    },
];

export function TenderIntelligenceSection() {
    return (
        <section
            className="relative overflow-hidden py-24"
            style={{
                background: 'var(--sw-ink)',
                color: '#E8E4DA',
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(900px 500px at 85% 0%, rgba(248,101,122,0.06), transparent 60%)',
                }}
            />
            <div className="relative max-w-[1280px] mx-auto px-8">
                <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-14 items-start">
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
                                    fontWeight: 700,
                                }}
                            >
                                {'// Why it works'}
                            </p>
                            <h2
                                className="m-0 text-balance"
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 'clamp(34px, 4.4vw, 56px)',
                                    fontWeight: 800,
                                    lineHeight: 1.05,
                                    letterSpacing: '-0.03em',
                                    color: 'var(--sw-paper)',
                                }}
                            >
                                AI that works from your tender evidence, not a blank prompt.
                            </h2>
                            <p
                                className="mt-5 max-w-[560px]"
                                style={{
                                    fontFamily: 'var(--sw-font-body)',
                                    fontSize: 17,
                                    lineHeight: 1.62,
                                    color: 'rgba(232,228,218,0.72)',
                                }}
                            >
                                Sitewise keeps the tender process grounded in the documents, decisions and
                                commercial context already sitting inside the project.
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {SIGNALS.map((signal, index) => {
                            const Icon = signal.icon;
                            return (
                                <ScrollReveal key={signal.title} delay={index * 80}>
                                    <article
                                        className="h-full p-5"
                                        style={{
                                            background: 'var(--sw-ink-2)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderLeft: `3px solid ${signal.accent}`,
                                        }}
                                    >
                                        <Icon size={20} strokeWidth={1.8} style={{ color: signal.accent }} />
                                        <h3
                                            className="mt-4 mb-2"
                                            style={{
                                                fontFamily: 'var(--sw-font-sans)',
                                                fontSize: 20,
                                                fontWeight: 700,
                                                letterSpacing: '-0.015em',
                                                color: 'var(--sw-paper)',
                                            }}
                                        >
                                            {signal.title}
                                        </h3>
                                        <p
                                            className="m-0"
                                            style={{
                                                fontFamily: 'var(--sw-font-body)',
                                                fontSize: 14,
                                                lineHeight: 1.58,
                                                color: 'rgba(232,228,218,0.68)',
                                            }}
                                        >
                                            {signal.body}
                                        </p>
                                    </article>
                                </ScrollReveal>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
