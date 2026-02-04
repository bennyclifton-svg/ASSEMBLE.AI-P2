/**
 * T114: AddendumTransmittalSchedule Component
 * Displays a read-only table of transmittal documents attached to an addendum
 */

'use client';

import { useAddendumTransmittal } from '@/lib/hooks/use-addendum-transmittal';
import { FileText, Loader2, Folder, Save, RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Aurora accent button styling - consistent across procurement components
const BUTTON_BG = 'var(--color-accent-copper-tint)';
const BUTTON_TEXT = 'var(--color-accent-copper)';
const BUTTON_BORDER = 'rgba(0, 255, 255, 0.3)';

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
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSaveTransmittal}
                        disabled={!canSaveTransmittal}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: BUTTON_BG,
                            color: BUTTON_TEXT,
                            border: `1px solid ${BUTTON_BORDER}`,
                        }}
                    >
                        <Save className="w-3 h-3 mr-1" />
                        Save Transmittal
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLoadTransmittal}
                        disabled={!hasTransmittal}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: BUTTON_BG,
                            color: BUTTON_TEXT,
                            border: `1px solid ${BUTTON_BORDER}`,
                        }}
                    >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Recall {documentCount > 0 && `(${documentCount})`}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDownloadTransmittal}
                        disabled={!hasTransmittal || isDownloading}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: BUTTON_BG,
                            color: BUTTON_TEXT,
                            border: `1px solid ${BUTTON_BORDER}`,
                        }}
                    >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                    </Button>
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
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="text-left text-[var(--color-document-header)] px-4 py-1.5 font-medium w-10">#</th>
                                <th className="text-left text-[var(--color-document-header)] px-4 py-1.5 font-medium w-24">DWG #</th>
                                <th className="text-left text-[var(--color-document-header)] px-4 py-1.5 font-medium">Name</th>
                                <th className="text-center text-[var(--color-document-header)] px-4 py-1.5 font-medium w-16">Rev</th>
                                <th className="text-left text-[var(--color-document-header)] px-4 py-1.5 font-medium w-36">Category</th>
                                <th className="text-left text-[var(--color-document-header)] px-4 py-1.5 font-medium w-40">Subcategory</th>
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
