/**
 * Admin Layout
 *
 * Protected layout for admin pages.
 * Currently checks for authenticated user - can be extended to check for admin role.
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/better-auth';
import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';

async function getCurrentSession() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        return session;
    } catch {
        return null;
    }
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getCurrentSession();

    if (!session?.user) {
        redirect('/login?redirect=/admin');
    }

    // TODO: Add admin role check when implementing user roles
    // For now, all authenticated users can access admin

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-white">
            {/* Admin Header */}
            <div className="border-b border-gray-800 bg-[#252526]">
                <div className="mx-auto max-w-6xl px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-gray-400 hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to App
                            </Link>
                            <span className="text-gray-600">|</span>
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-blue-400" />
                                <span className="font-semibold">Admin</span>
                            </div>
                        </div>
                        <nav className="flex items-center gap-6">
                            <Link
                                href="/admin/products"
                                className="text-sm text-gray-400 hover:text-white"
                            >
                                Products
                            </Link>
                        </nav>
                    </div>
                </div>
            </div>

            {/* Admin Content */}
            <main>{children}</main>
        </div>
    );
}
