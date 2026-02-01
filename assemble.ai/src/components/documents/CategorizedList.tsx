'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Loader2, FileIcon, Folder, ChevronUp, ChevronDown, Trash } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useSyncStatus, SyncStatus } from '@/lib/hooks/use-sync-status';
import { useRenderLoopGuard, useStableArray } from '@/lib/hooks/use-render-loop-guard';
import { cn } from '@/lib/utils';

/**
 * T032: Sync status dot indicator (compact version)
 * Now receives status as prop to avoid individual API calls per document
 */
function SyncStatusDot({ status }: { status: SyncStatus | null }) {
    if (!status || status.status === null) {
        return null; // Not synced
    }

    const colorMap = {
        synced: 'bg-[var(--color-accent-green)]',
        pending: 'bg-[var(--color-accent-yellow)]',
        processing: 'bg-[var(--color-accent-yellow)]',
        failed: 'bg-[var(--color-accent-coral)]',
    };

    const color = colorMap[status.status] || 'bg-[var(--color-text-muted)]';

    return (
        <div
            className={`w-2 h-2 rounded-full ${color} flex-shrink-0`}
            title={status.status.charAt(0).toUpperCase() + status.status.slice(1)}
        />
    );
}

interface Document {
    id: string;
    originalName: string;
    versionNumber: number;
    sizeBytes: number;
    updatedAt: string;
    categoryId?: string;
    categoryName?: string;
    subcategoryId?: string;
    subcategoryName?: string;
    // Drawing extraction fields
    drawingNumber?: string | null;
    drawingName?: string | null;
    drawingRevision?: string | null;
    drawingExtractionStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SKIPPED' | 'FAILED' | null;
}

interface CategorizedListProps {
    refreshTrigger: number;
    projectId: string;
    selectedIds?: Set<string>;
    onSelectionChange?: (selectedIds: Set<string>) => void;
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
    /** Filter to show only documents in this category. */
    filterCategoryId?: string | null;
    /** Filter to show only documents in this subcategory. */
    filterSubcategoryId?: string | null;
    /** Whether files are currently being uploaded/processed. */
    isProcessing?: boolean;
    /** Number of files being processed. */
    processingCount?: number;
}

export function CategorizedList({ refreshTrigger, projectId, selectedIds: externalSelectedIds, onSelectionChange, scrollContainerRef, filterCategoryId, filterSubcategoryId, isProcessing, processingCount }: CategorizedListProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(externalSelectedIds || new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<'drawingNumber' | 'name' | 'drawingRevision' | 'category' | 'subcategory' | 'fileName' | 'version' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Track if this is the initial load to avoid flickering during background refreshes
    const hasLoadedOnce = useRef(false);

    const { toast } = useToast();

    // Render loop detection - prevents infinite re-render cycles
    const { isInCooldown } = useRenderLoopGuard({
        componentName: 'CategorizedList',
        maxRendersPerSecond: 15,
        cooldownMs: 2000,
    });

    // Batch fetch sync status for all documents (single API call instead of one per document)
    // Use stable array to prevent unnecessary re-fetches when document array reference changes but IDs are the same
    const documentIds = useStableArray(useMemo(() => documents.map(d => d.id), [documents]));
    const { statuses: syncStatuses } = useSyncStatus(isInCooldown ? [] : documentIds);

    // Sorting logic
    const sortedDocuments = useMemo(() => {
        if (!sortColumn) return documents;

        return [...documents].sort((a, b) => {
            let comparison = 0;

            switch (sortColumn) {
                case 'drawingNumber':
                    const drawA = a.drawingNumber || '';
                    const drawB = b.drawingNumber || '';
                    comparison = drawA.localeCompare(drawB);
                    break;
                case 'name':
                    const nameA = a.drawingName || a.originalName || '';
                    const nameB = b.drawingName || b.originalName || '';
                    comparison = nameA.localeCompare(nameB);
                    break;
                case 'drawingRevision':
                    const revA = a.drawingRevision || '';
                    const revB = b.drawingRevision || '';
                    comparison = revA.localeCompare(revB);
                    break;
                case 'category':
                    const catA = a.categoryName || '';
                    const catB = b.categoryName || '';
                    comparison = catA.localeCompare(catB);
                    break;
                case 'subcategory':
                    const subA = a.subcategoryName || '';
                    const subB = b.subcategoryName || '';
                    comparison = subA.localeCompare(subB);
                    break;
                case 'fileName':
                    const fileA = a.originalName || '';
                    const fileB = b.originalName || '';
                    comparison = fileA.localeCompare(fileB);
                    break;
                case 'version':
                    comparison = a.versionNumber - b.versionNumber;
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [documents, sortColumn, sortDirection]);

    // Filter documents by category if filter is active
    const filteredDocuments = useMemo(() => {
        if (!filterCategoryId) return sortedDocuments;
        return sortedDocuments.filter(doc => {
            if (filterSubcategoryId) {
                return doc.categoryId === filterCategoryId && doc.subcategoryId === filterSubcategoryId;
            }
            return doc.categoryId === filterCategoryId;
        });
    }, [sortedDocuments, filterCategoryId, filterSubcategoryId]);

    const handleSort = (column: 'drawingNumber' | 'name' | 'drawingRevision' | 'category' | 'subcategory' | 'fileName' | 'version') => {
        if (sortColumn === column) {
            // Toggle direction or clear
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else {
                setSortColumn(null);
                setSortDirection('asc');
            }
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const SortIndicator = ({ column }: { column: 'drawingNumber' | 'name' | 'drawingRevision' | 'category' | 'subcategory' | 'fileName' | 'version' }) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4 inline ml-1" />
            : <ChevronDown className="w-4 h-4 inline ml-1" />
    };

    // Fetch data function - defined before effects that use it
    const fetchData = useCallback(async () => {
        // Skip fetching during cooldown to break render loops
        if (isInCooldown) {
            return;
        }

        // Save scroll position before fetching
        const scrollTop = scrollContainerRef?.current?.scrollTop ?? 0;

        try {
            // Only show loading spinner on initial load, not during background refreshes
            // This prevents flickering when polling for drawing extraction status
            if (!hasLoadedOnce.current) {
                setLoading(true);
            }
            const res = await fetch(`/api/documents?projectId=${projectId}`);
            if (res.ok) {
                const data = await res.json();

                // Debug: Log any documents with missing originalName
                const missingNames = data.filter((d: Document) => !d.originalName);
                if (missingNames.length > 0) {
                    console.warn('[CategorizedList] Documents with missing originalName:', missingNames);
                }

                setDocuments(data);

                // Restore scroll position after data is loaded
                // Use requestAnimationFrame to ensure DOM has updated
                requestAnimationFrame(() => {
                    if (scrollContainerRef?.current) {
                        scrollContainerRef.current.scrollTop = scrollTop;
                    }
                });
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
            hasLoadedOnce.current = true;
        }
    }, [isInCooldown, projectId, scrollContainerRef]);

    // Reset hasLoadedOnce when projectId changes to show loading state on project switch
    useEffect(() => {
        hasLoadedOnce.current = false;
    }, [projectId]);

    // Sync internal state when external selection changes (e.g., from transmittal load)
    useEffect(() => {
        if (externalSelectedIds) {
            setSelectedIds(externalSelectedIds);
        }
    }, [externalSelectedIds]);

    useEffect(() => {
        // Skip during cooldown to prevent render loops
        if (isInCooldown) return;
        fetchData();
    }, [refreshTrigger, projectId, isInCooldown, fetchData]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+A to select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && documents.length > 0) {
                e.preventDefault();
                const allIds = new Set(documents.map(d => d.id));
                setSelectedIds(allIds);
                onSelectionChange?.(allIds);
            }
            // ESC to clear selection
            if (e.key === 'Escape' && selectedIds.size > 0) {
                setSelectedIds(new Set());
                onSelectionChange?.(new Set());
                setLastSelectedId(null);
            }
            // DELETE to delete selected items
            if (e.key === 'Delete' && selectedIds.size > 0 && !deletingId) {
                setShowDeleteConfirm(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, documents, deletingId, onSelectionChange]);

    // Check if any documents have pending/processing drawing extraction
    const hasProcessingDrawings = useMemo(() =>
        documents.some(doc =>
            doc.drawingExtractionStatus === 'PROCESSING' ||
            doc.drawingExtractionStatus === 'PENDING'
        ),
        [documents]
    );

    // Poll for drawing extraction status updates
    useEffect(() => {
        // Skip polling during cooldown to prevent render loops
        if (!hasProcessingDrawings || isInCooldown) return;

        const interval = setInterval(() => {
            fetchData();
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [hasProcessingDrawings, projectId, isInCooldown, fetchData]);

    const handleSelectAll = (checked: boolean) => {
        const newSelection = checked ? new Set(documents.map(d => d.id)) : new Set<string>();
        setSelectedIds(newSelection);
        onSelectionChange?.(newSelection);
        setLastSelectedId(null);
    };

    const handleSelect = (id: string, event: React.MouseEvent) => {
        let newSelected = new Set(selectedIds);
        const isSelected = newSelected.has(id);

        if (event.shiftKey && lastSelectedId) {
            // Use filteredDocuments to match the visual order displayed to the user
            const start = filteredDocuments.findIndex(d => d.id === lastSelectedId);
            const end = filteredDocuments.findIndex(d => d.id === id);

            if (start !== -1 && end !== -1) {
                const low = Math.min(start, end);
                const high = Math.max(start, end);
                const range = filteredDocuments.slice(low, high + 1);

                // Range select always adds to selection
                range.forEach(doc => newSelected.add(doc.id));
            }
            // Update lastSelectedId to allow chaining
            setLastSelectedId(id);
        } else if (event.ctrlKey || event.metaKey) {
            // Ctrl/Cmd+Click - Toggle selection
            if (isSelected) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
            setLastSelectedId(id);
        } else {
            // Normal click
            if (selectedIds.size === 1 && selectedIds.has(id)) {
                // If this is the only one selected and we click it again -> deselect
                newSelected.clear();
                setLastSelectedId(null);
            } else {
                // Select only this item
                newSelected.clear();
                newSelected.add(id);
                setLastSelectedId(id);
            }
        }

        setSelectedIds(newSelected);
        onSelectionChange?.(newSelected);
    };

    const handleDeleteSingle = async (documentId: string) => {
        setDeletingId(documentId);
        try {
            const res = await fetch('/api/documents/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds: [documentId], projectId }),
            });

            if (res.ok) {
                toast({
                    title: "Document deleted",
                    description: "Successfully deleted document.",
                });
                fetchData();
            } else {
                toast({
                    title: "Error",
                    description: "Failed to delete document.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Failed to delete document', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteAll = async () => {
        if (documents.length === 0) return;

        try {
            const allIds = documents.map(d => d.id);
            const res = await fetch('/api/documents/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds: allIds, projectId }),
            });

            if (res.ok) {
                toast({
                    title: "All documents deleted",
                    description: `Successfully deleted ${allIds.length} document(s).`,
                });
                fetchData();
                setShowDeleteAllConfirm(false);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to delete documents.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Failed to delete documents', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;

        try {
            const idsToDelete = Array.from(selectedIds);
            const res = await fetch('/api/documents/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds: idsToDelete, projectId }),
            });

            if (res.ok) {
                toast({
                    title: "Documents deleted",
                    description: `Successfully deleted ${idsToDelete.length} document(s).`,
                });
                const newSelection = new Set<string>();
                setSelectedIds(newSelection);
                setLastSelectedId(null);
                onSelectionChange?.(newSelection);
                fetchData();
                setShowDeleteConfirm(false);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to delete documents.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Failed to delete selected documents', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-text-muted)]" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Processing Banner */}
            {isProcessing && processingCount && processingCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md">
                    <svg
                        width={16}
                        height={16}
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="animate-spin [animation-duration:2.5s] text-[var(--color-accent-copper)]"
                    >
                        <path
                            d="M8 1L15 8L8 15L1 8L8 1Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                        />
                        <path
                            d="M8 4.5L11.5 8L8 11.5L4.5 8L8 4.5Z"
                            fill="currentColor"
                        />
                    </svg>
                    <span className="text-sm text-[var(--color-text-primary)]">
                        Processing {processingCount} file{processingCount !== 1 ? 's' : ''}...
                    </span>
                </div>
            )}

            {/* Table View */}
            <div className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)] overflow-hidden @container">
                <div className="relative w-full">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader>
                            <TableRow className="border-[var(--color-border)] bg-[var(--color-accent-copper-tint)]">
                                <TableHead
                                    className="text-xs font-medium text-[var(--color-accent-blue)] uppercase tracking-wider w-16 !px-2 cursor-pointer hover:text-[var(--color-accent-copper)] select-none transition-colors"
                                    onClick={() => handleSort('drawingNumber')}
                                >
                                    #<SortIndicator column="drawingNumber" />
                                </TableHead>
                                <TableHead
                                    className="text-xs font-medium text-[var(--color-accent-blue)] uppercase tracking-wider !px-2 cursor-pointer hover:text-[var(--color-accent-copper)] select-none transition-colors"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 flex-shrink-0" />
                                        <span>Name</span>
                                        {selectedIds.size > 0 ? (
                                            <span className="text-[var(--color-accent-yellow)]">({selectedIds.size})</span>
                                        ) : (
                                            <span className="text-[var(--color-accent-blue)]">({filteredDocuments.length})</span>
                                        )}
                                        <SortIndicator column="name" />
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="text-xs font-medium text-[var(--color-accent-blue)] uppercase tracking-wider w-10 !px-2 cursor-pointer hover:text-[var(--color-accent-copper)] select-none transition-colors"
                                    onClick={() => handleSort('drawingRevision')}
                                >
                                    Rev<SortIndicator column="drawingRevision" />
                                </TableHead>
                                <TableHead
                                    className="text-xs font-medium text-[var(--color-accent-blue)] uppercase tracking-wider w-14 @2xl:w-20 @3xl:w-auto !px-2 @lg:table-cell hidden cursor-pointer hover:text-[var(--color-accent-copper)] select-none transition-colors"
                                    onClick={() => handleSort('category')}
                                >
                                    <span className="@3xl:hidden">Cat</span>
                                    <span className="hidden @3xl:inline">Category</span>
                                    <SortIndicator column="category" />
                                </TableHead>
                                <TableHead
                                    className="text-xs font-medium text-[var(--color-accent-blue)] uppercase tracking-wider w-28 @2xl:w-36 @3xl:w-auto !pl-2 !pr-1 @md:table-cell hidden cursor-pointer hover:text-[var(--color-accent-copper)] select-none transition-colors"
                                    onClick={() => handleSort('subcategory')}
                                >
                                    <span className="@3xl:hidden">Subcat</span>
                                    <span className="hidden @3xl:inline">Subcategory</span>
                                    <SortIndicator column="subcategory" />
                                </TableHead>
                                <TableHead
                                    className="text-xs font-medium text-[var(--color-accent-blue)] uppercase tracking-wider w-28 @4xl:w-auto !pl-1 !pr-2 @3xl:table-cell hidden cursor-pointer hover:text-[var(--color-accent-copper)] select-none transition-colors"
                                    onClick={() => handleSort('fileName')}
                                >
                                    File Name<SortIndicator column="fileName" />
                                </TableHead>
                                <TableHead
                                    className="text-xs font-medium text-[var(--color-accent-blue)] uppercase tracking-wider w-8 !px-1 @lg:table-cell hidden cursor-pointer hover:text-[var(--color-accent-copper)] select-none transition-colors"
                                    onClick={() => handleSort('version')}
                                >
                                    V<SortIndicator column="version" />
                                </TableHead>
                                <TableHead className="w-8 !px-1 @sm:table-cell hidden">
                                    {selectedIds.size > 0 ? (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="p-1 hover:bg-[var(--color-border)] rounded"
                                            title={`Delete ${selectedIds.size} selected document${selectedIds.size > 1 ? 's' : ''}`}
                                        >
                                            <Trash className="w-4 h-4 text-[var(--color-accent-coral)]" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowDeleteAllConfirm(true)}
                                            disabled={documents.length === 0}
                                            className="p-1 hover:bg-[var(--color-border)] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Delete all documents"
                                        >
                                            <Trash className="w-4 h-4 text-[var(--color-text-muted)]" />
                                        </button>
                                    )}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocuments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-[var(--color-text-muted)] h-24">
                                        {filterCategoryId ? 'No documents in this category.' : 'No documents found.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDocuments.map((doc) => (
                                    <TableRow
                                        key={doc.id}
                                        className={cn(
                                            "border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer select-none h-9",
                                            selectedIds.has(doc.id) && "bg-[var(--color-bg-tertiary)]"
                                        )}
                                        onMouseEnter={() => setHoveredRowId(doc.id)}
                                        onMouseLeave={() => setHoveredRowId(null)}
                                        onMouseDown={(e) => {
                                            if (e.shiftKey) {
                                                e.preventDefault(); // Prevent text selection on shift-click
                                            }
                                        }}
                                        onClick={(e) => handleSelect(doc.id, e)}
                                    >
                                        <TableCell className="text-[var(--color-text-primary)] w-16 !px-2 !py-1.5">
                                            {doc.drawingExtractionStatus === 'PROCESSING' ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
                                            ) : doc.drawingNumber ? (
                                                <span className="truncate block" title={doc.drawingNumber}>
                                                    {doc.drawingNumber}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-[var(--color-text-primary)] !px-2 !py-1.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-2 flex-shrink-0">
                                                    <SyncStatusDot status={syncStatuses[doc.id] || null} />
                                                </div>
                                                {doc.drawingExtractionStatus === 'PROCESSING' ? (
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                        <Loader2 className="w-3 h-3 animate-spin text-[var(--color-text-muted)] flex-shrink-0" />
                                                        <span className="truncate text-[var(--color-text-muted)] italic">Extracting...</span>
                                                    </div>
                                                ) : (
                                                    <span
                                                        className="truncate flex-1"
                                                        title={doc.drawingName || doc.originalName || 'Untitled'}
                                                    >
                                                        {doc.drawingName || doc.originalName || (
                                                            <span className="text-[var(--color-text-muted)] italic">Untitled Document</span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-primary)] w-10 !px-2 !py-1.5">
                                            {doc.drawingRevision ? (
                                                <span title={doc.drawingRevision}>{doc.drawingRevision}</span>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="w-14 @2xl:w-20 @3xl:w-auto @lg:table-cell hidden !px-2 !py-1.5">
                                            <div className="flex items-center gap-1 min-w-0 @3xl:min-w-max">
                                                {doc.categoryName ? (
                                                    <>
                                                        <Folder
                                                            className="w-3 h-3 flex-shrink-0 fill-current text-[var(--color-text-muted)]"
                                                        />
                                                        <span
                                                            className="truncate @3xl:overflow-visible text-[var(--color-text-muted)] text-xs"
                                                            title={doc.categoryName}
                                                        >
                                                            {doc.categoryName}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-[var(--color-text-muted)]">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="w-28 @2xl:w-36 @3xl:w-auto @md:table-cell hidden !pl-2 !pr-1 !py-1.5">
                                            {doc.subcategoryName ? (
                                                <div className="flex items-center gap-1 min-w-0 @3xl:min-w-max">
                                                    <Folder
                                                        className="w-3 h-3 flex-shrink-0 fill-current text-[var(--color-text-muted)]"
                                                    />
                                                    <span
                                                        className="truncate @3xl:overflow-visible text-[var(--color-text-muted)] text-xs"
                                                        title={doc.subcategoryName}
                                                    >
                                                        {doc.subcategoryName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-muted)] w-28 @4xl:w-auto @3xl:table-cell hidden !pl-1 !pr-2 !py-1.5">
                                            <span
                                                className="truncate @4xl:overflow-visible block text-xs"
                                                title={doc.originalName || 'Unknown'}
                                            >
                                                {doc.originalName || <span className="italic">Unknown</span>}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-[var(--color-text-muted)] w-8 @lg:table-cell hidden !px-1 !py-1.5 text-xs">v{doc.versionNumber}</TableCell>
                                        <TableCell className="w-8 @sm:table-cell hidden !px-1 !py-1.5">
                                            {(hoveredRowId === doc.id || deletingId === doc.id) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteSingle(doc.id);
                                                    }}
                                                    disabled={deletingId === doc.id}
                                                    className="p-1 hover:bg-[var(--color-border)] rounded disabled:opacity-50"
                                                    title="Delete document"
                                                >
                                                    {deletingId === doc.id ? (
                                                        <Loader2 className="w-4 h-4 text-[var(--color-text-muted)] animate-spin" />
                                                    ) : (
                                                        <Trash className="w-4 h-4 text-[var(--color-text-muted)] hover:text-[var(--color-accent-coral)]" />
                                                    )}
                                                </button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

            {/* Delete Selected Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Delete Selected Documents"
            >
                <div className="space-y-4">
                    <p className="text-[var(--color-text-primary)]">Are you sure you want to delete {selectedIds.size} selected document{selectedIds.size !== 1 ? 's' : ''}?</p>
                    <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete All Confirmation Modal */}
            <Modal
                isOpen={showDeleteAllConfirm}
                onClose={() => setShowDeleteAllConfirm(false)}
                title="Delete All Documents"
            >
                <div className="space-y-4">
                    <p className="text-[var(--color-text-primary)]">Are you sure you want to delete all {documents.length} document{documents.length !== 1 ? 's' : ''}?</p>
                    <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteAllConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAll}>
                            Delete All
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
