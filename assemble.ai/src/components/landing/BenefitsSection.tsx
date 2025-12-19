import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { benefitsContent } from './data/landing-data';
import { Check } from 'lucide-react';

export function BenefitsSection() {
    return (
        <SectionContainer background="bg-white" className="py-24">
            <ScrollReveal>
                <h2 className="serif text-[clamp(36px,4vw,52px)] leading-[1.1] text-[var(--gray-800)] text-center mb-12">
                    {benefitsContent.headline}
                </h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {benefitsContent.benefits.map((benefit, index) => (
                    <ScrollReveal key={benefit} delay={index * 100}>
                        <div className="flex items-start gap-4 p-6 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]">
                            <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-[var(--gray-700)] text-base">
                                {benefit}
                            </p>
                        </div>
                    </ScrollReveal>
                ))}
            </div>
        </SectionContainer>
    );
}
