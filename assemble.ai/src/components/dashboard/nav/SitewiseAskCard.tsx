'use client';

interface SitewiseAskCardProps {
    placeholder?: string;
    onActivate?: () => void;
}

export function SitewiseAskCard({
    placeholder = 'Ask sitewise…',
    onActivate,
}: SitewiseAskCardProps) {
    return (
        <button
            type="button"
            onClick={onActivate}
            className="p-3 w-full text-left transition-colors hover:bg-white"
            style={{ background: 'white', border: '1px solid var(--sw-rule)' }}
        >
            <div style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 10,
                color: 'var(--sw-rose-dk)',
                letterSpacing: '0.1em',
                marginBottom: 8,
            }}>
                // ASK
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--sw-ink)' }}>
                {placeholder}
            </div>
            <div className="mt-2 flex justify-between items-center">
                <span style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: 'var(--sw-muted)',
                }}>
                    ⌘K
                </span>
                <span style={{
                    background: 'var(--sw-rose)',
                    color: 'var(--sw-ink)',
                    padding: '2px 6px',
                    fontSize: 10,
                    fontFamily: 'var(--sw-font-mono)',
                    fontWeight: 700,
                }}>
                    ↵
                </span>
            </div>
        </button>
    );
}
