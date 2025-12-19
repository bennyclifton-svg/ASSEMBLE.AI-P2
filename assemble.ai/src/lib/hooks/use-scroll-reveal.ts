'use client';

import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions extends IntersectionObserverInit {
    triggerOnce?: boolean;
}

export function useScrollReveal(options?: UseScrollRevealOptions) {
    const { triggerOnce = true, threshold = 0.1, ...observerOptions } = options || {};
    const ref = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (triggerOnce) {
                        observer.disconnect();
                    }
                } else if (!triggerOnce) {
                    setIsVisible(false);
                }
            },
            { threshold, ...observerOptions }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [threshold, triggerOnce, observerOptions]);

    return { ref, isVisible };
}
