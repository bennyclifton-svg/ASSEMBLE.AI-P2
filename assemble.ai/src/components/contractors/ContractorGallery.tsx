'use client';

import { useState } from 'react';
import { useContractors } from '@/lib/hooks/use-contractors';
import { FirmCard, AddFirmButton, FirmData } from '@/components/firms';
import { useToast } from '@/lib/hooks/use-toast';

import { ProcurementCardShell, ProcurementWorkflowLayout } from '@/components/procurement';
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

interface ContractorGalleryProps {
  projectId: string;
  trade: string;
  tradeId?: string;
  scopeWorks?: string;
  scopePrice?: string;
  scopeProgram?: string;
  onUpdateScope?: (tradeId: string, field: 'scopeWorks' | 'scopePrice' | 'scopeProgram', value: string) => Promise<void>;
  selectedDocumentIds?: string[];
  onSetSelectedDocumentIds?: (ids: string[]) => void;
}

interface FirmExtractionResult {
  confidence: number;
  data: FirmData;
}

export function ContractorGallery({
  projectId,
  trade,
  tradeId,
  selectedDocumentIds = [],
  onSetSelectedDocumentIds,
}: ContractorGalleryProps) {
  const { contractors, isLoading, addContractor, updateContractor, deleteContractor, toggleShortlist, toggleAward } = useContractors(projectId, trade);
  const { toast } = useToast();

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
      if (id === 'new' && newFirm) {
        // Creating new contractor - only companyName is required
        const companyName = data.companyName || newFirm.companyName;
        if (companyName) {
          await addContractor({
            ...newFirm,
            ...data,
            companyName,
            trade,
          });
          toast({
            title: 'Success',
            description: 'Contractor added successfully',
            variant: 'success',
          });
          setNewFirm(null);
        } else {
          // Just update local state for new firm
          setNewFirm({ ...newFirm, ...data });
        }
      } else {
        // Find existing contractor to merge with partial updates
        const existingContractor = contractors.find(c => c.id === id);

        // Build form data - use nullish coalescing to preserve existing values when fields aren't provided
        const formData = {
          companyName: data.companyName ?? existingContractor?.companyName ?? '',
          contactPerson: data.contactPerson ?? existingContractor?.contactPerson ?? '',
          email: data.email ?? existingContractor?.email ?? '',
          address: data.address ?? existingContractor?.address ?? '',
          abn: data.abn ?? existingContractor?.abn ?? '',
          notes: data.notes ?? existingContractor?.notes ?? '',
          shortlisted: data.shortlisted ?? existingContractor?.shortlisted,
          awarded: data.awarded ?? existingContractor?.awarded,
          trade,
        };

        await updateContractor(id, formData);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save contractor',
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
      await deleteContractor(id);
      toast({
        title: 'Success',
        description: 'Contractor deleted successfully',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete contractor',
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
    if (!tradeId) {
      toast({
        title: 'Error',
        description: 'Trade ID is required for award toggle',
        variant: 'destructive',
      });
      return;
    }

    try {
      await toggleAward(id, awarded, tradeId);

      toast({
        title: awarded ? 'Contract Awarded' : 'Award Removed',
        description: awarded
          ? 'Award recorded. Push awarded pricing to the Cost Plan from Evaluation Price when ready.'
          : 'Award status has been removed.',
        variant: 'success',
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

  const handleFileExtraction = async (file: File): Promise<FirmExtractionResult> => {
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/contractors/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract data');
      }

      const result = await response.json();
      const { data, confidence } = result;

      return {
        confidence,
        data: {
          companyName: data.companyName || '',
          contactPerson: data.contactPerson || '',
          email: data.email || '',
          address: data.address || '',
          abn: data.abn || '',
          notes: data.notes || '',
          shortlisted: true,
          awarded: false,
          companyId: null,
          trade,
        },
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
      const { confidence, data: extractedData } = await handleFileExtraction(file);

      // Build form data from extracted data
      const formData = {
        companyName: extractedData.companyName || '',
        contactPerson: extractedData.contactPerson || '',
        email: extractedData.email || '',
        address: extractedData.address || '',
        abn: extractedData.abn || '',
        notes: extractedData.notes || '',
        trade,
      };

      if (action === 'replace') {
        if (id === 'new') {
          setNewFirm(extractedData);
        } else {
          await updateContractor(id, formData);
        }
      } else {
        // Add as new
        await addContractor(formData);
      }

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
          variant: 'success',
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
      const { confidence, data: extractedData } = await handleFileExtraction(file);
      const formData = {
        companyName: extractedData.companyName || '',
        contactPerson: extractedData.contactPerson || '',
        email: extractedData.email || '',
        address: extractedData.address || '',
        abn: extractedData.abn || '',
        notes: extractedData.notes || '',
        trade,
      };
      await addContractor(formData);

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
          variant: 'success',
        });
      }
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
          address: newFirm.address || '',
          abn: newFirm.abn || '',
          notes: newFirm.notes || '',
          trade,
        };
        await addContractor(formData);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save contractor',
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
      address: '',
      abn: '',
      notes: '',
      shortlisted: true,
      awarded: false,
      companyId: null,
      trade,
    });
  };

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--sw-muted)]">Loading contractors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ProcurementCardShell
        meta={`${contractors.length + (newFirm ? 1 : 0)} tenderers`}
        variant="strip"
      >
        <div className="relative">
        {/* Extraction Progress Overlay */}
        {isExtracting && (
          <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
            <div className="bg-white border border-[var(--sw-rule)] p-6 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-green)]"></div>
              <p className="text-[var(--sw-ink)] font-semibold">Extracting contractor data...</p>
              <p className="text-xs text-[var(--sw-muted)]">This may take a few moments</p>
            </div>
          </div>
        )}

        <div className="flex overflow-x-auto py-0.5 items-stretch gap-2 firms-scrollbar" style={{ scrollbarWidth: 'thin' }}>
          {/* Existing contractors */}
          {contractors.map((contractor) => (
            <FirmCard
              key={contractor.id}
              type="contractor"
              firm={{
                id: contractor.id,
                companyName: contractor.companyName,
                contactPerson: contractor.contactPerson,
                email: contractor.email,
                address: contractor.address,
                abn: contractor.abn,
                notes: contractor.notes,
                shortlisted: contractor.shortlisted,
                awarded: contractor.awarded,
                companyId: contractor.companyId,
                trade: contractor.trade,
              }}
              category={trade}
              onSave={(data) => handleSave(contractor.id, data)}
              onDelete={() => openDeleteDialog(contractor.id, contractor.companyName)}
              onShortlistToggle={(shortlisted) => handleShortlistToggle(contractor.id, shortlisted)}
              onAwardToggle={(awarded) => handleAwardToggle(contractor.id, awarded)}
              onFileDrop={(file, action) => handleFileDrop(contractor.id, file, action)}
            />
          ))}

          {/* New firm (if adding) */}
          {newFirm && (
            <FirmCard
              key="new"
              type="contractor"
              firm={newFirm}
              category={trade}
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
      </ProcurementCardShell>

      {tradeId && (
        <ProcurementWorkflowLayout
          projectId={projectId}
          stakeholderId={tradeId}
          stakeholderName={trade}
          contextType="trade"
          selectedDocumentIds={selectedDocumentIds}
          onSetSelectedDocumentIds={onSetSelectedDocumentIds}
        />
      )}


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="rounded-none bg-white border-[var(--sw-rule)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--sw-ink)]">Delete Contractor</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--sw-muted)]">
              Are you sure you want to delete {deleteDialog.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none bg-transparent text-[var(--sw-ink)] border-[var(--sw-rule)] hover:bg-[var(--sw-paper)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteDialog.id)}
              className="rounded-none bg-[var(--sw-rose)] hover:bg-[var(--sw-rose-dk)] text-[var(--sw-ink)] hover:text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
