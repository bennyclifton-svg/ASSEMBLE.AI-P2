'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { PendingApprovalView } from '@/lib/hooks/use-chat-stream';

interface ApprovalGateProps {
    approval: PendingApprovalView;
}

interface DiffShape {
    entity: string;
    entityId: string | null;
    summary: string;
    changes: Array<{ field: string; label: string; before: unknown; after: unknown }>;
}

function isDiff(x: unknown): x is DiffShape {
    return (
        typeof x === 'object' &&
        x !== null &&
        'summary' in x &&
        'changes' in x &&
        Array.isArray((x as DiffShape).changes)
    );
}

export function ApprovalGate({ approval }: ApprovalGateProps) {
    const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const diff = isDiff(approval.proposedDiff) ? approval.proposedDiff : null;
    const resolved = approval.resolution;

    const respond = async (decision: 'approve' | 'reject') => {
        setSubmitting(decision);
        setError(null);
        try {
            const res = await fetch(`/api/chat/approvals/${approval.id}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision }),
            });
            if (!res.ok && res.status !== 409 && res.status !== 410) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || `Request failed (${res.status})`);
            }
            // SSE pushes the resolution; useChatStream will populate
            // approval.resolution and the card transitions automatically.
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit decision');
        } finally {
            setSubmitting(null);
        }
    };

    let statusBanner: React.ReactNode = null;
    if (resolved) {
        if (resolved.status === 'applied') {
            statusBanner = (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        margin: '0 12px 12px',
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 4,
                        backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                        color: 'var(--color-success)',
                    }}
                >
                    <CheckCircle2 size={14} />
                    <span>Applied</span>
                </div>
            );
        } else if (resolved.status === 'rejected') {
            statusBanner = (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        margin: '0 12px 12px',
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 4,
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-secondary)',
                    }}
                >
                    <XCircle size={14} />
                    <span>Rejected</span>
                </div>
            );
        } else {
            statusBanner = (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                        margin: '0 12px 12px',
                        padding: '8px 10px',
                        fontSize: 12,
                        borderRadius: 4,
                        backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
                        color: 'var(--color-warning)',
                    }}
                >
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{resolved.error ?? 'Conflict — re-prompt the agent with current data.'}</span>
                </div>
            );
        }
    }

    return (
        <div
            data-testid="approval-gate"
            style={{
                // flexShrink:0 keeps the card at its natural content height
                // inside MessageList's flex-column. Without it, column pressure
                // shrinks the card and overflow:hidden clips the action buttons.
                // minHeight is a safety floor for empty/loading states.
                flexShrink: 0,
                minHeight: 140,
                width: '100%',
                display: 'block',
                margin: '8px 0',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-text-tertiary)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                }}
            >
                Proposed change · awaiting approval
            </div>

            <div style={{ padding: '12px', fontSize: 13, color: 'var(--color-text-primary)' }}>
                {diff ? (
                    <>
                        <div
                            style={{
                                fontWeight: 600,
                                marginBottom: 8,
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            {diff.summary}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {diff.changes.map((c) => (
                                <div
                                    key={c.field}
                                    style={{ fontSize: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: 'var(--color-text-tertiary)',
                                            minWidth: 110,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {c.label}
                                    </span>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>
                                        {String(c.before ?? '—')}
                                    </span>
                                    <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
                                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                                        {String(c.after ?? '—')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <pre
                        style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: 'var(--color-text-tertiary)',
                            whiteSpace: 'pre-wrap',
                            margin: 0,
                        }}
                    >
                        {JSON.stringify(approval.proposedDiff, null, 2)}
                    </pre>
                )}
            </div>

            {statusBanner}

            {!resolved && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderTop: '1px solid var(--color-border-subtle)',
                    }}
                >
                    <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={() => respond('approve')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 4,
                            border: 'none',
                            cursor: submitting !== null ? 'wait' : 'pointer',
                            backgroundColor: 'var(--color-accent-primary)',
                            color: 'var(--color-on-accent)',
                            opacity: submitting !== null ? 0.5 : 1,
                            transition: 'opacity 0.15s, filter 0.15s',
                        }}
                        onMouseEnter={(e) => {
                            if (submitting === null)
                                (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.filter = '';
                        }}
                        data-testid={`approve-${approval.id}`}
                    >
                        {submitting === 'approve' ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={12} />
                        )}
                        Approve & apply
                    </button>
                    <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={() => respond('reject')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 500,
                            borderRadius: 4,
                            cursor: submitting !== null ? 'wait' : 'pointer',
                            backgroundColor: 'transparent',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                            opacity: submitting !== null ? 0.5 : 1,
                            transition: 'background-color 0.15s, color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                            if (submitting === null) {
                                const btn = e.currentTarget as HTMLButtonElement;
                                btn.style.backgroundColor = 'var(--color-bg-tertiary)';
                                btn.style.color = 'var(--color-text-primary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            const btn = e.currentTarget as HTMLButtonElement;
                            btn.style.backgroundColor = 'transparent';
                            btn.style.color = 'var(--color-text-secondary)';
                        }}
                        data-testid={`reject-${approval.id}`}
                    >
                        {submitting === 'reject' ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <XCircle size={12} />
                        )}
                        Reject
                    </button>
                    {error && (
                        <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--color-error)' }}>
                            {error}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
