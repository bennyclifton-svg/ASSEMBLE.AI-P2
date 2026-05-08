'use client';

interface SitewiseNavItemProps {
    label: string;
    kbd?: string;
    active?: boolean;
    onClick?: () => void;
}

export function SitewiseNavItem({ label, kbd, active, onClick }: SitewiseNavItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center justify-between px-2.5 py-2 transition-colors text-left"
            style={{
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--sw-ink)' : 'var(--sw-muted)',
                background: active ? 'white' : 'transparent',
                border: active ? '1px solid var(--sw-rule)' : '1px solid transparent',
                borderLeft: active ? '2px solid var(--sw-rose)' : '2px solid transparent',
                cursor: 'pointer',
            }}
        >
            <span>{label}</span>
            {kbd && (
                <span style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: 'var(--sw-muted)',
                    opacity: 0.7,
                }}>
                    {kbd}
                </span>
            )}
        </button>
    );
}
