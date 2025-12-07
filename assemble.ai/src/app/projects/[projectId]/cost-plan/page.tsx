'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Plus, Download, Upload, RefreshCw, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useCostPlan, useCostLineMutations } from '@/lib/hooks/cost-plan';
import CostPlanSheet from '@/components/cost-plan/CostPlanSheet';
import type { CostLineSection } from '@/types/cost-plan';

export default function CostPlanPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { costLines, totals, isLoading, error, refetch } = useCostPlan(projectId);
  const { createCostLine, updateCostLine, isSubmitting } = useCostLineMutations(projectId);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState<CostLineSection>('FEES');

  const handleAddLine = async (section: CostLineSection) => {
    setSelectedSection(section);
    setShowAddDialog(true);
  };

  // Handle cell changes from FortuneSheet
  const handleCellChange = async (costLineId: string, field: string, value: unknown) => {
    try {
      await updateCostLine(costLineId, { [field]: value });
      // Refetch to get updated calculations
      refetch();
    } catch (err) {
      console.error('Failed to update cost line:', err);
    }
  };

  const handleCreateLine = async (data: { description: string; section: CostLineSection }) => {
    await createCostLine({
      section: data.section,
      description: data.description,
      sortOrder: costLines.filter(l => l.section === data.section).length,
    });
    setShowAddDialog(false);
    refetch();
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1e1e2e]">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load cost plan</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e2e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-xl font-semibold text-white">Cost Plan</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>

          <button
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <div className="relative">
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Line
            </button>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      {totals && (
        <div className="flex items-center gap-6 px-4 py-2 bg-[#252536] border-b border-gray-700 text-sm">
          <div>
            <span className="text-gray-400">Budget: </span>
            <span className="text-white font-medium">
              ${(totals.budgetCents / 100).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Final Forecast: </span>
            <span className="text-white font-medium">
              ${(totals.finalForecastCents / 100).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Variance: </span>
            <span className={`font-medium ${totals.varianceCents < 0 ? 'text-red-400' : 'text-green-400'}`}>
              ${(totals.varianceCents / 100).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Claimed: </span>
            <span className="text-white font-medium">
              ${(totals.claimedCents / 100).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">ETC: </span>
            <span className="text-white font-medium">
              ${(totals.etcCents / 100).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Spreadsheet */}
      <div className="flex-1 overflow-hidden">
        {isLoading && costLines.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-400">Loading cost plan...</div>
          </div>
        ) : (
          <CostPlanSheet
            costLines={costLines}
            totals={totals}
            onAddLine={handleAddLine}
            onCellChange={handleCellChange}
          />
        )}
      </div>

      {/* Add Line Dialog */}
      {showAddDialog && (
        <AddLineDialog
          section={selectedSection}
          onClose={() => setShowAddDialog(false)}
          onSubmit={handleCreateLine}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

interface AddLineDialogProps {
  section: CostLineSection;
  onClose: () => void;
  onSubmit: (data: { description: string; section: CostLineSection }) => void;
  isSubmitting: boolean;
}

function AddLineDialog({ section, onClose, onSubmit, isSubmitting }: AddLineDialogProps) {
  const [description, setDescription] = useState('');
  const [selectedSection, setSelectedSection] = useState<CostLineSection>(section);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit({ description: description.trim(), section: selectedSection });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252536] rounded-lg shadow-xl w-full max-w-md">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Add Cost Line</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value as CostLineSection)}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="FEES">Fees and Charges</option>
              <option value="CONSULTANTS">Consultants</option>
              <option value="CONSTRUCTION">Construction</option>
              <option value="CONTINGENCY">Contingency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter cost line description"
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!description.trim() || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Line'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
