import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { Button } from './shared/Button';
import { statsContent } from './data/landing-data';

export function StatsSection() {
    return (
        <SectionContainer pattern="standard" patternOffset={3} background="bg-[var(--gray-50)]" className="py-24">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                <div>
                    <h2 className="serif text-[clamp(36px,4vw,52px)] leading-[1.1] text-[var(--gray-800)] max-w-xl">
                        Objectives, cost plans, programmes and reports –{' '}
                        <span className="text-[var(--primary)]">aligned, automated and integrated</span>, powered by AI.
                    </h2>
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {statsContent.stats.map((stat, index) => (
                    <ScrollReveal key={stat.value} delay={index * 100}>
                        <div className="bg-white rounded-2xl p-10 shadow-sm border border-[var(--gray-100)]">
                            <p className="serif text-[clamp(56px,7vw,80px)] text-[var(--primary)] leading-none mb-4">
                                {stat.value}
                            </p>
                            <p className="text-[var(--gray-600)] text-base">
                                {stat.label}
                            </p>
                        </div>
                    </ScrollReveal>
                ))}
            </div>
        </SectionContainer>
    );
}
