'use client';

import { FileText, MoreHorizontal, MoreVertical } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';

const muted = 'var(--sw-muted)';

const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--sw-font-mono)',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'lowercase',
    color: muted,
    fontWeight: 600,
};

const metaStyle: React.CSSProperties = {
    fontFamily: 'var(--sw-font-mono)',
    fontSize: 10,
    color: 'var(--sw-cyan)',
    letterSpacing: '0.05em',
    textTransform: 'lowercase',
};

export function ProcurementCardShell({
    label,
    meta,
    variant = 'panel',
    children,
}: {
    label?: string;
    meta?: string;
    variant?: 'panel' | 'strip';
    children: React.ReactNode;
}) {
    const isStrip = variant === 'strip';

    return (
        <section
            style={{
                background: isStrip ? 'transparent' : 'white',
                border: isStrip ? '0' : '1px solid var(--sw-rule)',
            }}
        >
            {!isStrip && (label || meta) ? (
                <header
                    className="flex items-baseline justify-between px-3 py-2"
                    style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                >
                    {label ? <span style={labelStyle}>{label}</span> : <span />}
                    {meta ? <span style={metaStyle}>{meta}</span> : null}
                </header>
            ) : null}
            {isStrip && meta ? (
                <div className="flex justify-end px-1 pb-1">
                    <span style={metaStyle}>{meta}</span>
                </div>
            ) : null}
            <div className={isStrip ? 'p-0' : 'p-2'}>{children}</div>
        </section>
    );
}

export function ProcurementIconButton({
    title,
    onClick,
    disabled,
    children,
}: {
    title: string;
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            disabled={disabled}
            className="flex shrink-0 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
                width: 28,
                height: 28,
                border: '1px solid var(--sw-rule)',
                background: 'transparent',
                color: 'var(--sw-muted)',
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
                if (disabled) return;
                e.currentTarget.style.color = 'var(--sw-ink)';
                e.currentTarget.style.background = 'var(--sw-paper)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--sw-muted)';
                e.currentTarget.style.background = 'transparent';
            }}
        >
            {children}
        </button>
    );
}

export function ProcurementToolbarDivider() {
    return (
        <div
            className="mx-1 h-5 w-px shrink-0"
            style={{ background: 'var(--sw-rule-2)' }}
        />
    );
}

export function ProcurementSectionShell({
    label,
    meta,
    accentColor,
    isExpanded,
    onToggleExpanded,
    isMenuExpanded,
    onToggleMenu,
    menuContent,
    displayMode = 'accordion',
    children,
}: {
    label: string;
    meta?: string;
    accentColor?: string;
    isExpanded: boolean;
    onToggleExpanded: () => void;
    isMenuExpanded?: boolean;
    onToggleMenu?: () => void;
    menuContent?: React.ReactNode;
    displayMode?: 'accordion' | 'detail';
    children: React.ReactNode;
}) {
    const hasMenu = Boolean(menuContent && onToggleMenu);
    const isDetail = displayMode === 'detail';
    const detailAccent = accentColor ?? 'var(--sw-cyan)';

    return (
        <section
            style={{
                background: 'var(--sw-shell)',
                border: isDetail ? '0' : '1px solid var(--sw-rule)',
            }}
        >
            <header
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-3 py-2"
                style={{
                    background: isDetail ? 'var(--sw-ink)' : 'white',
                    borderBottom: isDetail ? 'none' : '1px solid var(--sw-rule-2)',
                }}
            >
                <div className="flex min-w-0 shrink-0 items-center gap-2">
                    {isDetail ? (
                        <span
                            aria-hidden="true"
                            className="inline-block rounded-full"
                            style={{ width: 8, height: 8, background: detailAccent }}
                        />
                    ) : (
                        <FileText
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0"
                            style={{ color: 'var(--sw-peach)' }}
                        />
                    )}
                    <div className="flex min-w-0 items-baseline gap-2">
                        <span
                            style={{
                                ...labelStyle,
                                color: isDetail ? 'var(--sw-paper)' : labelStyle.color,
                                textTransform: isDetail ? 'uppercase' : labelStyle.textTransform,
                            }}
                        >
                            {label}
                        </span>
                        {!isDetail && meta ? (
                            <span
                                style={{
                                    ...metaStyle,
                                }}
                            >
                                {meta}
                            </span>
                        ) : null}
                    </div>
                </div>

                {isDetail && meta ? (
                    <span
                        className="ml-auto truncate text-[10px]"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            color: 'rgba(232,228,218,0.6)',
                        }}
                    >
                        {meta}
                    </span>
                ) : null}

                {!isDetail ? (
                    <div className="flex shrink-0 items-center gap-1">
                        <ProcurementIconButton
                            title={isExpanded ? 'Collapse' : 'Expand'}
                            onClick={onToggleExpanded}
                        >
                            <CornerBracketIcon
                                direction={isExpanded ? 'right' : 'left'}
                                className="h-4 w-4"
                            />
                        </ProcurementIconButton>
                        {hasMenu ? (
                            <ProcurementIconButton
                                title={isMenuExpanded ? 'Hide options' : 'Show options'}
                                onClick={onToggleMenu}
                            >
                                {isMenuExpanded ? (
                                    <MoreHorizontal className="h-4 w-4" />
                                ) : (
                                    <MoreVertical className="h-4 w-4" />
                                )}
                            </ProcurementIconButton>
                        ) : null}
                    </div>
                ) : null}

                {!isDetail && isMenuExpanded && menuContent ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                        {menuContent}
                    </div>
                ) : null}
            </header>

            {isDetail ? (
                <div
                    className="min-h-0 overflow-hidden bg-[var(--sw-shell)]"
                    style={{
                        border: '1px solid var(--sw-rule)',
                        borderTop: 'none',
                        borderLeft: accentColor ? `3px solid ${detailAccent}` : '1px solid var(--sw-rule)',
                    }}
                >
                    {menuContent ? (
                        <div
                            className="flex min-w-0 items-center gap-2 overflow-x-auto px-3 py-2"
                            style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                        >
                            {menuContent}
                        </div>
                    ) : null}

                    <div className="p-0">{children}</div>
                </div>
            ) : isExpanded ? (
                <div className="p-2">{children}</div>
            ) : null}
        </section>
    );
}
