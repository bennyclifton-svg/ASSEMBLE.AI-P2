'use client';

import { useEffect, useState } from 'react';
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
                        : 'bg-transparent',
                )}
            >
                <div className="max-w-[1280px] mx-auto px-8 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center hover:scale-[1.02] transition-transform duration-200"
                        aria-label="Sitewise home"
                    >
                        <SitewiseWordmark size={26} color="#E8E4DA" accent="var(--sw-rose)" />
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex text-[13px] text-white/60 hover:text-white transition-colors duration-200"
                            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.02em' }}
                        >
                            login
                        </Link>
                        <button
                            type="button"
                            onClick={() => setDemoOpen(true)}
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] border border-white/14 text-[#E8E4DA] hover:bg-white/5 transition-colors"
                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                        >
                            Book a demo
                        </button>
                        <Link
                            href="/assessment"
                            className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                background: 'var(--sw-rose)',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Project Health Check
                        </Link>
                    </div>
                </div>
            </nav>
            <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
        </>
    );
}
