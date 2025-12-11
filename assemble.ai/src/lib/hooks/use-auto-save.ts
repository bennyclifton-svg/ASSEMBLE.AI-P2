/**
 * Auto-save hook with debouncing
 *
 * Provides debounced auto-save functionality for data that changes frequently.
 * Used for TOC editor to save changes automatically without user action.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  /** The data to auto-save */
  data: T;
  /** Async save function */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 1500ms) */
  debounceMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Comparison function to check if data changed (default: JSON.stringify comparison) */
  isEqual?: (prev: T, next: T) => boolean;
}

interface UseAutoSaveReturn {
  /** Whether a save is currently in progress */
  isSaving: boolean;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Any error from the last save attempt */
  error: Error | null;
  /** Manually trigger a save immediately */
  saveNow: () => Promise<void>;
  /** Clear the pending save timeout */
  cancel: () => void;
  /** Last successful save timestamp */
  lastSavedAt: Date | null;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 1500,
  enabled = true,
  isEqual = (prev, next) => JSON.stringify(prev) === JSON.stringify(next),
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Refs to track state without triggering re-renders
  const savedDataRef = useRef<T>(data);
  const pendingDataRef = useRef<T>(data);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Check if there are unsaved changes
  const hasUnsavedChanges = !isEqual(savedDataRef.current, pendingDataRef.current);

  // Clear timeout helper
  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Save function
  const performSave = useCallback(async (dataToSave: T) => {
    if (!isMountedRef.current) return;

    // Skip if data hasn't changed from last saved state
    if (isEqual(savedDataRef.current, dataToSave)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(dataToSave);

      if (isMountedRef.current) {
        savedDataRef.current = dataToSave;
        setLastSavedAt(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to save'));
        console.error('Auto-save failed:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [onSave, isEqual]);

  // Manual save function
  const saveNow = useCallback(async () => {
    clearPendingTimeout();
    await performSave(pendingDataRef.current);
  }, [clearPendingTimeout, performSave]);

  // Cancel pending save
  const cancel = useCallback(() => {
    clearPendingTimeout();
  }, [clearPendingTimeout]);

  // Watch for data changes and schedule auto-save
  useEffect(() => {
    pendingDataRef.current = data;

    if (!enabled) return;

    // Clear any existing timeout
    clearPendingTimeout();

    // Skip if data hasn't changed
    if (isEqual(savedDataRef.current, data)) {
      return;
    }

    // Schedule a new save
    timeoutRef.current = setTimeout(() => {
      performSave(data);
    }, debounceMs);

    return () => {
      clearPendingTimeout();
    };
  }, [data, enabled, debounceMs, performSave, clearPendingTimeout, isEqual]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPendingTimeout();
    };
  }, [clearPendingTimeout]);

  // Save on window unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isEqual(savedDataRef.current, pendingDataRef.current)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEqual]);

  return {
    isSaving,
    hasUnsavedChanges,
    error,
    saveNow,
    cancel,
    lastSavedAt,
  };
}
