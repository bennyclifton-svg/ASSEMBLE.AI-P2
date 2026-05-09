/**
 * EvaluationPriceTabs Component
 * Tab interface for switching between evaluation price instances (01, 02, etc.) with + button to create new
 * Uses underline style matching RFT/TRR/Addendum tabs
 */

'use client';

import { useState } from 'react';
import { type EvaluationPriceInstance } from '@/lib/hooks/use-evaluation-price';
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

interface EvaluationPriceTabsProps {
    evaluationPrices: EvaluationPriceInstance[];
    activeEvaluationPriceId: string | null;
    onSelectEvaluationPrice: (id: string) => void;
    onCreateEvaluationPrice: () => void;
    onDeleteEvaluationPrice?: (id: string) => void;
    isLoading: boolean;
}

export function EvaluationPriceTabs({
    evaluationPrices,
    activeEvaluationPriceId,
    onSelectEvaluationPrice,
    onCreateEvaluationPrice,
    onDeleteEvaluationPrice,
    isLoading,
}: EvaluationPriceTabsProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPendingDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (pendingDeleteId && onDeleteEvaluationPrice) {
            onDeleteEvaluationPrice(pendingDeleteId);
        }
        setDeleteDialogOpen(false);
        setPendingDeleteId(null);
    };

    const pendingInstance = evaluationPrices.find(ep => ep.id === pendingDeleteId);
    const pendingLabel = pendingInstance
        ? String(pendingInstance.evaluationPriceNumber).padStart(2, '0')
        : '';

    return (
        <>
            <div className="procurement-instance-tabs">
                {evaluationPrices.map((evalPrice) => {
                    const label = String(evalPrice.evaluationPriceNumber).padStart(2, '0');
                    const isActive = evalPrice.id === activeEvaluationPriceId;
                    const hasData = evalPrice.rowCount > 0;

                    return (
                        <div
                            key={evalPrice.id}
                            className="procurement-instance-tab group"
                            data-state={isActive ? 'active' : 'inactive'}
                            onClick={() => onSelectEvaluationPrice(evalPrice.id)}
                        >
                            <span>{label}</span>

                            {/* Indicator dot for data (only when inactive) */}
                            {hasData && !isActive && (
                                <span
                                    className={cn(
                                        'absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--color-success)]'
                                    )}
                                />
                            )}

                            {/* Delete button - always visible when active, hover when inactive */}
                            {onDeleteEvaluationPrice && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, evalPrice.id)}
                                    className={cn(
                                        'ml-1 p-0.5 transition-all hover:bg-[var(--sw-paper)]',
                                        isActive
                                            ? 'opacity-100 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                                            : 'opacity-0 group-hover:opacity-100 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                                    )}
                                    title={`Delete Evaluation ${label}`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Create New Button - styled to match tabs */}
                <button
                    onClick={onCreateEvaluationPrice}
                    disabled={isLoading}
                    className="procurement-instance-create"
                    title="Create new evaluation"
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
                            <span>Delete Evaluation {pendingLabel}?</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="pl-[52px] text-[var(--sw-muted)]">
                            This will permanently delete this evaluation and all its associated data.
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
