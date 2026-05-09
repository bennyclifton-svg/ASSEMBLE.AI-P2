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
            <div className="procurement-instance-tabs">
                {addenda.map((addendum) => {
                    const label = String(addendum.addendumNumber).padStart(2, '0');
                    const isActive = addendum.id === activeAddendumId;
                    const hasContent = !!addendum.content;
                    const hasTransmittal = addendum.transmittalCount > 0;

                    return (
                        <div
                            key={addendum.id}
                            className="procurement-instance-tab group min-w-[48px] justify-center"
                            data-state={isActive ? 'active' : 'inactive'}
                            onClick={() => onSelectAddendum(addendum.id)}
                        >
                            <span className="mr-1">{label}</span>

                            {/* Indicator dot for content/transmittal (only when inactive) */}
                            {(hasContent || hasTransmittal) && !isActive && (
                                <span
                                    className={cn(
                                        'absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full',
                                        hasTransmittal ? 'bg-[var(--color-success)]' : 'bg-[var(--sw-cyan)]'
                                    )}
                                />
                            )}

                            {/* Delete button - only visible on hover */}
                            {onDeleteAddendum && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, addendum.id)}
                                    className="absolute right-0 p-0.5 text-[var(--sw-muted)] opacity-0 transition-all hover:bg-[var(--sw-paper)] hover:text-[var(--sw-ink)] group-hover:opacity-100"
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
                    className="procurement-instance-create"
                    title="Create new addendum"
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
                <AlertDialogContent className="rounded-none border-[var(--sw-rule)] bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-3 text-[var(--sw-ink)]">
                            <div className="flex h-10 w-10 items-center justify-center border border-[var(--sw-rule)] bg-[var(--sw-rose-tint)]">
                                <AlertTriangle className="h-5 w-5 text-[var(--sw-rose-dk)]" />
                            </div>
                            <span>Delete Addendum {pendingLabel}?</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="pl-[52px] text-[var(--sw-muted)]">
                            This will permanently delete the addendum and all its associated transmittal documents.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 sm:gap-3">
                        <AlertDialogCancel className="rounded-none border-[var(--sw-rule)] bg-transparent text-[var(--sw-ink)] hover:bg-[var(--sw-paper)]">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="rounded-none border-0 bg-[var(--sw-rose)] text-[var(--sw-ink)] hover:bg-[var(--sw-rose-dk)] hover:text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
