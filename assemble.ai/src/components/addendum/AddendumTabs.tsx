/**
 * T112: AddendumTabs Component
 * Tab interface for switching between addenda (01, 02, etc.) with + button to create new
 * Uses underline style matching RFT tabs
 */

'use client';

import { useState } from 'react';
import { type Addendum } from '@/lib/hooks/use-addenda';
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

interface AddendumTabsProps {
    addenda: Addendum[];
    activeAddendumId: string | null;
    onSelectAddendum: (id: string) => void;
    onCreateAddendum: () => void;
    onDeleteAddendum?: (id: string) => void;
    isLoading: boolean;
}

export function AddendumTabs({
    addenda,
    activeAddendumId,
    onSelectAddendum,
    onCreateAddendum,
    onDeleteAddendum,
    isLoading,
}: AddendumTabsProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPendingDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (pendingDeleteId && onDeleteAddendum) {
            onDeleteAddendum(pendingDeleteId);
        }
        setDeleteDialogOpen(false);
        setPendingDeleteId(null);
    };

    const pendingAddendum = addenda.find(a => a.id === pendingDeleteId);
    const pendingLabel = pendingAddendum
        ? String(pendingAddendum.addendumNumber).padStart(2, '0')
        : '';

    return (
        <>
            <div className="flex items-center border-b border-[var(--color-border)]">
                {addenda.map((addendum) => {
                    const label = String(addendum.addendumNumber).padStart(2, '0');
                    const isActive = addendum.id === activeAddendumId;
                    const hasContent = !!addendum.content;
                    const hasTransmittal = addendum.transmittalCount > 0;

                    return (
                        <div
                            key={addendum.id}
                            className={cn(
                                'relative group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer',
                                isActive
                                    ? 'text-[var(--color-text-primary)] border-b-[3px] border-[var(--color-accent-copper)] -mb-px'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                            )}
                            onClick={() => onSelectAddendum(addendum.id)}
                        >
                            <span>{label}</span>

                            {/* Indicator dot for content/transmittal (only when inactive) */}
                            {(hasContent || hasTransmittal) && !isActive && (
                                <span
                                    className={cn(
                                        'absolute top-1 right-1 w-1.5 h-1.5 rounded-full',
                                        hasTransmittal ? 'bg-[#3fb950]' : 'bg-[#4fc1ff]'
                                    )}
                                />
                            )}

                            {/* Delete button - always visible when active, hover when inactive */}
                            {onDeleteAddendum && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, addendum.id)}
                                    className={cn(
                                        'ml-1 p-0.5 rounded hover:bg-[var(--color-border)] transition-all',
                                        isActive
                                            ? 'opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                            : 'opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                    )}
                                    title={`Delete Addendum ${label}`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Create New Button - styled to match tabs */}
                <button
                    onClick={onCreateAddendum}
                    disabled={isLoading}
                    className="flex items-center justify-center px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Create new addendum"
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Plus className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-[#252526] border-[var(--color-border)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            Delete Addendum {pendingLabel}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--color-text-muted)]">
                            This will permanently delete the addendum and all its associated transmittal documents.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[#4e4e52] border-[var(--color-border)]">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
