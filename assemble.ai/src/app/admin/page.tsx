/**
 * Admin Index
 *
 * Landing page for the operator console. Card grid linking to each admin section.
 * Layout already enforces super-admin via requireSuperAdminPage().
 */

import Link from 'next/link';
import { Users, Cpu, Package } from 'lucide-react';

const sections = [
    {
        href: '/admin/users',
        title: 'Users',
        description: 'List, search, suspend, and generate password-reset links across all orgs.',
        icon: Users,
        status: 'live' as const,
    },
    {
        href: '/admin/models',
        title: 'AI Models',
        description: 'Pick provider and model per feature group. See cost reference.',
        icon: Cpu,
        status: 'live' as const,
    },
    {
        href: '/admin/products',
        title: 'Products',
        description: 'Polar product IDs, active/inactive toggles, environment status.',
        icon: Package,
        status: 'live' as const,
    },
];

export default function AdminIndexPage() {
    return (
        <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="mb-10">
                <h1 className="text-2xl font-semibold text-white">Operator Console</h1>
                <p className="mt-1 text-sm text-gray-400">
                    Super-admin only. Every action is logged to <code className="text-xs">admin_audit_log</code>.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sections.map(({ href, title, description, icon: Icon, status }) => {
                    const isLive = status === 'live';
                    const card = (
                        <div
                            className={`group rounded-lg border p-5 transition-colors ${
                                isLive
                                    ? 'border-gray-700 bg-[#252526] hover:border-blue-500 hover:bg-[#2a2d2e]'
                                    : 'border-gray-800 bg-[#1f1f1f] opacity-60'
                            }`}
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <Icon className={`h-5 w-5 ${isLive ? 'text-blue-400' : 'text-gray-500'}`} />
                                {!isLive && (
                                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-400">
                                        Coming soon
                                    </span>
                                )}
                            </div>
                            <h2 className="mb-1 text-base font-semibold text-white">{title}</h2>
                            <p className="text-sm text-gray-400">{description}</p>
                        </div>
                    );

                    return isLive ? (
                        <Link key={href} href={href}>
                            {card}
                        </Link>
                    ) : (
                        <div key={href}>{card}</div>
                    );
                })}
            </div>
        </div>
    );
}
