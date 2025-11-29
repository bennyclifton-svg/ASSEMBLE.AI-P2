'use client';

import { useState } from 'react';
import { Contractor } from '@/lib/hooks/use-contractors';
import { ContractorForm } from './ContractorForm';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Mail, Phone, MapPin, Building2 } from 'lucide-react';
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

interface ContractorFirmCardProps {
  contractor: Contractor;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleShortlist: (id: string, shortlisted: boolean) => Promise<void>;
}

export function ContractorFirmCard({
  contractor,
  onUpdate,
  onDelete,
  onToggleShortlist,
}: ContractorFirmCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleUpdate = async (data: any) => {
    await onUpdate(contractor.id, data);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await onDelete(contractor.id);
    setShowDeleteDialog(false);
  };

  if (isEditing) {
    return (
      <div className="flex-shrink-0 w-80">
        <div className="bg-[#1e1e1e] border-2 border-[#0e639c] rounded-lg p-4">
          <ContractorForm
            initialData={{
              companyName: contractor.companyName,
              contactPerson: contractor.contactPerson || '',
              trade: contractor.trade,
              email: contractor.email,
              phone: contractor.phone || '',
              address: contractor.address || '',
              abn: contractor.abn || '',
              notes: contractor.notes || '',
              shortlisted: contractor.shortlisted,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            trade={contractor.trade}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-shrink-0 w-80">
        <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-lg p-4 hover:border-[#0e639c] transition-colors h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="text-base font-semibold text-[#cccccc] truncate">
                {contractor.companyName}
              </h4>
              {contractor.contactPerson && (
                <p className="text-sm text-[#858585] truncate">{contractor.contactPerson}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-7 w-7 text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d30]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="h-7 w-7 text-[#858585] hover:text-red-400 hover:bg-[#2d2d30]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 mb-4 flex-1">
            <div className="flex items-start gap-2 text-sm">
              <Mail className="h-4 w-4 text-[#858585] mt-0.5 flex-shrink-0" />
              <a
                href={`mailto:${contractor.email}`}
                className="text-[#4fc1ff] hover:underline truncate"
              >
                {contractor.email}
              </a>
            </div>

            {contractor.phone && (
              <div className="flex items-start gap-2 text-sm">
                <Phone className="h-4 w-4 text-[#858585] mt-0.5 flex-shrink-0" />
                <span className="text-[#cccccc] truncate">{contractor.phone}</span>
              </div>
            )}

            {contractor.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-[#858585] mt-0.5 flex-shrink-0" />
                <span className="text-[#858585] text-xs line-clamp-2">{contractor.address}</span>
              </div>
            )}

            {contractor.abn && (
              <div className="flex items-start gap-2 text-sm">
                <Building2 className="h-4 w-4 text-[#858585] mt-0.5 flex-shrink-0" />
                <span className="text-[#858585] text-xs">ABN: {contractor.abn}</span>
              </div>
            )}

            {contractor.notes && (
              <div className="mt-3 pt-3 border-t border-[#3e3e42]">
                <p className="text-xs text-[#858585] line-clamp-3">{contractor.notes}</p>
              </div>
            )}
          </div>

          {/* Shortlist Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-[#3e3e42]">
            <span className="text-sm text-[#858585]">Shortlisted</span>
            <Switch
              checked={contractor.shortlisted}
              onCheckedChange={(checked) => onToggleShortlist(contractor.id, checked)}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#252526] border-[#3e3e42]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cccccc]">Delete Contractor</AlertDialogTitle>
            <AlertDialogDescription className="text-[#858585]">
              Are you sure you want to delete {contractor.companyName}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#3e3e42] text-[#cccccc] border-[#3e3e42] hover:bg-[#505050]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
