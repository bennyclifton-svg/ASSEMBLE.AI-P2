import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { Button } from './shared/Button';
import { ctaBannerContent } from './data/landing-data';

function CursorTag({ label, className }: { label: string; className?: string }) {
    return (
        <div className={`hidden lg:flex items-center gap-2 bg-white rounded-[20px] px-4 py-2 shadow-lg ${className}`}>
            <div className="w-3 h-3 rounded-full bg-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--gray-800)]">{label}</span>
        </div>
    );
}

export function CTABannerSection() {
    return (
        <SectionContainer pattern="green" patternOffset={18} background="bg-[var(--primary-light)]" className="py-24">
            <ScrollReveal>
                <div className="relative text-center">
                    {/* Floating cursor tags */}
                    <CursorTag label="CEO" className="absolute top-0 left-[10%] -rotate-6" />
                    <CursorTag label="CPO" className="absolute bottom-0 right-[15%] rotate-12" />

                    <h2 className="serif text-[clamp(36px,4.5vw,56px)] leading-[1.1] text-[var(--gray-800)] mb-4">
                        {ctaBannerContent.headline}
                    </h2>
                    <p className="text-[var(--gray-600)] text-lg mb-8 max-w-xl mx-auto">
                        {ctaBannerContent.subtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button variant="light-green" href="/register">
                            {ctaBannerContent.primaryCta}
                        </Button>
                        <Button variant="black" href="/pricing">
                            {ctaBannerContent.secondaryCta}
                        </Button>
                    </div>
                </div>
            </ScrollReveal>
        </SectionContainer>
    );
}
