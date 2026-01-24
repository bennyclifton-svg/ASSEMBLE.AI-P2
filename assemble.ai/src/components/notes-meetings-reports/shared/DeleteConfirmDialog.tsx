/**
 * Delete Confirm Dialog Component
 * Feature 021 - Notes, Meetings & Reports - Phase 9
 *
 * Confirmation dialog for delete actions.
 */

'use client';

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

interface DeleteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    itemName?: string;
    itemType?: 'note' | 'meeting' | 'report';
}

export function DeleteConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    itemName,
    itemType = 'note',
}: DeleteConfirmDialogProps) {
    const defaultTitle = `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`;
    const defaultDescription = itemName
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : `Are you sure you want to delete this ${itemType}? This action cannot be undone.`;

    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-[var(--color-bg-primary)] border-[var(--color-border)]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-[var(--color-text-primary)]">
                        {title || defaultTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[var(--color-text-muted)]">
                        {description || defaultDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default DeleteConfirmDialog;
