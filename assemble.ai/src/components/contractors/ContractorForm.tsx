'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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

interface ContractorFormProps {
  contractor?: {
    id?: string;
    companyName: string;
    contactPerson: string;
    trade: string;
    email: string;
    mobile: string;
    address: string;
    abn: string;
    notes: string;
    shortlisted: boolean;
    awarded: boolean;
    companyId: string | null;
  };
  onSave: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onAwardChange?: (awarded: boolean) => Promise<void>;
  trade: string;
}

export function ContractorForm({ contractor, onSave, onDelete, onAwardChange, trade }: ContractorFormProps) {
  const [formData, setFormData] = useState({
    companyName: contractor?.companyName || '',
    contactPerson: contractor?.contactPerson || '',
    email: contractor?.email || '',
    mobile: contractor?.mobile || '',
    address: contractor?.address || '',
    abn: contractor?.abn || '',
    notes: contractor?.notes || '',
    shortlisted: contractor?.shortlisted || false,
    awarded: contractor?.awarded || false,
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);

  // Debounced autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only autosave if required fields are filled
      if (formData.companyName && formData.email) {
        handleSave();
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [formData]);

  const handleSave = async () => {
    if (!formData.companyName || !formData.email) return;

    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        trade,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (contractor?.id && onDelete) {
      await onDelete(contractor.id);
      setShowDeleteDialog(false);
    }
  };

  const handleAwardToggle = async (checked: boolean) => {
    // If no callback (new unsaved contractor), just update local state
    if (!onAwardChange) {
      setFormData({ ...formData, awarded: checked });
      return;
    }

    setIsAwarding(true);
    try {
      await onAwardChange(checked);
      setFormData({ ...formData, awarded: checked });
    } catch (error) {
      console.error('Failed to update award status:', error);
      // Revert on error - state stays as is
    } finally {
      setIsAwarding(false);
    }
  };

  return (
    <>
      <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-lg p-3 space-y-2 w-64 relative">
        {/* Awarded badge */}
        {formData.awarded && (
          <div className="absolute -top-2 -right-2 bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            Awarded
          </div>
        )}

        {/* Delete button and toggles at top */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Label className="text-[#cccccc] text-xs">Shortlisted</Label>
              <Switch
                checked={formData.shortlisted}
                onCheckedChange={(checked) => setFormData({ ...formData, shortlisted: checked })}
                className="scale-75"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[#cccccc] text-xs">Award</Label>
              <Switch
                checked={formData.awarded}
                onCheckedChange={handleAwardToggle}
                disabled={!contractor?.id || isAwarding}
                className="scale-75"
              />
            </div>
          </div>
          {contractor?.id && onDelete && (
            <Button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-[#858585] hover:text-red-400 hover:bg-[#3e3e42]"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <Label htmlFor="companyName" className="text-[#cccccc] text-xs">
              Company Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
              className="bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] h-7 text-xs"
              placeholder="e.g., ABC Contractors"
            />
          </div>

          <div>
            <Label htmlFor="contactPerson" className="text-[#cccccc] text-xs">
              Contact Person
            </Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className="bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] h-7 text-xs"
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-[#cccccc] text-xs">
              Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] h-7 text-xs"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <Label htmlFor="mobile" className="text-[#cccccc] text-xs">
              Mobile
            </Label>
            <Input
              id="mobile"
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] h-7 text-xs"
              placeholder="0412 345 678"
            />
          </div>

          <div>
            <Label htmlFor="address" className="text-[#cccccc] text-xs">
              Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] h-7 text-xs"
              placeholder="123 Main St, Sydney NSW 2000"
            />
          </div>

          <div>
            <Label htmlFor="abn" className="text-[#cccccc] text-xs">
              ABN
            </Label>
            <Input
              id="abn"
              value={formData.abn}
              onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
              className="bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] h-7 text-xs"
              placeholder="12 345 678 901"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-[#cccccc] text-xs">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] text-xs min-h-[60px]"
              placeholder="Additional notes..."
              rows={4}
            />
          </div>
        </div>

        {isSaving && (
          <div className="text-xs text-[#858585] text-center py-1">
            Saving...
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1e1e1e] border-[#3e3e42]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cccccc]">Delete Contractor</AlertDialogTitle>
            <AlertDialogDescription className="text-[#858585]">
              Are you sure you want to delete {formData.companyName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#3e3e42] text-[#cccccc] border-[#3e3e42] hover:bg-[#505050]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
