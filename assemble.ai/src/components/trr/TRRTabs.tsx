/**
 * TRRTabs Component
 * Tab interface for switching between TRRs (01, 02, etc.) with + button to create new
 * Uses underline style matching Addendum tabs
 */

'use client';

import { useState } from 'react';
import { TRR } from '@/types/trr';
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

interface TRRWithCount extends TRR {
    transmittalCount: number;
}

interface TRRTabsProps {
    trrs: TRRWithCount[];
    activeTrrId: string | null;
    onSelectTrr: (id: string) => void;
    onCreateTrr: () => void;
    onDeleteTrr?: (id: string) => void;
    isLoading: boolean;
}

export function TRRTabs({
    trrs,
    activeTrrId,
    onSelectTrr,
    onCreateTrr,
    onDeleteTrr,
    isLoading,
}: TRRTabsProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPendingDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (pendingDeleteId && onDeleteTrr) {
            onDeleteTrr(pendingDeleteId);
        }
        setDeleteDialogOpen(false);
        setPendingDeleteId(null);
    };

    const pendingTrr = trrs.find(t => t.id === pendingDeleteId);
    const pendingLabel = pendingTrr
        ? String(pendingTrr.trrNumber).padStart(2, '0')
        : '';

    return (
        <>
            <div className="procurement-instance-tabs">
                {trrs.map((trr) => {
                    const label = String(trr.trrNumber).padStart(2, '0');
                    const isActive = trr.id === activeTrrId;
                    const hasTransmittal = trr.transmittalCount > 0;

                    return (
                        <div
                            key={trr.id}
                            className="procurement-instance-tab group"
                            data-state={isActive ? 'active' : 'inactive'}
                            onClick={() => onSelectTrr(trr.id)}
                        >
                            <span>{label}</span>

                            {/* Indicator dot for transmittal (only when inactive) */}
                            {hasTransmittal && !isActive && (
                                <span
                                    className={cn(
                                        'absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--color-success)]'
                                    )}
                                />
                            )}

                            {/* Delete button - always visible when active, hover when inactive */}
                            {onDeleteTrr && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, trr.id)}
                                    className={cn(
                                        'ml-1 p-0.5 transition-all hover:bg-[var(--sw-paper)]',
                                        isActive
                                            ? 'opacity-100 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                                            : 'opacity-0 group-hover:opacity-100 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                                    )}
                                    title={`Delete TRR ${label}`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Create New Button - styled to match tabs */}
                <button
                    onClick={onCreateTrr}
                    disabled={isLoading}
                    className="procurement-instance-create"
                    title="Create new TRR"
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
                            <span>Delete TRR {pendingLabel}?</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="pl-[52px] text-[var(--sw-muted)]">
                            This will permanently delete the TRR and all its associated transmittal documents.
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
