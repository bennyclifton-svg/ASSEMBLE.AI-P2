import { cn } from '@/lib/utils';
import { AnimatedDotGrid } from './AnimatedDotGrid';

type PatternVariant = 'none' | 'standard' | 'dark' | 'fine' | 'green' | 'hero';

interface SectionContainerProps {
    children: React.ReactNode;
    id?: string;
    className?: string;
    pattern?: PatternVariant;
    patternOffset?: number;
    background?: string;
    containerClassName?: string;
}

export function SectionContainer({
    children,
    id,
    className,
    pattern = 'none',
    patternOffset = 0,
    background = 'bg-white',
    containerClassName,
}: SectionContainerProps) {
    return (
        <section id={id} className={cn('relative overflow-hidden', background, className)}>
            {pattern !== 'none' && <AnimatedDotGrid variant={pattern} phaseOffset={patternOffset} />}
            <div className={cn('relative max-w-[1280px] mx-auto px-8', containerClassName)}>
                {children}
            </div>
        </section>
    );
}
