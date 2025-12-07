'use client';

import { useState, useEffect } from 'react';
import { useContractors } from '@/lib/hooks/use-contractors';
import { ContractorForm } from './ContractorForm';
import { PriceStructureSection } from './PriceStructureSection';
import { useToast } from '@/lib/hooks/use-toast';
import { Upload } from 'lucide-react';
import { InlineEditField } from '@/components/dashboard/planning/InlineEditField';
import { ReportsSection } from '@/components/reports/ReportsSection';
import { GenerationMode } from '@/components/documents/DisciplineRepoTiles';

interface ContractorGalleryProps {
  projectId: string;
  trade: string;
  tradeId?: string;
  scopeWorks?: string;
  scopePrice?: string;
  scopeProgram?: string;
  onUpdateScope?: (tradeId: string, field: 'scopeWorks' | 'scopePrice' | 'scopeProgram', value: string) => Promise<void>;
  generationMode?: GenerationMode;
}

export function ContractorGallery({
  projectId,
  trade,
  tradeId,
  scopeWorks = '',
  scopePrice = '',
  scopeProgram = '',
  onUpdateScope,
  generationMode = 'ai_assisted'
}: ContractorGalleryProps) {
  const { contractors, isLoading, addContractor, updateContractor, deleteContractor, toggleAward } = useContractors(projectId, trade);
  const { toast } = useToast();
  const [cards, setCards] = useState<Array<{ id: string; contractor?: any }>>([]);
  const [draggingOverCardId, setDraggingOverCardId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Initialize with 3 empty cards or existing contractors
  useEffect(() => {
    const existingCards = contractors.map(c => ({ id: c.id, contractor: c }));
    const emptyCardsNeeded = Math.max(0, 3 - existingCards.length);
    const emptyCards = Array.from({ length: emptyCardsNeeded }, (_, i) => ({
      id: `empty-${i}`,
      contractor: undefined
    }));

    setCards([...existingCards, ...emptyCards]);
  }, [contractors]);

  const handleSave = async (cardId: string, data: any) => {
    try {
      const card = cards.find(c => c.id === cardId);

      if (card?.contractor?.id) {
        // Update existing contractor
        await updateContractor(card.contractor.id, { ...data, trade });
        toast({
          title: 'Success',
          description: 'Contractor updated successfully',
        });
      } else {
        // Create new contractor
        const newContractor = await addContractor({ ...data, trade });
        toast({
          title: 'Success',
          description: 'Contractor added successfully',
        });

        // Replace empty card with new contractor and add a new empty card
        setCards(prev => {
          const newCards = prev.map(c =>
            c.id === cardId ? { id: newContractor.id, contractor: newContractor } : c
          );
          // Add a new empty card at the end
          newCards.push({ id: `empty-${Date.now()}`, contractor: undefined });
          return newCards;
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save contractor',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContractor(id);
      toast({
        title: 'Success',
        description: 'Contractor deleted successfully',
      });

      // Remove the deleted card
      setCards(prev => {
        const filtered = prev.filter(c => c.contractor?.id !== id);
        // Ensure at least 3 cards
        const emptyCardsNeeded = Math.max(0, 3 - filtered.length);
        const emptyCards = Array.from({ length: emptyCardsNeeded }, (_, i) => ({
          id: `empty-${Date.now()}-${i}`,
          contractor: undefined
        }));
        return [...filtered, ...emptyCards];
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete contractor',
        variant: 'destructive',
      });
    }
  };

  const handleAwardChange = async (id: string, awarded: boolean) => {
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
      throw error; // Re-throw to revert UI
    }
  };

  const handleFileExtraction = async (file: File) => {
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

      // Add trade to extracted data
      data.trade = trade;
      setExtractedData({ ...data, confidence });

      // Find first empty card and pre-fill it
      const firstEmptyCardId = cards.find(c => !c.contractor)?.id;
      if (firstEmptyCardId) {
        // Trigger save on first empty card with extracted data
        await handleSave(firstEmptyCardId, data);
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
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to extract data',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
      setExtractedData(null);
    }
  };

  const handleDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOverCardId(cardId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if leaving the card entirely (not entering a child element)
    const relatedTarget = e.relatedTarget as Element | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDraggingOverCardId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOverCardId(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain'];

    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF, image (JPG/PNG), or text file',
        variant: 'destructive',
      });
      return;
    }

    await handleFileExtraction(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[#858585]">Loading contractors...</p>
      </div>
    );
  }

  // Handle Scope field updates
  const handleScopeUpdate = async (field: 'scopeWorks' | 'scopePrice' | 'scopeProgram', value: string) => {
    if (tradeId && onUpdateScope) {
      await onUpdateScope(tradeId, field, value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reports Section - Moved up for visibility */}
      {tradeId && (
        <ReportsSection
          projectId={projectId}
          tradeId={tradeId}
          tradeName={trade}
          generationMode={generationMode}
        />
      )}

      {/* Scope Section */}
      {tradeId && onUpdateScope && (
        <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
          <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Scope</h3>
          <div className="space-y-4">
            <InlineEditField
              label="Works"
              value={scopeWorks}
              onSave={(value) => handleScopeUpdate('scopeWorks', value)}
              placeholder="Describe the scope of works..."
              multiline
              rows={6}
            />
            <InlineEditField
              label="Price"
              value={scopePrice}
              onSave={(value) => handleScopeUpdate('scopePrice', value)}
              placeholder="Enter price range and budget..."
              multiline
              rows={6}
            />
            <InlineEditField
              label="Program"
              value={scopeProgram}
              onSave={(value) => handleScopeUpdate('scopeProgram', value)}
              placeholder="Enter program and timeline requirements..."
              multiline
              rows={6}
            />
          </div>
        </div>
      )}

      {/* Price Structure Section */}
      {tradeId && (
        <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
          <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Price Structure</h3>
          <PriceStructureSection
            tradeId={tradeId}
            tradeName={trade}
          />
        </div>
      )}

      {/* Firms Section */}
      <div>
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Firms</h3>
        <div className="relative">
        {/* Extraction Progress Overlay */}
        {isExtracting && (
          <div className="absolute inset-0 z-50 bg-[#1e1e1e]/80 rounded-lg flex items-center justify-center">
            <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-lg p-6 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0e639c]"></div>
              <p className="text-[#cccccc] font-semibold">Extracting contractor data...</p>
              <p className="text-xs text-[#858585]">This may take a few moments</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 overflow-x-auto pt-3 pb-4" style={{ scrollbarWidth: 'thin' }}>
          {cards.map((card, index) => {
            const isEmpty = !card.contractor;
            const isDraggingOver = draggingOverCardId === card.id;

            return (
              <div
                key={card.id}
                className="flex-shrink-0 relative"
                onDragOver={isEmpty ? (e) => handleDragOver(e, card.id) : undefined}
                onDragLeave={isEmpty ? handleDragLeave : undefined}
                onDrop={isEmpty ? handleDrop : undefined}
              >
                {/* Drag & Drop Overlay - Shows only on the specific card being dragged over */}
                {isEmpty && isDraggingOver && (
                  <div className="absolute inset-0 z-50 bg-[#0e639c]/20 border-2 border-dashed border-[#0e639c] rounded-lg flex items-center justify-center">
                    <div className="bg-[#1e1e1e] border border-[#0e639c] rounded-lg p-4 flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-[#0e639c]" />
                      <p className="text-[#cccccc] font-semibold text-xs">Drop to extract</p>
                    </div>
                  </div>
                )}

                <ContractorForm
                  contractor={card.contractor}
                  onSave={(data) => handleSave(card.id, data)}
                  onDelete={card.contractor?.id ? handleDelete : undefined}
                  onAwardChange={card.contractor?.id ? (awarded) => handleAwardChange(card.contractor.id, awarded) : undefined}
                  trade={trade}
                />
              </div>
            );
          })}
        </div>
        </div>
      </div>

    </div>
  );
}
