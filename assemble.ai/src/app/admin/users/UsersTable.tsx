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
        <div className="sitewise-card overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--sw-rule-2)] px-4 py-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sw-muted)]" />
                    <input
                        type="text"
                        placeholder="Search email or name…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full border py-2 pl-9 pr-3 text-sm placeholder-[var(--sw-muted)]"
                    />
                </div>
                <div className="sitewise-segmented">
                    {(['all', 'active', 'suspended'] as StatusFilter[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            aria-pressed={statusFilter === s}
                            className="capitalize transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="border-b border-[var(--sw-rule)] bg-[var(--sw-rose-tint)] px-4 py-2 text-sm text-[var(--sw-rose-dk)]">{error}</div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-[var(--sw-rule-2)]">
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
                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--sw-muted)]">
                                    No users match.
                                </td>
                            </tr>
                        )}
                        {filtered.map((u) => (
                            <tr
                                key={u.id}
                                className="border-b border-[var(--sw-rule-2)] last:border-0"
                            >
                                <td className="px-3 py-2 text-[var(--sw-ink)]">
                                    {u.email}
                                    {u.isSuperAdmin && (
                                        <span className="sitewise-chip sitewise-chip-cyan ml-2">
                                            Super-admin
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-[var(--sw-muted)]">{u.name}</td>
                                <td className="px-3 py-2 text-[var(--sw-muted)]">{formatDate(u.createdAt)}</td>
                                <td className="px-3 py-2 text-[var(--sw-muted)]">{u.lastSeen ? formatDate(u.lastSeen) : '—'}</td>
                                <td className="px-3 py-2 text-[var(--sw-muted)]">{u.planStatus || '—'}</td>
                                <td className="px-3 py-2">
                                    {u.suspendedAt ? (
                                        <span className="sitewise-chip sitewise-chip-rose">
                                            Suspended
                                        </span>
                                    ) : (
                                        <span className="sitewise-chip sitewise-chip-green">
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
                    <div className="sitewise-card w-full max-w-2xl p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <div className="sitewise-section-label">Password reset link generated</div>
                                <p className="mt-2 text-sm text-[var(--sw-muted)]">
                                    For <span className="font-mono text-[var(--sw-rose-dk)]">{resetLink.email}</span>. Send this link to the user manually.
                                </p>
                            </div>
                            <button
                                onClick={() => setResetLink(null)}
                                className="sitewise-icon-button"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mb-3 border border-[var(--sw-rule)] bg-[var(--sw-paper)] p-3">
                            <code className="break-all text-xs text-[var(--sw-ink)]">{resetLink.resetUrl}</code>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-[var(--sw-muted)]">
                                Expires {formatDate(resetLink.expiresAt)} (1 hour from now). Single-use.
                            </p>
                            <button
                                onClick={copyResetUrl}
                                className={`sitewise-button ${
                                    copied
                                        ? 'bg-[#5c7a4a] !text-white'
                                        : 'sitewise-button-primary'
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
            className="cursor-pointer select-none px-3 py-2 text-left font-semibold transition-colors hover:text-[var(--sw-ink)]"
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
        red: 'text-[var(--sw-rose-dk)] hover:bg-[var(--sw-rose-tint)]',
        green: 'text-[#4b653c] hover:bg-[rgba(92,122,74,0.10)]',
        gray: 'text-[var(--sw-muted)] hover:bg-[var(--sw-paper)]',
    }[variant];
    return (
        <button
            onClick={onClick}
            disabled={busy || disabled}
            title={title}
            className={`sitewise-button min-h-[28px] px-2 py-1 text-[10px] ${colors} disabled:opacity-40 disabled:cursor-not-allowed`}
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
