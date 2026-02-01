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
    className?: string;
}

export function AttachmentTable({
    documents,
    onRemove,
    showRemove = false,
    emptyMessage = 'No documents attached',
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

    return (
        <div className={cn('border border-[var(--color-border)] rounded overflow-hidden', className)}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                        <th className="text-left px-4 py-1.5 font-medium w-10">#</th>
                        <th className="text-left px-4 py-1.5 font-medium w-24">DWG #</th>
                        <th className="text-left px-4 py-1.5 font-medium">Name</th>
                        <th className="text-center px-4 py-1.5 font-medium w-16">Rev</th>
                        <th className="text-left px-4 py-1.5 font-medium w-36">Category</th>
                        <th className="text-left px-4 py-1.5 font-medium w-40">Subcategory</th>
                        {showRemove && (
                            <th className="w-10"></th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {documents.map((doc, index) => (
                            <tr
                                key={doc.id}
                                className="border-t border-[var(--color-border)] hover:bg-[#2d2d30]/50"
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
                                    {doc.drawingName || doc.documentName}
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
                                {showRemove && onRemove && (
                                    <td className="py-2 px-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:text-red-500"
                                            onClick={() => onRemove(doc.documentId)}
                                            title="Remove"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
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
