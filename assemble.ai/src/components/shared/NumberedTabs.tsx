/**
 * NumberedTabs Component
 * Generic numbered tabs component (01, 02, 03...) with create/delete functionality
 * Matching RFT/TRR/Addendum tab styling with Aurora underline on active
 */

'use client';

import { useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';

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
    /** Accent colour for active underline and indicator dots */
    accentColor?: string;
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
    accentColor = 'var(--sw-rose)',
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
            <div className="flex items-center border-b border-[var(--sw-rule-2)]">
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
                                    ? 'text-[var(--sw-ink)] border-b-[3px] -mb-px'
                                    : 'text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                            )}
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                borderBottomColor: isActive ? accentColor : undefined,
                            }}
                            onClick={() => onSelectItem(item.id)}
                        >
                            <span>{label}</span>

                            {/* Indicator dot (e.g., for transmittal) - only when inactive */}
                            {showIndicator && !isActive && (
                                <span className="absolute top-1 right-1 h-1.5 w-1.5" style={{ background: accentColor }} />
                            )}

                            {/* Delete button - visible on active, hover on inactive */}
                            {onDeleteItem && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, item.id)}
                                    className={cn(
                                        'ml-1 p-0.5 hover:bg-[var(--sw-paper)] transition-all',
                                        isActive
                                            ? 'opacity-100 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                                            : 'opacity-0 group-hover:opacity-100 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
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
                    className="flex items-center justify-center px-3 py-1.5 text-sm text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Create new ${entityName}`}
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Plus className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Delete Confirmation Dialog */}
            <AuroraConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title={`Delete ${entityName} ${pendingLabel}`}
                description={deleteMessage || `Are you sure you want to delete this ${entityName.toLowerCase()}?`}
                variant="destructive"
            />
        </>
    );
}

export default NumberedTabs;
