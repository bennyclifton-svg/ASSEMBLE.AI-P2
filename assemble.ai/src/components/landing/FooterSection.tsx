import { SectionContainer } from './shared/SectionContainer';
import { footerContent } from './data/landing-data';

export function FooterSection() {
    return (
        <SectionContainer background="bg-[var(--gray-900)]" className="py-12">
            <div className="flex flex-col items-center text-center">
                <p className="text-[var(--gray-500)] text-sm">
                    © {footerContent.copyright}
                </p>
            </div>
        </SectionContainer>
    );
}
