import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { aboutAuthorContent } from './data/landing-data';

type Institution = (typeof aboutAuthorContent.institutions)[number];

function MarqueeRow({ logos, direction }: { logos: Institution[]; direction: 'rtl' | 'ltr' }) {
    // Duplicate the list so the -50% translate completes one full visual cycle seamlessly.
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
        <SectionContainer background="bg-white" className="py-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center max-w-5xl mx-auto">
                {/* Headshot */}
                <ScrollReveal>
                    <div className="rounded-2xl overflow-hidden border border-[var(--gray-200)] bg-[var(--gray-50)] aspect-[4/5] w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={aboutAuthorContent.headshot.src}
                            alt={aboutAuthorContent.headshot.alt}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </ScrollReveal>

                {/* Content */}
                <ScrollReveal delay={100}>
                    <p className="text-[var(--gray-500)] text-sm font-medium mb-3 uppercase tracking-widest">
                        {aboutAuthorContent.label}
                    </p>
                    <h2 className="serif text-[clamp(28px,3.5vw,44px)] leading-[1.15] text-[var(--gray-800)] mb-6">
                        {aboutAuthorContent.headline}
                    </h2>
                    <div className="space-y-4 mb-8">
                        {aboutAuthorContent.bio.map((paragraph, idx) => (
                            <p key={idx} className="text-[var(--gray-700)] text-base lg:text-lg leading-relaxed">
                                {paragraph}
                            </p>
                        ))}
                    </div>
                    <ul className="space-y-3">
                        {aboutAuthorContent.qualifications.map((qual) => (
                            <li key={qual} className="flex items-start gap-3 text-[var(--gray-700)]">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />
                                <span>{qual}</span>
                            </li>
                        ))}
                    </ul>
                </ScrollReveal>
            </div>

            {/* Institution logos — dual-direction marquee */}
            <ScrollReveal delay={200}>
                <div className="mt-20 pt-12 border-t border-[var(--gray-200)]">
                    <p className="text-center text-[var(--gray-500)] text-sm font-medium mb-10">
                        {aboutAuthorContent.logosCaption}
                    </p>
                    <div className="space-y-8">
                        <MarqueeRow logos={rowOne} direction="rtl" />
                        <MarqueeRow logos={rowTwo} direction="ltr" />
                    </div>
                </div>
            </ScrollReveal>
        </SectionContainer>
    );
}
