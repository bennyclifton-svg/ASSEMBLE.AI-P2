import { NavBar } from '@/components/landing/NavBar';
import { HeroSection } from '@/components/landing/HeroSection';
import { WorkflowGallerySection } from '@/components/landing/WorkflowGallerySection';
import { CapabilitiesSection } from '@/components/landing/CapabilitiesSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function LandingPage() {
    return (
        <>
            <NavBar />
            <main>
                <HeroSection />
                <WorkflowGallerySection />
                <CapabilitiesSection />
                <FinalCTASection />
            </main>
            <FooterSection />
        </>
    );
}
