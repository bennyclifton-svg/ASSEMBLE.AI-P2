/**
 * Public Layout
 * Layout for unauthenticated pages (landing, pricing)
 * No authentication required
 */

import { Metadata } from 'next';
import { DM_Sans, Spectral } from 'next/font/google';
import '@/styles/landing.css';

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

const spectral = Spectral({
    subsets: ['latin'],
    variable: '--font-spectral',
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Foundry - AI-Powered Construction Project Management',
    description: 'Build faster. Save time. Stand out. Foundry is the AI platform that turns project chaos into an ongoing way of working for AEC firms.',
    openGraph: {
        title: 'Foundry - AI-Powered Construction Project Management',
        description: 'Build faster. Save time. Stand out. The AI platform for architecture, engineering, and construction firms.',
        type: 'website',
        locale: 'en_AU',
        siteName: 'Foundry',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Foundry',
        description: 'AI-Powered Construction Project Management',
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${dmSans.variable} ${spectral.variable} min-h-screen font-sans`}>
            {children}
        </div>
    );
}
