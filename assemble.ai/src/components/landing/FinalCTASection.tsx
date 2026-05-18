import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal } from './shared/ScrollReveal';

export function FinalCTASection() {
    return (
        <section
            className="relative overflow-hidden py-24"
            style={{
                background: 'var(--sw-cta)',
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            <div className="relative max-w-[980px] mx-auto px-8 text-center">
                <ScrollReveal>
                    <p
                        className="mb-3"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: 'var(--sw-rose)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                        }}
                    >
                        {'// Free 14-day trial'}
                    </p>
                    <h2
                        className="m-0 text-balance"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 'clamp(38px, 5vw, 64px)',
                            fontWeight: 800,
                            lineHeight: 1.04,
                            letterSpacing: '-0.035em',
                            color: 'var(--sw-cta-fg)',
                        }}
                    >
                        Stop doing the grunt work.
                    </h2>
                    <p
                        className="mt-5 mb-8 mx-auto max-w-[680px]"
                        style={{
                            fontFamily: 'var(--sw-font-body)',
                            fontSize: 17,
                            lineHeight: 1.6,
                            color: 'rgba(255,255,255,0.82)',
                        }}
                    >
                        Start a free 14-day trial. No card. Full features inside trial caps. Export anytime.
                    </p>
                    <Link
                        href="/pricing"
                        className="inline-flex items-center justify-center gap-2 px-[20px] py-3 font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 12,
                            background: 'var(--sw-paper)',
                            color: 'var(--sw-cta)',
                        }}
                    >
                        Start free trial
                        <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                    </Link>
                </ScrollReveal>
            </div>
        </section>
    );
}
