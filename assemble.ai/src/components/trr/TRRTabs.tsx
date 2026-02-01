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
            <div className="flex items-center border-b border-[var(--color-border)]">
                {trrs.map((trr) => {
                    const label = String(trr.trrNumber).padStart(2, '0');
                    const isActive = trr.id === activeTrrId;
                    const hasTransmittal = trr.transmittalCount > 0;

                    return (
                        <div
                            key={trr.id}
                            className={cn(
                                'relative group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer',
                                isActive
                                    ? 'text-[var(--color-text-primary)] border-b-[3px] border-[var(--color-accent-copper)] -mb-px'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                            )}
                            onClick={() => onSelectTrr(trr.id)}
                        >
                            <span>{label}</span>

                            {/* Indicator dot for transmittal (only when inactive) */}
                            {hasTransmittal && !isActive && (
                                <span
                                    className={cn(
                                        'absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#3fb950]'
                                    )}
                                />
                            )}

                            {/* Delete button - always visible when active, hover when inactive */}
                            {onDeleteTrr && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, trr.id)}
                                    className={cn(
                                        'ml-1 p-0.5 rounded hover:bg-[var(--color-border)] transition-all',
                                        isActive
                                            ? 'opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                            : 'opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
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
                    className="flex items-center justify-center px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                <AlertDialogContent className="card-aurora border-0 bg-[rgba(20,22,24,0.95)] backdrop-blur-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-3 text-[var(--color-text-primary)]">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primitive-aurora-magenta)]/20 to-[var(--primitive-aurora-violet)]/20 border border-[var(--primitive-aurora-magenta)]/30">
                                <AlertTriangle className="w-5 h-5 text-[var(--primitive-aurora-magenta)]" />
                            </div>
                            <span>Delete TRR {pendingLabel}?</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--color-text-muted)] pl-[52px]">
                            This will permanently delete the TRR and all its associated transmittal documents.
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
