'use client';

import { useState, useEffect } from 'react';
import { useContractors } from '@/lib/hooks/use-contractors';
import { ContractorForm } from './ContractorForm';
import { useToast } from '@/lib/hooks/use-toast';
import { Upload } from 'lucide-react';

interface ContractorGalleryProps {
  projectId: string;
  trade: string;
}

export function ContractorGallery({ projectId, trade }: ContractorGalleryProps) {
  const { contractors, isLoading, addContractor, updateContractor, deleteContractor } = useContractors(projectId, trade);
  const { toast } = useToast();
  const [cards, setCards] = useState<Array<{ id: string; contractor?: any }>>([]);
  const [isDragging, setIsDragging] = useState(false);
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
        throw new Error('Failed to extract data');
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#cccccc]">{trade}</h3>

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

        <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
          {cards.map((card, index) => {
            const isFirstEmpty = !card.contractor && index === cards.findIndex(c => !c.contractor);

            return (
              <div
                key={card.id}
                className="flex-shrink-0 relative"
                onDragOver={isFirstEmpty ? handleDragOver : undefined}
                onDragLeave={isFirstEmpty ? handleDragLeave : undefined}
                onDrop={isFirstEmpty ? handleDrop : undefined}
              >
                {/* Drag & Drop Overlay - Only on first empty card */}
                {isFirstEmpty && isDragging && (
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
                  trade={trade}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
