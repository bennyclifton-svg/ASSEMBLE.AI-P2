'use client';

interface AgentBadgeProps {
    name: string;
}

const DISPLAY: Record<string, string> = {
    finance: 'Finance',
    design: 'Design',
    program: 'Program',
    procurement: 'Procurement',
    delivery: 'Delivery',
    feasibility: 'Feasibility',
    correspondence: 'Correspondence',
    orchestrator: 'Orchestrator',
};

export function AgentBadge({ name }: AgentBadgeProps) {
    const label = DISPLAY[name] ?? name;
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded"
            style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-subtle)',
            }}
        >
            {label}
        </span>
    );
}
