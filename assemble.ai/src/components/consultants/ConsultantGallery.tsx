'use client';

import { useState } from 'react';
import { useConsultants } from '@/lib/hooks/use-consultants';
import { FirmCard, AddFirmButton, FirmData } from '@/components/firms';
import { FeeStructureSection } from './FeeStructureSection';
import { useToast } from '@/lib/hooks/use-toast';
import { RFTSection } from '@/components/reports/rft';
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

interface ConsultantGalleryProps {
  projectId: string;
  discipline: string;
  disciplineId?: string;
  briefServices?: string;
  briefFee?: string;
  briefProgram?: string;
  onUpdateBrief?: (disciplineId: string, field: 'briefServices' | 'briefFee' | 'briefProgram', value: string) => Promise<void>;
  selectedDocumentIds?: string[];
  onSetSelectedDocumentIds?: (ids: string[]) => void;
}

export function ConsultantGallery({
  projectId,
  discipline,
  disciplineId,
  briefServices = '',
  briefFee = '',
  briefProgram = '',
  onUpdateBrief,
  selectedDocumentIds = [],
  onSetSelectedDocumentIds,
}: ConsultantGalleryProps) {
  const { consultants, isLoading, addConsultant, updateConsultant, deleteConsultant, toggleShortlist, toggleAward } = useConsultants(projectId, discipline);
  const { toast } = useToast();

  // Accordion state - only one card expanded at a time
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // New firm state - for creating a new firm
  const [newFirm, setNewFirm] = useState<FirmData | null>(null);

  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });

  const handleToggleExpand = (id: string) => {
    setExpandedCardId(prev => prev === id ? null : id);
  };

  const handleSave = async (id: string, data: Partial<FirmData>) => {
    try {
      // Find existing consultant to merge with partial updates
      const existingConsultant = consultants.find(c => c.id === id);

      // Build form data with only the fields ConsultantFormData expects
      // Use nullish coalescing to preserve existing values when fields aren't provided
      const formData = {
        companyName: data.companyName ?? existingConsultant?.companyName ?? '',
        contactPerson: data.contactPerson ?? existingConsultant?.contactPerson ?? '',
        email: data.email ?? existingConsultant?.email ?? '',
        mobile: data.mobile ?? existingConsultant?.mobile ?? '',
        address: data.address ?? existingConsultant?.address ?? '',
        abn: data.abn ?? existingConsultant?.abn ?? '',
        notes: data.notes ?? existingConsultant?.notes ?? '',
        shortlisted: data.shortlisted ?? existingConsultant?.shortlisted,
        awarded: data.awarded ?? existingConsultant?.awarded,
        discipline,
      };

      if (id === 'new' && newFirm) {
        // Creating new consultant
        const mergedData = {
          ...formData,
          companyName: data.companyName || newFirm.companyName || '',
          email: data.email || newFirm.email || '',
        };

        if (mergedData.companyName && mergedData.email) {
          const newConsultant = await addConsultant(mergedData);
          toast({
            title: 'Success',
            description: 'Consultant added successfully',
          });
          setNewFirm(null);
          setExpandedCardId(newConsultant.id);
        } else {
          // Just update local state for new firm
          setNewFirm({ ...newFirm, ...data });
        }
      } else {
        // Updating existing consultant
        await updateConsultant(id, formData);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save consultant',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (id === 'new') {
      setNewFirm(null);
      setExpandedCardId(null);
      return;
    }

    try {
      await deleteConsultant(id);
      toast({
        title: 'Success',
        description: 'Consultant deleted successfully',
      });
      if (expandedCardId === id) {
        setExpandedCardId(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete consultant',
        variant: 'destructive',
      });
    }
    setDeleteDialog({ open: false, id: '', name: '' });
  };

  const handleShortlistToggle = async (id: string, shortlisted: boolean) => {
    if (id === 'new' && newFirm) {
      setNewFirm({ ...newFirm, shortlisted });
      return;
    }

    try {
      await toggleShortlist(id, shortlisted);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update shortlist',
        variant: 'destructive',
      });
    }
  };

  const handleAwardToggle = async (id: string, awarded: boolean) => {
    try {
      await toggleAward(id, awarded);
      toast({
        title: awarded ? 'Contract Awarded' : 'Award Removed',
        description: awarded
          ? 'Company has been added to the master list and is now available in Cost Planning.'
          : 'Award status has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update award status',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleFileExtraction = async (file: File): Promise<FirmData> => {
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/consultants/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract data');
      }

      const result = await response.json();
      const { data, confidence } = result;

      if (confidence < 70) {
        toast({
          title: 'Low Confidence',
          description: `Extraction confidence is ${confidence}%. Please review the data carefully.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: `Data extracted with ${confidence}% confidence`,
        });
      }

      return {
        companyName: data.companyName || '',
        contactPerson: data.contactPerson || '',
        email: data.email || '',
        mobile: data.mobile || '',
        address: data.address || '',
        abn: data.abn || '',
        notes: data.notes || '',
        shortlisted: false,
        awarded: false,
        companyId: null,
        discipline,
      };
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to extract data',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileDrop = async (id: string, file: File, action: 'replace' | 'add') => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF, image (JPG/PNG), or text file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const extractedData = await handleFileExtraction(file);

      // Build form data from extracted data
      const formData = {
        companyName: extractedData.companyName || '',
        contactPerson: extractedData.contactPerson || '',
        email: extractedData.email || '',
        mobile: extractedData.mobile || '',
        address: extractedData.address || '',
        abn: extractedData.abn || '',
        notes: extractedData.notes || '',
        discipline,
      };

      if (action === 'replace') {
        if (id === 'new') {
          setNewFirm(extractedData);
        } else {
          await updateConsultant(id, formData);
        }
      } else {
        // Add as new
        const newConsultant = await addConsultant(formData);
        toast({
          title: 'Success',
          description: 'New consultant added from extracted data',
        });
        setExpandedCardId(newConsultant.id);
      }
    } catch {
      // Error already handled in handleFileExtraction
    }
  };

  const handleAddNewFileDrop = async (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF, image (JPG/PNG), or text file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const extractedData = await handleFileExtraction(file);
      const formData = {
        companyName: extractedData.companyName || '',
        contactPerson: extractedData.contactPerson || '',
        email: extractedData.email || '',
        mobile: extractedData.mobile || '',
        address: extractedData.address || '',
        abn: extractedData.abn || '',
        notes: extractedData.notes || '',
        discipline,
      };
      const newConsultant = await addConsultant(formData);
      toast({
        title: 'Success',
        description: 'New consultant added from extracted data',
      });
      setExpandedCardId(newConsultant.id);
    } catch {
      // Error already handled
    }
  };

  const handleAddNew = async () => {
    // If there's an existing newFirm with a company name, save it first
    if (newFirm && newFirm.companyName && newFirm.companyName.trim()) {
      try {
        const formData = {
          companyName: newFirm.companyName,
          contactPerson: newFirm.contactPerson || '',
          email: newFirm.email || '',
          mobile: newFirm.mobile || '',
          address: newFirm.address || '',
          abn: newFirm.abn || '',
          notes: newFirm.notes || '',
          discipline,
        };
        await addConsultant(formData);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save consultant',
          variant: 'destructive',
        });
        return; // Don't create new if save failed
      }
    }

    // Create a new empty firm (collapsed by default)
    setNewFirm({
      companyName: '',
      contactPerson: '',
      email: '',
      mobile: '',
      address: '',
      abn: '',
      notes: '',
      shortlisted: false,
      awarded: false,
      companyId: null,
      discipline,
    });
    // Collapse any expanded card
    setExpandedCardId(null);
  };

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[#858585]">Loading consultants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Firms Section */}
      <div>
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Firms</h3>
        <div className="relative">
          {/* Extraction Progress Overlay */}
          {isExtracting && (
            <div className="absolute inset-0 z-50 bg-[#1e1e1e]/80 rounded-lg flex items-center justify-center">
              <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-lg p-6 flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0e639c]"></div>
                <p className="text-[#cccccc] font-semibold">Extracting consultant data...</p>
                <p className="text-xs text-[#858585]">This may take a few moments</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 overflow-x-auto pt-3 pb-4 items-start" style={{ scrollbarWidth: 'thin' }}>
            {/* Existing consultants */}
            {consultants.map((consultant) => (
              <FirmCard
                key={consultant.id}
                type="consultant"
                firm={{
                  id: consultant.id,
                  companyName: consultant.companyName,
                  contactPerson: consultant.contactPerson,
                  email: consultant.email,
                  mobile: consultant.mobile,
                  address: consultant.address,
                  abn: consultant.abn,
                  notes: consultant.notes,
                  shortlisted: consultant.shortlisted,
                  awarded: consultant.awarded,
                  companyId: consultant.companyId,
                  discipline: consultant.discipline,
                }}
                category={discipline}
                isExpanded={expandedCardId === consultant.id}
                onToggleExpand={() => handleToggleExpand(consultant.id)}
                onSave={(data) => handleSave(consultant.id, data)}
                onDelete={() => openDeleteDialog(consultant.id, consultant.companyName)}
                onShortlistToggle={(shortlisted) => handleShortlistToggle(consultant.id, shortlisted)}
                onAwardToggle={(awarded) => handleAwardToggle(consultant.id, awarded)}
                onFileDrop={(file, action) => handleFileDrop(consultant.id, file, action)}
              />
            ))}

            {/* New firm (if adding) */}
            {newFirm && (
              <FirmCard
                key="new"
                type="consultant"
                firm={newFirm}
                category={discipline}
                isExpanded={expandedCardId === 'new'}
                onToggleExpand={() => handleToggleExpand('new')}
                onSave={(data) => handleSave('new', data)}
                onDelete={() => handleDelete('new')}
                onShortlistToggle={(shortlisted) => handleShortlistToggle('new', shortlisted)}
                onAwardToggle={() => Promise.resolve()}
                onFileDrop={(file, action) => handleFileDrop('new', file, action)}
              />
            )}

            {/* Add button - always visible */}
            <AddFirmButton
              onAdd={handleAddNew}
              onFileDrop={handleAddNewFileDrop}
            />
          </div>
        </div>
      </div>

      {/* RFT Section - contains Brief, TOC, and RFT tabs */}
      {disciplineId && onUpdateBrief && (
        <RFTSection
          projectId={projectId}
          disciplineId={disciplineId}
          name={discipline}
          contextType="discipline"
          briefData={{
            services: briefServices,
            fee: briefFee,
            program: briefProgram,
          }}
          onBriefChange={async (field, value) => {
            const fieldMap = {
              services: 'briefServices',
              fee: 'briefFee',
              program: 'briefProgram',
            } as const;
            await onUpdateBrief(disciplineId, fieldMap[field], value);
          }}
          selectedDocumentIds={selectedDocumentIds}
          onSetSelectedDocumentIds={onSetSelectedDocumentIds}
        />
      )}

      {/* Fee Structure Section */}
      {disciplineId && (
        <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
          <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Fee Structure</h3>
          <FeeStructureSection
            disciplineId={disciplineId}
            disciplineName={discipline}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-[#1e1e1e] border-[#3e3e42]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cccccc]">Delete Consultant</AlertDialogTitle>
            <AlertDialogDescription className="text-[#858585]">
              Are you sure you want to delete {deleteDialog.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#3e3e42] text-[#cccccc] border-[#3e3e42] hover:bg-[#505050]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteDialog.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
