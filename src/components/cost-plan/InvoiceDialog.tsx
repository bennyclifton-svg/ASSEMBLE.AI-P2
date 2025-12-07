'use client';

import { useState } from 'react';
import { X, Plus, FileText } from 'lucide-react';
import { useInvoices, useInvoiceMutations } from '@/lib/hooks/cost-plan';
import { formatCurrency, getCurrentPeriod } from '@/lib/calculations/cost-plan-formulas';
import type { Invoice, CreateInvoiceInput } from '@/types/invoice';

interface InvoiceDialogProps {
  projectId: string;
  costLineId: string;
  costLineDescription: string;
  onClose: () => void;
}

export function InvoiceDialog({
  projectId,
  costLineId,
  costLineDescription,
  onClose,
}: InvoiceDialogProps) {
  const { invoices, isLoading, refetch } = useInvoices(projectId, { costLineId });
  const { createInvoice, isSubmitting } = useInvoiceMutations(projectId, refetch);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateInvoiceInput>>({
    periodYear: getCurrentPeriod().year,
    periodMonth: getCurrentPeriod().month,
    invoiceNumber: '',
    amountCents: 0,
    status: 'Submitted',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNumber || !formData.amountCents) return;

    await createInvoice({
      costLineId,
      periodYear: formData.periodYear!,
      periodMonth: formData.periodMonth!,
      invoiceNumber: formData.invoiceNumber,
      amountCents: formData.amountCents,
      status: formData.status || 'Submitted',
      description: formData.description,
    });

    setShowAddForm(false);
    setFormData({
      periodYear: getCurrentPeriod().year,
      periodMonth: getCurrentPeriod().month,
      invoiceNumber: '',
      amountCents: 0,
      status: 'Submitted',
    });
  };

  const totalClaimed = invoices.reduce((sum, inv) => sum + inv.amountCents, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252536] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Invoices</h2>
            <p className="text-sm text-gray-400">{costLineDescription}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading invoices...</div>
          ) : invoices.length === 0 && !showAddForm ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No invoices linked to this cost line</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add Invoice
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Invoice List */}
              {invoices.length > 0 && (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <InvoiceRow key={invoice.id} invoice={invoice} />
                  ))}

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-700 text-sm">
                    <span className="text-gray-400">Total Claimed:</span>
                    <span className="text-white font-medium">
                      {formatCurrency(totalClaimed)}
                    </span>
                  </div>
                </div>
              )}

              {/* Add Form */}
              {showAddForm && (
                <form onSubmit={handleSubmit} className="space-y-4 border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-white">New Invoice</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Invoice Number</label>
                      <input
                        type="text"
                        value={formData.invoiceNumber || ''}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        placeholder="INV-001"
                        className="w-full px-3 py-2 bg-[#1e1e2e] border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Amount</label>
                      <input
                        type="number"
                        value={(formData.amountCents || 0) / 100}
                        onChange={(e) => setFormData({ ...formData, amountCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-[#1e1e2e] border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Period</label>
                      <div className="flex gap-2">
                        <select
                          value={formData.periodMonth}
                          onChange={(e) => setFormData({ ...formData, periodMonth: parseInt(e.target.value) })}
                          className="flex-1 px-3 py-2 bg-[#1e1e2e] border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={formData.periodYear}
                          onChange={(e) => setFormData({ ...formData, periodYear: parseInt(e.target.value) })}
                          className="w-24 px-3 py-2 bg-[#1e1e2e] border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Invoice['status'] })}
                        className="w-full px-3 py-2 bg-[#1e1e2e] border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!formData.invoiceNumber || !formData.amountCents || isSubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Invoice'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {invoices.length > 0 && !showAddForm && (
          <div className="px-4 py-3 border-t border-gray-700">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Invoice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const statusColors: Record<Invoice['status'], string> = {
    Draft: 'text-gray-400 bg-gray-700',
    Submitted: 'text-yellow-400 bg-yellow-900/30',
    Approved: 'text-blue-400 bg-blue-900/30',
    Paid: 'text-green-400 bg-green-900/30',
    Rejected: 'text-red-400 bg-red-900/30',
  };

  const periodLabel = `${new Date(2000, invoice.periodMonth - 1).toLocaleString('default', { month: 'short' })} ${invoice.periodYear}`;

  return (
    <div className="flex items-center justify-between p-3 bg-[#1e1e2e] rounded">
      <div className="flex items-center gap-4">
        <FileText className="w-5 h-5 text-gray-500" />
        <div>
          <div className="text-white font-medium">{invoice.invoiceNumber}</div>
          <div className="text-sm text-gray-400">{periodLabel}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[invoice.status]}`}>
          {invoice.status}
        </span>
        <span className="text-white font-medium">
          {formatCurrency(invoice.amountCents)}
        </span>
      </div>
    </div>
  );
}

export default InvoiceDialog;
