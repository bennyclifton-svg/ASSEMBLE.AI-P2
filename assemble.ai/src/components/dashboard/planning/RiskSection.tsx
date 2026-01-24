'use client';

interface RiskSectionProps {
    projectId: string;
    data: any[];
    onUpdate: () => void;
}

const DEFAULT_RISKS = [
    { id: '1', title: 'Risk 1', status: 'identified' },
    { id: '2', title: 'Risk 2', status: 'identified' },
    { id: '3', title: 'Risk 3', status: 'identified' },
];

export function RiskSection({ projectId, data, onUpdate }: RiskSectionProps) {
    const risks = data.length > 0 ? data : DEFAULT_RISKS;

    return (
        <div className="bg-[var(--color-bg-primary)] rounded-lg p-6 border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Risk</h3>
            <div className="space-y-2">
                {risks.map((risk: any) => (
                    <div
                        key={risk.id}
                        className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)]"
                    >
                        <span className="text-[var(--color-text-primary)]">{risk.title}</span>
                        <span className="text-sm text-[var(--color-text-muted)]">{risk.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
