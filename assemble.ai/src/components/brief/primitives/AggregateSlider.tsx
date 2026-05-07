'use client';

const muted = 'var(--sw-muted)';

/**
 * AggregateSlider — subtle "baseline setter" used under Complexity / Scope.
 *
 * Drag the dot from left to right and the dimensions above snap up to the
 * matching tier. After settling, the user can click individual chips to
 * fine-tune. Visually a thin rule with a small brown dot — no fill bar so it
 * stays quiet on the page.
 */
export function AggregateSlider({
    value,
    onChange,
    leftLabel = 'low',
    rightLabel = 'extreme',
    ticks = 5,
}: {
    value: number; // 0–100
    onChange: (v: number) => void;
    leftLabel?: string;
    rightLabel?: string;
    ticks?: number;
}) {
    return (
        <div>
            <div className="relative" style={{ height: 18 }}>
                {/* Track */}
                <div
                    className="absolute left-0 right-0 top-1/2"
                    style={{
                        height: 1,
                        background: 'var(--sw-rule)',
                        transform: 'translateY(-50%)',
                    }}
                />
                {/* Tick marks */}
                {Array.from({ length: ticks }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute top-1/2"
                        style={{
                            left: `${(i / (ticks - 1)) * 100}%`,
                            width: 1,
                            height: 5,
                            background: 'var(--sw-rule)',
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                ))}
                {/* Native range input — invisible but interactive */}
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="sw-aggregate-slider absolute inset-0 w-full"
                    style={{ background: 'transparent', appearance: 'none' }}
                />
            </div>
            <div
                className="flex justify-between mt-1.5"
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: muted,
                }}
            >
                <span>{leftLabel}</span>
                <span>{rightLabel}</span>
            </div>
        </div>
    );
}
