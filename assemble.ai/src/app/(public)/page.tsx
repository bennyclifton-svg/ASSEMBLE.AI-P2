/**
 * Public Landing Page
 * Main marketing page for unauthenticated visitors
 * Implements the redesigned landing page with all 15 sections
 */

import { NavBar } from '@/components/landing/NavBar';
import { HeroSection } from '@/components/landing/HeroSection';
import { LogoBar } from '@/components/landing/LogoBar';
import { StatsSection } from '@/components/landing/StatsSection';
import { AISection } from '@/components/landing/AISection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { SolutionSection } from '@/components/landing/SolutionSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { CTABannerSection } from '@/components/landing/CTABannerSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function LandingPage() {
    return (
        <>
            <NavBar />
            <main>
                <HeroSection />
                <LogoBar />
                <StatsSection />
                <AISection />
                <ProblemSection />
                <SolutionSection />
                <FeaturesSection />
                <BenefitsSection />
                <TestimonialsSection />
                <HowItWorksSection />
                <CTABannerSection />
                <FAQSection />
                <FinalCTASection />
            </main>
            <FooterSection />
        </>
    );
}
