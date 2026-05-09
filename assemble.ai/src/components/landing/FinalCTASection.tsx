import Link from 'next/link';
import { ScrollReveal } from './shared/ScrollReveal';
import { finalCtaContent } from './data/landing-data';

export function FinalCTASection() {
    return (
        <section
            className="relative overflow-hidden py-24"
            style={{
                background: 'var(--sw-ink)',
                color: '#E8E4DA',
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            {/* Warm radial vignettes */}
            <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(900px 500px at 50% 0%, rgba(248,101,122,0.08), transparent 60%),' +
                        'radial-gradient(700px 400px at 50% 110%, rgba(168,156,217,0.05), transparent 60%)',
                }}
            />

            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <div className="text-center max-w-3xl mx-auto">
                        <h2
                            className="m-0 mb-6 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(44px, 5.5vw, 72px)',
                                fontWeight: 800,
                                lineHeight: 1.05,
                                letterSpacing: '-0.045em',
                                color: 'var(--sw-paper)',
                            }}
                        >
                            <span style={{ color: 'rgba(232,228,218,0.55)' }}>
                                {finalCtaContent.headline.gray}
                            </span>{' '}
                            <span style={{ color: 'var(--sw-rose)' }}>
                                {finalCtaContent.headline.accent}
                            </span>
                        </h2>
                        <p
                            className="mb-8"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 17,
                                lineHeight: 1.6,
                                color: 'rgba(232,228,218,0.7)',
                            }}
                        >
                            {finalCtaContent.subtitle}
                        </p>
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2 transition-opacity hover:opacity-90"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 13,
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                padding: '14px 22px',
                                background: 'var(--sw-rose)',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            {finalCtaContent.cta} →
                        </Link>
                        <p
                            className="mt-6"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'rgba(232,228,218,0.45)',
                                letterSpacing: '0.05em',
                            }}
                        >
                            {finalCtaContent.note}
                        </p>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}
