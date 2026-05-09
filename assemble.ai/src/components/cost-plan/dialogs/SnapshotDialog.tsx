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
      <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Cost Plan Snapshots
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="px-4 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
            <h3 className="text-sm font-medium text-white mb-3">Create New Snapshot</h3>

            <div className="space-y-3">
              {/* Name input */}
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">
                  Snapshot Name
                </label>
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="e.g., REV A, Tender Award"
                  className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-primary)]"
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
                <label className="block text-sm text-[var(--color-text-muted)] mb-2">
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
                          ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary-tint)] text-white'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}
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
                  className="px-4 py-2 text-[var(--color-text-primary)] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!snapshotName.trim() || isCreating}
                  className="px-4 py-2 bg-[var(--color-accent-primary)] text-white rounded hover:bg-[var(--color-accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              Loading snapshots...
            </div>
          ) : snapshots.length === 0 && !showCreateForm ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="text-[var(--color-text-muted)] mb-4">No snapshots created yet</p>
              <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-md mx-auto">
                Snapshots capture the current state of your cost plan for future comparison.
                Create a snapshot before major changes.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-[var(--color-accent-primary)] text-white rounded hover:bg-[var(--color-accent-primary-hover)] transition-colors inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Create First Snapshot
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="px-4 py-3 hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  {deleteConfirmId === snapshot.id ? (
                    // Delete confirmation
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-error)]">
                        Delete "{snapshot.snapshotName}"?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 text-sm text-[var(--color-text-primary)] hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(snapshot.id)}
                          disabled={isDeleting}
                          className="px-3 py-1 text-sm bg-[var(--color-error)] text-white rounded hover:bg-[var(--color-error)] transition-colors disabled:opacity-50"
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
                          <Camera className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                          <span className="text-[var(--color-text-primary)] font-medium truncate">
                            {snapshot.snapshotName}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[var(--color-text-muted)]">
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
                            <span className="text-[var(--color-text-muted)]">
                              Budget: <span className="text-[var(--color-text-primary)]">{formatCurrency(snapshot.totals.budgetCents)}</span>
                            </span>
                            <span className="text-[var(--color-text-muted)]">
                              Forecast: <span className="text-[var(--color-text-primary)]">{formatCurrency(snapshot.totals.finalForecastCents)}</span>
                            </span>
                            <span className={snapshot.totals.varianceCents >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
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
                            className="p-2 text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-hover)] rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {onExport && (
                          <button
                            onClick={() => onExport(snapshot.id)}
                            title="Export snapshot"
                            className="p-2 text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-hover)] rounded transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => setDeleteConfirmId(snapshot.id)}
                            title="Delete snapshot"
                            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded transition-colors"
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
          <div className="px-4 py-3 border-t border-[var(--color-border)] flex items-center justify-between shrink-0">
            <div className="text-sm text-[var(--color-text-muted)]">
              {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
            </div>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-primary)] hover:text-white hover:bg-[var(--color-bg-hover)] rounded transition-colors"
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
