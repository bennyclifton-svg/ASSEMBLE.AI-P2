import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { Button } from './shared/Button';
import { aiSectionContent } from './data/landing-data';
import { Sparkles, FileText, BarChart3, Search, Zap } from 'lucide-react';

function AIToolbarMockup() {
    const tools = [
        { icon: Sparkles, label: 'AI' },
        { icon: FileText, label: 'Docs' },
        { icon: BarChart3, label: 'Analytics' },
        { icon: Search, label: 'Search' },
        { icon: Zap, label: 'Quick' },
    ];

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
                {tools.map(({ icon: Icon, label }) => (
                    <button
                        key={label}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[var(--gray-50)] transition-colors"
                    >
                        <div className="w-10 h-10 rounded-lg bg-[var(--primary-light)] flex items-center justify-center">
                            <Icon className="w-5 h-5 text-[var(--primary-dark)]" />
                        </div>
                        <span className="text-xs text-[var(--gray-500)]">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function AISection() {
    return (
        <SectionContainer pattern="standard" background="bg-[var(--gray-50)]" className="py-24">
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
                        <Button variant="primary-green" href="#features">
                            {aiSectionContent.cta}
                        </Button>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={200}>
                    <AIToolbarMockup />
                </ScrollReveal>
            </div>
        </SectionContainer>
    );
}
