'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    CalendarDays,
    ClipboardCheck,
    FileSearch,
    GitCompare,
    Mail,
    MessageSquare,
    Send,
    Check,
} from 'lucide-react';
import { BookDemoDialog } from './BookDemoDialog';

const HERO_CHIPS = [
    { label: 'Draft tenders', icon: FileSearch, color: 'var(--sw-rose-dk)' },
    { label: 'Build programs', icon: ClipboardCheck, color: 'var(--sw-peach)' },
    { label: 'Extract objectives', icon: GitCompare, color: 'var(--sw-cyan)' },
    { label: 'Track RFIs', icon: MessageSquare, color: 'var(--sw-lav)' },
    { label: 'Issue letters & transmittals', icon: Mail, color: 'var(--sw-amber)' },
];

export function HeroSection() {
    const [demoOpen, setDemoOpen] = useState(false);

    return (
        <section
            className="relative overflow-hidden"
            style={{
                background: 'var(--sw-canvas)',
                color: 'var(--sw-ink)',
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none z-[1]"
                style={{
                    background:
                        'radial-gradient(1000px 620px at 82% -12%, rgba(79,182,190,0.08), transparent 60%),' +
                        'radial-gradient(760px 420px at -10% 105%, rgba(32,105,138,0.05), transparent 62%)',
                }}
            />

            <div className="relative z-10 w-full max-w-[1280px] mx-auto px-8 pt-[132px] pb-[92px]">
                <div className="grid w-full min-w-0 grid-cols-1 lg:grid-cols-[1.02fr_0.98fr] gap-12 items-center">
                    <div className="min-w-0">
                        <div
                            className="inline-flex items-center gap-2 px-2.5 py-1 mb-6 font-semibold"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose-dk)',
                                background: 'var(--sw-rose-tint)',
                                border: '1px solid rgba(79,182,190,0.30)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                            }}
                        >
                            Agentic project ops · one PM
                        </div>

                        <h1
                            className="m-0"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(40px, 6vw, 78px)',
                                fontWeight: 800,
                                lineHeight: 0.98,
                                letterSpacing: 0,
                                color: 'var(--sw-ink)',
                                maxWidth: 760,
                            }}
                        >
                            AI does the
                            <span className="block" style={{ color: 'var(--sw-rose-dk)' }}>
                                grunt work.
                            </span>
                            <span className="block">You run the project.</span>
                        </h1>

                        <p
                            className="mt-6 w-full max-w-[650px]"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 18,
                                lineHeight: 1.58,
                                color: 'var(--sw-muted)',
                            }}
                        >
                            An AI project officer that keeps your project coherent, grounded,
                            evidenced, and ready to issue.
                        </p>

                        <div className="mt-7 grid w-full grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-[680px]">
                            {HERO_CHIPS.map(({ label, icon: Icon, color }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2.5 px-3 py-2.5"
                                    style={{
                                        border: '1px solid var(--sw-rule)',
                                        background: 'var(--sw-paper)',
                                        color: 'var(--sw-ink)',
                                        fontFamily: 'var(--sw-font-body)',
                                        fontSize: 14,
                                    }}
                                >
                                    <Icon size={16} strokeWidth={1.8} style={{ color }} aria-hidden="true" />
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                            <Link
                                href="/pricing"
                                className="inline-flex items-center justify-center gap-2 px-[18px] py-3 font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    background: 'var(--sw-cta)',
                                    color: 'var(--sw-cta-fg)',
                                }}
                            >
                                Start free trial · no card
                                <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setDemoOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-[18px] py-3 font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[color:var(--sw-shell)]"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    color: 'var(--sw-ink)',
                                    border: '1px solid var(--sw-rule)',
                                    background: 'transparent',
                                }}
                            >
                                <CalendarDays size={15} strokeWidth={2} aria-hidden="true" />
                                Book a demo
                            </button>
                        </div>

                        <p
                            className="mt-5"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 13.5,
                                lineHeight: 1.55,
                                color: 'var(--sw-muted)',
                                maxWidth: 600,
                            }}
                        >
                            For PMs, D&amp;C contractors, architects and developers running projects.
                        </p>
                    </div>

                    <ChatApprovalScene />
                </div>
            </div>

            <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
        </section>
    );
}

function ChatApprovalScene() {
    return (
        <div
            className="overflow-hidden"
            style={{
                background: 'var(--sw-paper-2)',
                border: '1px solid var(--sw-rule-dk)',
                boxShadow: '0 30px 80px -20px rgba(14,16,20,0.32)',
            }}
        >
            <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                    borderBottom: '1px solid var(--sw-rule-dk)',
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 11,
                }}
            >
                <span style={{ color: 'rgba(232,228,218,0.55)' }}>project.chat</span>
                <span style={{ color: 'var(--sw-amber)' }}>● 1 approval pending</span>
            </div>

            <div className="p-5 space-y-4">
                <div
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-rose)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    You · just now
                </div>

                <div
                    className="px-4 py-3"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--sw-rule-dk)',
                        fontFamily: 'var(--sw-font-body)',
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: '#E8E4DA',
                    }}
                >
                    Create RFT for electrical consultant.
                </div>

                <div
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-cyan)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    Sitewise · drafted in 6s
                </div>

                <div
                    className="overflow-hidden"
                    style={{
                        background: 'rgba(255,255,255,0.035)',
                        border: '1px solid var(--sw-rule-dk-2)',
                    }}
                >
                    <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{
                            borderBottom: '1px solid var(--sw-rule-dk)',
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'rgba(232,228,218,0.6)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                        }}
                    >
                        <span>Approval card</span>
                        <span style={{ color: 'var(--sw-amber)' }}>pending</span>
                    </div>

                    <div className="px-4 py-4 space-y-3">
                        <div
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 15,
                                fontWeight: 700,
                                color: '#E8E4DA',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            RFT — Electrical Consultant
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Documents', value: '14' },
                                { label: 'Pages', value: '38' },
                                { label: 'Refs', value: 'NCC · AS' },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="px-2.5 py-2"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--sw-rule-dk)',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 9,
                                            color: 'rgba(232,228,218,0.5)',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {stat.label}
                                    </div>
                                    <div
                                        className="mt-1"
                                        style={{
                                            fontFamily: 'var(--sw-font-sans)',
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: '#E8E4DA',
                                        }}
                                    >
                                        {stat.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <ul
                            className="space-y-1.5 pt-1"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 12.5,
                                lineHeight: 1.5,
                                color: 'rgba(232,228,218,0.78)',
                            }}
                        >
                            {[
                                'Scope of services drafted',
                                'Deliverables list assembled',
                                'Fee schedule template attached',
                            ].map((line) => (
                                <li key={line} className="flex items-start gap-2">
                                    <Check
                                        size={13}
                                        strokeWidth={2}
                                        style={{ color: 'var(--sw-cyan)', marginTop: 2 }}
                                        aria-hidden="true"
                                    />
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="flex items-center gap-2 pt-2">
                            <span
                                className="px-3 py-1.5 font-bold uppercase"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    background: 'var(--sw-cta)',
                                    color: 'var(--sw-cta-fg)',
                                    letterSpacing: '0.12em',
                                }}
                            >
                                Approve
                            </span>
                            <span
                                className="px-3 py-1.5 uppercase"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    color: '#E8E4DA',
                                    border: '1px solid var(--sw-rule-dk-2)',
                                    letterSpacing: '0.12em',
                                }}
                            >
                                Edit
                            </span>
                            <span
                                className="px-3 py-1.5 uppercase"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    color: 'rgba(232,228,218,0.55)',
                                    letterSpacing: '0.12em',
                                }}
                            >
                                Reject
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <Send size={11} strokeWidth={2} style={{ color: 'rgba(232,228,218,0.4)' }} aria-hidden="true" />
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'rgba(232,228,218,0.4)',
                            letterSpacing: '0.06em',
                        }}
                    >
                        type a command or attach a document…
                    </span>
                </div>
            </div>
        </div>
    );
}
