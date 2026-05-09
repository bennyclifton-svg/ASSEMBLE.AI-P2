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
import { DropActionDialogProps } from './types';

export function DropActionDialog({
  open,
  onOpenChange,
  onReplace,
  onAddNew,
  fileName,
}: DropActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-none bg-white border-[var(--sw-rule)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--sw-ink)]">Extract Firm Data</AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--sw-muted)]">
            Extract data from <span className="text-[var(--sw-ink)] font-medium">{fileName}</span>?
            <br />
            <br />
            Choose how to handle the extracted data:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="rounded-none bg-transparent text-[var(--sw-ink)] border-[var(--sw-rule)] hover:bg-[var(--sw-paper)]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onAddNew}
            className="rounded-none bg-[var(--sw-rose)] hover:bg-[var(--sw-rose-dk)] text-[var(--sw-ink)] hover:text-white"
          >
            Add as New Firm
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onReplace}
            className="rounded-none bg-transparent hover:bg-[var(--sw-paper)] text-[var(--sw-ink)] border border-[var(--sw-rule)]"
          >
            Replace This Firm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
