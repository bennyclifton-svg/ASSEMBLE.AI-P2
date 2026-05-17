import { ScrollReveal } from './shared/ScrollReveal';

const LOGOS = [
    { name: 'Health Infrastructure NSW', src: '/images/trust-logos/health-infrastructure-nsw.jpg' },
    { name: 'Schools Infrastructure NSW', src: '/images/trust-logos/schools-infrastructure-nsw.png' },
    { name: 'TAFE NSW', src: '/images/trust-logos/tafe-nsw.png' },
    { name: 'CBUS', src: '/images/trust-logos/cbus.png' },
    { name: 'Stockland', src: '/images/trust-logos/stockland.png' },
    { name: 'NCC', src: '/images/trust-logos/ncc.jpg' },
];

const PROOF_POINTS = [
    '20+ years across feasibility, design, procurement and delivery.',
    'Experience with NSW Health, Schools Infrastructure NSW and TAFE NSW frameworks.',
    'Built for Australian building projects, not generic task management.',
];

export function TenderCredibilitySection() {
    return (
        <section
            className="relative overflow-hidden py-20"
            style={{ background: 'var(--sw-paper-2)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <div className="grid grid-cols-1 lg:grid-cols-[0.78fr_1.22fr] gap-12 items-center">
                    <ScrollReveal>
                        <div className="grid grid-cols-[92px_1fr] gap-5 items-center">
                            <div
                                className="w-[92px] h-[92px] flex items-center justify-center"
                                style={{
                                    border: '1px solid var(--sw-rule)',
                                    background: 'var(--sw-ink)',
                                    color: 'var(--sw-rose)',
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 22,
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                }}
                                aria-hidden="true"
                            >
                                BC
                            </div>
                            <div>
                                <p
                                    className="mb-2"
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 11,
                                        color: 'var(--sw-rose-dk)',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        fontWeight: 700,
                                    }}
                                >
                                    {'// Built from the work'}
                                </p>
                                <h2
                                    className="m-0 text-balance"
                                    style={{
                                        fontFamily: 'var(--sw-font-sans)',
                                        fontSize: 'clamp(28px, 3.2vw, 40px)',
                                        fontWeight: 800,
                                        lineHeight: 1.1,
                                        letterSpacing: '-0.025em',
                                        color: 'var(--sw-ink)',
                                    }}
                                >
                                    Tender systems shaped by real project delivery.
                                </h2>
                            </div>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal delay={120}>
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {PROOF_POINTS.map((point) => (
                                    <div
                                        key={point}
                                        className="p-4"
                                        style={{
                                            background: 'var(--sw-paper)',
                                            border: '1px solid var(--sw-rule)',
                                            borderLeft: '3px solid var(--sw-rose)',
                                        }}
                                    >
                                        <p
                                            className="m-0"
                                            style={{
                                                fontFamily: 'var(--sw-font-body)',
                                                fontSize: 14,
                                                lineHeight: 1.5,
                                                color: 'var(--sw-ink)',
                                            }}
                                        >
                                            {point}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div
                                className="mt-8 pt-7 grid grid-cols-3 md:grid-cols-6 gap-6 items-center"
                                style={{ borderTop: '1px solid var(--sw-rule)' }}
                            >
                                {LOGOS.map((logo) => (
                                    <div key={logo.name} className="flex items-center justify-center" title={logo.name}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={logo.src}
                                            alt={`${logo.name} logo`}
                                            className="h-9 sm:h-11 w-auto object-contain grayscale opacity-70"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </div>
        </section>
    );
}
