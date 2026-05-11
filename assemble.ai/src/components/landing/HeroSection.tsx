'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, ClipboardCheck, FileSearch, GitCompare, Send } from 'lucide-react';
import { BookDemoDialog } from './BookDemoDialog';

const HERO_FEATURES = [
    { label: 'Develop the brief', icon: ClipboardCheck, color: 'var(--sw-rose)' },
    { label: 'Procure consultants', icon: Send, color: 'var(--sw-peach)' },
    { label: 'Tender packages', icon: FileSearch, color: 'var(--sw-cyan)' },
    { label: 'Run contract admin', icon: GitCompare, color: 'var(--sw-lav)' },
    { label: 'Close out and hand over', icon: ClipboardCheck, color: 'var(--sw-amber)' },
];

export function HeroSection() {
    const [demoOpen, setDemoOpen] = useState(false);

    return (
        <section
            className="relative overflow-hidden"
            style={{
                background: 'var(--sw-ink)',
                color: '#E8E4DA',
                fontFamily: 'var(--sw-font-sans)',
            }}
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(1000px 620px at 82% -12%, rgba(248,101,122,0.08), transparent 60%),' +
                        'radial-gradient(760px 420px at -10% 105%, rgba(122,184,194,0.06), transparent 62%)',
                }}
            />

            <div className="relative max-w-[1280px] mx-auto px-8 pt-[132px] pb-[92px]">
                <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr] gap-12 items-center">
                    <div>
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
                            Brief to handover · client-side delivery
                        </div>

                        <h1
                            className="m-0 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(44px, 6vw, 78px)',
                                fontWeight: 800,
                                lineHeight: 0.98,
                                letterSpacing: '-0.035em',
                                color: 'var(--sw-paper)',
                                maxWidth: 760,
                            }}
                        >
                            Brief to handover.{' '}
                            <span style={{ color: 'var(--sw-rose)' }}>From your side of the table.</span>
                        </h1>

                        <p
                            className="mt-6 max-w-[650px]"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 18,
                                lineHeight: 1.58,
                                color: 'rgba(232,228,218,0.74)',
                            }}
                        >
                            Sitewise is the AI-staffed workspace for architects, project managers and
                            in-house developer teams running building projects on behalf of an owner.
                        </p>

                        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-[680px]">
                            {HERO_FEATURES.map(({ label, icon: Icon, color }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2.5 px-3 py-2.5"
                                    style={{
                                        border: '1px solid rgba(255,255,255,0.09)',
                                        background: 'rgba(255,255,255,0.035)',
                                        color: '#E8E4DA',
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
                                href="/assessment"
                                className="inline-flex items-center justify-center gap-2 px-[18px] py-3 font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    background: 'var(--sw-rose)',
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                Take the 2-min Health Check
                                <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setDemoOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-[18px] py-3 font-bold uppercase tracking-[0.12em] transition-colors hover:bg-white/5"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    color: '#E8E4DA',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                    background: 'transparent',
                                }}
                            >
                                <CalendarDays size={15} strokeWidth={2} aria-hidden="true" />
                                Book a demo
                            </button>
                        </div>
                    </div>

                    <HeroAgentRoster />
                </div>
            </div>

            <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
        </section>
    );
}

function HeroAgentRoster() {
    const ROSTER = [
        { code: '01', name: 'Feasibility Agent',    role: 'Site · planning · DD',       active: false },
        { code: '02', name: 'Design Agent',         role: 'Brief · consultants',         active: true  },
        { code: '03', name: 'Procurement Agent',    role: 'Tender · evaluation',         active: true  },
        { code: '04', name: 'Delivery Agent',       role: 'CA · variations',             active: false },
        { code: '05', name: 'Finance Agent',        role: 'Cost plan · cashflow',        active: true  },
        { code: '06', name: 'Program Agent',        role: 'Master programme',            active: false },
        { code: '07', name: 'Correspondence Agent', role: 'RFIs · letters · register',   active: true  },
    ];

    return (
        <div
            className="overflow-hidden"
            style={{
                background: 'var(--sw-ink-2)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 30px 80px -20px rgba(0,0,0,0.62)',
            }}
        >
            <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 11,
                }}
            >
                <span style={{ color: 'rgba(232,228,218,0.55)' }}>team.workspace</span>
                <span style={{ color: 'var(--sw-amber)' }}>4 active</span>
            </div>

            <div className="p-5">
                <div
                    className="mb-4"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-rose)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    Your client-side team
                </div>

                <div className="grid gap-2">
                    {ROSTER.map((agent) => (
                        <div
                            key={agent.code}
                            className="grid grid-cols-[36px_1fr_auto] gap-3 items-center px-3 py-2.5"
                            style={{
                                background: 'rgba(255,255,255,0.035)',
                                border: '1px solid rgba(255,255,255,0.07)',
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    color: 'rgba(232,228,218,0.45)',
                                    letterSpacing: '0.08em',
                                }}
                            >
                                {agent.code}
                            </span>
                            <div className="flex items-baseline gap-2 min-w-0">
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-sans)',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#E8E4DA',
                                    }}
                                >
                                    {agent.name}
                                </span>
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 10,
                                        color: 'rgba(232,228,218,0.45)',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    {agent.role}
                                </span>
                            </div>
                            <span
                                style={{
                                    width: 7,
                                    height: 7,
                                    background: agent.active ? 'var(--sw-cyan)' : 'rgba(232,228,218,0.18)',
                                }}
                                aria-hidden="true"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
