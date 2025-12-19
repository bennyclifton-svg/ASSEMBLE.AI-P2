import { SectionContainer } from './shared/SectionContainer';
import { logoBarContent } from './data/landing-data';

export function LogoBar() {
    return (
        <SectionContainer background="bg-white" className="py-12">
            <div className="text-center">
                <p className="text-[var(--gray-500)] text-sm mb-8">
                    {logoBarContent.headline}
                </p>
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                    {logoBarContent.logos.map((logo) => (
                        <span
                            key={logo}
                            className="text-[var(--gray-300)] font-semibold text-lg tracking-wider"
                        >
                            {logo}
                        </span>
                    ))}
                </div>
            </div>
        </SectionContainer>
    );
}
