'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Send, Loader2, FileIcon, FolderIcon } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { TransmittalManager } from './TransmittalManager';
import { cn } from '@/lib/utils';
import { getCategoryById } from '@/lib/constants/categories';

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
    scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function CategorizedList({ refreshTrigger, projectId, selectedIds: externalSelectedIds, onSelectionChange, scrollContainerRef }: CategorizedListProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(externalSelectedIds || new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTransmittalManager, setShowTransmittalManager] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
        fetchData();
    }, [refreshTrigger, projectId]);

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

    const handleDelete = async () => {
        const fileIds = Array.from(selectedIds);
        if (fileIds.length === 0) return;

        try {
            const res = await fetch('/api/documents/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds: fileIds, projectId }),
            });

            if (res.ok) {
                toast({
                    title: "Documents deleted",
                    description: `Successfully deleted ${fileIds.length} document(s).`,
                });
                setSelectedIds(new Set());
                setLastSelectedId(null);
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
            console.error('Failed to delete documents', error);
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
            {/* Bulk Action Bar */}
            <div className="flex items-center gap-2 p-3 bg-[#252526] border border-[#3e3e42] rounded-md">
                <span className="text-sm text-[#cccccc]">
                    {selectedIds.size > 0
                        ? `${selectedIds.size} selected`
                        : 'No selection'}
                </span>
                <div className="flex-1" />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={selectedIds.size === 0}
                    className="text-[#cccccc] hover:bg-[#3e3e42]"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTransmittalManager(true)}
                    disabled={selectedIds.size === 0}
                    className="text-[#cccccc] hover:bg-[#3e3e42]"
                >
                    <Send className="w-4 h-4 mr-2" />
                    Create Transmittal
                </Button>
            </div>

            {/* Table View */}
            <div className="border border-[#3e3e42] rounded-md bg-[#1e1e1e] overflow-hidden @container">
                <div className="relative w-full">
                    <table className="w-full caption-bottom text-sm table-fixed">
                        <TableHeader>
                            <TableRow className="border-[#3e3e42] hover:bg-[#252526]">
                                <TableHead className="text-[#cccccc] max-w-0">Name</TableHead>
                                <TableHead className="text-[#cccccc] w-48 @lg:table-cell hidden">Category</TableHead>
                                <TableHead className="text-[#cccccc] w-20 @md:table-cell hidden">Version</TableHead>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedIds.size === documents.length && documents.length > 0}
                                        onCheckedChange={handleSelectAll}
                                        className="border-[#858585] data-[state=checked]:bg-[#0e639c] data-[state=checked]:border-[#0e639c]"
                                    />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-[#858585] h-24">
                                        No documents found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc) => (
                                    <TableRow
                                        key={doc.id}
                                        className={cn(
                                            "border-[#3e3e42] hover:bg-[#2a2d2e] transition-colors cursor-pointer select-none",
                                            selectedIds.has(doc.id) && "bg-[#37373d]"
                                        )}
                                        onMouseDown={(e) => {
                                            if (e.shiftKey) {
                                                e.preventDefault(); // Prevent text selection on shift-click
                                            }
                                        }}
                                        onClick={(e) => handleSelect(doc.id, e)}
                                    >
                                        <TableCell className="font-medium text-[#cccccc] max-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileIcon className="w-4 h-4 flex-shrink-0 text-[#519aba]" />
                                                <span className="truncate" title={doc.originalName}>
                                                    {doc.originalName}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[#cccccc] w-48 @lg:table-cell hidden">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {doc.categoryName ? (
                                                    <>
                                                        <FolderIcon
                                                            className="w-4 h-4 flex-shrink-0"
                                                            style={{
                                                                color: getCategoryById(doc.categoryId || '')?.color || '#dcb67a'
                                                            }}
                                                        />
                                                        <span className="truncate" title={`${doc.categoryName}${doc.subcategoryName ? ` / ${doc.subcategoryName}` : ''}`}>
                                                            {doc.categoryName}
                                                            {doc.subcategoryName && ` / ${doc.subcategoryName}`}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-[#858585] italic">Uncategorized</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[#cccccc] w-20 @md:table-cell hidden">v{doc.versionNumber}</TableCell>
                                        <TableCell className="w-12">
                                            <Checkbox
                                                checked={selectedIds.has(doc.id)}
                                                className="border-[#858585] data-[state=checked]:bg-[#0e639c] data-[state=checked]:border-[#0e639c] pointer-events-none"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Confirm Delete"
            >
                <div className="space-y-4">
                    <p className="text-[#cccccc]">Are you sure you want to delete {selectedIds.size} document{selectedIds.size > 1 ? 's' : ''}?</p>
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

            {/* Transmittal Manager Modal */}
            <Modal
                isOpen={showTransmittalManager}
                onClose={() => setShowTransmittalManager(false)}
                title="Create Transmittal"
            >
                <TransmittalManager
                    selectedIds={Array.from(selectedIds)}
                    onComplete={() => {
                        setShowTransmittalManager(false);
                        setSelectedIds(new Set());
                    }}
                    onCancel={() => setShowTransmittalManager(false)}
                />
            </Modal>
        </div>
    );
}
