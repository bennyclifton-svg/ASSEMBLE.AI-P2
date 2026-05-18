'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookDemoDialog } from './BookDemoDialog';

export function NavBar() {
    const [demoOpen, setDemoOpen] = useState(false);

    return (
        <>
            <nav
                className="fixed top-0 left-0 right-0 z-50"
                style={{
                    background: 'var(--sw-paper-2)',
                    borderBottom: '1px solid var(--sw-rule-dk)',
                }}
            >
                <div className="max-w-[1280px] mx-auto px-8 py-3 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center hover:opacity-80 transition-opacity"
                        aria-label="Sitewise home"
                    >
                        <Image
                            src="/images/sitewise-logo-light.png"
                            alt="Sitewise"
                            width={1038}
                            height={554}
                            priority
                            style={{ height: 44, width: 'auto', display: 'block' }}
                        />
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex text-[13px] hover:opacity-100 transition-opacity"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                letterSpacing: '0.02em',
                                color: 'rgba(232,228,218,0.65)',
                            }}
                        >
                            Sign in
                        </Link>
                        <button
                            type="button"
                            onClick={() => setDemoOpen(true)}
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-white/5"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                color: '#E8E4DA',
                                border: '1px solid var(--sw-rule-dk-2)',
                                background: 'transparent',
                            }}
                        >
                            Book a demo
                        </button>
                        <Link
                            href="/pricing"
                            className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors hover:opacity-90"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                background: 'var(--sw-cta)',
                                color: 'var(--sw-cta-fg)',
                            }}
                        >
                            Start free trial
                        </Link>
                    </div>
                </div>
            </nav>
            <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
        </>
    );
}
