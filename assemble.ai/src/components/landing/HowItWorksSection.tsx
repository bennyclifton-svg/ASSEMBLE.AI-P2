import { ScrollReveal } from './shared/ScrollReveal';
import { howItWorksContent } from './data/landing-data';

const STEP_ACCENTS = ['var(--sw-rose)', 'var(--sw-peach)', 'var(--sw-cyan)'];

export function HowItWorksSection() {
    return (
        <section
            id="how-it-works"
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <div className="text-center mb-16">
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
                            // {howItWorksContent.label}
                        </p>
                        <h2
                            className="m-0 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(36px, 4vw, 52px)',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                letterSpacing: '-0.025em',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            {howItWorksContent.headline}
                        </h2>
                    </div>
                </ScrollReveal>

                <div className="relative">
                    {/* Connecting rule — drafting line */}
                    <div
                        className="hidden md:block absolute top-[28px] left-[16.67%] right-[16.67%]"
                        style={{
                            height: 1,
                            background:
                                'linear-gradient(90deg, var(--sw-rose-tint) 0%, var(--sw-rose) 50%, var(--sw-rose-tint) 100%)',
                        }}
                        aria-hidden="true"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {howItWorksContent.steps.map((step, index) => {
                            const accent = STEP_ACCENTS[index % STEP_ACCENTS.length];
                            return (
                                <ScrollReveal key={step.number} delay={index * 150}>
                                    <div className="text-center relative">
                                        {/* Step badge — square not circle */}
                                        <div
                                            className="mx-auto mb-6 relative z-10 flex items-center justify-center"
                                            style={{
                                                width: 56,
                                                height: 56,
                                                background: 'var(--sw-paper)',
                                                border: `2px solid ${accent}`,
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 18,
                                                fontWeight: 700,
                                                color: accent,
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            0{step.number}
                                        </div>
                                        <h3
                                            className="mb-3"
                                            style={{
                                                fontFamily: 'var(--sw-font-sans)',
                                                fontSize: 22,
                                                fontWeight: 600,
                                                lineHeight: 1.2,
                                                letterSpacing: '-0.015em',
                                                color: 'var(--sw-ink)',
                                            }}
                                        >
                                            {step.title}
                                        </h3>
                                        <p
                                            className="max-w-xs mx-auto"
                                            style={{
                                                fontFamily: 'var(--sw-font-body)',
                                                fontSize: 15,
                                                lineHeight: 1.55,
                                                color: 'var(--sw-muted)',
                                            }}
                                        >
                                            {step.description}
                                        </p>
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
