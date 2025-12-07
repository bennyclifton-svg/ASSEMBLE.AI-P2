'use client';

/**
 * Link Invoice Dialog
 * Feature 006 - Cost Planning Module (Task T102)
 *
 * Dialog for linking an existing invoice to a cost line.
 * Shows unlinked invoices with search and filter capabilities.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  FileText,
  Link2,
  Calendar,
  Building2,
  DollarSign,
  Filter,
} from 'lucide-react';
import { useInvoices } from '@/lib/hooks/cost-plan';
import { formatCurrency } from '@/lib/calculations/cost-plan-formulas';
import type { InvoiceWithRelations, PaidStatus } from '@/types/invoice';

// ============================================================================
// TYPES
// ============================================================================

interface LinkInvoiceDialogProps {
  isOpen: boolean;
  projectId: string;
  costLineId: string;
  costLineDescription: string;
  onClose: () => void;
  onLink: (invoiceId: string) => void;
  /** Already linked invoice IDs to exclude */
  excludeInvoiceIds?: string[];
}

type SortField = 'date' | 'amount' | 'number';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// STATUS COLORS
// ============================================================================

const STATUS_COLORS: Record<PaidStatus, { text: string; bg: string }> = {
  unpaid: { text: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  paid: { text: 'text-green-400', bg: 'bg-green-900/30' },
  partial: { text: 'text-blue-400', bg: 'bg-blue-900/30' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function LinkInvoiceDialog({
  isOpen,
  projectId,
  costLineId,
  costLineDescription,
  onClose,
  onLink,
  excludeInvoiceIds = [],
}: LinkInvoiceDialogProps) {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaidStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isLinking, setIsLinking] = useState(false);

  // Fetch unlinked invoices (costLineId = null)
  const { invoices: allInvoices, isLoading } = useInvoices(projectId, {
    unlinked: true,
  });

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = allInvoices.filter(
      (inv) => !excludeInvoiceIds.includes(inv.id)
    );

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.paidStatus === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(term) ||
          inv.description?.toLowerCase().includes(term) ||
          (inv as InvoiceWithRelations).company?.name?.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
          break;
        case 'amount':
          comparison = a.amountCents - b.amountCents;
          break;
        case 'number':
          comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allInvoices, excludeInvoiceIds, statusFilter, searchTerm, sortField, sortDirection]);

  // Handle link action
  const handleLink = useCallback(async () => {
    if (!selectedId) return;

    setIsLinking(true);
    try {
      await onLink(selectedId);
      onClose();
    } finally {
      setIsLinking(false);
    }
  }, [selectedId, onLink, onClose]);

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Format period
  const formatPeriod = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#3e3e42] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Link Invoice
            </h2>
            <p className="text-sm text-[#858585]">
              Select an invoice to link to: <span className="text-[#cccccc]">{costLineDescription}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-4 py-3 border-b border-[#3e3e42] space-y-3 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number, description, or company..."
              className="w-full pl-10 pr-4 py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded text-[#cccccc] placeholder-[#6e6e6e] focus:outline-none focus:border-[#007acc]"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#858585]" />
              <span className="text-sm text-[#858585]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PaidStatus | 'all')}
                className="px-2 py-1 bg-[#1e1e1e] border border-[#3e3e42] rounded text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]"
              >
                <option value="all">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="flex items-center gap-2 ml-auto text-sm text-[#858585]">
              <span>{filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="text-center py-12 text-[#858585]">
              Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-[#4e4e4e] mx-auto mb-3" />
              <p className="text-[#858585]">
                {searchTerm || statusFilter !== 'all'
                  ? 'No invoices match your filters'
                  : 'No unlinked invoices available'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#3e3e42]">
              {/* Table Header */}
              <div className="px-4 py-2 bg-[#1e1e1e] grid grid-cols-[1fr_120px_140px_100px] gap-4 text-xs text-[#858585] font-medium uppercase tracking-wider sticky top-0">
                <button
                  onClick={() => toggleSort('number')}
                  className="flex items-center gap-1 hover:text-white transition-colors text-left"
                >
                  Invoice
                  {sortField === 'number' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => toggleSort('date')}
                  className="flex items-center gap-1 hover:text-white transition-colors text-left"
                >
                  Date
                  {sortField === 'date' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => toggleSort('amount')}
                  className="flex items-center gap-1 hover:text-white transition-colors text-right justify-end"
                >
                  Amount
                  {sortField === 'amount' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <span className="text-right">Status</span>
              </div>

              {/* Invoice Rows */}
              {filteredInvoices.map((invoice) => {
                const inv = invoice as InvoiceWithRelations;
                const isSelected = selectedId === invoice.id;
                const statusColor = STATUS_COLORS[invoice.paidStatus];

                return (
                  <button
                    key={invoice.id}
                    onClick={() => setSelectedId(isSelected ? null : invoice.id)}
                    className={`
                      w-full px-4 py-3 grid grid-cols-[1fr_120px_140px_100px] gap-4 items-center text-left
                      transition-colors cursor-pointer
                      ${isSelected
                        ? 'bg-[#094771]'
                        : 'hover:bg-[#2a2d2e]'}
                    `}
                  >
                    {/* Invoice Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#858585] shrink-0" />
                        <span className="text-[#cccccc] font-medium truncate">
                          {invoice.invoiceNumber}
                        </span>
                      </div>
                      {(inv.company?.name || invoice.description) && (
                        <div className="text-sm text-[#858585] truncate pl-6">
                          {inv.company?.name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {inv.company.name}
                            </span>
                          )}
                          {invoice.description && !inv.company?.name && (
                            <span>{invoice.description}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-sm text-[#cccccc] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#858585]" />
                      {formatPeriod(invoice.periodYear, invoice.periodMonth)}
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <span className="text-[#cccccc] font-medium">
                        {formatCurrency(invoice.amountCents)}
                      </span>
                      {invoice.gstCents > 0 && (
                        <span className="text-xs text-[#858585] ml-1">
                          +{formatCurrency(invoice.gstCents)} GST
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${statusColor.text} ${statusColor.bg}`}
                      >
                        {invoice.paidStatus}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#3e3e42] flex items-center justify-between shrink-0">
          <div className="text-sm text-[#858585]">
            {selectedId && (
              <span className="text-[#cccccc]">
                1 invoice selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[#cccccc] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedId || isLinking}
              className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              {isLinking ? 'Linking...' : 'Link Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LinkInvoiceDialog;
