'use client';

import { useRef, useState, useEffect } from 'react';
import { statsContent } from './data/landing-data';

const ACCENT_COLORS = ['var(--sw-peach)', 'var(--sw-lav)', 'var(--sw-cyan)'];

function StatTile({
    stat,
    index,
    isVisible,
    accent,
}: {
    stat: { value: string; label: string };
    index: number;
    isVisible: boolean;
    accent: string;
}) {
    return (
        <div
            className="p-10 transition-all duration-700 ease-out"
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible
                    ? 'translateX(0) scale(1)'
                    : 'translateX(-30px) scale(0.97)',
                transitionDelay: `${index * 180}ms`,
                background: 'var(--sw-paper)',
                border: '1px solid var(--sw-rule)',
                borderLeft: `3px solid ${accent}`,
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            <p
                className="leading-none mb-4"
                style={{
                    fontFamily: 'var(--sw-font-sans)',
                    fontWeight: 800,
                    fontSize: 'clamp(56px, 7vw, 80px)',
                    letterSpacing: '-0.04em',
                    color: accent,
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {stat.value}
            </p>
            <p style={{ color: 'var(--sw-ink)', fontSize: 15, lineHeight: 1.55 }}>
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
        <section
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper-2)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
                    <div>
                        <p
                            className="mb-3"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose-dk)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                            }}
                        >
                            // {statsContent.label}
                        </p>
                        <h2
                            className="m-0 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(36px, 4vw, 52px)',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                letterSpacing: '-0.025em',
                                color: 'var(--sw-ink)',
                                maxWidth: 720,
                            }}
                        >
                            Objectives, cost plans, programmes and reports —{' '}
                            <span style={{ color: 'var(--sw-rose-dk)' }}>
                                aligned, automated and integrated
                            </span>
                            , powered by construction-trained AI.
                        </h2>
                    </div>
                </div>

                <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {statsContent.stats.map((stat, index) => (
                        <StatTile
                            key={stat.value}
                            stat={stat}
                            index={index}
                            isVisible={isVisible}
                            accent={ACCENT_COLORS[index % ACCENT_COLORS.length]}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
