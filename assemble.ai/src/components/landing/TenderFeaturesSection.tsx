import { ClipboardList, GitCompare, ScrollText } from 'lucide-react';
import { ScrollReveal } from './shared/ScrollReveal';

const FEATURES = [
    {
        code: '01',
        title: 'Scope packages',
        body: 'Turn project requirements into tenderable scopes, inclusions, exclusions and deliverables.',
        icon: ClipboardList,
        accent: 'var(--sw-rose)',
    },
    {
        code: '02',
        title: 'Compare submissions',
        body: 'Review price, scope gaps, qualifications and non-price criteria in a structured evaluation.',
        icon: GitCompare,
        accent: 'var(--sw-cyan)',
    },
    {
        code: '03',
        title: 'Generate award reports',
        body: 'Draft tender recommendations from the evidence already captured in the workspace.',
        icon: ScrollText,
        accent: 'var(--sw-amber)',
    },
];

export function TenderFeaturesSection() {
    return (
        <section
            id="features"
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <div className="max-w-3xl mb-12">
                        <p
                            className="mb-3"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose-dk)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}
                        >
                            {'// One module · Procurement Agent'}
                        </p>
                        <h2
                            className="m-0 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(34px, 4.4vw, 56px)',
                                fontWeight: 800,
                                lineHeight: 1.05,
                                letterSpacing: '-0.03em',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Starting with the most painful module — tender.
                        </h2>
                        <p
                            className="mt-5 mb-0 max-w-[680px]"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 17,
                                lineHeight: 1.6,
                                color: 'var(--sw-muted)',
                            }}
                        >
                            The Procurement Agent runs every tender package from scope to award. It&apos;s
                            the deepest module today; the rest of the team works the same way.
                        </p>
                    </div>
                </ScrollReveal>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {FEATURES.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <ScrollReveal key={feature.title} delay={index * 70}>
                                <article
                                    className="h-full p-5"
                                    style={{
                                        background: 'var(--sw-paper-2)',
                                        border: '1px solid var(--sw-rule)',
                                        borderTop: `3px solid ${feature.accent}`,
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 10,
                                                color: feature.accent,
                                                letterSpacing: '0.18em',
                                                fontWeight: 700,
                                            }}
                                        >
                                            F-{feature.code}
                                        </span>
                                        <Icon size={18} strokeWidth={1.8} style={{ color: feature.accent }} />
                                    </div>
                                    <h3
                                        className="mt-5 mb-3"
                                        style={{
                                            fontFamily: 'var(--sw-font-sans)',
                                            fontSize: 20,
                                            fontWeight: 700,
                                            lineHeight: 1.15,
                                            letterSpacing: '-0.015em',
                                            color: 'var(--sw-ink)',
                                        }}
                                    >
                                        {feature.title}
                                    </h3>
                                    <p
                                        className="m-0"
                                        style={{
                                            fontFamily: 'var(--sw-font-body)',
                                            fontSize: 14,
                                            lineHeight: 1.55,
                                            color: 'var(--sw-muted)',
                                        }}
                                    >
                                        {feature.body}
                                    </p>
                                </article>
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
