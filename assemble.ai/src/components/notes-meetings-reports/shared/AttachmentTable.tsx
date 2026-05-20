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
    ingestStatus?: string | null;
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
            <div className={cn('flex flex-col items-center justify-center border border-dashed border-[var(--sw-rule)] py-8 text-center text-[var(--sw-muted)]', className)}>
                <FileText className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm text-[var(--sw-muted)]">{emptyMessage}</p>
                <p className="mt-1 text-xs text-[var(--sw-muted)]">
                    Select documents and click &quot;Save&quot;
                </p>
            </div>
        );
    }

    // Compact mode: smaller padding, text-xs, hide category/subcategory columns
    const cellPadding = compact ? 'px-2 py-1' : 'px-4 py-1.5';
    const headerPadding = compact ? 'px-2 py-1' : 'px-4 py-1.5';
    const textSize = compact ? 'text-xs' : 'text-sm';
    const showIngestStatus = documents.some((doc) => Boolean(doc.ingestStatus));

    return (
        <div className={cn('overflow-hidden border border-[var(--sw-rule)]', className)}>
            <table className={cn('w-full', textSize)}>
                <thead>
                    <tr
                        className="bg-[var(--sw-paper)] text-[var(--sw-muted)]"
                        style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.12em' }}
                    >
                        <th className={cn('w-8 text-left text-[10px] font-medium uppercase', headerPadding)}>#</th>
                        <th className={cn('text-left text-[10px] font-medium uppercase', compact ? 'w-20' : 'w-24', headerPadding)}>dwg #</th>
                        <th className={cn('text-left text-[10px] font-medium uppercase', headerPadding)}>name</th>
                        <th className={cn('w-12 text-center text-[10px] font-medium uppercase', headerPadding)}>rev</th>
                        {!compact && (
                            <>
                                <th className={cn('w-36 text-left text-[10px] font-medium uppercase', headerPadding)}>category</th>
                                <th className={cn('w-40 text-left text-[10px] font-medium uppercase', headerPadding)}>subcategory</th>
                            </>
                        )}
                        {showIngestStatus && (
                            <th className={cn('w-24 text-left text-[10px] font-medium uppercase', headerPadding)}>ingest</th>
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
                                className="border-t border-[var(--sw-rule-2)] hover:bg-[var(--sw-canvas)]"
                            >
                                <td className={cn('text-[var(--sw-muted)]', cellPadding)}>
                                    {index + 1}
                                </td>
                                <td className={cn('text-[var(--sw-ink)]', cellPadding)}>
                                    {doc.drawingNumber ? (
                                        <span title={doc.drawingNumber} className="truncate block">
                                            {doc.drawingNumber}
                                        </span>
                                    ) : (
                                        <span className="text-[var(--sw-muted)]">-</span>
                                    )}
                                </td>
                                <td className={cn('truncate text-[var(--sw-ink)]', compact ? 'max-w-[180px]' : 'max-w-[300px]', cellPadding)}>
                                    {doc.drawingName || doc.documentName}
                                </td>
                                <td className={cn('text-center text-[var(--sw-ink)]', cellPadding)}>
                                    {doc.drawingRevision || <span className="text-[var(--sw-muted)]">-</span>}
                                </td>
                                {!compact && (
                                    <>
                                        <td className={cellPadding}>
                                            {doc.categoryName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Folder
                                                        className="h-3.5 w-3.5 flex-shrink-0 text-[var(--sw-muted)]"
                                                    />
                                                    <span
                                                        className="truncate text-sm text-[var(--sw-ink)]"
                                                    >
                                                        {doc.categoryName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[var(--sw-muted)]">-</span>
                                            )}
                                        </td>
                                        <td className={cellPadding}>
                                            {doc.subcategoryName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Folder
                                                        className="h-3.5 w-3.5 flex-shrink-0 text-[var(--sw-muted)]"
                                                    />
                                                    <span
                                                        className="truncate text-sm text-[var(--sw-ink)]"
                                                    >
                                                        {doc.subcategoryName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[var(--sw-muted)]">-</span>
                                            )}
                                        </td>
                                    </>
                                )}
                                {showIngestStatus && (
                                    <td className={cellPadding}>
                                        <span
                                            className="inline-flex border px-1.5 py-0.5 text-[10px] uppercase"
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                color: doc.ingestStatus === 'synced' ? 'var(--sw-ink)' : 'var(--sw-muted)',
                                                borderColor: 'var(--sw-rule)',
                                                background: doc.ingestStatus === 'synced' ? 'var(--sw-paper)' : 'transparent',
                                            }}
                                        >
                                            {doc.ingestStatus ?? '-'}
                                        </span>
                                    </td>
                                )}
                                {showRemove && onRemove && (
                                    <td className={compact ? 'py-1 px-1' : 'py-2 px-1'}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn('rounded-none text-[var(--sw-muted)] hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)]', compact ? 'h-5 w-5' : 'h-7 w-7')}
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
