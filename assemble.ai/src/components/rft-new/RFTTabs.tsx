/**
 * RFTTabs Component
 * Tab interface for switching between RFTs (01, 02, etc.) with + button to create new
 * Uses underline style matching Addendum tabs
 */

'use client';

import { useState } from 'react';
import { type RftNew } from '@/lib/hooks/use-rft-new';
import { Plus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';

interface RFTTabsProps {
    rfts: RftNew[];
    activeRftId: string | null;
    onSelectRft: (id: string) => void;
    onCreateRft: () => void;
    onDeleteRft?: (id: string) => void;
    isLoading: boolean;
}

export function RFTTabs({
    rfts,
    activeRftId,
    onSelectRft,
    onCreateRft,
    onDeleteRft,
    isLoading,
}: RFTTabsProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPendingDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (pendingDeleteId && onDeleteRft) {
            onDeleteRft(pendingDeleteId);
        }
        setDeleteDialogOpen(false);
        setPendingDeleteId(null);
    };

    const pendingRft = rfts.find(r => r.id === pendingDeleteId);
    const pendingLabel = pendingRft
        ? String(pendingRft.rftNumber).padStart(2, '0')
        : '';

    return (
        <>
            <div className="procurement-instance-tabs">
                {rfts.map((rft) => {
                    const label = String(rft.rftNumber).padStart(2, '0');
                    const isActive = rft.id === activeRftId;
                    const hasTransmittal = rft.transmittalCount > 0;

                    return (
                        <div
                            key={rft.id}
                            className="procurement-instance-tab group"
                            data-state={isActive ? 'active' : 'inactive'}
                            onClick={() => onSelectRft(rft.id)}
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
                            {onDeleteRft && (
                                <button
                                    onClick={(e) => handleDeleteClick(e, rft.id)}
                                    className={cn(
                                        'ml-1 p-0.5 transition-all hover:bg-[var(--sw-paper)]',
                                        isActive
                                            ? 'opacity-100 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                                            : 'opacity-0 group-hover:opacity-100 text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                                    )}
                                    title={`Delete RFT ${label}`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Create New Button - styled to match tabs */}
                <button
                    onClick={onCreateRft}
                    disabled={isLoading}
                    className="procurement-instance-create"
                    title="Create new RFT"
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
                title={`Delete RFT ${pendingLabel}?`}
                description="This will permanently delete the RFT and all its associated transmittal documents."
                variant="destructive"
            />
        </>
    );
}
