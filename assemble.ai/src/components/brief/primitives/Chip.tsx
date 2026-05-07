/* Filled chip — "selected" variant from the mockup */
export function Chip({
    label,
    selected,
    accent = 'var(--sw-rose)',
    onAccent = 'var(--sw-paper)',
    onClick,
}: {
    label: string;
    selected?: boolean;
    accent?: string;
    onAccent?: string;
    onClick?: () => void;
}) {
    return (
        <span
            onClick={onClick}
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 11,
                padding: '5px 10px',
                background: selected ? accent : 'white',
                color: selected ? onAccent : 'var(--sw-ink)',
                border: selected ? `1px solid ${accent}` : '1px solid var(--sw-rule)',
                fontWeight: selected ? 600 : 400,
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
                cursor: onClick ? 'pointer' : undefined,
            }}
        >
            {label}
        </span>
    );
}
