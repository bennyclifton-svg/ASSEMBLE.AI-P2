import { cn } from '@/lib/utils';
import { DotGridPattern } from './DotGridPattern';

type PatternVariant = 'none' | 'standard' | 'dark' | 'fine' | 'green' | 'hero';

interface SectionContainerProps {
    children: React.ReactNode;
    id?: string;
    className?: string;
    pattern?: PatternVariant;
    background?: string;
    containerClassName?: string;
}

export function SectionContainer({
    children,
    id,
    className,
    pattern = 'none',
    background = 'bg-white',
    containerClassName,
}: SectionContainerProps) {
    return (
        <section id={id} className={cn('relative overflow-hidden', background, className)}>
            {pattern !== 'none' && <DotGridPattern variant={pattern} />}
            <div className={cn('relative max-w-[1280px] mx-auto px-8', containerClassName)}>
                {children}
            </div>
        </section>
    );
}
