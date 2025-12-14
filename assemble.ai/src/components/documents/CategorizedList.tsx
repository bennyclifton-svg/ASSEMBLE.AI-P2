'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import { useDocumentSyncStatus, useSyncStatus } from '@/lib/hooks/use-sync-status';
import { cn } from '@/lib/utils';
import { getCategoryById } from '@/lib/constants/categories';

/**
 * T032: Sync status dot indicator (compact version)
 */
function SyncStatusDot({ documentId }: { documentId: string }) {
    const { statuses } = useSyncStatus([documentId]);
    const status = statuses[documentId];

    if (!status || status.status === null) {
        return null; // Not synced
    }

    const colorMap = {
        synced: 'bg-green-500',
        pending: 'bg-amber-500',
        processing: 'bg-amber-500',
        failed: 'bg-red-500',
    };

    const color = colorMap[status.status] || 'bg-gray-500';

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
}

interface CategorizedListProps {
    refreshTrigger: number;
    projectId: string;
    selectedIds?: Set<string>;
    onSelectionChange?: (selectedIds: Set<string>) => void;
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function CategorizedList({ refreshTrigger, projectId, selectedIds: externalSelectedIds, onSelectionChange, scrollContainerRef }: CategorizedListProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(externalSelectedIds || new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<'name' | 'category' | 'subcategory' | 'version' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const { toast } = useToast();

    // Sorting logic
    const sortedDocuments = useMemo(() => {
        if (!sortColumn) return documents;

        return [...documents].sort((a, b) => {
            let comparison = 0;

            switch (sortColumn) {
                case 'name':
                    comparison = a.originalName.localeCompare(b.originalName);
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
                case 'version':
                    comparison = a.versionNumber - b.versionNumber;
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [documents, sortColumn, sortDirection]);

    const handleSort = (column: 'name' | 'category' | 'subcategory' | 'version') => {
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

    const SortIndicator = ({ column }: { column: 'name' | 'category' | 'subcategory' | 'version' }) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4 inline ml-1" />
            : <ChevronDown className="w-4 h-4 inline ml-1" />
    };

    // Sync internal state when external selection changes (e.g., from transmittal load)
    useEffect(() => {
        if (externalSelectedIds) {
            setSelectedIds(externalSelectedIds);
        }
    }, [externalSelectedIds]);

    useEffect(() => {
        fetchData();
    }, [refreshTrigger, projectId]);

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

    const fetchData = async () => {
        // Save scroll position before fetching
        const scrollTop = scrollContainerRef?.current?.scrollTop ?? 0;

        try {
            setLoading(true);
            const res = await fetch(`/api/documents?projectId=${projectId}`);
            if (res.ok) {
                const data = await res.json();
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
        }
    };

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
            const start = documents.findIndex(d => d.id === lastSelectedId);
            const end = documents.findIndex(d => d.id === id);

            if (start !== -1 && end !== -1) {
                const low = Math.min(start, end);
                const high = Math.max(start, end);
                const range = documents.slice(low, high + 1);

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
                <Loader2 className="w-8 h-8 animate-spin text-[#858585]" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Table View */}
            <div className="border border-[#3e3e42] rounded-md bg-[#1e1e1e] overflow-hidden @container">
                <div className="relative w-full">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader>
                            <TableRow className="border-[#3e3e42] hover:bg-[#252526]">
                                <TableHead
                                    className="text-[#cccccc] cursor-pointer hover:text-white select-none w-[50%] @md:w-auto"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>Name</span>
                                        {selectedIds.size > 0 ? (
                                            <span className="text-[#4fc3f7] text-xs">({selectedIds.size} selected)</span>
                                        ) : (
                                            <span className="text-[#858585] text-xs">({documents.length})</span>
                                        )}
                                        <SortIndicator column="name" />
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="text-[#cccccc] w-[35%] @md:w-36 cursor-pointer hover:text-white select-none"
                                    onClick={() => handleSort('category')}
                                >
                                    Category<SortIndicator column="category" />
                                </TableHead>
                                <TableHead
                                    className="text-[#cccccc] w-36 @lg:table-cell hidden cursor-pointer hover:text-white select-none"
                                    onClick={() => handleSort('subcategory')}
                                >
                                    Subcategory<SortIndicator column="subcategory" />
                                </TableHead>
                                <TableHead
                                    className="text-[#cccccc] w-14 @lg:table-cell hidden cursor-pointer hover:text-white select-none"
                                    onClick={() => handleSort('version')}
                                >
                                    Ver<SortIndicator column="version" />
                                </TableHead>
                                <TableHead className="w-10 @sm:table-cell hidden">
                                    {selectedIds.size > 0 ? (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="p-1 hover:bg-[#3e3e42] rounded"
                                            title={`Delete ${selectedIds.size} selected document${selectedIds.size > 1 ? 's' : ''}`}
                                        >
                                            <Trash className="w-4 h-4 text-red-400" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowDeleteAllConfirm(true)}
                                            disabled={documents.length === 0}
                                            className="p-1 hover:bg-[#3e3e42] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Delete all documents"
                                        >
                                            <Trash className="w-4 h-4 text-[#858585]" />
                                        </button>
                                    )}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-[#858585] h-24">
                                        No documents found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedDocuments.map((doc) => (
                                    <TableRow
                                        key={doc.id}
                                        className={cn(
                                            "border-[#3e3e42] hover:bg-[#2a2d2e] transition-colors cursor-pointer select-none h-12",
                                            selectedIds.has(doc.id) && "bg-[#37373d]"
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
                                        <TableCell className="font-medium text-[#cccccc] !py-2 w-[50%] @md:w-auto">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-2 flex-shrink-0">
                                                    <SyncStatusDot documentId={doc.id} />
                                                </div>
                                                <span className="truncate flex-1" title={doc.originalName}>
                                                    {doc.originalName}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="w-[35%] @md:w-36 !py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {doc.categoryName ? (
                                                    <>
                                                        <Folder
                                                            className="w-4 h-4 flex-shrink-0 fill-current"
                                                            style={{
                                                                color: getCategoryById(doc.categoryId || '')?.color || '#858585'
                                                            }}
                                                        />
                                                        <span
                                                            className="truncate"
                                                            title={doc.categoryName}
                                                            style={{
                                                                color: getCategoryById(doc.categoryId || '')?.color || '#858585'
                                                            }}
                                                        >
                                                            {doc.categoryName}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-[#858585] italic">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="w-36 @lg:table-cell hidden !py-2">
                                            <span
                                                className="truncate"
                                                title={doc.subcategoryName || ''}
                                                style={{
                                                    color: doc.categoryId ? getCategoryById(doc.categoryId)?.color || '#cccccc' : '#858585'
                                                }}
                                            >
                                                {doc.subcategoryName || <span className="text-[#858585]">—</span>}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-[#cccccc] w-14 @lg:table-cell hidden !py-2">v{doc.versionNumber}</TableCell>
                                        <TableCell className="w-10 @sm:table-cell hidden !py-2">
                                            {(hoveredRowId === doc.id || deletingId === doc.id) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteSingle(doc.id);
                                                    }}
                                                    disabled={deletingId === doc.id}
                                                    className="p-1 hover:bg-[#3e3e42] rounded disabled:opacity-50"
                                                    title="Delete document"
                                                >
                                                    {deletingId === doc.id ? (
                                                        <Loader2 className="w-4 h-4 text-[#858585] animate-spin" />
                                                    ) : (
                                                        <Trash className="w-4 h-4 text-[#858585] hover:text-red-400" />
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
                    <p className="text-[#cccccc]">Are you sure you want to delete {selectedIds.size} selected document{selectedIds.size !== 1 ? 's' : ''}?</p>
                    <p className="text-sm text-[#858585]">This action cannot be undone.</p>
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
                    <p className="text-[#cccccc]">Are you sure you want to delete all {documents.length} document{documents.length !== 1 ? 's' : ''}?</p>
                    <p className="text-sm text-[#858585]">This action cannot be undone.</p>
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
