const muted = 'var(--sw-muted)';

export function CardShell({
    label,
    meta,
    children,
}: {
    label: string;
    meta?: string;
    children: React.ReactNode;
}) {
    return (
        <section
            style={{
                background: 'white',
                border: '1px solid var(--sw-rule)',
            }}
        >
            <header
                className="flex items-baseline justify-between px-4 py-2.5"
                style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
            >
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: muted,
                        fontWeight: 600,
                    }}
                >
                    {label}
                </span>
                {meta && (
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'var(--sw-cyan)',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {meta}
                    </span>
                )}
            </header>
            <div className="p-4">{children}</div>
        </section>
    );
}
