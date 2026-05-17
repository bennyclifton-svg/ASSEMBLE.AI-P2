'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, Loader2, Save, Trash2 } from 'lucide-react';
import type { AccountState } from '@/lib/account/account-state';

export function AccountSettingsPanel({ initialState }: { initialState: AccountState }) {
    const [account, setAccount] = useState(initialState);
    const [name, setName] = useState(initialState.user.name);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function saveProfile() {
        setIsSaving(true);
        setMessage(null);
        try {
            const response = await fetch('/api/account/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not save account details');
            setAccount((current) => ({
                ...current,
                user: { ...current.user, name: data.user.name },
            }));
            setMessage('Account details saved.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not save account details');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="h-full overflow-auto bg-transparent text-[var(--sw-ink)]">
            <div className="sitewise-page-frame max-w-4xl">
                <div className="sitewise-page-header">
                    <div>
                        <div className="sitewise-page-kicker">account / settings</div>
                        <h1 className="mt-2">Account Settings</h1>
                        <p className="sitewise-page-subtitle">
                            Profile, subscription state, exports, and data requests.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                        <span className="sitewise-status-pill">{account.subscription.status}</span>
                        <span className="sitewise-status-pill sitewise-status-pill-dark">
                            {account.subscription.planName}
                        </span>
                    </div>
                </div>

                {account.subscription.readOnly && (
                    <div className="sitewise-card mb-8 border-l-[3px] border-l-[var(--sw-rose)] p-4">
                        <p className="font-medium text-[var(--sw-rose-dk)]">Workspace is read-only</p>
                        <p className="mt-1 text-sm text-[var(--sw-muted)]">
                            Viewing and export stay available. Upgrade or update billing to create, edit, upload, and run AI actions again.
                        </p>
                    </div>
                )}

                <section className="sitewise-card mb-8 p-6">
                    <div className="sitewise-section-label mb-4">Profile</div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--sw-muted)]">Name</span>
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full border px-3 py-2 text-sm"
                                maxLength={100}
                            />
                        </label>
                        <div>
                            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--sw-muted)]">Email</div>
                            <div className="border border-[var(--sw-rule-2)] bg-[var(--sw-paper)] px-3 py-2 text-sm">
                                {account.user.email}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={saveProfile}
                            disabled={isSaving || name.trim().length === 0}
                            className="sitewise-button sitewise-button-primary"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                        </button>
                        {message && <p className="text-sm text-[var(--sw-muted)]">{message}</p>}
                    </div>
                </section>

                <section className="mb-8 grid gap-6 md:grid-cols-2">
                    <div className="sitewise-card p-6">
                        <div className="sitewise-section-label mb-4">Trial</div>
                        <dl className="space-y-3 text-sm">
                            <DataRow label="Plan" value={account.trial.planId ?? 'None'} />
                            <DataRow label="Status" value={account.trial.status ?? 'None'} />
                            <DataRow label="Ends" value={formatDate(account.trial.endsAt)} />
                            <DataRow label="Days left" value={account.trial.daysRemaining === null ? 'N/A' : String(account.trial.daysRemaining)} />
                        </dl>
                    </div>
                    <div className="sitewise-card p-6">
                        <div className="sitewise-section-label mb-4">Billing</div>
                        <dl className="space-y-3 text-sm">
                            <DataRow label="Plan" value={account.subscription.planName} />
                            <DataRow label="Status" value={account.subscription.status} />
                            <DataRow label="Renewal" value={formatDate(account.subscription.currentPeriodEnd)} />
                            <DataRow label="Cancellation" value={account.subscription.cancelAtPeriodEnd ? 'Scheduled' : 'Not scheduled'} />
                        </dl>
                        <Link href="/settings/billing" className="sitewise-button mt-5 inline-flex">
                            Manage subscription
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </div>
                </section>

                <section className="mb-8 grid gap-6 md:grid-cols-2">
                    <div className="sitewise-card p-6">
                        <div className="sitewise-section-label mb-3">Exports</div>
                        <p className="text-sm text-[var(--sw-muted)]">{account.dataControls.projectExportHint}</p>
                        <a href={account.dataControls.accountExportHref} className="sitewise-button mt-5 inline-flex">
                            <Download className="h-4 w-4" />
                            Download account state
                        </a>
                    </div>
                    <div className="sitewise-card p-6">
                        <div className="sitewise-section-label mb-3">Data Deletion</div>
                        <p className="text-sm text-[var(--sw-muted)]">{account.dataControls.deletionRequestCopy}</p>
                        <a href={account.dataControls.deletionRequestHref} className="sitewise-button mt-5 inline-flex">
                            <Trash2 className="h-4 w-4" />
                            Request deletion
                        </a>
                    </div>
                </section>

                <section className="sitewise-card p-6">
                    <div className="sitewise-section-label mb-4">Support State</div>
                    <dl className="grid gap-3 text-sm md:grid-cols-2">
                        <DataRow label="User ID" value={account.user.id} />
                        <DataRow label="Workspace" value={account.workspace.organizationName ?? 'None'} />
                        <DataRow label="Workspace ID" value={account.workspace.organizationId ?? 'None'} />
                        <DataRow label="Projects" value={String(account.workspace.projectCount)} />
                    </dl>
                </section>
            </div>
        </div>
    );
}

function DataRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--sw-rule-2)] pb-2 last:border-0">
            <dt className="font-mono text-[11px] uppercase text-[var(--sw-muted)]">{label}</dt>
            <dd className="text-right text-[var(--sw-ink)]">{value}</dd>
        </div>
    );
}

function formatDate(value: string | null): string {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
