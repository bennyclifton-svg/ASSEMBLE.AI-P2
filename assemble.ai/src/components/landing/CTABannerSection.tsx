import Link from 'next/link';
import { ScrollReveal } from './shared/ScrollReveal';
import { ctaBannerContent } from './data/landing-data';

function RoleTag({
    label,
    color,
    className,
}: {
    label: string;
    color: string;
    className?: string;
}) {
    return (
        <div
            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 ${className ?? ''}`}
            style={{
                background: 'var(--sw-paper)',
                border: `1px solid ${color}33`,
                borderLeft: `3px solid ${color}`,
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: 'var(--sw-ink)',
                boxShadow: '0 6px 18px -8px rgba(14,16,20,0.25)',
            }}
        >
            <span
                className="inline-block"
                style={{ width: 8, height: 8, background: color }}
                aria-hidden="true"
            />
            {label}
        </div>
    );
}

export function CTABannerSection() {
    return (
        <section
            className="relative overflow-hidden py-24"
            style={{
                background: 'var(--sw-rose-tint)',
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <div className="relative text-center">
                        <RoleTag label="CEO" color="var(--sw-cyan)" className="absolute top-0 left-[8%] -rotate-6" />
                        <RoleTag label="CPO" color="var(--sw-lav)" className="absolute bottom-0 right-[10%] rotate-6" />
                        <RoleTag
                            label="QS"
                            color="var(--sw-peach)"
                            className="absolute top-[20%] right-[5%] rotate-3"
                        />

                        <h2
                            className="m-0 mb-4 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(36px, 4.5vw, 56px)',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                letterSpacing: '-0.03em',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            {ctaBannerContent.headline}
                        </h2>
                        <p
                            className="mx-auto mb-8 max-w-xl"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 17,
                                lineHeight: 1.6,
                                color: 'var(--sw-muted)',
                            }}
                        >
                            {ctaBannerContent.subtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="/register"
                                className="inline-flex items-center gap-2 transition-opacity hover:opacity-90"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    padding: '12px 18px',
                                    background: 'var(--sw-rose)',
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                {ctaBannerContent.primaryCta} →
                            </Link>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center gap-2 transition-colors hover:bg-[color:var(--sw-ink)] hover:text-[color:var(--sw-paper)]"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    padding: '12px 18px',
                                    background: 'transparent',
                                    color: 'var(--sw-ink)',
                                    border: '1px solid var(--sw-ink)',
                                }}
                            >
                                {ctaBannerContent.secondaryCta}
                            </Link>
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}
