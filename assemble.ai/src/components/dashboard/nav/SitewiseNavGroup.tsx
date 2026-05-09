'use client';

interface SitewiseNavGroupProps {
    label?: string;
    showDivider?: boolean;
    children: React.ReactNode;
}

export function SitewiseNavGroup({ label, showDivider, children }: SitewiseNavGroupProps) {
    return (
        <div className="sitewise-nav-group flex flex-col gap-px">
            {showDivider && <div className="sitewise-nav-divider" style={{ height: 1, background: 'var(--sw-rule)', margin: '8px 0' }} />}
            {label && (
                <div className="sitewise-nav-group-label" style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: 'var(--sw-muted)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    padding: '0 10px 4px',
                }}>
                    {label}
                </div>
            )}
            {children}
        </div>
    );
}
