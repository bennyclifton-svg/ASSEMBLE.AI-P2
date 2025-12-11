/**
 * RFTSection Component
 *
 * Main container component for RFT management within Procurement tab.
 * Replaces ReportsSection and Brief section with a unified tabbed interface.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { RFTTabInterface } from './RFTTabInterface';
import {
  getDefaultTocSections,
  type LinkedTocSection,
} from '@/lib/constants/default-toc-sections';

interface BriefData {
  services?: string;
  fee?: string;
  program?: string;
}

interface ScopeData {
  works?: string;
  price?: string;
  program?: string;
}

interface RFTSectionProps {
  projectId: string;
  /** 'discipline' for consultants, 'trade' for contractors */
  contextType: 'discipline' | 'trade';
  /** Discipline ID (for consultants) */
  disciplineId?: string;
  /** Trade ID (for contractors) */
  tradeId?: string;
  /** Display name */
  name: string;
  // Brief fields (consultants) - object format
  briefData?: BriefData;
  onBriefChange?: (field: 'services' | 'fee' | 'program', value: string) => Promise<void>;
  // Scope fields (contractors) - object format
  scopeData?: ScopeData;
  onScopeChange?: (field: 'works' | 'price' | 'program', value: string) => Promise<void>;
  // Transmittal props
  selectedDocumentIds?: string[];
  onSetSelectedDocumentIds?: (ids: string[]) => void;
}

interface Report {
  id: string;
  tableOfContents?: { sections: LinkedTocSection[]; version: number };
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function RFTSection({
  projectId,
  contextType,
  disciplineId,
  tradeId,
  name,
  briefData,
  onBriefChange,
  scopeData,
  onScopeChange,
  selectedDocumentIds = [],
  onSetSelectedDocumentIds,
}: RFTSectionProps) {
  // State for transmittal check
  const [hasTransmittal, setHasTransmittal] = useState(false);

  // Fetch existing RFT to get initial TOC sections
  const queryParams = new URLSearchParams({
    projectId,
    ...(disciplineId && { disciplineId }),
    ...(tradeId && { tradeId }),
    reportType: 'tender_request',
  });

  const { data: reportData } = useSWR<{ reports: Report[] }>(
    `/api/reports?${queryParams.toString()}`,
    fetcher
  );

  // Check for transmittal
  useEffect(() => {
    const checkTransmittal = async () => {
      const endpoint = contextType === 'discipline'
        ? `/api/transmittals?projectId=${projectId}&disciplineId=${disciplineId}`
        : `/api/transmittals?projectId=${projectId}&tradeId=${tradeId}`;

      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          // API returns { ...transmittal, items: [...] } - check items array
          setHasTransmittal(data.items?.length > 0);
          console.log('[RFTSection] Transmittal check:', { hasItems: data.items?.length > 0, count: data.items?.length });
        }
      } catch {
        // Ignore errors - transmittal check is optional
      }
    };

    if (disciplineId || tradeId) {
      checkTransmittal();
    }
  }, [projectId, disciplineId, tradeId, contextType]);

  // Get initial TOC sections from existing report or default
  const existingReport = reportData?.reports?.[0];
  const initialTocSections = existingReport?.tableOfContents?.sections ||
    getDefaultTocSections(contextType, hasTransmittal);

  // Handler for Brief updates - maps to RFTTabInterface format
  const handleUpdateBrief = useCallback(
    async (field: 'briefServices' | 'briefFee' | 'briefProgram', value: string) => {
      if (onBriefChange) {
        const fieldMap: Record<string, 'services' | 'fee' | 'program'> = {
          briefServices: 'services',
          briefFee: 'fee',
          briefProgram: 'program',
        };
        await onBriefChange(fieldMap[field], value);
      }
    },
    [onBriefChange]
  );

  // Handler for Scope updates - maps to RFTTabInterface format
  const handleUpdateScope = useCallback(
    async (field: 'scopeWorks' | 'scopePrice' | 'scopeProgram', value: string) => {
      if (onScopeChange) {
        const fieldMap: Record<string, 'works' | 'price' | 'program'> = {
          scopeWorks: 'works',
          scopePrice: 'price',
          scopeProgram: 'program',
        };
        await onScopeChange(fieldMap[field], value);
      }
    },
    [onScopeChange]
  );

  // Handler for TOC save
  const handleSaveToc = useCallback(
    async (sections: LinkedTocSection[]) => {
      // If report exists, save TOC to it
      if (existingReport?.id) {
        await fetch(`/api/reports/${existingReport.id}/toc`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableOfContents: {
              sections,
              version: (existingReport.tableOfContents?.version || 0) + 1,
            },
          }),
        });
      }
      // If no report exists yet, TOC will be saved when report is created
    },
    [existingReport]
  );

  return (
    <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
      <RFTTabInterface
        name={name}
        contextType={contextType}
        projectId={projectId}
        disciplineId={disciplineId}
        tradeId={tradeId}
        hasTransmittal={hasTransmittal}
        // Brief fields
        briefServices={briefData?.services}
        briefFee={briefData?.fee}
        briefProgram={briefData?.program}
        onUpdateBrief={contextType === 'discipline' ? handleUpdateBrief : undefined}
        // Scope fields
        scopeWorks={scopeData?.works}
        scopePrice={scopeData?.price}
        scopeProgram={scopeData?.program}
        onUpdateScope={contextType === 'trade' ? handleUpdateScope : undefined}
        // TOC
        onSaveToc={handleSaveToc}
        initialTocSections={initialTocSections}
        // Transmittal
        selectedDocumentIds={selectedDocumentIds}
        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
      />
    </div>
  );
}
