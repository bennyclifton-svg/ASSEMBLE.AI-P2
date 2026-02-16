'use client';

import { ReactNode, useEffect } from 'react';
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

type ConfirmationVariant = 'destructive' | 'warning' | 'info';

interface AuroraConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description?: string;
    cancelLabel?: string;
    confirmLabel?: string;
    variant?: ConfirmationVariant;
    icon?: ReactNode;
}

const variantButtonClass: Record<ConfirmationVariant, string> = {
    destructive: 'bg-[var(--color-accent-coral)] text-white hover:bg-[var(--color-accent-coral)]/80',
    warning: 'bg-amber-600 text-white hover:bg-amber-600/80',
    info: 'bg-blue-600 text-white hover:bg-blue-600/80',
};

const variantDefaultLabel: Record<ConfirmationVariant, string> = {
    destructive: 'Delete',
    warning: 'Confirm',
    info: 'Confirm',
};

export function AuroraConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    cancelLabel = 'Cancel',
    confirmLabel,
    variant = 'destructive',
}: AuroraConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };

    // Handle Enter key to confirm
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, handleConfirm]);

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-xl max-w-sm p-0 gap-0">
                <AlertDialogHeader className="px-4 py-3 border-b border-[var(--color-border)]">
                    <AlertDialogTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {title}
                    </AlertDialogTitle>
                </AlertDialogHeader>
                <div className="p-4 space-y-4">
                    {description && (
                        <AlertDialogDescription className="text-sm text-[var(--color-text-primary)]">
                            {description}
                        </AlertDialogDescription>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)]">
                        This action cannot be undone.
                    </p>
                    <AlertDialogFooter className="flex justify-end gap-2 p-0">
                        <AlertDialogCancel className="px-4 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors border-0 bg-transparent hover:bg-transparent">
                            {cancelLabel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            className={`px-4 py-2 text-xs rounded border-0 transition-colors ${variantButtonClass[variant]}`}
                        >
                            {confirmLabel || variantDefaultLabel[variant]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default AuroraConfirmDialog;
