/**
 * Public Layout
 * Layout for unauthenticated pages (landing, pricing)
 * No authentication required
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Assemble.ai - AI-Powered Construction Project Management',
    description: 'Streamline your construction projects with intelligent document management, procurement automation, and AI-powered insights. Built for Australian construction firms.',
    openGraph: {
        title: 'Assemble.ai - AI-Powered Construction Project Management',
        description: 'Streamline your construction projects with intelligent document management, procurement automation, and AI-powered insights.',
        type: 'website',
        locale: 'en_AU',
        siteName: 'Assemble.ai',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Assemble.ai',
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
        <div className="min-h-screen bg-[#1e1e1e] text-white">
            {children}
        </div>
    );
}
