'use client';

import { useRef, useState, useEffect } from 'react';
import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { statsContent } from './data/landing-data';

function StatTile({ stat, index, isVisible }: {
    stat: { value: string; label: string };
    index: number;
    isVisible: boolean;
}) {
    return (
        <div
            className="bg-white/50 backdrop-blur-sm rounded-2xl p-10 shadow-lg border border-[var(--gray-100)] transition-all duration-700 ease-out"
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible
                    ? 'translateX(0) scale(1)'
                    : 'translateX(-30px) scale(0.97)',
                transitionDelay: `${index * 180}ms`,
            }}
        >
            <p className="serif text-[clamp(56px,7vw,80px)] text-[var(--primary)] leading-none mb-4">
                {stat.value}
            </p>
            <p className="text-[var(--gray-600)] text-base">
                {stat.label}
            </p>
        </div>
    );
}

export function StatsSection() {
    const gridRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = gridRef.current;
        if (!el) return;

        // Respect reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <SectionContainer pattern="standard" patternOffset={3} background="bg-[var(--gray-50)]" className="py-24">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                <div>
                    <h2 className="serif text-[clamp(36px,4vw,52px)] leading-[1.1] text-[var(--gray-800)] max-w-xl">
                        Objectives, cost plans, programmes and reports –{' '}
                        <span className="text-[var(--primary)]">aligned, automated and integrated</span>, powered by construction-trained AI.
                    </h2>
                </div>

            </div>

            <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {statsContent.stats.map((stat, index) => (
                    <StatTile key={stat.value} stat={stat} index={index} isVisible={isVisible} />
                ))}
            </div>
        </SectionContainer>
    );
}
