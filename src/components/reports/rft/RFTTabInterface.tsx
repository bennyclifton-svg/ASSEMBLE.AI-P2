/**
 * RFTTabInterface Component
 *
 * Tab layout container with:
 * - Dynamic title "RFT [Discipline/Trade Name]"
 * - 3 tabs: Brief/Scope, TOC, RFT
 * - Dynamic tab naming based on context type
 * - Transmittal tiles in header row (right side)
 */

'use client';

import { useState, useCallback } from 'react';
import { Save, Upload, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BriefScopeTab } from './BriefScopeTab';
import { TocTab } from './TocTab';
import { RFTTab } from './RFTTab';
import { useTransmittal } from '@/lib/hooks/use-transmittal';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { LinkedTocSection } from '@/lib/constants/default-toc-sections';

type TabValue = 'brief' | 'toc' | 'rft';

// Highlight blue color for icons and buttons
const HIGHLIGHT_BLUE = '#4fc1ff';

interface RFTTabInterfaceProps {
  /** Display name (discipline or trade name) */
  name: string;
  /** 'discipline' for consultants, 'trade' for contractors */
  contextType: 'discipline' | 'trade';
  projectId: string;
  disciplineId?: string;
  tradeId?: string;
  /** Whether a transmittal exists */
  hasTransmittal?: boolean;
  // Brief fields (consultants)
  briefServices?: string;
  briefFee?: string;
  briefProgram?: string;
  onUpdateBrief?: (field: 'briefServices' | 'briefFee' | 'briefProgram', value: string) => Promise<void>;
  // Scope fields (contractors)
  scopeWorks?: string;
  scopePrice?: string;
  scopeProgram?: string;
  onUpdateScope?: (field: 'scopeWorks' | 'scopePrice' | 'scopeProgram', value: string) => Promise<void>;
  /** Callback to save TOC sections */
  onSaveToc?: (sections: LinkedTocSection[]) => Promise<void>;
  /** Initial TOC sections (from existing report) */
  initialTocSections?: LinkedTocSection[];
  /** Selected document IDs for transmittal */
  selectedDocumentIds?: string[];
  /** Callback to update selected document IDs */
  onSetSelectedDocumentIds?: (ids: string[]) => void;
}

export function RFTTabInterface({
  name,
  contextType,
  projectId,
  disciplineId,
  tradeId,
  hasTransmittal = false,
  briefServices,
  briefFee,
  briefProgram,
  onUpdateBrief,
  scopeWorks,
  scopePrice,
  scopeProgram,
  onUpdateScope,
  onSaveToc,
  initialTocSections,
  selectedDocumentIds = [],
  onSetSelectedDocumentIds,
}: RFTTabInterfaceProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('brief');
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  // Handle tab click - toggles if active, expands if inactive
  const handleTabClick = (tab: TabValue) => {
    if (activeTab === tab) {
      setIsExpanded(!isExpanded);
    } else {
      setActiveTab(tab);
      if (!isExpanded) {
        setIsExpanded(true);
      }
    }
  };
  const [tocSections, setTocSections] = useState<LinkedTocSection[]>(initialTocSections || []);
  const { toast } = useToast();
  const [isSavingTransmittal, setIsSavingTransmittal] = useState(false);

  // Transmittal hook
  const {
    transmittal,
    isLoading: isLoadingTransmittal,
    saveTransmittal,
    loadTransmittal,
    hasTransmittal: hasExistingTransmittal,
  } = useTransmittal({
    projectId,
    disciplineId,
    tradeId,
    contextName: name,
  });

  // Dynamic tab label for first tab
  const firstTabLabel = contextType === 'discipline' ? 'Brief' : 'Scope';

  // Handle TOC sections change (for passing to RFTTab)
  const handleTocSectionsChange = (sections: LinkedTocSection[]) => {
    setTocSections(sections);
  };

  // Handle save transmittal
  const handleSaveTransmittal = useCallback(async () => {
    if (selectedDocumentIds.length === 0) {
      toast({ title: 'Error', description: 'No documents selected', variant: 'destructive' });
      return;
    }

    setIsSavingTransmittal(true);
    try {
      await saveTransmittal(selectedDocumentIds);
      toast({ title: 'Transmittal Saved', description: `${selectedDocumentIds.length} document(s)` });
    } catch {
      toast({ title: 'Error', description: 'Failed to save transmittal', variant: 'destructive' });
    } finally {
      setIsSavingTransmittal(false);
    }
  }, [selectedDocumentIds, saveTransmittal, toast]);

  // Handle load transmittal
  const handleLoadTransmittal = useCallback(() => {
    const documentIds = loadTransmittal();
    if (documentIds.length > 0) {
      onSetSelectedDocumentIds?.(documentIds);
      toast({ title: 'Transmittal Loaded', description: `${documentIds.length} document(s) selected` });
    } else {
      toast({ title: 'Info', description: 'No transmittal to load' });
    }
  }, [loadTransmittal, onSetSelectedDocumentIds, toast]);

  const hasSelection = selectedDocumentIds.length > 0;

  // Solid triangle icons - matching Firm Cards style
  const TriangleRight = () => (
    <svg
      className="w-3.5 h-3.5 text-[#858585]"
      viewBox="0 0 12 12"
      fill="currentColor"
    >
      <polygon points="2,0 12,6 2,12" />
    </svg>
  );

  const TriangleDown = () => (
    <svg
      className="w-3.5 h-3.5 text-[#858585]"
      viewBox="0 0 12 12"
      fill="currentColor"
    >
      <polygon points="0,2 12,2 6,12" />
    </svg>
  );

  return (
    <div className="border border-[#3e3e42] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#2d2d30] border-b border-[#3e3e42]">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <FileText className="w-4 h-4" style={{ color: HIGHLIGHT_BLUE }} />
          <span className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
            RFT Access
          </span>
          {isExpanded ? <TriangleDown /> : <TriangleRight />}
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveTransmittal}
            disabled={isSavingTransmittal || !hasSelection}
            className="h-7 px-2 text-xs"
            style={{
              backgroundColor: `rgba(79, 193, 255, 0.2)`,
              color: HIGHLIGHT_BLUE,
            }}
          >
            {isSavingTransmittal ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Save className="w-3 h-3 mr-1" />
            )}
            Save Transmittal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadTransmittal}
            disabled={isLoadingTransmittal || !hasExistingTransmittal}
            className="h-7 px-2 text-xs"
            style={{
              backgroundColor: `rgba(79, 193, 255, 0.2)`,
              color: HIGHLIGHT_BLUE,
            }}
          >
            {isLoadingTransmittal ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Upload className="w-3 h-3 mr-1" />
            )}
            Load {transmittal?.documentCount ? `(${transmittal.documentCount})` : ''}
          </Button>
        </div>
      </div>

      {/* Tabs - always visible */}
      <div className="bg-[#252526]">
        <div className="flex items-center px-4 pt-2 border-b border-[#3e3e42]">
          <button
            onClick={() => handleTabClick('brief')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-none transition-colors',
              activeTab === 'brief'
                ? 'text-[#cccccc] border-b-2 border-[#0e639c] -mb-px'
                : 'text-[#858585] hover:text-[#cccccc]'
            )}
          >
            {firstTabLabel}
          </button>
          <button
            onClick={() => handleTabClick('toc')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-none transition-colors',
              activeTab === 'toc'
                ? 'text-[#cccccc] border-b-2 border-[#0e639c] -mb-px'
                : 'text-[#858585] hover:text-[#cccccc]'
            )}
          >
            TOC
          </button>
          <button
            onClick={() => handleTabClick('rft')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-none transition-colors',
              activeTab === 'rft'
                ? 'text-[#cccccc] border-b-2 border-[#0e639c] -mb-px'
                : 'text-[#858585] hover:text-[#cccccc]'
            )}
          >
            RFT
          </button>
        </div>

        {/* Tab content - only shown when expanded */}
        {isExpanded && (
          <div className="p-4">
            {activeTab === 'brief' && (
              <BriefScopeTab
                contextType={contextType}
                briefServices={briefServices}
                briefFee={briefFee}
                briefProgram={briefProgram}
                onUpdateBrief={onUpdateBrief}
                scopeWorks={scopeWorks}
                scopePrice={scopePrice}
                scopeProgram={scopeProgram}
                onUpdateScope={onUpdateScope}
              />
            )}

            {activeTab === 'toc' && (
              <TocTab
                contextType={contextType}
                hasTransmittal={hasTransmittal || hasExistingTransmittal}
                initialSections={initialTocSections}
                onSectionsChange={handleTocSectionsChange}
                onSave={onSaveToc}
              />
            )}

            {activeTab === 'rft' && (
              <RFTTab
                projectId={projectId}
                disciplineId={disciplineId}
                tradeId={tradeId}
                contextName={name}
                contextType={contextType}
                tocSections={tocSections}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
