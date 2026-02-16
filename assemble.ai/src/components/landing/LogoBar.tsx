import { SectionContainer } from './shared/SectionContainer';
import { logoBarContent } from './data/landing-data';

export function LogoBar() {
    return (
        <SectionContainer background="bg-white" className="py-12">
            <div className="text-center">
                <p className="text-[var(--gray-500)] text-lg font-medium mb-0">
                    {logoBarContent.headline}
                </p>
            </div>
        </SectionContainer>
    );
}
