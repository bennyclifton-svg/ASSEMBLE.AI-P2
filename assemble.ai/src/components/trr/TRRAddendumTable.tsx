/**
 * TRRAddendumTable Component
 * Displays addenda summary table
 * Feature 012 - TRR Report
 */

'use client';

import { TRRAddendumRow } from '@/types/trr';
import { TRR_ACCENT_COLOR, TRRSectionHeading } from './TRRSectionHeading';

interface TRRAddendumTableProps {
    addenda: TRRAddendumRow[];
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function TRRAddendumTable({ addenda }: TRRAddendumTableProps) {
    const formatDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-AU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-2">
            <div className="px-4">
                <TRRSectionHeading>
                    Addendum Table
                </TRRSectionHeading>
            </div>
            <div className="overflow-hidden rounded-lg">
                {addenda.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="px-4 py-2.5 text-left font-medium w-[15%]" style={{ color: TRR_ACCENT_COLOR }}>
                                    Addendum #
                                </th>
                                <th className="px-4 py-2.5 text-left font-medium w-[60%]" style={{ color: TRR_ACCENT_COLOR }}>
                                    Summary
                                </th>
                                <th className="px-4 py-2.5 text-left font-medium w-[25%]" style={{ color: TRR_ACCENT_COLOR }}>
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {addenda.map((addendum) => (
                                <tr key={addendum.id}>
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                        {String(addendum.addendumNumber).padStart(2, '0')}
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                        {addendum.summary ? stripHtml(addendum.summary) : '-'}
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                        {formatDate(addendum.date)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                        No addenda issued
                    </div>
                )}
            </div>
        </div>
    );
}
