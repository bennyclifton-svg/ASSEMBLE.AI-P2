import { ScrollReveal } from './shared/ScrollReveal';
import { solutionContent } from './data/landing-data';

export function SolutionSection() {
    return (
        <section
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <div className="max-w-3xl mx-auto text-center">
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
                            // {solutionContent.label}
                        </p>
                        {solutionContent.headline && (
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
                                {solutionContent.headline}
                            </h2>
                        )}
                        <p
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 18,
                                lineHeight: 1.7,
                                color: 'var(--sw-ink)',
                                opacity: 0.78,
                            }}
                        >
                            {solutionContent.description}
                        </p>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}
