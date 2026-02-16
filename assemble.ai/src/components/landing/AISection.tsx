import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { Button } from './shared/Button';
import { aiSectionContent } from './data/landing-data';
import { CircuitBoardGraphic } from './CircuitBoardGraphic';

export function AISection() {
    return (
        <SectionContainer pattern="standard" patternOffset={6} background="bg-[var(--gray-50)]" className="py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <ScrollReveal>
                    <div>
                        <p className="text-[var(--gray-500)] text-sm font-medium mb-3">
                            {aiSectionContent.label}
                        </p>
                        <h2 className="serif text-[clamp(36px,4.5vw,56px)] leading-[1.1] text-[var(--gray-800)] mb-6">
                            {aiSectionContent.headline}
                        </h2>
                        <p className="text-[var(--gray-600)] text-lg mb-8 max-w-lg">
                            {aiSectionContent.description}
                        </p>

                    </div>
                </ScrollReveal>

                <ScrollReveal delay={200} className="w-full">
                    <CircuitBoardGraphic />
                </ScrollReveal>
            </div>
        </SectionContainer>
    );
}
