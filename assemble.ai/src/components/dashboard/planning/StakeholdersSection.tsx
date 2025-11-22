'use client';

interface StakeholdersSectionProps {
    projectId: string;
    data: any[];
    onUpdate: () => void;
}

export function StakeholdersSection({ projectId, data, onUpdate }: StakeholdersSectionProps) {
    return (
        <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
            <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Stakeholders</h3>
            {data.length === 0 ? (
                <div className="text-[#858585] text-sm">No stakeholders added yet</div>
            ) : (
                <div className="space-y-2">
                    {data.map((stakeholder: any) => (
                        <div
                            key={stakeholder.id}
                            className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] rounded border border-[#3e3e42]"
                        >
                            <div>
                                <div className="text-[#cccccc]">{stakeholder.name}</div>
                                {stakeholder.role && (
                                    <div className="text-sm text-[#858585]">{stakeholder.role}</div>
                                )}
                            </div>
                            {stakeholder.email && (
                                <div className="text-sm text-[#858585]">{stakeholder.email}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
