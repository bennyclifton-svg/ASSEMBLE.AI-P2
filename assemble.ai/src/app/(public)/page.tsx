import { NavBar } from '@/components/landing/NavBar';
import { HeroSection } from '@/components/landing/HeroSection';
import { AgentRosterSection } from '@/components/landing/AgentRosterSection';
import { TenderFeaturesSection } from '@/components/landing/TenderFeaturesSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function LandingPage() {
    return (
        <>
            <NavBar />
            <main>
                <HeroSection />
                <AgentRosterSection />
                <TenderFeaturesSection />
                <FinalCTASection />
            </main>
            <FooterSection />
        </>
    );
}
