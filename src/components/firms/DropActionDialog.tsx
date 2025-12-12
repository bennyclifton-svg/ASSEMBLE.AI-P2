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
      <AlertDialogContent className="bg-[#1e1e1e] border-[#3e3e42]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#cccccc]">Extract Firm Data</AlertDialogTitle>
          <AlertDialogDescription className="text-[#858585]">
            Extract data from <span className="text-[#cccccc] font-medium">{fileName}</span>?
            <br />
            <br />
            Choose how to handle the extracted data:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="bg-[#3e3e42] text-[#cccccc] border-[#3e3e42] hover:bg-[#505050]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onAddNew}
            className="bg-[#0e639c] hover:bg-[#1177bb] text-white"
          >
            Add as New Firm
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onReplace}
            className="bg-[#3e3e42] hover:bg-[#505050] text-[#cccccc]"
          >
            Replace This Firm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
