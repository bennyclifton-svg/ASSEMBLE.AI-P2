/**
 * Attachment Table Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays attached documents in a table format matching the RFT transmittal schedule style.
 */

'use client';

import { FileText, Trash2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AttachmentDocument {
    id: string;
    documentId: string;
    categoryId?: string | null;
    categoryName: string | null;
    subcategoryId?: string | null;
    subcategoryName: string | null;
    documentName: string;
    revision: number;
    addedAt: string;
    // Drawing extraction fields
    drawingNumber?: string | null;
    drawingName?: string | null;
    drawingRevision?: string | null;
    drawingExtractionStatus?: string | null;
}

interface AttachmentTableProps {
    documents: AttachmentDocument[];
    onRemove?: (documentId: string) => void;
    showRemove?: boolean;
    emptyMessage?: string;
    /** Compact mode for notes - smaller text, reduced padding, fewer columns */
    compact?: boolean;
    className?: string;
}

export function AttachmentTable({
    documents,
    onRemove,
    showRemove = false,
    emptyMessage = 'No documents attached',
    compact = false,
    className,
}: AttachmentTableProps) {
    if (documents.length === 0) {
        return (
            <div className={cn('flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]', className)}>
                <FileText className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">{emptyMessage}</p>
                <p className="text-xs mt-1">
                    Select documents and click "Save"
                </p>
            </div>
        );
    }

    // Compact mode: smaller padding, text-xs, hide category/subcategory columns
    const cellPadding = compact ? 'px-2 py-1' : 'px-4 py-1.5';
    const headerPadding = compact ? 'px-2 py-1' : 'px-4 py-1.5';
    const textSize = compact ? 'text-xs' : 'text-sm';

    return (
        <div className={cn('border border-black/10 rounded overflow-hidden', className)}>
            <table className={cn('w-full', textSize)}>
                <thead>
                    <tr className="bg-black/5 text-[var(--color-text-primary)]">
                        <th className={cn('text-left font-medium w-8', headerPadding)}>#</th>
                        <th className={cn('text-left font-medium', compact ? 'w-20' : 'w-24', headerPadding)}>DWG #</th>
                        <th className={cn('text-left font-medium', headerPadding)}>Name</th>
                        <th className={cn('text-center font-medium w-12', headerPadding)}>Rev</th>
                        {!compact && (
                            <>
                                <th className={cn('text-left font-medium w-36', headerPadding)}>Category</th>
                                <th className={cn('text-left font-medium w-40', headerPadding)}>Subcategory</th>
                            </>
                        )}
                        {showRemove && (
                            <th className="w-8"></th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {documents.map((doc, index) => (
                            <tr
                                key={doc.id}
                                className="border-t border-black/10 hover:bg-black/5"
                            >
                                <td className={cn('text-[var(--color-text-muted)]', cellPadding)}>
                                    {index + 1}
                                </td>
                                <td className={cn('text-[var(--color-text-primary)]', cellPadding)}>
                                    {doc.drawingNumber ? (
                                        <span title={doc.drawingNumber} className="truncate block">
                                            {doc.drawingNumber}
                                        </span>
                                    ) : (
                                        <span className="text-[var(--color-text-muted)]">-</span>
                                    )}
                                </td>
                                <td className={cn('text-[var(--color-text-primary)] truncate', compact ? 'max-w-[180px]' : 'max-w-[300px]', cellPadding)}>
                                    {doc.drawingName || doc.documentName}
                                </td>
                                <td className={cn('text-center text-[var(--color-text-primary)]', cellPadding)}>
                                    {doc.drawingRevision || <span className="text-[var(--color-text-muted)]">-</span>}
                                </td>
                                {!compact && (
                                    <>
                                        <td className={cellPadding}>
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
                                        <td className={cellPadding}>
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
                                    </>
                                )}
                                {showRemove && onRemove && (
                                    <td className={compact ? 'py-1 px-1' : 'py-2 px-1'}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn('hover:text-red-500', compact ? 'h-5 w-5' : 'h-7 w-7')}
                                            onClick={() => onRemove(doc.documentId)}
                                            title="Remove"
                                        >
                                            <Trash2 className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                                        </Button>
                                    </td>
                                )}
                            </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AttachmentTable;
