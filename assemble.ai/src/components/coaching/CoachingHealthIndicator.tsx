'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useCoachingHealth } from '@/lib/hooks/use-coaching-health';

const MODULE_LABELS: Record<string, string> = {
    cost_plan: 'Cost Plan',
    procurement: 'Procurement',
    program: 'Program',
    documents: 'Documents',
    reports: 'Reports',
    stakeholders: 'Stakeholders',
};

interface CoachingHealthIndicatorProps {
    projectId: string;
}

export function CoachingHealthIndicator({ projectId }: CoachingHealthIndicatorProps) {
    const { health, isLoading } = useCoachingHealth(projectId);

    if (isLoading || !health) return null;

    const progressColor =
        health.percentage >= 71
            ? 'var(--color-accent-green)'
            : health.percentage >= 41
              ? 'var(--color-accent-yellow)'
              : 'var(--color-accent-coral)';

    return (
        <div className="nav-panel-section py-3">
            <div className="nav-panel-header">
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" style={{ color: progressColor }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Project Health
                    </span>
                    <span
                        className="text-xs ml-auto tabular-nums font-medium"
                        style={{ color: progressColor }}
                    >
                        {health.percentage}%
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2 px-0.5">
                <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-border)' }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${health.percentage}%`,
                            backgroundColor: progressColor,
                        }}
                    />
                </div>
            </div>

            {/* Per-module breakdown */}
            <div className="mt-2 space-y-0.5">
                {health.modules.map((mod) => (
                    <div
                        key={mod.module}
                        className="flex items-center justify-between text-[11px] px-0.5"
                    >
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                            {MODULE_LABELS[mod.module] || mod.module}
                        </span>
                        <span
                            className="tabular-nums"
                            style={{
                                color: mod.complete
                                    ? 'var(--color-accent-green)'
                                    : 'var(--color-text-secondary)',
                            }}
                        >
                            {mod.checked}/{mod.total}
                            {mod.complete && ' \u2713'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
