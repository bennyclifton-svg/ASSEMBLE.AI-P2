import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { Button } from './shared/Button';
import { finalCtaContent } from './data/landing-data';

export function FinalCTASection() {
    return (
        <SectionContainer pattern="dark" patternOffset={4} background="bg-black" className="py-24">
            <ScrollReveal>
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="serif text-[clamp(44px,5.5vw,72px)] leading-[1.05] tracking-[-1px] mb-6">
                        <span className="text-[var(--gray-500)]">{finalCtaContent.headline.gray}</span>{' '}
                        <span className="text-[var(--primary)]">{finalCtaContent.headline.green}</span>
                    </h2>
                    <p className="text-[var(--gray-400)] text-lg mb-8">
                        {finalCtaContent.subtitle}
                    </p>
                    <Button variant="primary-green" size="large" href="/register">
                        {finalCtaContent.cta}
                    </Button>
                    <p className="text-[var(--gray-500)] text-sm mt-6">
                        {finalCtaContent.note}
                    </p>
                </div>
            </ScrollReveal>
        </SectionContainer>
    );
}
