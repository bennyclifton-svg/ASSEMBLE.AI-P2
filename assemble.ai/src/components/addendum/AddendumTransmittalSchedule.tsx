/**
 * T114: AddendumTransmittalSchedule Component
 * Displays a read-only table of transmittal documents attached to an addendum
 */

'use client';

import { useAddendumTransmittal } from '@/lib/hooks/use-addendum-transmittal';
import { FileText, Loader2, Folder, Save, RotateCcw, Download } from 'lucide-react';

interface AddendumTransmittalScheduleProps {
    addendumId: string;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    onDownloadTransmittal?: () => void;
    canSaveTransmittal?: boolean;
    hasTransmittal?: boolean;
    documentCount?: number;
    isDownloading?: boolean;
}

export function AddendumTransmittalSchedule({
    addendumId,
    onSaveTransmittal,
    onLoadTransmittal,
    onDownloadTransmittal,
    canSaveTransmittal,
    hasTransmittal: hasTransmittalProp,
    documentCount: documentCountProp,
    isDownloading,
}: AddendumTransmittalScheduleProps) {
    const { transmittal, isLoading, hasTransmittal: hasTransmittalHook, documentCount: documentCountHook } = useAddendumTransmittal({
        addendumId,
    });

    // Use props if provided, otherwise fall back to hook values
    const hasTransmittal = hasTransmittalProp !== undefined ? hasTransmittalProp : hasTransmittalHook;
    const documentCount = documentCountProp !== undefined ? documentCountProp : documentCountHook;

    return (
        <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    Transmittal Document Schedule
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSaveTransmittal}
                        disabled={!canSaveTransmittal}
                        className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                    >
                        <Save className="h-3.5 w-3.5" />
                        Save Transmittal
                    </button>
                    <button
                        onClick={onLoadTransmittal}
                        disabled={!hasTransmittal}
                        className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Recall {documentCount > 0 && `(${documentCount})`}
                    </button>
                    <button
                        onClick={onDownloadTransmittal}
                        disabled={!hasTransmittal || isDownloading}
                        className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-[var(--color-text-muted)]">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading transmittal...
                    </div>
                ) : !hasTransmittal ? (
                    <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
                        <FileText className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No transmittal documents</p>
                        <p className="text-xs mt-1">
                            Select documents and click "Save Transmittal"
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-10">#</th>
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-24">DWG #</th>
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium">Name</th>
                                <th className="text-center text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-16">Rev</th>
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-36">Category</th>
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-40">Subcategory</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transmittal?.documents.map((doc, index) => (
                                    <tr
                                        key={doc.id}
                                        className="hover:bg-[var(--color-bg-tertiary)]"
                                    >
                                        <td className="px-4 py-1.5 text-[var(--color-text-muted)]">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-1.5 text-[var(--color-text-primary)]">
                                            {doc.drawingNumber ? (
                                                <span title={doc.drawingNumber}>
                                                    {doc.drawingNumber}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-1.5 text-[var(--color-text-primary)] truncate max-w-[300px]">
                                            {doc.drawingName || doc.originalName}
                                        </td>
                                        <td className="px-4 py-1.5 text-center text-[var(--color-text-primary)]">
                                            {doc.drawingRevision || <span className="text-[var(--color-text-muted)]">-</span>}
                                        </td>
                                        <td className="px-4 py-1.5">
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
                                                <span className="text-[var(--color-text-muted)]">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-1.5">
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
                                                <span className="text-[var(--color-text-muted)]">-</span>
                                            )}
                                        </td>
                                    </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
