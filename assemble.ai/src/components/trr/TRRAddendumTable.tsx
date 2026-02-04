/**
 * TRRAddendumTable Component
 * Displays addenda summary table
 * Feature 012 - TRR Report
 */

'use client';

import { TRRAddendumRow } from '@/types/trr';

interface TRRAddendumTableProps {
    addenda: TRRAddendumRow[];
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
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                Addendum Table
            </h3>
            <div className="overflow-hidden rounded-lg">
                {addenda.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="px-4 py-2.5 text-left text-[var(--color-document-header)] font-medium w-[15%]">
                                    Addendum #
                                </th>
                                <th className="px-4 py-2.5 text-left text-[var(--color-document-header)] font-medium w-[60%]">
                                    Summary
                                </th>
                                <th className="px-4 py-2.5 text-left text-[var(--color-document-header)] font-medium w-[25%]">
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
                                        {addendum.summary || '-'}
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
