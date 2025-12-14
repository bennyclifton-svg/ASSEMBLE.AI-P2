/**
 * Public Landing Page
 * Main marketing page for unauthenticated visitors
 */

import { NavBar } from '@/components/landing/NavBar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function LandingPage() {
    return (
        <>
            <NavBar />
            <main className="pt-16">
                <HeroSection />
                <FeaturesSection />
                <PricingSection />
            </main>
            <FooterSection />
        </>
    );
}
