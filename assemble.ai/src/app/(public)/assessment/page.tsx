'use client';

/**
 * /assessment — Tender Readiness Health Check landing page.
 *
 * Single-purpose funnel for cold-traffic visitors (LinkedIn ads, podcast
 * referrals, partner outreach). Follows the YouTube script structure:
 * Hook → Subhead → 3-pillar value prop → Credibility → CTA.
 *
 * v1: the quiz itself (Tally form) is parked. CTA is an email-capture
 * waitlist that POSTs to /api/assessment-waitlist. When the quiz goes
 * live, swap the form for the Tally embed.
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NavBar } from '@/components/landing/NavBar';

const PILLARS = [
    {
        code: '01 · SCOPE',
        accent: 'var(--sw-rose)',
        title: 'Scope',
        body: 'Sharp, complete, contract-aligned. Drawings, specifications, schedules and contract framework moving as one package — not drip-fed.',
    },
    {
        code: '02 · FIELD',
        accent: 'var(--sw-peach)',
        title: 'Field',
        body: 'The right firms, motivated, with their A-team on it. Market-sounded, capability-matched, not just whoever is available.',
    },
    {
        code: '03 · PROCESS',
        accent: 'var(--sw-cyan)',
        title: 'Process',
        body: 'Well-paced, well-run, properly presented. Tender period protected, queries through one register, evaluation matrix agreed before bids land.',
    },
];

const CREDIBILITY_LOGOS = [
    { name: 'Health Infrastructure NSW', src: '/images/trust-logos/health-infrastructure-nsw.jpg' },
    { name: 'Schools Infrastructure NSW', src: '/images/trust-logos/schools-infrastructure-nsw.png' },
    { name: 'TAFE NSW', src: '/images/trust-logos/tafe-nsw.png' },
    { name: 'CBUS', src: '/images/trust-logos/cbus.png' },
    { name: 'Stockland', src: '/images/trust-logos/stockland.png' },
    { name: 'NCC', src: '/images/trust-logos/ncc.jpg' },
];

export default function AssessmentPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (status === 'submitting') return;
        setStatus('submitting');
        setErrorMessage('');

        try {
            const res = await fetch('/api/assessment-waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name: name || undefined }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setErrorMessage(data.error ?? 'Something went wrong. Try again.');
                setStatus('error');
                return;
            }

            setStatus('success');
        } catch {
            setErrorMessage('Could not reach the server. Check your connection.');
            setStatus('error');
        }
    }

    return (
        <>
            <NavBar />
            <main style={{ fontFamily: 'var(--sw-font-sans)' }}>
                {/* ------------------------------------------------------------------ */}
                {/* HERO — frustration hook + subhead, dark Sitewise (matches /)       */}
                {/* ------------------------------------------------------------------ */}
                <section
                    className="relative overflow-hidden"
                    style={{ background: 'var(--sw-ink)', color: '#E8E4DA' }}
                >
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(900px 500px at 80% -10%, rgba(248,101,122,0.08), transparent 60%),' +
                                'radial-gradient(700px 400px at -10% 110%, rgba(168,156,217,0.05), transparent 60%)',
                        }}
                    />
                    <div className="relative max-w-[960px] mx-auto px-8 pt-[140px] pb-[100px]">
                        <div
                            className="inline-flex items-center gap-2 px-2.5 py-1 mb-6 font-semibold"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose)',
                                background: 'rgba(248,101,122,0.10)',
                                border: '1px solid rgba(248,101,122,0.25)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                            }}
                        >
                            // Tender Readiness Health Check
                        </div>

                        <h1
                            className="m-0 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(36px, 5vw, 60px)',
                                fontWeight: 800,
                                lineHeight: 1.05,
                                letterSpacing: '-0.035em',
                                color: 'var(--sw-paper)',
                            }}
                        >
                            Frustrated that your tenders go out{' '}
                            <span style={{ color: 'var(--sw-rose)' }}>rushed</span>
                            {' '}— and come back{' '}
                            <span style={{ color: 'var(--sw-peach)' }}>priced for it</span>?
                        </h1>

                        <p
                            className="mt-6 max-w-[640px]"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 18,
                                lineHeight: 1.55,
                                color: 'rgba(232,228,218,0.75)',
                            }}
                        >
                            Answer 15 questions to find out <em>why</em> — and exactly what to do about it.
                            A 3-minute self-diagnostic on your tender process, scored against the same
                            procurement frameworks used on NSW Health, Schools Infrastructure, and tier-1
                            commercial projects.
                        </p>

                        <p
                            className="mt-4"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: 'rgba(232,228,218,0.45)',
                            }}
                        >
                            // Free · 3 minutes · Per-pillar diagnostic · Immediate recommendations
                        </p>
                    </div>
                </section>

                {/* ------------------------------------------------------------------ */}
                {/* VALUE PROP — 3 pillars + rinse-and-repeat punchline (paper)        */}
                {/* ------------------------------------------------------------------ */}
                <section style={{ background: 'var(--sw-paper)' }}>
                    <div className="max-w-[1080px] mx-auto px-8 py-24">
                        <p
                            className="mb-3"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                            }}
                        >
                            // What we measure
                        </p>
                        <h2
                            className="m-0 max-w-[720px]"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(28px, 3.5vw, 40px)',
                                fontWeight: 700,
                                lineHeight: 1.15,
                                letterSpacing: '-0.025em',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Three things decide whether your tenders come back priced for the work — or
                            priced for the chaos.
                        </h2>

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {PILLARS.map((p) => (
                                <article
                                    key={p.code}
                                    className="p-7"
                                    style={{
                                        background: 'white',
                                        border: '1px solid var(--sw-rule)',
                                        borderTop: `2px solid ${p.accent}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 10,
                                            color: p.accent,
                                            letterSpacing: '0.18em',
                                            textTransform: 'uppercase',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {p.code}
                                    </div>
                                    <h3
                                        className="mt-3 m-0"
                                        style={{
                                            fontFamily: 'var(--sw-font-sans)',
                                            fontSize: 22,
                                            fontWeight: 700,
                                            letterSpacing: '-0.02em',
                                            color: 'var(--sw-ink)',
                                        }}
                                    >
                                        {p.title}
                                    </h3>
                                    <p
                                        className="mt-3 m-0"
                                        style={{
                                            fontFamily: 'var(--sw-font-body)',
                                            fontSize: 15,
                                            lineHeight: 1.55,
                                            color: 'var(--sw-ink)',
                                        }}
                                    >
                                        {p.body}
                                    </p>
                                </article>
                            ))}
                        </div>

                        {/* Rinse-and-repeat punchline */}
                        <div
                            className="mt-12 p-7 max-w-[720px]"
                            style={{
                                background: 'var(--sw-paper-2)',
                                border: '1px solid var(--sw-rule)',
                                borderLeft: '2px solid var(--sw-rose)',
                            }}
                        >
                            <p
                                className="m-0"
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 18,
                                    fontWeight: 600,
                                    lineHeight: 1.45,
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                Then do it again. And again. And again.
                            </p>
                            <p
                                className="mt-2 m-0"
                                style={{
                                    fontFamily: 'var(--sw-font-body)',
                                    fontSize: 15,
                                    lineHeight: 1.55,
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                20+ procurement events per project — consultants, trades, packages. Every
                                tender to the same standard.{' '}
                                <strong style={{ color: 'var(--sw-rose-dk)' }}>Speed without shortcuts.</strong>
                            </p>
                        </div>
                    </div>
                </section>

                {/* ------------------------------------------------------------------ */}
                {/* CREDIBILITY — bio + 6 trust logos (paper-2)                        */}
                {/* ------------------------------------------------------------------ */}
                <section style={{ background: 'var(--sw-paper-2)' }}>
                    <div className="max-w-[1080px] mx-auto px-8 py-24">
                        <p
                            className="mb-3"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                            }}
                        >
                            // Why trust this assessment
                        </p>
                        <h2
                            className="m-0 max-w-[720px]"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(28px, 3.5vw, 40px)',
                                fontWeight: 700,
                                lineHeight: 1.15,
                                letterSpacing: '-0.025em',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Built by someone who&apos;s been graded against the same standards.
                        </h2>

                        <div className="mt-10 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-8 items-start">
                            <div
                                className="relative w-[160px] h-[160px] overflow-hidden"
                                style={{ border: '1px solid var(--sw-rule)' }}
                            >
                                <Image
                                    src="/images/author-headshot.jpg"
                                    alt="Sitewise founder"
                                    fill
                                    sizes="160px"
                                    className="object-cover grayscale"
                                />
                            </div>
                            <div className="space-y-4 max-w-[640px]">
                                <p
                                    className="m-0"
                                    style={{
                                        fontFamily: 'var(--sw-font-body)',
                                        fontSize: 16,
                                        lineHeight: 1.6,
                                        color: 'var(--sw-ink)',
                                    }}
                                >
                                    <strong>Benny Clifton.</strong> Founder of Sitewise. Master of Construction
                                    Management (Hons), UNSW Civil Engineering. 20+ years across the full
                                    development lifecycle — feasibility, design, procurement, commercial
                                    delivery — on commercial, residential, hotel, health and education projects.
                                </p>
                                <p
                                    className="m-0"
                                    style={{
                                        fontFamily: 'var(--sw-font-body)',
                                        fontSize: 16,
                                        lineHeight: 1.6,
                                        color: 'var(--sw-ink)',
                                    }}
                                >
                                    Delivered under the procurement frameworks of <strong>Health Infrastructure
                                    NSW</strong>, <strong>Schools Infrastructure NSW</strong> and{' '}
                                    <strong>TAFE NSW</strong> — and for <strong>CBUS Property</strong>,{' '}
                                    <strong>Stockland</strong>, and international brands including{' '}
                                    <strong>Holiday Inn Express</strong>. Early career in tier-1 head
                                    contracting; both sides of the tender table.
                                </p>
                                <p
                                    className="m-0"
                                    style={{
                                        fontFamily: 'var(--sw-font-body)',
                                        fontSize: 16,
                                        lineHeight: 1.6,
                                        color: 'var(--sw-ink)',
                                    }}
                                >
                                    The 10 best-practice questions in this assessment are distilled from those
                                    exact procurement frameworks — what <em>good</em> looks like in NSW
                                    commercial construction, by someone who&apos;s been graded against the
                                    same standards on real projects.
                                </p>
                                <p
                                    className="m-0"
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 12,
                                        color: 'var(--sw-muted)',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    // I read every reply personally — questions go straight to my inbox.
                                </p>
                            </div>
                        </div>

                        <div
                            className="mt-12 pt-8 grid grid-cols-3 md:grid-cols-6 gap-8 items-center"
                            style={{ borderTop: '1px solid var(--sw-rule)' }}
                        >
                            {CREDIBILITY_LOGOS.map((logo) => (
                                <div
                                    key={logo.name}
                                    className="flex items-center justify-center"
                                    title={logo.name}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={logo.src}
                                        alt={`${logo.name} logo`}
                                        className="h-10 sm:h-12 w-auto object-contain grayscale opacity-70"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ------------------------------------------------------------------ */}
                {/* CTA — email waitlist (paper, rose accents)                         */}
                {/* ------------------------------------------------------------------ */}
                <section style={{ background: 'var(--sw-paper)' }}>
                    <div className="max-w-[640px] mx-auto px-8 py-24">
                        {status === 'success' ? (
                            <SuccessState />
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <p
                                    className="mb-3"
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 11,
                                        color: 'var(--sw-rose)',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    // Get the link first
                                </p>
                                <h2
                                    className="m-0"
                                    style={{
                                        fontFamily: 'var(--sw-font-sans)',
                                        fontSize: 'clamp(24px, 3vw, 34px)',
                                        fontWeight: 700,
                                        lineHeight: 1.2,
                                        letterSpacing: '-0.025em',
                                        color: 'var(--sw-ink)',
                                    }}
                                >
                                    Be first to take the Tender Readiness Health Check.
                                </h2>
                                <p
                                    className="mt-3"
                                    style={{
                                        fontFamily: 'var(--sw-font-body)',
                                        fontSize: 16,
                                        lineHeight: 1.55,
                                        color: 'var(--sw-ink)',
                                    }}
                                >
                                    The quiz launches in the next few weeks. Drop your email and you&apos;ll
                                    get the link the moment it&apos;s live — plus a copy of the full Tender
                                    Process Playbook the framework is built on.
                                </p>

                                <div className="mt-8 grid gap-3">
                                    <label className="block">
                                        <span
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 11,
                                                color: 'var(--sw-muted)',
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Your name (optional)
                                        </span>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            disabled={status === 'submitting'}
                                            className="mt-1.5 w-full px-4 py-3 outline-none transition-colors focus:border-[var(--sw-rose)]"
                                            style={{
                                                fontFamily: 'var(--sw-font-body)',
                                                fontSize: 15,
                                                background: 'white',
                                                border: '1px solid var(--sw-rule)',
                                                color: 'var(--sw-ink)',
                                            }}
                                        />
                                    </label>
                                    <label className="block">
                                        <span
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 11,
                                                color: 'var(--sw-muted)',
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Work email
                                        </span>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={status === 'submitting'}
                                            className="mt-1.5 w-full px-4 py-3 outline-none transition-colors focus:border-[var(--sw-rose)]"
                                            style={{
                                                fontFamily: 'var(--sw-font-body)',
                                                fontSize: 15,
                                                background: 'white',
                                                border: '1px solid var(--sw-rule)',
                                                color: 'var(--sw-ink)',
                                            }}
                                            placeholder="you@firm.com.au"
                                        />
                                    </label>
                                </div>

                                {status === 'error' && (
                                    <p
                                        className="mt-4"
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 12,
                                            color: 'var(--sw-rose-dk)',
                                            letterSpacing: '0.05em',
                                        }}
                                    >
                                        // {errorMessage}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={status === 'submitting' || !email}
                                    className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 12,
                                        background: 'var(--sw-rose)',
                                        color: 'var(--sw-ink)',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {status === 'submitting' ? 'Saving…' : 'Save my spot →'}
                                </button>

                                <p
                                    className="mt-4"
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 10,
                                        letterSpacing: '0.15em',
                                        textTransform: 'uppercase',
                                        color: 'var(--sw-muted)',
                                    }}
                                >
                                    // No spam. Unsubscribe in one click. We never share your details.
                                </p>
                            </form>
                        )}
                    </div>
                </section>

                {/* ------------------------------------------------------------------ */}
                {/* FOOTER — lightweight                                                */}
                {/* ------------------------------------------------------------------ */}
                <footer
                    style={{
                        background: 'var(--sw-ink)',
                        color: 'rgba(232,228,218,0.55)',
                        fontFamily: 'var(--sw-font-mono)',
                    }}
                >
                    <div className="max-w-[1080px] mx-auto px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            Sitewise · Tender Readiness Health Check
                        </div>
                        <nav className="flex items-center gap-6" style={{ fontSize: 12 }}>
                            <Link href="/" className="hover:text-white transition-colors">
                                ← Sitewise
                            </Link>
                            <a
                                href="mailto:bennyclifton@gmail.com"
                                className="hover:text-white transition-colors"
                            >
                                Email founder
                            </a>
                            <Link href="/login" className="hover:text-white transition-colors">
                                Login
                            </Link>
                        </nav>
                    </div>
                </footer>
            </main>
        </>
    );
}

function SuccessState() {
    return (
        <div className="text-center">
            <p
                className="mb-3"
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 11,
                    color: 'var(--sw-rose)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                }}
            >
                // Confirmed
            </p>
            <h2
                className="m-0"
                style={{
                    fontFamily: 'var(--sw-font-sans)',
                    fontSize: 'clamp(24px, 3vw, 34px)',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    letterSpacing: '-0.025em',
                    color: 'var(--sw-ink)',
                }}
            >
                You&apos;re on the list.
            </h2>
            <p
                className="mt-4 max-w-[480px] mx-auto"
                style={{
                    fontFamily: 'var(--sw-font-body)',
                    fontSize: 16,
                    lineHeight: 1.55,
                    color: 'var(--sw-ink)',
                }}
            >
                The Tender Readiness Health Check link will land in your inbox the moment it&apos;s live.
                The Tender Process Playbook follows shortly after.
            </p>
            <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 transition-colors hover:bg-[var(--sw-paper-2)]"
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--sw-ink)',
                    border: '1px solid var(--sw-rule)',
                    background: 'transparent',
                }}
            >
                ← Back to Sitewise
            </Link>
        </div>
    );
}
