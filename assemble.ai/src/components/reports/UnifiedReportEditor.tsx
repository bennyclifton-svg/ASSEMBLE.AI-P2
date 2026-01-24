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
import { useToast } from '@/lib/hooks/use-toast';
import VisualEditor from './VisualEditor';
import RefreshConfirmationModal from './RefreshConfirmationModal';

interface UnifiedReportEditorProps {
  reportId: string;
  reportTitle: string;
  initialContent?: string;
  isEdited?: boolean;
  onSave?: (content: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export default function UnifiedReportEditor({
  reportTitle,
  initialContent = '',
  isEdited = false,
  onSave,
  onRefresh,
}: UnifiedReportEditorProps) {
  const { toast } = useToast();
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
            toast({ title: 'Failed to auto-save report', variant: 'destructive' });
          } finally {
            setSaving(false);
          }
        }
      }, 2000);
    },
    [onSave, toast]
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
      toast({ title: 'Report saved', variant: 'success' });
      // Hide "Saved" indicator after 2 seconds
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (error) {
      console.error('Save failed:', error);
      toast({ title: 'Failed to save report', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [content, onSave, toast]);

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
      toast({ title: 'Report refreshed with latest data', variant: 'success' });
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({ title: 'Failed to refresh report', variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  }, [isEdited, onRefresh, toast]);

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
      toast({ title: 'Report refreshed with latest data', variant: 'success' });
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({ title: 'Failed to refresh report', variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, toast]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)] text-gray-100">
      {/* Visual Editor with Toolbar */}
      <VisualEditor
        content={content}
        onChange={handleContentChange}
        onSave={handleSave}
        placeholder="Start editing your report..."
      />

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
