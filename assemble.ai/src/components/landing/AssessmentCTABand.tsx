import Link from 'next/link';

/**
 * AssessmentCTABand — secondary cold-traffic CTA on /.
 *
 * Sits between SolutionSection and FeaturesSection (per Q13 of the locked
 * landing-page brief). Paper-2 background + rose left edge marks this as a
 * parenthetical callout — visually distinct from the chapter-style sections
 * above and below, but still in the paper register.
 *
 * Routes to /assessment, which carries the same frustration hook as the hero
 * but funnels into the Tender Readiness Health Check waitlist (until the
 * Tally quiz ships).
 */
export function AssessmentCTABand() {
    return (
        <section
            className="relative"
            style={{
                background: 'var(--sw-paper-2)',
                borderTop: '1px solid var(--sw-rule)',
                borderBottom: '1px solid var(--sw-rule)',
            }}
        >
            <div className="max-w-[1080px] mx-auto px-8 py-16">
                <div
                    className="max-w-[760px] pl-6"
                    style={{ borderLeft: '2px solid var(--sw-rose)' }}
                >
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
                        // Self-diagnostic
                    </p>
                    <h2
                        className="m-0"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 'clamp(24px, 3vw, 32px)',
                            fontWeight: 700,
                            lineHeight: 1.2,
                            letterSpacing: '-0.025em',
                            color: 'var(--sw-ink)',
                        }}
                    >
                        Not ready for a free trial? Take the Tender Readiness Health Check.
                    </h2>
                    <p
                        className="mt-4"
                        style={{
                            fontFamily: 'var(--sw-font-body)',
                            fontSize: 16,
                            lineHeight: 1.55,
                            color: 'var(--sw-ink)',
                            maxWidth: 640,
                        }}
                    >
                        15 questions. 3 minutes. A per-pillar diagnostic of your tender process —
                        scope, field, process — scored against the same procurement frameworks used on
                        NSW Health, Schools Infrastructure, and tier-1 commercial projects. Free.
                        Immediate recommendations.
                    </p>

                    <Link
                        href="/assessment"
                        className="mt-6 inline-flex items-center gap-2 px-[18px] py-3 font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 12,
                            background: 'var(--sw-rose)',
                            color: 'var(--sw-ink)',
                        }}
                    >
                        Start the Health Check →
                    </Link>
                </div>
            </div>
        </section>
    );
}
