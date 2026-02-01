'use client';

import { useState } from 'react';
import { useConsultants } from '@/lib/hooks/use-consultants';
import { FirmCard, AddFirmButton, FirmData } from '@/components/firms';
import { useToast } from '@/lib/hooks/use-toast';

import { RFTNewSection } from '@/components/rft-new';
import { AddendumSection } from '@/components/addendum';
import { EvaluationSection } from '@/components/evaluation';
import { TRRSection } from '@/components/trr';
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

  // Global firms expansion state - all firms expand/collapse together
  const [isFirmsExpanded, setIsFirmsExpanded] = useState<boolean>(false);

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

        if (mergedData.companyName) {
          const newConsultant = await addConsultant(mergedData);
          toast({
            title: 'Success',
            description: 'Consultant added successfully',
          });
          setNewFirm(null);
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
      return;
    }

    try {
      await deleteConsultant(id);
      toast({
        title: 'Success',
        description: 'Consultant deleted successfully',
      });
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
        await addConsultant(formData);
        toast({
          title: 'Success',
          description: 'New consultant added from extracted data',
        });
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
      await addConsultant(formData);
      toast({
        title: 'Success',
        description: 'New consultant added from extracted data',
      });
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
  };

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--color-text-muted)]">Loading consultants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Firms Section - Unified Panel */}
      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
        {/* Header with master toggle */}
        <button
          onClick={() => setIsFirmsExpanded(prev => !prev)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform ${isFirmsExpanded ? 'rotate-90' : ''}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <polygon points="2,0 12,6 2,12" />
          </svg>
          <span className="text-lg font-semibold text-[var(--color-text-primary)]">Firms</span>
          <span className="text-sm text-[var(--color-text-muted)]">
            ({consultants.length + (newFirm ? 1 : 0)})
          </span>
        </button>

        {/* Content */}
        <div className="relative bg-[var(--color-bg-primary)]">
          {/* Extraction Progress Overlay */}
          {isExtracting && (
            <div className="absolute inset-0 z-50 bg-[var(--color-bg-primary)]/80 flex items-center justify-center">
              <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-6 flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-green)]"></div>
                <p className="text-[var(--color-text-primary)] font-semibold">Extracting consultant data...</p>
                <p className="text-xs text-[var(--color-text-muted)]">This may take a few moments</p>
              </div>
            </div>
          )}

          <div className="flex overflow-x-auto py-3 px-1 items-stretch" style={{ scrollbarWidth: 'thin' }}>
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
                isExpanded={isFirmsExpanded}
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
                isExpanded={isFirmsExpanded}
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
              isExpanded={isFirmsExpanded}
            />
          </div>
        </div>
      </div>



      {/* RFT NEW Section - comprehensive RFT documents per discipline */}
      {disciplineId && (
        <RFTNewSection
          projectId={projectId}
          stakeholderId={disciplineId}
          stakeholderName={discipline}
          selectedDocumentIds={selectedDocumentIds}
          onLoadTransmittal={onSetSelectedDocumentIds}
          onSaveTransmittal={() => selectedDocumentIds}
        />
      )}

      {/* Addendum Section - independent transmittals per addendum */}
      {disciplineId && (
        <AddendumSection
          projectId={projectId}
          stakeholderId={disciplineId}
          stakeholderName={discipline}
          selectedDocumentIds={selectedDocumentIds}
          onLoadTransmittal={onSetSelectedDocumentIds}
          onSaveTransmittal={() => selectedDocumentIds}
        />
      )}

      {/* Evaluation Section - tender price/non-price evaluation */}
      {disciplineId && (
        <EvaluationSection
          projectId={projectId}
          stakeholderId={disciplineId}
          stakeholderName={discipline}
        />
      )}

      {/* TRR Section - Tender Recommendation Report */}
      {disciplineId && (
        <TRRSection
          projectId={projectId}
          stakeholderId={disciplineId}
          stakeholderName={discipline}
          contextType="discipline"
          selectedDocumentIds={selectedDocumentIds}
          onLoadTransmittal={onSetSelectedDocumentIds}
          onSaveTransmittal={() => selectedDocumentIds}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-[var(--color-bg-primary)] border-[var(--color-border)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--color-text-primary)]">Delete Consultant</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--color-text-muted)]">
              Are you sure you want to delete {deleteDialog.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[var(--color-border)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteDialog.id)}
              className="bg-[var(--color-accent-coral)] hover:bg-[var(--primitive-coral-dark)] text-white transition-colors"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
