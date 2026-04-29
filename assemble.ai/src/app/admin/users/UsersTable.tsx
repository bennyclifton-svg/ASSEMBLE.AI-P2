'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown, Search, Loader2, Copy, Check, ShieldOff, ShieldCheck, KeyRound, X } from 'lucide-react';
import type { AdminUserRow } from './page';

type SortKey = 'email' | 'name' | 'createdAt' | 'lastSeen' | 'planStatus' | 'status';
type StatusFilter = 'all' | 'active' | 'suspended';

interface ResetLinkModalState {
    email: string;
    resetUrl: string;
    expiresAt: string;
}

export function UsersTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
    const router = useRouter();
    const [users, setUsers] = useState(initialUsers);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [resetLink, setResetLink] = useState<ResetLinkModalState | null>(null);
    const [copied, setCopied] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let out = users;
        if (statusFilter === 'active') out = out.filter((u) => !u.suspendedAt);
        else if (statusFilter === 'suspended') out = out.filter((u) => u.suspendedAt);
        if (q) {
            out = out.filter(
                (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
            );
        }
        const sorted = [...out].sort((a, b) => {
            const aVal = sortValue(a, sortKey);
            const bVal = sortValue(b, sortKey);
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [users, search, statusFilter, sortKey, sortDir]);

    function toggleSort(k: SortKey) {
        if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortKey(k);
            setSortDir('asc');
        }
    }

    async function callAction(userId: string, path: 'suspend' | 'unsuspend' | 'reset-password') {
        setBusyId(userId);
        setError(null);
        try {
            const res = await fetch(`/api/admin/users/${userId}/${path}`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Action failed');

            if (path === 'reset-password') {
                setResetLink({ email: data.email, resetUrl: data.resetUrl, expiresAt: data.expiresAt });
            } else {
                // optimistic update for suspend / unsuspend
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === userId
                            ? { ...u, suspendedAt: path === 'suspend' ? data.suspendedAt : null }
                            : u
                    )
                );
                // soft refresh server data in background
                router.refresh();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setBusyId(null);
        }
    }

    async function copyResetUrl() {
        if (!resetLink) return;
        await navigator.clipboard.writeText(resetLink.resetUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div className="rounded-lg border border-gray-700 bg-[#252526]">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-700 px-4 py-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search email or name…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-gray-700 bg-[#1e1e1e] py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <div className="flex gap-1 rounded-md border border-gray-700 bg-[#1e1e1e] p-1 text-xs">
                    {(['all', 'active', 'suspended'] as StatusFilter[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`rounded px-3 py-1 capitalize transition-colors ${
                                statusFilter === s ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="border-b border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-300">{error}</div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-gray-700 text-xs uppercase tracking-wider text-gray-400">
                        <tr>
                            <Th onClick={() => toggleSort('email')} active={sortKey === 'email'} dir={sortDir}>Email</Th>
                            <Th onClick={() => toggleSort('name')} active={sortKey === 'name'} dir={sortDir}>Name</Th>
                            <Th onClick={() => toggleSort('createdAt')} active={sortKey === 'createdAt'} dir={sortDir}>Signed up</Th>
                            <Th onClick={() => toggleSort('lastSeen')} active={sortKey === 'lastSeen'} dir={sortDir}>Last login</Th>
                            <Th onClick={() => toggleSort('planStatus')} active={sortKey === 'planStatus'} dir={sortDir}>Plan</Th>
                            <Th onClick={() => toggleSort('status')} active={sortKey === 'status'} dir={sortDir}>Status</Th>
                            <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                                    No users match.
                                </td>
                            </tr>
                        )}
                        {filtered.map((u) => (
                            <tr key={u.id} className="border-b border-gray-800 last:border-0 hover:bg-[#2a2d2e]">
                                <td className="px-3 py-2 text-white">
                                    {u.email}
                                    {u.isSuperAdmin && (
                                        <span className="ml-2 rounded-full bg-blue-900/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-300">
                                            Super-admin
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-gray-300">{u.name}</td>
                                <td className="px-3 py-2 text-gray-400">{formatDate(u.createdAt)}</td>
                                <td className="px-3 py-2 text-gray-400">{u.lastSeen ? formatDate(u.lastSeen) : '—'}</td>
                                <td className="px-3 py-2 text-gray-400">{u.planStatus || '—'}</td>
                                <td className="px-3 py-2">
                                    {u.suspendedAt ? (
                                        <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">
                                            Suspended
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-300">
                                            Active
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    <div className="inline-flex items-center gap-1">
                                        {u.suspendedAt ? (
                                            <ActionButton
                                                onClick={() => callAction(u.id, 'unsuspend')}
                                                busy={busyId === u.id}
                                                title="Unsuspend"
                                                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                                                label="Unsuspend"
                                                variant="green"
                                            />
                                        ) : (
                                            <ActionButton
                                                onClick={() => callAction(u.id, 'suspend')}
                                                busy={busyId === u.id}
                                                title="Suspend (revokes sessions)"
                                                icon={<ShieldOff className="h-3.5 w-3.5" />}
                                                label="Suspend"
                                                variant="red"
                                                disabled={u.isSuperAdmin}
                                            />
                                        )}
                                        <ActionButton
                                            onClick={() => callAction(u.id, 'reset-password')}
                                            busy={busyId === u.id}
                                            title="Generate password reset link"
                                            icon={<KeyRound className="h-3.5 w-3.5" />}
                                            label="Reset link"
                                            variant="gray"
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Reset link modal */}
            {resetLink && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-[#252526] p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Password reset link generated</h3>
                                <p className="mt-1 text-sm text-gray-400">
                                    For <span className="font-mono text-blue-300">{resetLink.email}</span>. Send this link to the user manually.
                                </p>
                            </div>
                            <button
                                onClick={() => setResetLink(null)}
                                className="rounded p-1 text-gray-500 hover:bg-gray-700/50 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mb-3 rounded border border-gray-700 bg-[#1e1e1e] p-3">
                            <code className="break-all text-xs text-gray-200">{resetLink.resetUrl}</code>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-gray-500">
                                Expires {formatDate(resetLink.expiresAt)} (1 hour from now). Single-use.
                            </p>
                            <button
                                onClick={copyResetUrl}
                                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    copied ? 'bg-green-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? 'Copied' : 'Copy link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Th({
    children,
    onClick,
    active,
    dir,
}: {
    children: React.ReactNode;
    onClick: () => void;
    active: boolean;
    dir: 'asc' | 'desc';
}) {
    return (
        <th
            onClick={onClick}
            className="cursor-pointer select-none px-3 py-2 text-left font-semibold transition-colors hover:text-white"
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {active && (dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
            </span>
        </th>
    );
}

function ActionButton({
    onClick,
    busy,
    title,
    icon,
    label,
    variant,
    disabled,
}: {
    onClick: () => void;
    busy: boolean;
    title: string;
    icon: React.ReactNode;
    label: string;
    variant: 'red' | 'green' | 'gray';
    disabled?: boolean;
}) {
    const colors = {
        red: 'border-red-900/50 text-red-300 hover:bg-red-950/40',
        green: 'border-green-900/50 text-green-300 hover:bg-green-950/40',
        gray: 'border-gray-700 text-gray-300 hover:bg-gray-700/40',
    }[variant];
    return (
        <button
            onClick={onClick}
            disabled={busy || disabled}
            title={title}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${colors} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
            {label}
        </button>
    );
}

function sortValue(u: AdminUserRow, k: SortKey): string | number {
    switch (k) {
        case 'email':
            return u.email.toLowerCase();
        case 'name':
            return u.name.toLowerCase();
        case 'createdAt':
            return new Date(u.createdAt).getTime();
        case 'lastSeen':
            return u.lastSeen ? new Date(u.lastSeen).getTime() : 0;
        case 'planStatus':
            return u.planStatus || '';
        case 'status':
            return u.suspendedAt ? 1 : 0;
    }
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
}
