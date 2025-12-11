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
import { Save, FolderOpen, Loader2 } from 'lucide-react';
import { BriefScopeTab } from './BriefScopeTab';
import { TocTab } from './TocTab';
import { RFTTab } from './RFTTab';
import { useTransmittal } from '@/lib/hooks/use-transmittal';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { LinkedTocSection } from '@/lib/constants/default-toc-sections';

type TabValue = 'brief' | 'toc' | 'rft';

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper to brighten color
const brightenColor = (hex: string, amount: number = 80) => {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r}, ${g}, ${b})`;
};

const TRANSMITTAL_COLOR = '#2e7d32'; // Green

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

  // Handle tab click - toggle expand/collapse
  const handleTabClick = (tab: TabValue) => {
    if (isExpanded && activeTab === tab) {
      // Clicking same tab while expanded - collapse
      setIsExpanded(false);
    } else {
      // Clicking different tab or expanding - expand and switch
      setActiveTab(tab);
      setIsExpanded(true);
    }
  };

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
  const brightTransmittal = brightenColor(TRANSMITTAL_COLOR);

  // Common tile classes
  const tileBaseClasses = cn(
    'relative rounded-lg transition-all duration-200 ease-in-out cursor-pointer group',
    'flex flex-col items-center justify-center text-center',
    'h-12 w-16 flex-shrink-0'
  );

  return (
    <div className="space-y-2">
      {/* Header row with title and transmittal tiles */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#cccccc]">RFT {name}</h3>

        {/* Transmittal tiles (right side) */}
        <div className="flex gap-2">
          {/* Save Transmittal Tile */}
          <button
            onClick={handleSaveTransmittal}
            disabled={isSavingTransmittal || !hasSelection}
            className={cn(
              tileBaseClasses,
              !hasSelection && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              backgroundColor: hexToRgba(TRANSMITTAL_COLOR, hasSelection ? 0.45 : 0.25),
            }}
            title={hasSelection ? 'Save as transmittal' : 'Select documents first'}
          >
            {/* Hover glow effect */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg"
              style={{
                background: `radial-gradient(circle at center, ${hexToRgba(TRANSMITTAL_COLOR, 0.4)} 0%, transparent 70%)`,
              }}
            />
            <div className="relative z-10 flex flex-col items-center">
              {isSavingTransmittal ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mb-0.5" style={{ color: brightTransmittal }} />
              ) : (
                <Save className="h-3.5 w-3.5 mb-0.5" style={{ color: brightTransmittal }} />
              )}
              <span className="text-[10px] font-medium leading-tight" style={{ color: brightTransmittal }}>Save</span>
              <span className="text-[10px] font-medium leading-tight" style={{ color: brightTransmittal }}>Transmittal</span>
            </div>
          </button>

          {/* Load Transmittal Tile */}
          <button
            onClick={handleLoadTransmittal}
            disabled={isLoadingTransmittal || !hasExistingTransmittal}
            className={cn(
              tileBaseClasses,
              !hasExistingTransmittal && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              backgroundColor: hexToRgba(TRANSMITTAL_COLOR, hasExistingTransmittal ? 0.45 : 0.25),
            }}
            title={hasExistingTransmittal ? `Load ${transmittal?.documentCount || 0} documents` : 'No transmittal saved'}
          >
            {/* Hover glow effect */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg"
              style={{
                background: `radial-gradient(circle at center, ${hexToRgba(TRANSMITTAL_COLOR, 0.4)} 0%, transparent 70%)`,
              }}
            />
            <div className="relative z-10 flex flex-col items-center">
              {isLoadingTransmittal ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mb-0.5" style={{ color: brightTransmittal }} />
              ) : (
                <FolderOpen className="h-3.5 w-3.5 mb-0.5" style={{ color: brightTransmittal }} />
              )}
              <span className="text-[10px] font-medium leading-tight" style={{ color: brightTransmittal }}>Load</span>
              <span className="text-[10px] font-medium leading-tight" style={{ color: brightTransmittal }}>
                ({transmittal?.documentCount || 0})
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Tabs - underline style, full width underline */}
      <div className="w-full">
        {/* Tab buttons with full-width border */}
        <div className="flex items-center border-b border-[#3e3e42]">
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
          <div className="mt-4">
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
