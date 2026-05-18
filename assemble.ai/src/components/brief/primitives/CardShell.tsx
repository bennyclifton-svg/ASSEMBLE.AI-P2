'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const muted = 'var(--sw-muted)';

export function CardShell({
    label,
    meta,
    action,
    headerSlot,
    collapsible = false,
    defaultCollapsed = false,
    bordered = true,
    children,
}: {
    label: string;
    meta?: string;
    action?: React.ReactNode;
    headerSlot?: React.ReactNode;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    /** When false, drops the outer border + background so the shell can be
     *  embedded inside a larger unified shell that owns those edges. */
    bordered?: boolean;
    children: React.ReactNode;
}) {
    const [expanded, setExpanded] = useState(!defaultCollapsed);
    const labelStyle: React.CSSProperties = {
        fontFamily: 'var(--sw-font-mono)',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--sw-cta)',
        fontWeight: 700,
    };
    const metaStyle: React.CSSProperties = {
        fontFamily: 'var(--sw-font-mono)',
        fontSize: 10,
        color: 'var(--sw-cyan)',
        letterSpacing: '0.05em',
        textTransform: 'lowercase',
    };

    const Chevron = expanded ? ChevronDown : ChevronRight;

    return (
        <section
            style={{
                background: bordered ? 'var(--sw-shell)' : 'transparent',
                border: bordered ? '1px solid var(--sw-rule)' : 'none',
            }}
        >
            {headerSlot ? (
                <header
                    className="px-3 py-2 items-center"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr auto',
                        gap: 12,
                        borderBottom: expanded ? '1px solid var(--sw-rule-2)' : 'none',
                    }}
                >
                    <span className="flex items-center gap-2">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" style={{ background: 'var(--sw-cta)' }} />
                        <span style={labelStyle}>{label}</span>
                    </span>
                    <div className="min-w-0">{headerSlot}</div>
                    {meta ? <span style={metaStyle}>{meta}</span> : <span />}
                </header>
            ) : collapsible ? (
                <header
                    className="flex items-center justify-between px-3 py-2"
                    style={{
                        borderBottom: expanded ? '1px solid var(--sw-rule-2)' : 'none',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        aria-expanded={expanded}
                        className="flex items-center gap-2"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                        }}
                    >
                        <Chevron
                            size={12}
                            strokeWidth={2}
                            style={{ color: muted }}
                        />
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" style={{ background: 'var(--sw-cta)' }} />
                        <span style={labelStyle}>{label}</span>
                    </button>
                    <span className="flex items-center gap-3">
                        {meta && <span style={metaStyle}>{meta}</span>}
                        {action}
                    </span>
                </header>
            ) : (
                <header
                    className="flex items-center justify-between px-3 py-2"
                    style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                >
                    <span className="flex items-center gap-2">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" style={{ background: 'var(--sw-cta)' }} />
                        <span style={labelStyle}>{label}</span>
                    </span>
                    <span className="flex items-center gap-3">
                        {meta && <span style={metaStyle}>{meta}</span>}
                        {action}
                    </span>
                </header>
            )}
            {expanded && (
                <div className="p-2" style={{ textTransform: 'lowercase' }}>
                    {children}
                </div>
            )}
        </section>
    );
}
