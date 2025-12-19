import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { featuresContent } from './data/landing-data';

function FeatureMockup({ index }: { index: number }) {
    // Different mockup styles for visual variety
    const mockupStyles = [
        'from-[var(--primary)] to-[var(--primary-dark)]', // Dashboard
        'from-[var(--gray-700)] to-[var(--gray-800)]', // Document
        'from-[var(--primary-light)] to-[var(--primary)]', // AI
        'from-[var(--gray-600)] to-[var(--gray-700)]', // Cost
        'from-[var(--primary)] to-[var(--primary-light)]', // Hub
        'from-[var(--gray-800)] to-[var(--black)]', // Reports
        'from-[var(--primary-dark)] to-[var(--primary)]', // Knowledge
    ];

    return (
        <div className={`w-full aspect-[4/3] rounded-2xl bg-gradient-to-br ${mockupStyles[index % mockupStyles.length]} shadow-xl flex items-center justify-center overflow-hidden`}>
            <div className="w-[85%] h-[75%] bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 p-4">
                <div className="flex gap-1.5 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--logo-red)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--logo-yellow)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--logo-green)]" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-white/20 rounded w-3/4" />
                    <div className="h-3 bg-white/20 rounded w-1/2" />
                    <div className="h-3 bg-white/20 rounded w-2/3" />
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="h-16 bg-white/15 rounded" />
                        <div className="h-16 bg-white/15 rounded" />
                    </div>
                </div>
            </div>
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
