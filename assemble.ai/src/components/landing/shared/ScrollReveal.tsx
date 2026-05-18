'use client';

import { cn } from '@/lib/utils';
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal';

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export function ScrollReveal({
    children,
    className,
    delay = 0,
}: ScrollRevealProps) {
    const { ref, isVisible } = useScrollReveal();

    return (
        <div
            ref={ref as React.RefObject<HTMLDivElement>}
            className={cn(
                'transition-all duration-[600ms] ease-out',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]',
                className
            )}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}
