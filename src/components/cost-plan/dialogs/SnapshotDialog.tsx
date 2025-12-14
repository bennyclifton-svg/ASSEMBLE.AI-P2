'use client';

/**
 * Snapshot Dialog
 * Feature 006 - Cost Planning Module (Task T103)
 *
 * Dialog for creating and managing cost plan snapshots (baselines).
 * Allows users to capture the current state for historical comparison.
 */

import { useState, useCallback } from 'react';
import {
  X,
  Camera,
  History,
  Calendar,
  Trash,
  Eye,
  Download,
  Plus,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/cost-plan-formulas';

// ============================================================================
// TYPES
// ============================================================================

export interface Snapshot {
  id: string;
  snapshotName: string;
  snapshotDate: string;
  createdBy: string;
  createdAt: string;
  totals?: {
    budgetCents: number;
    approvedContractCents: number;
    finalForecastCents: number;
    varianceCents: number;
  };
}

interface SnapshotDialogProps {
  isOpen: boolean;
  projectId: string;
  projectName: string;
  snapshots: Snapshot[];
  isLoading?: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onDelete?: (snapshotId: string) => Promise<void>;
  onCompare?: (snapshotId: string) => void;
  onExport?: (snapshotId: string) => void;
}

// ============================================================================
// SUGGESTED NAMES
// ============================================================================

const SUGGESTED_NAMES = [
  'Initial Budget',
  'Tender Award',
  'REV A',
  'REV B',
  'REV C',
  'PC Adjustment',
  'Variation Approved',
  'Month End',
  'Final Account',
];

// ============================================================================
// COMPONENT
// ============================================================================

export function SnapshotDialog({
  isOpen,
  projectId,
  projectName,
  snapshots,
  isLoading = false,
  onClose,
  onCreate,
  onDelete,
  onCompare,
  onExport,
}: SnapshotDialogProps) {
  // State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle create snapshot
  const handleCreate = useCallback(async () => {
    if (!snapshotName.trim()) return;

    setIsCreating(true);
    try {
      await onCreate(snapshotName.trim());
      setSnapshotName('');
      setShowCreateForm(false);
    } finally {
      setIsCreating(false);
    }
  }, [snapshotName, onCreate]);

  // Handle delete snapshot
  const handleDelete = useCallback(async (id: string) => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(id);
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#3e3e42] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Cost Plan Snapshots
            </h2>
            <p className="text-sm text-[#858585]">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="px-4 py-4 border-b border-[#3e3e42] bg-[#1e1e1e]">
            <h3 className="text-sm font-medium text-white mb-3">Create New Snapshot</h3>

            <div className="space-y-3">
              {/* Name input */}
              <div>
                <label className="block text-sm text-[#858585] mb-1">
                  Snapshot Name
                </label>
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="e.g., REV A, Tender Award"
                  className="w-full px-3 py-2 bg-[#252526] border border-[#3e3e42] rounded text-[#cccccc] placeholder-[#6e6e6e] focus:outline-none focus:border-[#007acc]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && snapshotName.trim()) {
                      handleCreate();
                    }
                  }}
                />
              </div>

              {/* Quick select buttons */}
              <div>
                <label className="block text-sm text-[#858585] mb-2">
                  Suggestions
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_NAMES.filter(
                    (name) => !snapshots.some((s) => s.snapshotName === name)
                  ).slice(0, 6).map((name) => (
                    <button
                      key={name}
                      onClick={() => setSnapshotName(name)}
                      className={`
                        px-2 py-1 text-xs rounded border transition-colors
                        ${snapshotName === name
                          ? 'border-[#007acc] bg-[#094771] text-white'
                          : 'border-[#3e3e42] text-[#858585] hover:border-[#6e6e6e] hover:text-[#cccccc]'}
                      `}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setSnapshotName('');
                  }}
                  className="px-4 py-2 text-[#cccccc] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!snapshotName.trim() || isCreating}
                  className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {isCreating ? 'Creating...' : 'Create Snapshot'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Snapshot List */}
        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="text-center py-12 text-[#858585]">
              Loading snapshots...
            </div>
          ) : snapshots.length === 0 && !showCreateForm ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-[#4e4e4e] mx-auto mb-3" />
              <p className="text-[#858585] mb-4">No snapshots created yet</p>
              <p className="text-sm text-[#6e6e6e] mb-6 max-w-md mx-auto">
                Snapshots capture the current state of your cost plan for future comparison.
                Create a snapshot before major changes.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] transition-colors inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Create First Snapshot
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#3e3e42]">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="px-4 py-3 hover:bg-[#2a2d2e] transition-colors"
                >
                  {deleteConfirmId === snapshot.id ? (
                    // Delete confirmation
                    <div className="flex items-center justify-between">
                      <span className="text-[#f87171]">
                        Delete "{snapshot.snapshotName}"?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 text-sm text-[#cccccc] hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(snapshot.id)}
                          disabled={isDeleting}
                          className="px-3 py-1 text-sm bg-[#f87171] text-white rounded hover:bg-[#ef4444] transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Normal view
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-[#858585] shrink-0" />
                          <span className="text-[#cccccc] font-medium truncate">
                            {snapshot.snapshotName}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[#858585]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(snapshot.snapshotDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {snapshot.createdBy}
                          </span>
                        </div>
                        {snapshot.totals && (
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-[#858585]">
                              Budget: <span className="text-[#cccccc]">{formatCurrency(snapshot.totals.budgetCents)}</span>
                            </span>
                            <span className="text-[#858585]">
                              Forecast: <span className="text-[#cccccc]">{formatCurrency(snapshot.totals.finalForecastCents)}</span>
                            </span>
                            <span className={snapshot.totals.varianceCents >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}>
                              Variance: {formatCurrency(snapshot.totals.varianceCents)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 ml-4">
                        {onCompare && (
                          <button
                            onClick={() => onCompare(snapshot.id)}
                            title="Compare with current"
                            className="p-2 text-[#858585] hover:text-white hover:bg-[#37373d] rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {onExport && (
                          <button
                            onClick={() => onExport(snapshot.id)}
                            title="Export snapshot"
                            className="p-2 text-[#858585] hover:text-white hover:bg-[#37373d] rounded transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => setDeleteConfirmId(snapshot.id)}
                            title="Delete snapshot"
                            className="p-2 text-[#858585] hover:text-[#f87171] hover:bg-[#f87171]/10 rounded transition-colors"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {(snapshots.length > 0 || showCreateForm) && (
          <div className="px-4 py-3 border-t border-[#3e3e42] flex items-center justify-between shrink-0">
            <div className="text-sm text-[#858585]">
              {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
            </div>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#cccccc] hover:text-white hover:bg-[#37373d] rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Snapshot
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SnapshotDialog;
