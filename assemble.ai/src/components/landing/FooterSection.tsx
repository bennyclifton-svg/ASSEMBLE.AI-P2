import { SectionContainer } from './shared/SectionContainer';
import { footerContent } from './data/landing-data';

function ColorfulLogo() {
    return (
        <div className="flex gap-1">
            <div className="w-3 h-8 rounded-sm bg-[var(--logo-green)]" />
            <div className="w-3 h-8 rounded-sm bg-[var(--logo-yellow)]" />
            <div className="w-3 h-8 rounded-sm bg-[var(--logo-red)]" />
            <div className="w-3 h-8 rounded-sm bg-[var(--logo-teal)]" />
        </div>
    );
}

export function FooterSection() {
    return (
        <SectionContainer background="bg-[var(--gray-900)]" className="py-12">
            <div className="flex flex-col items-center text-center">
                <ColorfulLogo />
                <p className="text-[var(--gray-500)] text-sm mt-6">
                    © {footerContent.copyright}
                </p>
            </div>
        </SectionContainer>
    );
}
