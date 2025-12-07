'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, RefreshCw, FileText, CheckCircle, Clock, AlertCircle, Upload, Check, X } from 'lucide-react';
import { useInvoices, useInvoiceMutations, useCostLines } from '@/lib/hooks/cost-plan';
import { formatCurrency, getCurrentPeriod } from '@/lib/calculations/cost-plan-formulas';
import type { PaidStatus, InvoiceWithRelations, CreateInvoiceInput } from '@/types/invoice';
import type { CostLineWithCalculations } from '@/types/cost-plan';
import { InvoiceDropZone } from './InvoiceDropZone';

// App color palette - consistent with global styles
const COLORS = {
    bg: {
        primary: '#1e1e1e',
        secondary: '#252526',
        tertiary: '#2d2d30',
        hover: '#37373d',
    },
    text: {
        primary: '#cccccc',
        secondary: '#858585',
        muted: '#6e6e6e',
    },
    border: {
        primary: '#3e3e42',
        secondary: '#555555',
    },
    accent: {
        blue: '#0e639c',
        invoice: '#6B9BD1',
    },
    status: {
        unpaid: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', border: 'border-yellow-600' },
        paid: { bg: 'bg-green-900/40', text: 'text-green-400', border: 'border-green-600' },
        partial: { bg: 'bg-orange-900/40', text: 'text-orange-400', border: 'border-orange-600' },
    },
};

const STATUS_CONFIG: Record<PaidStatus, { icon: typeof Clock; style: { bg: string; text: string; border: string } }> = {
    unpaid: { icon: Clock, style: COLORS.status.unpaid },
    paid: { icon: CheckCircle, style: COLORS.status.paid },
    partial: { icon: AlertCircle, style: COLORS.status.partial },
};

interface InvoicesPanelProps {
    projectId: string;
}

export function InvoicesPanel({ projectId }: InvoicesPanelProps) {
    const { invoices, isLoading, error, refetch } = useInvoices(projectId);
    const { createInvoice, updateInvoice, isSubmitting } = useInvoiceMutations(projectId, refetch);
    const { costLines } = useCostLines(projectId);

    const [showAddRow, setShowAddRow] = useState(false);
    const [filterStatus, setFilterStatus] = useState<PaidStatus | 'all'>('all');
    const [filterPeriod, setFilterPeriod] = useState<string>('all');

    // Get unique periods for filter
    const periods = [...new Set(invoices.map(inv => `${inv.periodYear}-${String(inv.periodMonth).padStart(2, '0')}`))].sort().reverse();

    const filteredInvoices = invoices.filter(inv => {
        if (filterStatus !== 'all' && inv.paidStatus !== filterStatus) return false;
        if (filterPeriod !== 'all') {
            const invPeriod = `${inv.periodYear}-${String(inv.periodMonth).padStart(2, '0')}`;
            if (invPeriod !== filterPeriod) return false;
        }
        return true;
    });

    // Summary calculations
    const summary = {
        totalAmount: invoices.reduce((sum, inv) => sum + inv.amountCents, 0),
        paidAmount: invoices.filter(inv => inv.paidStatus === 'paid').reduce((sum, inv) => sum + inv.amountCents, 0),
        unpaidAmount: invoices.filter(inv => inv.paidStatus === 'unpaid').reduce((sum, inv) => sum + inv.amountCents, 0),
        invoiceCount: invoices.length,
    };

    const handleAddInvoice = async (data: Omit<CreateInvoiceInput, 'projectId'>) => {
        await createInvoice(data);
        setShowAddRow(false);
    };

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="text-center">
                    <p className="text-[#f87171] mb-2">Failed to load invoices</p>
                    <button onClick={() => refetch()} className="text-sm text-[#0e639c] hover:text-[#1177bb]">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <InvoiceDropZone projectId={projectId} onUploadComplete={() => refetch()}>
        <div className="h-full flex flex-col bg-[#1e1e1e] text-xs">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#3e3e42] bg-[#252526]">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[#858585]">Total:</span>
                        <span className="font-semibold text-[#cccccc]">{formatCurrency(summary.totalAmount)}</span>
                        <span className="text-[#6e6e6e]">({summary.invoiceCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[#858585]">Paid:</span>
                        <span className="font-semibold text-green-400">{formatCurrency(summary.paidAmount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[#858585]">Unpaid:</span>
                        <span className="font-semibold text-yellow-400">{formatCurrency(summary.unpaidAmount)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddRow(true)}
                        disabled={showAddRow}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Invoice
                    </button>
                    <span className="text-[#3e3e42]">|</span>
                    <span className="text-[10px] text-[#6e6e6e] flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        Drop PDF
                    </span>
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="p-1.5 text-[#858585] hover:text-[#cccccc] hover:bg-[#37373d] rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-[#3e3e42] bg-[#2d2d30]">
                <div className="flex items-center gap-2">
                    <label className="text-[#858585]">Status:</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as PaidStatus | 'all')}
                        className="px-2 py-1 bg-[#1e1e1e] border border-[#3e3e42] rounded text-xs text-[#cccccc] focus:outline-none focus:border-[#0e639c]"
                    >
                        <option value="all">All</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-[#858585]">Period:</label>
                    <select
                        value={filterPeriod}
                        onChange={(e) => setFilterPeriod(e.target.value)}
                        className="px-2 py-1 bg-[#1e1e1e] border border-[#3e3e42] rounded text-xs text-[#cccccc] focus:outline-none focus:border-[#0e639c]"
                    >
                        <option value="all">All Periods</option>
                        {periods.map(period => {
                            const [year, month] = period.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1);
                            return (
                                <option key={period} value={period}>
                                    {date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-[11px]" style={{ tableLayout: 'fixed' }}>
                    <thead className="sticky top-0 z-10" style={{ backgroundColor: COLORS.accent.invoice }}>
                        <tr>
                            <th className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[100px]">Invoice No.</th>
                            <th className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium">Description</th>
                            <th className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[160px]">Cost Line</th>
                            <th className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[80px]">Period</th>
                            <th className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[90px]">Date</th>
                            <th className="border border-[#5080a0] px-2 py-2 text-right text-[#1e1e1e] font-medium w-[100px]">Amount ex GST</th>
                            <th className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[80px]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-[#858585] bg-[#1e1e1e]">Loading invoices...</td>
                            </tr>
                        ) : filteredInvoices.length === 0 && !showAddRow ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-[#858585] bg-[#1e1e1e]">
                                    {invoices.length === 0 ? 'No invoices yet. Click "Add Invoice" to create one.' : 'No invoices match the current filters'}
                                </td>
                            </tr>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <InvoiceRow
                                    key={invoice.id}
                                    invoice={invoice}
                                    costLines={costLines}
                                    onUpdate={updateInvoice}
                                />
                            ))
                        )}
                        {/* Inline Add Row - at bottom */}
                        {showAddRow && (
                            <AddInvoiceRow
                                costLines={costLines}
                                onSave={handleAddInvoice}
                                onCancel={() => setShowAddRow(false)}
                                isSubmitting={isSubmitting}
                            />
                        )}
                    </tbody>
                    {filteredInvoices.length > 0 && (
                        <tfoot className="bg-[#2d2d30] font-semibold">
                            <tr>
                                <td colSpan={5} className="border border-[#3e3e42] px-2 py-1.5 text-right text-[#858585]">
                                    Filtered Total:
                                </td>
                                <td className="border border-[#3e3e42] px-2 py-1.5 text-right font-mono text-[#cccccc]">
                                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.amountCents, 0))}
                                </td>
                                <td className="border border-[#3e3e42] px-2 py-1.5"></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
        </InvoiceDropZone>
    );
}

interface InvoiceRowProps {
    invoice: InvoiceWithRelations;
    costLines: CostLineWithCalculations[];
    onUpdate: (id: string, data: Partial<{
        paidStatus: PaidStatus;
        description: string;
        costLineId: string | null;
        amountCents: number;
        gstCents: number;
        invoiceNumber: string;
        periodMonth: number;
        periodYear: number;
        invoiceDate: string;
    }>) => Promise<void>;
}

function InvoiceRow({ invoice, costLines, onUpdate }: InvoiceRowProps) {
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    const statusConfig = STATUS_CONFIG[invoice.paidStatus];

    const inputClass = "w-full p-0 bg-transparent border-none rounded text-[11px] text-[#cccccc] focus:outline-none";
    const numberInputClass = `${inputClass} text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

    const periodDate = new Date(invoice.periodYear, invoice.periodMonth - 1);
    const periodLabel = periodDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });

    // Sort cost lines alphabetically by cost code or description
    const sortedCostLines = [...costLines].sort((a, b) => {
        const aKey = a.costCode || a.description;
        const bKey = b.costCode || b.description;
        return aKey.localeCompare(bKey, undefined, { numeric: true });
    });

    useEffect(() => {
        if (editingField && inputRef.current) {
            inputRef.current.focus();
            // Auto-open date/month picker
            if (editingField === 'invoiceDate' || editingField === 'period') {
                try {
                    (inputRef.current as HTMLInputElement).showPicker?.();
                } catch (e) {
                    // showPicker() not supported in all browsers, fallback to regular focus
                }
            } else {
                inputRef.current.select();
            }
        }
    }, [editingField]);

    const handleStartEdit = (field: string, value: string) => {
        setEditingField(field);
        setEditValue(value);
    };

    const handleSaveEdit = async (field: string) => {
        if (field === 'invoiceNumber') {
            if (editValue.trim() && editValue !== invoice.invoiceNumber) {
                await onUpdate(invoice.id, { invoiceNumber: editValue.trim() });
            }
        } else if (field === 'description') {
            if (editValue !== (invoice.description || '')) {
                await onUpdate(invoice.id, { description: editValue.trim() });
            }
        } else if (field === 'amount') {
            const cents = Math.round(parseFloat(editValue || '0') * 100);
            if (cents !== invoice.amountCents) {
                await onUpdate(invoice.id, { amountCents: cents });
            }
        } else if (field === 'invoiceDate') {
            if (editValue !== invoice.invoiceDate) {
                await onUpdate(invoice.id, { invoiceDate: editValue });
            }
        } else if (field === 'period') {
            // editValue is in format "YYYY-MM"
            const [year, month] = editValue.split('-');
            const periodYear = parseInt(year);
            const periodMonth = parseInt(month);
            if (periodYear !== invoice.periodYear || periodMonth !== invoice.periodMonth) {
                await onUpdate(invoice.id, { periodYear, periodMonth });
            }
        }
        setEditingField(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveEdit(field);
        } else if (e.key === 'Escape') {
            setEditingField(null);
        }
    };

    const handleCostLineChange = async (costLineId: string) => {
        await onUpdate(invoice.id, { costLineId: costLineId || null });
    };

    return (
        <tr className="bg-[#252526] hover:bg-[#2a2d2e] border-b border-[#3e3e42] transition-colors">
            <td
                className="border-x border-[#3e3e42] px-2 py-1.5 font-mono font-medium text-[#6B9BD1] cursor-pointer w-[100px]"
                onClick={() => handleStartEdit('invoiceNumber', invoice.invoiceNumber)}
            >
                {editingField === 'invoiceNumber' ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit('invoiceNumber')}
                        onKeyDown={(e) => handleKeyDown(e, 'invoiceNumber')}
                        className={inputClass}
                    />
                ) : (
                    <span className="hover:text-white">{invoice.invoiceNumber}</span>
                )}
            </td>
            <td
                className="border-x border-[#3e3e42] px-2 py-1.5 max-w-[200px] cursor-pointer"
                title={invoice.description || ''}
                onClick={() => handleStartEdit('description', invoice.description || '')}
            >
                {editingField === 'description' ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit('description')}
                        onKeyDown={(e) => handleKeyDown(e, 'description')}
                        className={inputClass}
                    />
                ) : (
                    <span className="truncate block text-[#cccccc] hover:text-white">
                        {invoice.description || '-'}
                    </span>
                )}
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1 w-[160px]">
                <select
                    value={invoice.costLineId || ''}
                    onChange={(e) => handleCostLineChange(e.target.value)}
                    className="w-full px-1 py-0.5 bg-transparent border border-transparent hover:border-[#3e3e42] focus:border-[#0e639c] rounded text-[11px] text-[#858585] focus:outline-none cursor-pointer"
                    title={invoice.costLine?.description || ''}
                >
                    <option value="">None</option>
                    {sortedCostLines.map((line) => (
                        <option key={line.id} value={line.id} title={line.description}>
                            {line.costCode ? `${line.costCode} - ${line.description}` : line.description}
                        </option>
                    ))}
                </select>
            </td>
            <td
                className="border-x border-[#3e3e42] px-2 py-1.5 text-[#858585] cursor-pointer w-[80px]"
                onClick={() => handleStartEdit('period', `${invoice.periodYear}-${String(invoice.periodMonth).padStart(2, '0')}`)}
            >
                {editingField === 'period' ? (
                    <input
                        ref={inputRef}
                        type="month"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit('period')}
                        onKeyDown={(e) => handleKeyDown(e, 'period')}
                        className={`${inputClass} text-[10px]`}
                    />
                ) : (
                    <span className="hover:text-white">{periodLabel}</span>
                )}
            </td>
            <td
                className="border-x border-[#3e3e42] px-2 py-1.5 text-[#858585] cursor-pointer w-[90px]"
                onClick={() => handleStartEdit('invoiceDate', invoice.invoiceDate)}
            >
                {editingField === 'invoiceDate' ? (
                    <input
                        ref={inputRef}
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit('invoiceDate')}
                        onKeyDown={(e) => handleKeyDown(e, 'invoiceDate')}
                        className={`${inputClass} text-[10px]`}
                    />
                ) : (
                    <span className="hover:text-white">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                )}
            </td>
            <td
                className="border-x border-[#3e3e42] px-2 py-1.5 text-right cursor-pointer w-[100px]"
                onClick={() => handleStartEdit('amount', (invoice.amountCents / 100).toString())}
            >
                {editingField === 'amount' ? (
                    <input
                        ref={inputRef}
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit('amount')}
                        onKeyDown={(e) => handleKeyDown(e, 'amount')}
                        className={numberInputClass}
                    />
                ) : (
                    <span className="font-mono text-[#cccccc] hover:text-white">
                        {formatCurrency(invoice.amountCents)}
                    </span>
                )}
            </td>
            <td className="border-x border-[#3e3e42] px-2 py-1.5 w-[80px]">
                <select
                    value={invoice.paidStatus}
                    onChange={(e) => onUpdate(invoice.id, { paidStatus: e.target.value as PaidStatus })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${statusConfig.style.bg} ${statusConfig.style.text} ${statusConfig.style.border} focus:outline-none`}
                >
                    <option value="unpaid" className="bg-[#1e1e1e] text-[#cccccc]">Unpaid</option>
                    <option value="paid" className="bg-[#1e1e1e] text-[#cccccc]">Paid</option>
                    <option value="partial" className="bg-[#1e1e1e] text-[#cccccc]">Partial</option>
                </select>
            </td>
        </tr>
    );
}

interface AddInvoiceRowProps {
    costLines: CostLineWithCalculations[];
    onSave: (data: Omit<CreateInvoiceInput, 'projectId'>) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
}

function AddInvoiceRow({ costLines, onSave, onCancel, isSubmitting }: AddInvoiceRowProps) {
    const invoiceNumberRef = useRef<HTMLInputElement>(null);
    const currentPeriod = getCurrentPeriod();
    const [formData, setFormData] = useState({
        invoiceNumber: '',
        description: '',
        costLineId: '',
        periodMonth: currentPeriod.month,
        periodYear: currentPeriod.year,
        invoiceDate: new Date().toISOString().split('T')[0],
        amountCents: 0,
        gstCents: 0,
        paidStatus: 'unpaid' as PaidStatus,
    });

    // Sort cost lines alphabetically by cost code or description
    const sortedCostLines = [...costLines].sort((a, b) => {
        const aKey = a.costCode || a.description;
        const bKey = b.costCode || b.description;
        return aKey.localeCompare(bKey, undefined, { numeric: true });
    });

    // Auto-focus invoice number field
    useEffect(() => {
        invoiceNumberRef.current?.focus();
    }, []);

    const handleSave = async () => {
        if (!formData.invoiceNumber.trim() || !formData.amountCents) return;
        await onSave({
            invoiceNumber: formData.invoiceNumber,
            description: formData.description || undefined,
            costLineId: formData.costLineId || undefined,
            periodMonth: formData.periodMonth,
            periodYear: formData.periodYear,
            invoiceDate: formData.invoiceDate,
            amountCents: formData.amountCents,
            gstCents: formData.gstCents,
            paidStatus: formData.paidStatus,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const inputClass = "w-full px-1.5 py-1 bg-transparent border-none text-[11px] text-[#cccccc] placeholder-[#6e6e6e] focus:outline-none";
    const numberInputClass = `${inputClass} text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

    return (
        <tr className="bg-[#252526] hover:bg-[#2a2d2e] border-b border-[#3e3e42]" onKeyDown={handleKeyDown}>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <input
                    ref={invoiceNumberRef}
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="INV-001"
                    className={inputClass}
                />
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description..."
                    className={inputClass}
                />
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <select
                    value={formData.costLineId}
                    onChange={(e) => setFormData({ ...formData, costLineId: e.target.value })}
                    className={inputClass}
                    title={formData.costLineId ? sortedCostLines.find(l => l.id === formData.costLineId)?.description : ''}
                >
                    <option value="">None</option>
                    {sortedCostLines.map((line) => (
                        <option key={line.id} value={line.id} title={line.description}>
                            {line.costCode ? `${line.costCode} - ${line.description}` : line.description}
                        </option>
                    ))}
                </select>
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <input
                    type="month"
                    value={`${formData.periodYear}-${String(formData.periodMonth).padStart(2, '0')}`}
                    onChange={(e) => {
                        const [year, month] = e.target.value.split('-');
                        setFormData({ ...formData, periodYear: parseInt(year), periodMonth: parseInt(month) });
                    }}
                    className={`${inputClass} text-[10px]`}
                />
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className={`${inputClass} text-[10px]`}
                />
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <input
                    type="number"
                    value={formData.amountCents / 100 || ''}
                    onChange={(e) => setFormData({ ...formData, amountCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    placeholder="0.00"
                    className={numberInputClass}
                />
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <div className="flex items-center gap-1">
                    <select
                        value={formData.paidStatus}
                        onChange={(e) => setFormData({ ...formData, paidStatus: e.target.value as PaidStatus })}
                        className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer bg-yellow-900/40 text-yellow-400 border-yellow-600 focus:outline-none`}
                    >
                        <option value="unpaid" className="bg-[#1e1e1e] text-[#cccccc]">Unpaid</option>
                        <option value="paid" className="bg-[#1e1e1e] text-[#cccccc]">Paid</option>
                        <option value="partial" className="bg-[#1e1e1e] text-[#cccccc]">Partial</option>
                    </select>
                    <button
                        onClick={handleSave}
                        disabled={!formData.invoiceNumber.trim() || !formData.amountCents || isSubmitting}
                        className="p-1 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Save (Enter)"
                    >
                        <Check className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded disabled:opacity-50 transition-colors"
                        title="Cancel (Esc)"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default InvoicesPanel;
