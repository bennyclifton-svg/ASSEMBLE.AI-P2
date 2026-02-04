/**
 * NumberedTabs Component
 * Generic numbered tabs component (01, 02, 03...) with create/delete functionality
 * Matching RFT/TRR/Addendum tab styling with Aurora underline on active
 */

'use client';

import { useState, ReactNode } from 'react';
import { Plus, Loader2, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface NumberedTabsProps<T extends { id: string }> {
    /** Array of items to display as tabs */
    items: T[];
    /** Currently active item ID */
    activeItemId: string | null;
    /** Callback when a tab is selected */
    onSelectItem: (id: string) => void;
    /** Callback when the create button is clicked */
    onCreateItem: () => void;
    /** Optional callback for deleting an item */
    onDeleteItem?: (id: string) => void;
    /** Function to get the display number for an item (e.g., item.number or index + 1) */
    getItemNumber: (item: T, index: number) => number;
    /** Optional function to check if item should show an indicator dot (e.g., has transmittal) */
    hasIndicator?: (item: T) => boolean;
    /** Whether the component is in a loading state */
    isLoading?: boolean;
    /** Entity name for the delete dialog (e.g., "Note", "Meeting", "RFT") */
    entityName?: string;
    /** Delete confirmation message */
    deleteMessage?: string;
}

export function NumberedTabs<T extends { id: string }>({
    items,
    activeItemId,
    onSelectItem,
    onCreateItem,
    onDeleteItem,
    getItemNumber,
    hasIndicator,
    isLoading = false,
    entityName = 'item',
    deleteMessage,
}: NumberedTabsProps<T>) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPendingDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (pendingDeleteId && onDeleteItem) {
            onDeleteItem(pendingDeleteId);
        }
        setDeleteDialogOpen(false);
        setPendingDeleteId(null);
    };

    // Find the pending item for the delete dialog
    const pendingItemIndex = items.findIndex(item => item.id === pendingDeleteId);
    const pendingLabel = pendingItemIndex >= 0
        ? String(getItemNumber(items[pendingItemIndex], pendingItemIndex)).padStart(2, '0')
        : '';

    return (
        <>
            <div className="flex items-center border-b border-[var(--color-border)]">
                {items.map((item, index) => {
                    const label = String(getItemNumber(item, index)).padStart(2, '0');
                    const isActive = item.id === activeItemId;
                    const showIndicator = hasIndicator ? hasIndicator(item) : false;

                    return (
                        <div
                            key={item.id}
                            className={cn(
                                'relative group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer',
                                isActive
                                    ? 'text-[var(--color-text-primary)] border-b-[3px] border-[var(--color-accent-copper)] -mb-px'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                            )}
                            onClick={() => onSelectItem(item.id)}
                        >
                            <span>{label}</span>

                            {/* Indicator dot (e.g., for transmittal) - only when inactive */}
                            {showIndicator && !isActive && (
                                <span
                                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#3fb950]"
                                />
                            )}

                            {/* Delete button - visible on active, hover on inactive */}
                            {onDeleteItem && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, item.id)}
                                    className={cn(
                                        'ml-1 p-0.5 rounded hover:bg-[var(--color-border)] transition-all',
                                        isActive
                                            ? 'opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                            : 'opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                    )}
                                    title={`Delete ${entityName} ${label}`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Create New Button */}
                <button
                    onClick={onCreateItem}
                    disabled={isLoading}
                    className="flex items-center justify-center px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Create new ${entityName}`}
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Plus className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Delete Confirmation Dialog - Aurora styled */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="card-aurora border-0 bg-[rgba(20,22,24,0.95)] backdrop-blur-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-3 text-[var(--color-text-primary)]">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primitive-aurora-magenta)]/20 to-[var(--primitive-aurora-violet)]/20 border border-[var(--primitive-aurora-magenta)]/30">
                                <AlertTriangle className="w-5 h-5 text-[var(--primitive-aurora-magenta)]" />
                            </div>
                            <span>Delete {entityName} {pendingLabel}?</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--color-text-muted)] pl-[52px]">
                            {deleteMessage || `This will permanently delete this ${entityName.toLowerCase()} and all its associated data. This action cannot be undone.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 sm:gap-3">
                        <AlertDialogCancel className="btn-aurora-ghost border-[var(--color-border)] hover:border-[var(--primitive-aurora-cyan)]/30">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-gradient-to-r from-[var(--primitive-aurora-magenta)] to-[var(--primitive-aurora-violet)] text-white hover:opacity-90 border-0 shadow-[0_0_20px_rgba(255,20,147,0.3)]"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default NumberedTabs;
