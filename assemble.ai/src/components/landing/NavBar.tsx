'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SitewiseWordmark } from '@/components/brand/SitewiseWordmark';
import { BookDemoDialog } from './BookDemoDialog';

export function NavBar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [demoOpen, setDemoOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <nav
                className={cn(
                    'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
                    isScrolled
                        ? 'bg-[color:var(--sw-ink)]/95 backdrop-blur-[20px] border-b border-white/[0.06]'
                        : 'bg-transparent'
                )}
            >
                <div className="max-w-[1280px] mx-auto px-8 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center hover:scale-[1.02] transition-transform duration-200"
                        aria-label="Sitewise — home"
                    >
                        <SitewiseWordmark
                            size={26}
                            color="#E8E4DA"
                            accent="var(--sw-rose)"
                        />
                    </Link>

                    <div className="flex-1" />

                    {/* Version pill — matches design "v2.4.0 (stable) Sitewise" */}
                    <div
                        className="hidden md:inline-flex items-center gap-2 mr-4 px-3 py-1 rounded-full border border-white/10"
                        style={{ fontFamily: 'var(--sw-font-mono)', fontSize: 11, letterSpacing: '0.02em' }}
                    >
                        <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ background: 'var(--sw-amber)' }}
                            aria-hidden="true"
                        />
                        <span style={{ color: '#E8E4DA' }}>v2.4.0</span>
                        <span style={{ color: 'rgba(232,228,218,0.55)' }}>(stable)</span>
                        <span style={{ color: 'var(--sw-rose)', fontWeight: 600, marginLeft: 4 }}>Sitewise</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/assessment"
                            className="hidden sm:inline-flex text-[13px] text-white/60 hover:text-white transition-colors duration-200"
                            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.02em' }}
                        >
                            health check
                        </Link>
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex text-[13px] text-white/60 hover:text-white transition-colors duration-200"
                            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.02em' }}
                        >
                            login
                        </Link>
                        <button
                            onClick={() => setDemoOpen(true)}
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] border border-white/14 text-[#E8E4DA] hover:bg-white/5 transition-colors"
                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                        >
                            Book a demo
                        </button>
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                background: 'var(--sw-rose)',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Sign up free →
                        </Link>
                    </div>
                </div>
            </nav>
            <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
        </>
    );
}
