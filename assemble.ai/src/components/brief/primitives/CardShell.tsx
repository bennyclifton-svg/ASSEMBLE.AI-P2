const muted = 'var(--sw-muted)';

export function CardShell({
    label,
    meta,
    headerSlot,
    children,
}: {
    label: string;
    meta?: string;
    headerSlot?: React.ReactNode;
    children: React.ReactNode;
}) {
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

    return (
        <section
            style={{
                background: 'white',
                border: '1px solid var(--sw-rule)',
            }}
        >
            {headerSlot ? (
                <header
                    className="px-3 py-2 items-center"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr auto',
                        gap: 12,
                        borderBottom: '1px solid var(--sw-rule-2)',
                    }}
                >
                    <span style={labelStyle}>{label}</span>
                    <div className="min-w-0">{headerSlot}</div>
                    {meta ? <span style={metaStyle}>{meta}</span> : <span />}
                </header>
            ) : (
                <header
                    className="flex items-baseline justify-between px-3 py-2"
                    style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                >
                    <span style={labelStyle}>{label}</span>
                    {meta && <span style={metaStyle}>{meta}</span>}
                </header>
            )}
            <div className="p-2" style={{ textTransform: 'lowercase' }}>
                {children}
            </div>
        </section>
    );
}
