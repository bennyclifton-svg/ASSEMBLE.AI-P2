'use client';

/**
 * Unified Report Editor - Phase 11
 *
 * Main container for unified editable report view with:
 * - Single large editable text box
 * - Color-coded headings (H1/H2/H3)
 * - Embedded transmittal table
 * - Save/refresh/export operations
 * - Short RFT ↔ Long RFT workflow
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import EditableContentArea from './EditableContentArea';
import HeadingToolbar from './HeadingToolbar';
import TransmittalTableEditor from './TransmittalTableEditor';
import ExportButton from './ExportButton';
import RefreshConfirmationModal from './RefreshConfirmationModal';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles, FileText, Save } from 'lucide-react';

interface UnifiedReportEditorProps {
  reportId: string;
  reportTitle: string;
  initialContent?: string;
  reportChain: 'short' | 'long';
  parentReportId?: string | null;
  isEdited?: boolean;
  onSave?: (content: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onGenerateLong?: () => void;
}

export default function UnifiedReportEditor({
  reportId,
  reportTitle,
  initialContent = '',
  reportChain,
  parentReportId,
  isEdited = false,
  onSave,
  onRefresh,
  onGenerateLong,
}: UnifiedReportEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setSaving] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
    setLastSaved(new Date()); // Reset on new content
  }, [initialContent]);

  /**
   * Auto-save debounced handler (2 seconds)
   */
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      // Clear existing auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new auto-save timer
      autoSaveTimerRef.current = setTimeout(async () => {
        if (onSave) {
          setSaving(true);
          try {
            await onSave(newContent);
            setLastSaved(new Date());
            setShowSavedIndicator(true);
            // Hide "Saved" indicator after 2 seconds
            setTimeout(() => setShowSavedIndicator(false), 2000);
          } catch (error) {
            console.error('Auto-save failed:', error);
            toast.error('Failed to auto-save report');
          } finally {
            setSaving(false);
          }
        }
      }, 2000);
    },
    [onSave]
  );

  /**
   * Cleanup auto-save timer on unmount
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  /**
   * Manual save handler (Ctrl+S)
   */
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    // Clear auto-save timer to avoid double save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setSaving(true);
    try {
      await onSave(content);
      setLastSaved(new Date());
      setShowSavedIndicator(true);
      toast.success('Report saved');
      // Hide "Saved" indicator after 2 seconds
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save report');
    } finally {
      setSaving(false);
    }
  }, [content, onSave]);

  /**
   * Refresh handler for Short RFT
   */
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    // If edited, show confirmation modal
    if (isEdited) {
      setShowRefreshModal(true);
      return;
    }

    setRefreshing(true);
    try {
      await onRefresh();
      toast.success('Report refreshed with latest data');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh report');
    } finally {
      setRefreshing(false);
    }
  }, [isEdited, onRefresh]);

  /**
   * Confirm refresh from modal
   * @param preserveEdits - Whether to attempt preserving user edits (future feature)
   */
  const confirmRefresh = useCallback(async (preserveEdits: boolean) => {
    setShowRefreshModal(false);
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      toast.success('Report refreshed with latest data');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh report');
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-100">
      {/* Header with actions */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <FileText className="w-5 h-5 text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold">
              {reportChain === 'short' ? 'Short RFT (Data Only)' : 'Long RFT (AI Assisted)'}
            </h2>
            {lastSaved && (
              <p className="text-xs text-gray-400">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            title="Save report (Ctrl+S)"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-current rounded-full animate-spin" />
                Saving...
              </>
            ) : showSavedIndicator ? (
              <>
                <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>

          {/* Refresh button (Short RFT only) */}
          {reportChain === 'short' && onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh RFT'}
            </Button>
          )}

          {/* Generate Long RFT button (Short RFT only) */}
          {reportChain === 'short' && onGenerateLong && (
            <Button
              variant="default"
              size="sm"
              onClick={onGenerateLong}
              className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Long RFT
            </Button>
          )}

          {/* Export button */}
          <ExportButton reportId={reportId} content={content} />

          {/* Parent report link (Long RFT only) */}
          {reportChain === 'long' && parentReportId && (
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a href={`/reports/${parentReportId}`}>
                ← View Parent Report
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Heading Toolbar */}
      <HeadingToolbar />

      {/* Editable Content Area */}
      <div className="flex-1 overflow-auto">
        <EditableContentArea
          content={content}
          onChange={handleContentChange}
          onSave={handleSave}
        />
      </div>

      {/* Refresh Confirmation Modal */}
      <RefreshConfirmationModal
        isOpen={showRefreshModal}
        onClose={() => setShowRefreshModal(false)}
        onConfirm={confirmRefresh}
        reportTitle={reportTitle}
      />
    </div>
  );
}
