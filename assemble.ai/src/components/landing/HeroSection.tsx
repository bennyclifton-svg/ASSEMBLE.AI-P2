'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SectionContainer } from './shared/SectionContainer';
import { Button } from './shared/Button';
import { heroContent } from './data/landing-data';

function TeamSelector() {
    const [selected, setSelected] = useState('Architecture');
    const teams = ['Architecture', 'Construction', 'Engineering', 'Project Mgmt'];

    return (
        <div className="absolute top-8 right-8 bg-white rounded-xl p-4 shadow-xl w-[200px]">
            <p className="text-[var(--gray-600)] text-xs font-medium mb-3">Select your team</p>
            <div className="space-y-2">
                {teams.map((team) => (
                    <button
                        key={team}
                        onClick={() => setSelected(team)}
                        className={cn(
                            'w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                            selected === team
                                ? 'bg-[var(--primary-lighter)] text-[var(--primary-dark)] font-medium'
                                : 'text-[var(--gray-600)] hover:bg-[var(--gray-100)]'
                        )}
                    >
                        {team}
                    </button>
                ))}
            </div>
        </div>
    );
}

import { cn } from '@/lib/utils';

function HeroMockup() {
    return (
        <div className="relative">
            {/* Main mockup container */}
            <div className="bg-[var(--gray-900)] rounded-2xl p-6 shadow-2xl">
                {/* Header bar */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-[var(--gray-700)]" />
                    <div className="w-3 h-3 rounded-full bg-[var(--gray-700)]" />
                    <div className="w-3 h-3 rounded-full bg-[var(--gray-700)]" />
                </div>
                {/* Dashboard preview */}
                <div className="bg-[var(--gray-100)] rounded-lg p-4 h-[300px]">
                    <div className="flex gap-4">
                        <div className="w-1/3 space-y-3">
                            <div className="h-4 bg-[var(--gray-300)] rounded w-3/4" />
                            <div className="h-3 bg-[var(--gray-200)] rounded w-1/2" />
                            <div className="space-y-2 mt-4">
                                <div className="h-8 bg-white rounded shadow-sm" />
                                <div className="h-8 bg-white rounded shadow-sm" />
                                <div className="h-8 bg-white rounded shadow-sm" />
                            </div>
                        </div>
                        <div className="w-2/3 bg-white rounded-lg shadow-sm p-4">
                            <div className="h-4 bg-[var(--gray-200)] rounded w-1/3 mb-4" />
                            <div className="h-32 bg-gradient-to-br from-[var(--primary-lighter)] to-[var(--primary-light)] rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>
            {/* Team selector overlay */}
            <TeamSelector />
        </div>
    );
}

export function HeroSection() {
    const [email, setEmail] = useState('');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            router.push(`/register?email=${encodeURIComponent(email)}`);
        }
    };

    return (
        <SectionContainer pattern="hero" background="bg-black" className="pt-[120px] pb-[80px]">
            {/* Gradient fade at bottom of hero pattern */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
                {/* Content */}
                <div>
                    <h1 className="font-[var(--font-spectral)] serif text-[clamp(48px,5.5vw,72px)] leading-[1.15] tracking-[-2px] mb-6">
                        <span className="text-[var(--gray-500)]">{heroContent.headline.gray}</span>{' '}
                        <span className="text-white">{heroContent.headline.white}</span>
                    </h1>

                    <p className="text-[17px] text-[var(--gray-400)] max-w-[480px] mb-8 leading-relaxed">
                        {heroContent.subtitle}
                    </p>

                    <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="px-4 py-3 bg-[var(--gray-900)] border border-[var(--gray-700)] rounded-lg text-white text-sm w-full max-w-[280px] focus:outline-none focus:border-[var(--gray-500)] placeholder:text-[var(--gray-500)]"
                            required
                        />
                        <Button type="submit" variant="primary-green" size="large">
                            {heroContent.cta}
                        </Button>
                    </form>

                    <p className="text-[13px] text-[var(--gray-500)] mt-4">
                        By signing up, you agree to our{' '}
                        <a href="/terms" className="underline hover:text-[var(--gray-400)]">Terms</a>
                        {' '}and{' '}
                        <a href="/privacy" className="underline hover:text-[var(--gray-400)]">Privacy Policy</a>
                    </p>
                </div>

                {/* Hero Mockup - hidden on tablet/mobile */}
                <div className="hidden lg:block">
                    <HeroMockup />
                </div>
            </div>
        </SectionContainer>
    );
}
