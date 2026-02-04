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
                                'relative group flex items-center justify-center min-w-[48px] px-3 py-1 text-sm transition-colors cursor-pointer',
                                isActive
                                    ? 'text-[var(--color-text-primary)] border-b-[3px] border-[var(--color-accent-copper)] -mb-px'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                            )}
                            onClick={() => onSelectAddendum(addendum.id)}
                        >
                            <span className="mr-1">{label}</span>

                            {/* Indicator dot for content/transmittal (only when inactive) */}
                            {(hasContent || hasTransmittal) && !isActive && (
                                <span
                                    className={cn(
                                        'absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full',
                                        hasTransmittal ? 'bg-[#3fb950]' : 'bg-[#4fc1ff]'
                                    )}
                                />
                            )}

                            {/* Delete button - only visible on hover */}
                            {onDeleteAddendum && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, addendum.id)}
                                    className="absolute right-0 p-0.5 rounded hover:bg-[var(--color-border)] transition-all opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
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
                    className="flex items-center justify-center px-2 py-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                <AlertDialogContent className="card-aurora border-0 bg-[rgba(20,22,24,0.95)] backdrop-blur-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-3 text-[var(--color-text-primary)]">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primitive-aurora-magenta)]/20 to-[var(--primitive-aurora-violet)]/20 border border-[var(--primitive-aurora-magenta)]/30">
                                <AlertTriangle className="w-5 h-5 text-[var(--primitive-aurora-magenta)]" />
                            </div>
                            <span>Delete Addendum {pendingLabel}?</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--color-text-muted)] pl-[52px]">
                            This will permanently delete the addendum and all its associated transmittal documents.
                            This action cannot be undone.
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
