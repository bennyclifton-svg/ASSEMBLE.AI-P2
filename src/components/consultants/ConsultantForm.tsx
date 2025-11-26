'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
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

interface ConsultantFormProps {
  consultant?: {
    id?: string;
    companyName: string;
    contactPerson: string;
    discipline: string;
    email: string;
    mobile: string;
    address: string;
    abn: string;
    shortlisted: boolean;
  };
  onSave: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  discipline: string;
}

export function ConsultantForm({ consultant, onSave, onDelete, discipline }: ConsultantFormProps) {
  const [formData, setFormData] = useState({
    companyName: consultant?.companyName || '',
    contactPerson: consultant?.contactPerson || '',
    email: consultant?.email || '',
    mobile: consultant?.mobile || '',
    address: consultant?.address || '',
    abn: consultant?.abn || '',
    shortlisted: consultant?.shortlisted || false,
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        discipline,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (consultant?.id && onDelete) {
      await onDelete(consultant.id);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-lg p-3 space-y-2 w-64">
        {/* Delete button at top */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Label className="text-[#cccccc] text-xs">Shortlisted</Label>
            <Switch
              checked={formData.shortlisted}
              onCheckedChange={(checked) => setFormData({ ...formData, shortlisted: checked })}
              className="scale-75"
            />
          </div>
          {consultant?.id && onDelete && (
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
              placeholder="e.g., Arup"
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
            <AlertDialogTitle className="text-[#cccccc]">Delete Consultant</AlertDialogTitle>
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
