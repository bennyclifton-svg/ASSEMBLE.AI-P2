'use client';

/**
 * T148: Refresh Confirmation Modal
 *
 * Displays when user attempts to refresh a report that has been manually edited.
 * Provides options to:
 * - Cancel: Don't refresh
 * - Overwrite: Re-generate and discard edits
 * - Keep Edits: (Future) Attempt to preserve manual edits
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface RefreshConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (preserveEdits: boolean) => void;
  reportTitle: string;
}

export default function RefreshConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  reportTitle,
}: RefreshConfirmationModalProps) {
  if (!isOpen) return null;

  const handleOverwrite = () => {
    onConfirm(false); // Don't preserve edits
  };

  const handleKeepEdits = () => {
    onConfirm(true); // Attempt to preserve edits (future feature)
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#2d2d2d] border border-gray-700 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        {/* Icon and Title */}
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-semibold text-gray-100 mb-2">
              Report Has Been Edited
            </h2>
            <p className="text-sm text-gray-300 mb-1">
              <span className="font-medium">{reportTitle}</span>
            </p>
            <p className="text-sm text-gray-400">
              This report contains manual edits. Refreshing will re-generate the content using
              updated data from the database.
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mb-6">
          <p className="text-sm text-yellow-200">
            <strong>Warning:</strong> Selecting "Overwrite Edits" will permanently discard
            all manual changes you've made to this report.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={handleKeepEdits}
            className="w-full"
            disabled
            title="Feature coming soon"
          >
            Keep Edits (Coming Soon)
          </Button>

          <Button
            variant="destructive"
            onClick={handleOverwrite}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Overwrite Edits
          </Button>
        </div>

        {/* Info Note */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          The "Keep Edits" feature will be available in a future update.
        </p>
      </div>
    </div>
  );
}
