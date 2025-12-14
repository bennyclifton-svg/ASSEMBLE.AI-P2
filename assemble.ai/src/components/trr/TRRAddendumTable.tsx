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
            <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                Addendum Table
            </h3>
            <div className="border border-[#3e3e42] rounded overflow-hidden">
                {addenda.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="bg-[#2d2d30]">
                            <tr className="border-b border-[#3e3e42]">
                                <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[15%]">
                                    Addendum #
                                </th>
                                <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[60%]">
                                    Summary
                                </th>
                                <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[25%]">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {addenda.map((addendum) => (
                                <tr key={addendum.id} className="border-b border-[#3e3e42] last:border-0">
                                    <td className="px-4 py-2.5 text-[#cccccc]">
                                        {String(addendum.addendumNumber).padStart(2, '0')}
                                    </td>
                                    <td className="px-4 py-2.5 text-[#cccccc]">
                                        {addendum.summary || '-'}
                                    </td>
                                    <td className="px-4 py-2.5 text-[#cccccc]">
                                        {formatDate(addendum.date)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="px-4 py-3 text-[#858585] text-sm">
                        No addenda issued
                    </div>
                )}
            </div>
        </div>
    );
}
