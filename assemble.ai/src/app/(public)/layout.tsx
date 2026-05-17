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
    title: 'Sitewise - Run Better Tenders, Faster',
    description: 'Tender intelligence for Australian building projects. Scope packages, issue tenders, compare submissions and prepare award recommendations from one AI-powered workspace.',
    openGraph: {
        title: 'Sitewise - Run Better Tenders, Faster',
        description: 'Tender intelligence for Australian building projects.',
        type: 'website',
        locale: 'en_AU',
        siteName: 'SiteWise',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SiteWise',
        description: 'Run better tenders, faster.',
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
