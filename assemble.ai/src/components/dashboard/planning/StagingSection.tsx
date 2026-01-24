'use client';

interface StagingSectionProps {
    projectId: string;
    data: any[];
    onUpdate: () => void;
}

const DEFAULT_STAGES = [
    { stageNumber: 1, stageName: 'Stage 1 Initiation' },
    { stageNumber: 2, stageName: 'Stage 2 Scheme Design' },
    { stageNumber: 3, stageName: 'Stage 3 Detail Design' },
    { stageNumber: 4, stageName: 'Stage 4 Procurement' },
    { stageNumber: 5, stageName: 'Stage 5 Delivery' },
];

export function StagingSection({ projectId, data, onUpdate }: StagingSectionProps) {
    const stages = data.length > 0 ? data : DEFAULT_STAGES;

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Staging</h3>
            <div className="space-y-2">
                {stages.map((stage: any) => (
                    <div
                        key={stage.stageNumber}
                        className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)]"
                    >
                        <span className="text-[var(--color-text-primary)]">{stage.stageName}</span>
                        <span className="text-sm text-[var(--color-text-muted)]">
                            {stage.status || 'not_started'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
