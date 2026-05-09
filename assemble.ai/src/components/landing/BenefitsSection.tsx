import { ScrollReveal } from './shared/ScrollReveal';
import { benefitsContent } from './data/landing-data';

const BENEFIT_ACCENTS = [
    'var(--sw-rose)',
    'var(--sw-peach)',
    'var(--sw-lav)',
    'var(--sw-cyan)',
    'var(--sw-amber)',
    'var(--sw-rose-dk)',
];

export function BenefitsSection() {
    return (
        <section
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper-2)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <h2
                        className="text-center mb-12 text-balance"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 'clamp(36px, 4vw, 52px)',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            letterSpacing: '-0.025em',
                            color: 'var(--sw-ink)',
                        }}
                    >
                        Why teams switch to <span style={{ color: 'var(--sw-rose-dk)' }}>sitewise</span>
                    </h2>
                </ScrollReveal>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                    {benefitsContent.benefits.map((benefit, index) => {
                        const accent = BENEFIT_ACCENTS[index % BENEFIT_ACCENTS.length];
                        return (
                            <ScrollReveal key={benefit} delay={index * 80}>
                                <div
                                    className="flex items-start gap-3 p-5 h-full"
                                    style={{
                                        background: 'var(--sw-paper)',
                                        border: '1px solid var(--sw-rule)',
                                        borderLeft: `3px solid ${accent}`,
                                    }}
                                >
                                    <span
                                        className="flex-shrink-0 mt-1 inline-block"
                                        style={{
                                            width: 6,
                                            height: 6,
                                            background: accent,
                                            borderRadius: 0,
                                        }}
                                        aria-hidden="true"
                                    />
                                    <p
                                        style={{
                                            fontFamily: 'var(--sw-font-body)',
                                            fontSize: 15,
                                            lineHeight: 1.55,
                                            color: 'var(--sw-ink)',
                                        }}
                                    >
                                        {benefit}
                                    </p>
                                </div>
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
