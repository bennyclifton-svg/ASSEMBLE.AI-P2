import { ScrollReveal } from './shared/ScrollReveal';
import { aboutAuthorContent } from './data/landing-data';

type Institution = (typeof aboutAuthorContent.institutions)[number];

function MarqueeRow({ logos, direction }: { logos: Institution[]; direction: 'rtl' | 'ltr' }) {
    const doubled = [...logos, ...logos];
    const animationClass = direction === 'rtl' ? 'animate-marquee-rtl' : 'animate-marquee-ltr';
    return (
        <div className="overflow-hidden marquee-fade">
            <div className={`flex w-max gap-12 md:gap-16 ${animationClass}`}>
                {doubled.map((logo, idx) => (
                    <div
                        key={`${logo.name}-${idx}`}
                        title={logo.name}
                        className="flex-shrink-0 flex items-center justify-center"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={logo.src}
                            alt={`${logo.name} logo`}
                            aria-hidden={idx >= logos.length}
                            className="h-12 sm:h-14 md:h-16 w-auto object-contain grayscale opacity-70"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AboutAuthorSection() {
    const half = Math.ceil(aboutAuthorContent.institutions.length / 2);
    const rowOne = aboutAuthorContent.institutions.slice(0, half);
    const rowTwo = aboutAuthorContent.institutions.slice(half);

    return (
        <section
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper-2)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center max-w-5xl mx-auto">
                    <ScrollReveal>
                        <div
                            className="overflow-hidden aspect-[4/5] w-full"
                            style={{
                                border: '1px solid var(--sw-rule)',
                                background: 'var(--sw-paper)',
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={aboutAuthorContent.headshot.src}
                                alt={aboutAuthorContent.headshot.alt}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </ScrollReveal>

                    <ScrollReveal delay={100}>
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
                            // {aboutAuthorContent.label}
                        </p>
                        <h2
                            className="mb-6 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(28px, 3.4vw, 42px)',
                                fontWeight: 700,
                                lineHeight: 1.15,
                                letterSpacing: '-0.025em',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            {aboutAuthorContent.headline}
                        </h2>
                        <div className="space-y-4 mb-8">
                            {aboutAuthorContent.bio.map((paragraph, idx) => (
                                <p
                                    key={idx}
                                    style={{
                                        fontFamily: 'var(--sw-font-body)',
                                        fontSize: 16,
                                        lineHeight: 1.6,
                                        color: 'var(--sw-ink)',
                                    }}
                                >
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                        <ul className="space-y-2">
                            {aboutAuthorContent.qualifications.map((qual) => (
                                <li
                                    key={qual}
                                    className="flex items-start gap-3"
                                    style={{
                                        fontFamily: 'var(--sw-font-body)',
                                        fontSize: 14,
                                        lineHeight: 1.5,
                                        color: 'var(--sw-ink)',
                                    }}
                                >
                                    <span
                                        className="mt-2 flex-shrink-0 inline-block"
                                        style={{
                                            width: 6,
                                            height: 6,
                                            background: 'var(--sw-rose)',
                                        }}
                                        aria-hidden="true"
                                    />
                                    <span>{qual}</span>
                                </li>
                            ))}
                        </ul>
                    </ScrollReveal>
                </div>

                <ScrollReveal delay={200}>
                    <div
                        className="mt-20 pt-12"
                        style={{ borderTop: '1px solid var(--sw-rule)' }}
                    >
                        <p
                            className="text-center mb-10"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-muted)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                            }}
                        >
                            // {aboutAuthorContent.logosCaption}
                        </p>
                        <div className="space-y-8">
                            <MarqueeRow logos={rowOne} direction="rtl" />
                            <MarqueeRow logos={rowTwo} direction="ltr" />
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}
