/**
 * RFTNewTransmittalSchedule Component
 * Displays a read-only table of transmittal documents attached to an RFT NEW report
 */

'use client';

import { useRftNewTransmittal } from '@/lib/hooks/use-rft-new-transmittal';
import { FileText, Loader2, Folder } from 'lucide-react';

interface RFTNewTransmittalScheduleProps {
    rftNewId: string;
}

export function RFTNewTransmittalSchedule({ rftNewId }: RFTNewTransmittalScheduleProps) {
    const { transmittal, isLoading, hasTransmittal, documentCount } = useRftNewTransmittal({
        rftNewId,
    });

    return (
        <div className="border border-[var(--color-border)] rounded overflow-hidden">
            {isLoading ? (
                <div className="flex items-center justify-center py-8 text-[var(--color-text-muted)]">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading transmittal...
                </div>
            ) : !hasTransmittal ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#6e6e6e]">
                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No transmittal documents</p>
                    <p className="text-xs mt-1">
                        Select documents and click "Save Transmittal"
                    </p>
                </div>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
                            <th className="text-left px-4 py-2.5 font-medium w-10">#</th>
                            <th className="text-left px-4 py-2.5 font-medium w-24">DWG #</th>
                            <th className="text-left px-4 py-2.5 font-medium">Name</th>
                            <th className="text-center px-4 py-2.5 font-medium w-16">Rev</th>
                            <th className="text-left px-4 py-2.5 font-medium w-36">Category</th>
                            <th className="text-left px-4 py-2.5 font-medium w-40">Subcategory</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transmittal.map((doc, index) => (
                                <tr
                                    key={doc.id}
                                    className="border-t border-[var(--color-border)] hover:bg-[#2d2d30]/50"
                                >
                                    <td className="px-4 py-2.5 text-[#6e6e6e]">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                        {doc.drawingNumber ? (
                                            <span title={doc.drawingNumber}>
                                                {doc.drawingNumber}
                                            </span>
                                        ) : (
                                            <span className="text-[#6e6e6e]">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)] truncate max-w-[300px]">
                                        {doc.drawingName || doc.fileName}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-[var(--color-text-primary)]">
                                        {doc.drawingRevision || <span className="text-[#6e6e6e]">-</span>}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {doc.categoryName ? (
                                            <div className="flex items-center gap-1.5">
                                                <Folder
                                                    className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-primary)]"
                                                />
                                                <span
                                                    className="text-sm truncate text-[var(--color-text-primary)]"
                                                >
                                                    {doc.categoryName}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[#6e6e6e]">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {doc.subcategoryName ? (
                                            <div className="flex items-center gap-1.5">
                                                <Folder
                                                    className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-primary)]"
                                                />
                                                <span
                                                    className="text-sm truncate text-[var(--color-text-primary)]"
                                                >
                                                    {doc.subcategoryName}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[#6e6e6e]">-</span>
                                        )}
                                    </td>
                                </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
