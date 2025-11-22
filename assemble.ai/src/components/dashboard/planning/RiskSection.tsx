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
        <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
            <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Risk</h3>
            <div className="space-y-2">
                {risks.map((risk: any) => (
                    <div
                        key={risk.id}
                        className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] rounded border border-[#3e3e42]"
                    >
                        <span className="text-[#cccccc]">{risk.title}</span>
                        <span className="text-sm text-[#858585]">{risk.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
