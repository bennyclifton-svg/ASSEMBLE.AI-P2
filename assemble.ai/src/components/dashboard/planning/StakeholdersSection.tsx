'use client';

interface StakeholdersSectionProps {
    projectId: string;
    data: any[];
    onUpdate: () => void;
}

export function StakeholdersSection({ projectId, data, onUpdate }: StakeholdersSectionProps) {
    return (
        <div className="bg-[var(--color-bg-primary)] rounded-lg p-6 border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Stakeholders</h3>
            {data.length === 0 ? (
                <div className="text-[var(--color-text-muted)] text-sm">No stakeholders added yet</div>
            ) : (
                <div className="space-y-2">
                    {data.map((stakeholder: any) => (
                        <div
                            key={stakeholder.id}
                            className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)]"
                        >
                            <div>
                                <div className="text-[var(--color-text-primary)]">{stakeholder.name}</div>
                                {stakeholder.role && (
                                    <div className="text-sm text-[var(--color-text-muted)]">{stakeholder.role}</div>
                                )}
                            </div>
                            {stakeholder.email && (
                                <div className="text-sm text-[var(--color-text-muted)]">{stakeholder.email}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
