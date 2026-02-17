'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from './shared/Button';
import { TypingLogo } from '@/components/brand/TypingLogo';
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
                isScrolled ? 'bg-black/95 backdrop-blur-[20px]' : 'bg-transparent'
            )}
        >
            <div className="max-w-[1280px] mx-auto px-8 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 hover:scale-[1.02] transition-transform duration-200">
                    <Image
                        src="/logo-foundry.svg"
                        alt="Foundry Logo"
                        width={29}
                        height={29}
                        className="flex-shrink-0 logo-icon-glow"
                        priority
                    />
                    <TypingLogo className="text-white font-bold text-[18px] italic" />
                </Link>

                {/* Nav Links - REMOVED */}
                <div className="flex-1" />

                {/* CTA Buttons */}
                <div className="flex items-center gap-3">
                    <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors duration-200 hidden sm:block">
                        Login
                    </Link>
                    <Button variant="ghost" hasArrow={false} onClick={() => setDemoOpen(true)} className="hidden sm:flex">
                        Book a demo
                    </Button>
                    <Button variant="black" href="/register">
                        Sign up free
                    </Button>
                </div>
            </div>
        </nav>
        <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
        </>
    );
}
