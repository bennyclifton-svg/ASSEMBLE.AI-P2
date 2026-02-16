'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDotGridAnimation, type PatternVariant } from '@/lib/hooks/use-dot-grid-animation';

interface AnimatedDotGridProps {
    variant?: PatternVariant;
    className?: string;
    phaseOffset?: number;
}

// Static CSS fallback (matches original DotGridPattern exactly)
const STATIC_STYLES: Record<PatternVariant, React.CSSProperties> = {
    standard: {
        backgroundImage: 'radial-gradient(circle, var(--gray-400) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
    },
    dark: {
        backgroundImage: 'radial-gradient(circle, var(--gray-700) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
    },
    fine: {
        backgroundImage: 'radial-gradient(circle, var(--gray-300) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
    },
    green: {
        backgroundImage: 'radial-gradient(circle, rgba(0, 194, 122, 0.3) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
    },
    hero: {
        backgroundImage: 'radial-gradient(circle, var(--gray-800) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        opacity: 0.5,
    },
};

export function AnimatedDotGrid({ variant = 'standard', className, phaseOffset = 0 }: AnimatedDotGridProps) {
    const [mounted, setMounted] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Client mount detection
    useEffect(() => {
        setMounted(true);
    }, []);

    // Detect prefers-reduced-motion
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mq.matches);
        const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // IntersectionObserver for visibility-based activation
    useEffect(() => {
        const el = containerRef.current;
        if (!el || reducedMotion || !mounted) return;

        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0.05 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [reducedMotion, mounted]);

    const canvasRef = useDotGridAnimation({
        variant,
        enabled: mounted && isVisible && !reducedMotion,
        phaseOffset,
    });

    // SSR + reduced motion: static CSS fallback
    if (!mounted || reducedMotion) {
        return (
            <div
                className={cn('absolute inset-0 pointer-events-none', className)}
                style={STATIC_STYLES[variant]}
            />
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn('absolute inset-0 pointer-events-none', className)}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ display: 'block' }}
                aria-hidden="true"
                role="presentation"
            />
        </div>
    );
}
