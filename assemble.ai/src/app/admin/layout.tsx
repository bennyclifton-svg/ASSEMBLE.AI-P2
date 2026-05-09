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
import { SitewiseWordmark } from '@/components/brand/SitewiseWordmark';
import { AdminTabs } from './AdminTabs';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireSuperAdminPage();

    return (
        <div className="sitewise-control-surface min-h-screen bg-[var(--sw-paper)] text-[var(--sw-ink)]">
            {/* Admin Header */}
            <header className="border-b border-[var(--sw-rule)] bg-[var(--sw-paper-2)]">
                {/* Row 1 — branding + back link */}
                <div className="mx-auto max-w-6xl px-6 pt-4 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="sitewise-button sitewise-button-muted">
                                <ArrowLeft className="h-3.5 w-3.5" />
                                App
                            </Link>
                            <span className="h-8 w-px bg-[var(--sw-rule)]" />
                            <div className="flex items-center gap-3">
                                <SitewiseWordmark size={24} color="var(--sw-ink)" accent="var(--sw-rose)" />
                                <span className="sitewise-status-pill sitewise-status-pill-dark">
                                    <Settings className="h-3.5 w-3.5" />
                                    admin
                                </span>
                            </div>
                        </div>
                        <span className="sitewise-page-kicker">operator console</span>
                    </div>
                </div>
                {/* Row 2 — tabs */}
                <div className="mx-auto max-w-6xl px-6">
                    <AdminTabs />
                </div>
            </header>

            {/* Admin Content */}
            <main className="sitewise-graphic-field min-h-[calc(100vh-104px)]">{children}</main>
        </div>
    );
}
