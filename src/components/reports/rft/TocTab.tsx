/**
 * TocTab Component
 *
 * Wrapper for TocEditorStandalone that handles:
 * - Initializing default 7 sections
 * - Auto-save functionality
 * - State management for TOC sections
 */

'use client';

import { useEffect, useState } from 'react';
import { TocEditorStandalone } from './TocEditorStandalone';
import { useAutoSave } from '@/lib/hooks/use-auto-save';
import {
  getDefaultTocSections,
  DEFAULT_TOC_SECTION_IDS,
  type LinkedTocSection,
} from '@/lib/constants/default-toc-sections';

interface TocTabProps {
  /** 'discipline' for consultants, 'trade' for contractors */
  contextType: 'discipline' | 'trade';
  /** Whether a transmittal exists for this discipline/trade */
  hasTransmittal?: boolean;
  /** Initial sections (if report exists) */
  initialSections?: LinkedTocSection[];
  /** Callback when sections change (for parent state sync) */
  onSectionsChange?: (sections: LinkedTocSection[]) => void;
  /** Async save function for auto-save */
  onSave?: (sections: LinkedTocSection[]) => Promise<void>;
  /** Whether editing is disabled */
  disabled?: boolean;
}

export function TocTab({
  contextType,
  hasTransmittal = true,
  initialSections,
  onSectionsChange,
  onSave,
  disabled = false,
}: TocTabProps) {
  // Initialize with provided sections or default 7 sections
  // Always ensure Transmittal section is present
  const [sections, setSections] = useState<LinkedTocSection[]>(() => {
    if (initialSections && initialSections.length > 0) {
      // Check if Transmittal section is missing and add it
      const hasTransmittalSection = initialSections.some(
        s => s.id === DEFAULT_TOC_SECTION_IDS.TRANSMITTAL
      );
      if (!hasTransmittalSection) {
        return [
          ...initialSections,
          {
            id: DEFAULT_TOC_SECTION_IDS.TRANSMITTAL,
            title: 'Transmittal',
            level: 1,
            linkedTo: 'transmittal',
          },
        ];
      }
      return initialSections;
    }
    return getDefaultTocSections(contextType, hasTransmittal);
  });

  // Auto-save hook
  const { isSaving, hasUnsavedChanges, error } = useAutoSave({
    data: sections,
    onSave: async (data) => {
      if (onSave) {
        await onSave(data);
      }
    },
    debounceMs: 1500,
    enabled: !!onSave,
  });

  // Sync sections with initial when they change from parent
  // Always ensure Transmittal section is present
  useEffect(() => {
    if (initialSections && initialSections.length > 0) {
      const hasTransmittalSection = initialSections.some(
        s => s.id === DEFAULT_TOC_SECTION_IDS.TRANSMITTAL
      );
      if (!hasTransmittalSection) {
        setSections([
          ...initialSections,
          {
            id: DEFAULT_TOC_SECTION_IDS.TRANSMITTAL,
            title: 'Transmittal',
            level: 1,
            linkedTo: 'transmittal',
          },
        ]);
      } else {
        setSections(initialSections);
      }
    }
  }, [initialSections]);

  // Handle sections change
  const handleSectionsChange = (newSections: LinkedTocSection[]) => {
    setSections(newSections);
    onSectionsChange?.(newSections);
  };

  return (
    <div className="space-y-4">
      {/* Status indicators */}
      {error && (
        <div className="p-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded">
          Failed to save: {error.message}
        </div>
      )}

      <TocEditorStandalone
        sections={sections}
        onSectionsChange={handleSectionsChange}
        disabled={disabled}
        isSaving={isSaving}
      />
    </div>
  );
}
