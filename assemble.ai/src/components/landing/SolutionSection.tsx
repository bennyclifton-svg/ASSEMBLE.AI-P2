import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { solutionContent } from './data/landing-data';

export function SolutionSection() {
    return (
        <SectionContainer pattern="fine" background="bg-white" className="py-24">
            <ScrollReveal>
                <div className="max-w-3xl mx-auto text-center">
                    <p className="text-[var(--primary)] text-sm font-medium mb-3">
                        {solutionContent.label}
                    </p>
                    <h2 className="serif text-[clamp(36px,4.5vw,56px)] leading-[1.1] text-[var(--gray-800)] mb-6">
                        {solutionContent.headline}
                    </h2>
                    <p className="text-[var(--gray-600)] text-lg">
                        {solutionContent.description}
                    </p>
                </div>
            </ScrollReveal>
        </SectionContainer>
    );
}
