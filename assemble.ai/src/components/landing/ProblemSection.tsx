import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { problemContent } from './data/landing-data';
import { FileX, Clock, TrendingDown, Users } from 'lucide-react';

const problemIcons = [FileX, Clock, TrendingDown, Users];

export function ProblemSection() {
    return (
        <SectionContainer pattern="dark" background="bg-black" className="py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <ScrollReveal>
                    <div>
                        <h2 className="serif text-[clamp(36px,4.5vw,56px)] leading-[1.1] text-white mb-6">
                            {problemContent.headline}
                        </h2>
                        <p className="text-[var(--gray-400)] text-lg">
                            {problemContent.description}
                        </p>
                    </div>
                </ScrollReveal>

                <div className="space-y-4">
                    {problemContent.problems.map((problem, index) => {
                        const Icon = problemIcons[index];
                        return (
                            <ScrollReveal key={problem} delay={index * 100}>
                                <div className="group flex items-center gap-4 p-5 rounded-xl border border-[var(--gray-800)] bg-[var(--gray-900)]/50 transition-all hover:border-[var(--gray-700)] hover:translate-x-1">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--gray-800)] flex items-center justify-center flex-shrink-0">
                                        <Icon className="w-5 h-5 text-[var(--gray-400)]" />
                                    </div>
                                    <p className="text-[var(--gray-300)] text-base">
                                        {problem}
                                    </p>
                                </div>
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </SectionContainer>
    );
}
