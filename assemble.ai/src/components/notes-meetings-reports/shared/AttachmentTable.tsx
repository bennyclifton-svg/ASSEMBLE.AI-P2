/**
 * Attachment Table Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays attached documents in a table format matching the RFT transmittal schedule style.
 */

'use client';

import React from 'react';
import { FileText, Trash2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCategoryById } from '@/lib/constants/categories';

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
}

/**
 * Get category color by ID - falls back to constants if not in database
 */
function getCategoryColor(categoryId: string | null | undefined): string {
    if (!categoryId) return 'var(--color-text-muted)';

    // Try to get from constants first (for color)
    const category = getCategoryById(categoryId);
    if (category) return category.color;

    // Default gray
    return 'var(--color-text-muted)';
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
                    <tr className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
                        <th className="text-left px-4 py-2.5 font-medium w-10">#</th>
                        <th className="text-left px-4 py-2.5 font-medium">Document</th>
                        <th className="text-center px-4 py-2.5 font-medium w-16">Rev</th>
                        <th className="text-left px-4 py-2.5 font-medium w-36">Category</th>
                        <th className="text-left px-4 py-2.5 font-medium w-40">Subcategory</th>
                        {showRemove && (
                            <th className="w-10"></th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {documents.map((doc, index) => {
                        const categoryColor = getCategoryColor(doc.categoryId);

                        return (
                            <tr
                                key={doc.id}
                                className="border-t border-[var(--color-border)] hover:bg-[#2d2d30]/50"
                            >
                                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                                    {index + 1}
                                </td>
                                <td className="px-4 py-2.5 text-[var(--color-text-primary)] truncate max-w-[300px]">
                                    {doc.documentName}
                                </td>
                                <td className="px-4 py-2.5 text-center text-[var(--color-text-primary)]">
                                    {String(doc.revision).padStart(2, '0')}
                                </td>
                                <td className="px-4 py-2.5">
                                    {doc.categoryName ? (
                                        <div className="flex items-center gap-1.5">
                                            <Folder
                                                className="w-3.5 h-3.5 flex-shrink-0"
                                                style={{ color: categoryColor }}
                                            />
                                            <span
                                                className="text-sm truncate"
                                                style={{ color: categoryColor }}
                                            >
                                                {doc.categoryName}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[var(--color-text-muted)]">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-2.5">
                                    {doc.subcategoryName ? (
                                        <div className="flex items-center gap-1.5">
                                            <Folder
                                                className="w-3.5 h-3.5 flex-shrink-0"
                                                style={{ color: categoryColor }}
                                            />
                                            <span
                                                className="text-sm truncate"
                                                style={{ color: categoryColor }}
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
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default AttachmentTable;
