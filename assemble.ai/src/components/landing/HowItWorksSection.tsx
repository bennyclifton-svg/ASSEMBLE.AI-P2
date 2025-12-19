import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { howItWorksContent } from './data/landing-data';

export function HowItWorksSection() {
    return (
        <SectionContainer id="how-it-works" background="bg-white" className="py-24">
            <ScrollReveal>
                <div className="text-center mb-16">
                    <p className="text-[var(--gray-500)] text-sm font-medium mb-3">
                        {howItWorksContent.label}
                    </p>
                    <h2 className="serif text-[clamp(36px,4vw,52px)] leading-[1.1] text-[var(--gray-800)]">
                        {howItWorksContent.headline}
                    </h2>
                </div>
            </ScrollReveal>

            <div className="relative">
                {/* Connecting line - hidden on mobile */}
                <div className="hidden md:block absolute top-[36px] left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-[var(--primary-light)] via-[var(--primary)] to-[var(--primary-light)]" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {howItWorksContent.steps.map((step, index) => (
                        <ScrollReveal key={step.number} delay={index * 150}>
                            <div className="text-center relative">
                                {/* Step number circle */}
                                <div className="w-[72px] h-[72px] rounded-full bg-[var(--primary)] text-white flex items-center justify-center mx-auto mb-6 relative z-10">
                                    <span className="serif text-3xl">{step.number}</span>
                                </div>
                                <h3 className="serif text-[22px] text-[var(--gray-800)] mb-3">
                                    {step.title}
                                </h3>
                                <p className="text-[var(--gray-600)] text-base max-w-xs mx-auto">
                                    {step.description}
                                </p>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </SectionContainer>
    );
}
