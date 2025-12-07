'use client';

import { useState } from 'react';
import { Consultant } from '@/lib/hooks/use-consultants';
import { ConsultantForm } from './ConsultantForm';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Mail, Phone, MapPin, Building2, UploadCloud } from 'lucide-react';
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

interface ConsultantFirmCardProps {
  consultant: Consultant;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleShortlist: (id: string, shortlisted: boolean) => Promise<void>;
}

export function ConsultantFirmCard({
  consultant,
  onUpdate,
  onDelete,
  onToggleShortlist,
}: ConsultantFirmCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleUpdate = async (data: any) => {
    await onUpdate(consultant.id, data);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await onDelete(consultant.id);
    setShowDeleteDialog(false);
  };

  if (isEditing) {
    return (
      <div className="flex-shrink-0 w-80">
        <div className="bg-[#1e1e1e] border-2 border-[#0e639c] rounded-lg p-4">
          <ConsultantForm
            initialData={{
              companyName: consultant.companyName,
              contactPerson: consultant.contactPerson || '',
              discipline: consultant.discipline,
              email: consultant.email,
              phone: consultant.phone || '',
              mobile: consultant.mobile || '',
              address: consultant.address || '',
              abn: consultant.abn || '',
              notes: consultant.notes || '',
              shortlisted: consultant.shortlisted,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            discipline={consultant.discipline}
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
                {consultant.companyName}
              </h4>
              {consultant.contactPerson && (
                <p className="text-sm text-[#858585] truncate">{consultant.contactPerson}</p>
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
              <UploadCloud className="h-3.5 w-3.5 text-[#858585]" />
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
                href={`mailto:${consultant.email}`}
                className="text-[#4fc1ff] hover:underline truncate"
              >
                {consultant.email}
              </a>
            </div>

            {consultant.phone && (
              <div className="flex items-start gap-2 text-sm">
                <Phone className="h-4 w-4 text-[#858585] mt-0.5 flex-shrink-0" />
                <span className="text-[#cccccc] truncate">{consultant.phone}</span>
              </div>
            )}

            {consultant.mobile && (
              <div className="flex items-start gap-2 text-sm">
                <Phone className="h-4 w-4 text-[#858585] mt-0.5 flex-shrink-0" />
                <span className="text-[#cccccc] truncate">{consultant.mobile}</span>
              </div>
            )}

            {consultant.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-[#858585] mt-0.5 flex-shrink-0" />
                <span className="text-[#858585] text-xs line-clamp-2">{consultant.address}</span>
              </div>
            )}

            {consultant.abn && (
              <div className="flex items-start gap-2 text-sm">
                <Building2 className="h-4 w-4 text-[#858585] mt-0.5 flex-shrink-0" />
                <span className="text-[#858585] text-xs">ABN: {consultant.abn}</span>
              </div>
            )}

            {consultant.notes && (
              <div className="mt-3 pt-3 border-t border-[#3e3e42]">
                <p className="text-xs text-[#858585] line-clamp-3">{consultant.notes}</p>
              </div>
            )}
          </div>

          {/* Shortlist Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-[#3e3e42]">
            <span className="text-sm text-[#858585]">Shortlisted</span>
            <Switch
              checked={consultant.shortlisted}
              onCheckedChange={(checked) => onToggleShortlist(consultant.id, checked)}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#252526] border-[#3e3e42]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cccccc]">Delete Consultant</AlertDialogTitle>
            <AlertDialogDescription className="text-[#858585]">
              Are you sure you want to delete {consultant.companyName}? This action cannot be
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
