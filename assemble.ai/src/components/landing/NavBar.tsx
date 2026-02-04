'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from './shared/Button';
import { navLinks } from './data/landing-data';

export function NavBar() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (href.startsWith('#')) {
            e.preventDefault();
            const element = document.querySelector(href);
            element?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
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
                        width={36}
                        height={36}
                        className="flex-shrink-0"
                        priority
                    />
                    <span className="text-white font-bold text-[22px] italic">Foundry</span>
                </Link>

                {/* Nav Links - hidden on mobile */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleNavClick(e, link.href)}
                            className="text-[var(--gray-400)] hover:text-white transition-colors text-[15px] font-medium"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" hasArrow={false} href="/demo" className="hidden sm:flex">
                        Book a demo
                    </Button>
                    <Button variant="black" href="/register">
                        Sign up free
                    </Button>
                </div>
            </div>
        </nav>
    );
}
