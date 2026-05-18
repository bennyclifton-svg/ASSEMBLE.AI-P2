import { NavBar } from '@/components/landing/NavBar';
import { FooterSection } from '@/components/landing/FooterSection';
import { LegalPage } from '@/components/legal/LegalPage';

export default function SupportPage() {
    return (
        <>
            <NavBar />
            <LegalPage kind="support" />
            <FooterSection />
        </>
    );
}
