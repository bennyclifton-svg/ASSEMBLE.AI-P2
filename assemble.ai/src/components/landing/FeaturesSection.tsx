import Image from 'next/image';
import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { featuresContent } from './data/landing-data';

// Map each feature index to the matching screenshot
const featureImages = [
    { src: '/images/Landing-03.png', alt: 'Project objectives and requirements setup' },      // Project Setup
    { src: '/images/Landing-02.png', alt: 'Cost planning and program overview' },               // Cost Planning
    { src: '/images/Landing-01.png', alt: 'Procurement evaluation and tender management' },     // Procurement
    { src: '/images/Landing-05.png', alt: 'Notes, meetings, and automated reporting' },          // Reporting
    { src: '/images/Landing-04.png', alt: 'Stakeholder and document management' },               // Documents
];

function FeatureMockup({ index }: { index: number }) {
    const image = featureImages[index % featureImages.length];

    return (
        <div className="w-full rounded-2xl shadow-xl overflow-hidden border border-[var(--gray-200)]">
            <Image
                src={image.src}
                alt={image.alt}
                width={1320}
                height={840}
                className="w-full h-auto"
            />
        </div>
    );
}

export function FeaturesSection() {
    return (
        <SectionContainer id="features" background="bg-white" className="py-24">
            <ScrollReveal>
                <div className="text-center mb-20">
                    <p className="text-[var(--gray-500)] text-sm font-medium mb-3">
                        {featuresContent.label}
                    </p>
                    <h2 className="serif text-[clamp(36px,4vw,52px)] leading-[1.1] text-[var(--gray-800)]">
                        {featuresContent.headline}
                    </h2>
                </div>
            </ScrollReveal>

            <div className="space-y-24">
                {featuresContent.features.map((feature, index) => {
                    const isReversed = index % 2 === 1;
                    return (
                        <ScrollReveal key={feature.title} delay={index * 100}>
                            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${isReversed ? 'lg:flex-row-reverse' : ''}`}>
                                {/* Text content */}
                                <div className={`${isReversed ? 'lg:order-2' : 'lg:order-1'}`}>
                                    <h3 className="serif text-[28px] lg:text-[32px] text-[var(--gray-800)] mb-4">
                                        {feature.title}
                                    </h3>
                                    <p className="text-[var(--gray-600)] text-base lg:text-lg mb-6 leading-relaxed">
                                        {feature.description}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-[var(--gray-700)] font-medium">
                                            {feature.benefit}
                                        </span>
                                    </div>
                                </div>
                                {/* Mockup */}
                                <div className={`${isReversed ? 'lg:order-1' : 'lg:order-2'}`}>
                                    <FeatureMockup index={index} />
                                </div>
                            </div>
                        </ScrollReveal>
                    );
                })}
            </div>
        </SectionContainer>
    );
}
