/**
 * Admin Layout
 *
 * Two-row header:
 *   Row 1: "Back to App" link + "Admin" branding (left aligned)
 *   Row 2: Tab nav (Users / AI Models / Products) — same styling as project dashboard
 *
 * Enforces super-admin via requireSuperAdminPage().
 */

import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';
import { requireSuperAdminPage } from '@/lib/admin/guard';
import { AdminTabs } from './AdminTabs';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireSuperAdminPage();

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
            {/* Admin Header */}
            <div className="bg-[var(--color-bg-secondary)]">
                {/* Row 1 — branding + back link */}
                <div className="mx-auto max-w-6xl px-6 pt-4 pb-2">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to App
                        </Link>
                        <span className="text-[var(--color-border-strong)]">|</span>
                        <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
                            <Settings className="h-5 w-5 text-[var(--color-accent-primary)]" />
                            <span className="font-semibold">Admin</span>
                        </div>
                    </div>
                </div>
                {/* Row 2 — tabs */}
                <div className="mx-auto max-w-6xl px-6">
                    <AdminTabs />
                </div>
            </div>

            {/* Admin Content */}
            <main>{children}</main>
        </div>
    );
}
