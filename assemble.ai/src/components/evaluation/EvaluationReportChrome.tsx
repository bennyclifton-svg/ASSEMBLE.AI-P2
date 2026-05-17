'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Evaluation workspace accent colors now route through semantic role tokens.
// Price = money values across the app; non-price = identifier-style values
// (firm names, codes). Visual change: price was rose, becomes peach to match
// the cost-plan workspace. Non-price stays lavender (same primitive, renamed).
export const EVALUATION_PRICE_ACCENT_COLOR = 'var(--role-money)';
export const EVALUATION_NON_PRICE_ACCENT_COLOR = 'var(--role-id)';

interface ProjectDetails {
    projectName: string;
    address: string;
}

function formatDisplayDate(value?: string | null): string {
    if (!value) return '-';

    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('en-AU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function useEvaluationProjectDetails(projectId: string): ProjectDetails | null {
    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchProjectDetails = async () => {
            try {
                const response = await fetch(`/api/planning/${projectId}`);
                if (!response.ok) return;

                const data = await response.json();
                if (cancelled) return;

                setProjectDetails({
                    projectName: data.details?.projectName || 'Untitled Project',
                    address: data.details?.address || '',
                });
            } catch (error) {
                console.error('Failed to fetch evaluation project details:', error);
            }
        };

        fetchProjectDetails();

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    return projectDetails;
}

export function EvaluationSectionHeading({
    children,
    accentColor,
    muted = false,
}: {
    children: ReactNode;
    accentColor: string;
    muted?: boolean;
}) {
    return (
        <h3
            className={cn(
                'flex items-center gap-2 text-sm font-semibold transition-colors',
                muted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
            )}
        >
            <span aria-hidden="true" className="h-1.5 w-1.5" style={{ background: accentColor }} />
            {children}
        </h3>
    );
}

export function EvaluationReportHeader({
    projectId,
    documentTitle,
    issuedDate,
    accentColor,
    surface = 'procurement',
}: {
    projectId: string;
    documentTitle: string;
    issuedDate?: string | null;
    accentColor: string;
    surface?: 'procurement' | 'record';
}) {
    const projectDetails = useEvaluationProjectDetails(projectId);
    const usesRecordSurface = surface === 'record';

    return (
        <div
            className={usesRecordSurface ? 'overflow-hidden' : 'overflow-hidden rounded-lg'}
            style={usesRecordSurface ? { borderBottom: '1px solid var(--sw-rule-2)' } : undefined}
        >
            <table className="w-full text-sm">
                <tbody>
                    <tr
                        className={usesRecordSurface ? undefined : 'border-b border-[var(--color-border)]'}
                        style={usesRecordSurface ? { borderBottom: '1px solid var(--sw-rule-2)' } : undefined}
                    >
                        <td className="w-36 px-4 py-2.5 font-medium" style={{ color: accentColor }}>
                            Project Name
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                            {projectDetails?.projectName || 'Loading...'}
                        </td>
                    </tr>
                    <tr
                        className={usesRecordSurface ? undefined : 'border-b border-[var(--color-border)]'}
                        style={usesRecordSurface ? { borderBottom: '1px solid var(--sw-rule-2)' } : undefined}
                    >
                        <td className="px-4 py-2.5 font-medium" style={{ color: accentColor }}>
                            Address
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                            {projectDetails?.address || '-'}
                        </td>
                    </tr>
                    <tr>
                        <td className="px-4 py-2.5 font-medium" style={{ color: accentColor }}>
                            Document
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-semibold">
                            {documentTitle}
                        </td>
                        <td
                            className="w-44 px-4 py-2.5 text-right font-medium whitespace-nowrap"
                            style={{ color: accentColor }}
                        >
                            <span className="font-medium">Issued</span>
                            <span className="ml-4">{formatDisplayDate(issuedDate)}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
