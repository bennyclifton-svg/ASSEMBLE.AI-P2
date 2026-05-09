import Image from 'next/image';
import { ScrollReveal } from './shared/ScrollReveal';
import { featuresContent } from './data/landing-data';

const featureImages = [
    { src: '/images/Landing-03.png', alt: 'Project objectives and requirements setup' },
    { src: '/images/Landing-02.png', alt: 'Cost planning and program overview' },
    { src: '/images/Landing-01.png', alt: 'Procurement evaluation and tender management' },
    { src: '/images/Landing-05.png', alt: 'Notes, meetings, and automated reporting' },
    { src: '/images/Landing-04.png', alt: 'Stakeholder and document management' },
];

const FEATURE_TAGS = [
    { code: 'F-01', accent: 'var(--sw-rose)' },
    { code: 'F-02', accent: 'var(--sw-peach)' },
    { code: 'F-03', accent: 'var(--sw-lav)' },
    { code: 'F-04', accent: 'var(--sw-cyan)' },
    { code: 'F-05', accent: 'var(--sw-amber)' },
];

function FeatureMockup({ index }: { index: number }) {
    const image = featureImages[index % featureImages.length];
    return (
        <div
            className="w-full overflow-hidden"
            style={{
                border: '1px solid var(--sw-rule)',
                background: 'var(--sw-paper-2)',
                boxShadow: '0 12px 32px -16px rgba(14,16,20,0.25)',
            }}
        >
            <Image
                src={image.src}
                alt={image.alt}
                width={1320}
                height={840}
                className="w-full h-auto block"
            />
        </div>
    );
}

export function FeaturesSection() {
    return (
        <section
            id="features"
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <div className="text-center mb-20">
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
                            // {featuresContent.label}
                        </p>
                        <h2
                            className="m-0 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(36px, 4vw, 52px)',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                letterSpacing: '-0.03em',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            {featuresContent.headline}
                        </h2>
                    </div>
                </ScrollReveal>

                <div className="space-y-24">
                    {featuresContent.features.map((feature, index) => {
                        const isReversed = index % 2 === 1;
                        const tag = FEATURE_TAGS[index % FEATURE_TAGS.length];
                        return (
                            <ScrollReveal key={feature.title} delay={index * 100}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                                    {/* Text */}
                                    <div className={isReversed ? 'lg:order-2' : 'lg:order-1'}>
                                        <div
                                            className="inline-flex items-center gap-2 mb-4 px-2 py-1"
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 10,
                                                color: tag.accent,
                                                background: `${tag.accent}15`,
                                                border: `1px solid ${tag.accent}33`,
                                                letterSpacing: '0.18em',
                                                textTransform: 'uppercase',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {tag.code}
                                        </div>
                                        <h3
                                            className="mb-4"
                                            style={{
                                                fontFamily: 'var(--sw-font-sans)',
                                                fontSize: 'clamp(28px, 3vw, 36px)',
                                                fontWeight: 700,
                                                lineHeight: 1.15,
                                                letterSpacing: '-0.025em',
                                                color: 'var(--sw-ink)',
                                            }}
                                        >
                                            {feature.title}
                                        </h3>
                                        <p
                                            className="mb-6"
                                            style={{
                                                fontFamily: 'var(--sw-font-body)',
                                                fontSize: 17,
                                                lineHeight: 1.6,
                                                color: 'var(--sw-muted)',
                                            }}
                                        >
                                            {feature.description}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="inline-block w-3 h-3"
                                                style={{ background: tag.accent }}
                                                aria-hidden="true"
                                            />
                                            <span
                                                style={{
                                                    fontFamily: 'var(--sw-font-mono)',
                                                    fontSize: 13,
                                                    fontWeight: 500,
                                                    color: 'var(--sw-ink)',
                                                    letterSpacing: '0.01em',
                                                }}
                                            >
                                                {feature.benefit}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Mockup */}
                                    <div className={isReversed ? 'lg:order-1' : 'lg:order-2'}>
                                        <FeatureMockup index={index} />
                                    </div>
                                </div>
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
