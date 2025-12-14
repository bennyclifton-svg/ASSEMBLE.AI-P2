'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Upload, Check, X, Trash, ChevronUp, ChevronDown } from 'lucide-react';
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

// Sort column type for sortable headers
type SortColumn = 'invoiceNumber' | 'description' | 'costLine' | 'period' | 'invoiceDate' | 'amountCents' | 'paidStatus';

interface InvoicesPanelProps {
    projectId: string;
}

export function InvoicesPanel({ projectId }: InvoicesPanelProps) {
    const { invoices, isLoading, error, refetch } = useInvoices(projectId);
    const { createInvoice, updateInvoice, deleteInvoice, isSubmitting } = useInvoiceMutations(projectId, refetch);
    const { costLines } = useCostLines(projectId);

    const [showAddRow, setShowAddRow] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; invoiceNo: string } | null>(null);
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Handle sort column click
    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Sort invoices based on current sort state
    const sortedInvoices = useMemo(() => {
        if (!sortColumn) return invoices;

        return [...invoices].sort((a, b) => {
            let aVal: string | number;
            let bVal: string | number;

            switch (sortColumn) {
                case 'invoiceNumber':
                    aVal = a.invoiceNumber.toLowerCase();
                    bVal = b.invoiceNumber.toLowerCase();
                    break;
                case 'description':
                    aVal = (a.description || '').toLowerCase();
                    bVal = (b.description || '').toLowerCase();
                    break;
                case 'costLine':
                    aVal = (a.costLine?.activity || '').toLowerCase();
                    bVal = (b.costLine?.activity || '').toLowerCase();
                    break;
                case 'period':
                    aVal = a.periodYear * 100 + a.periodMonth;
                    bVal = b.periodYear * 100 + b.periodMonth;
                    break;
                case 'invoiceDate':
                    aVal = a.invoiceDate;
                    bVal = b.invoiceDate;
                    break;
                case 'amountCents':
                    aVal = a.amountCents;
                    bVal = b.amountCents;
                    break;
                case 'paidStatus':
                    aVal = a.paidStatus;
                    bVal = b.paidStatus;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [invoices, sortColumn, sortDirection]);

    const handleAddInvoice = async (data: Omit<CreateInvoiceInput, 'projectId'>) => {
        await createInvoice(data);
        setShowAddRow(false);
    };

    const handleDeleteInvoice = async (id: string) => {
        await deleteInvoice(id);
        setDeleteConfirm(null);
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
            <div className="flex items-center justify-end px-4 py-2 border-b border-[#3e3e42] bg-[#252526]">
                <span className="text-[10px] text-[#6e6e6e] flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Drop Invoice
                </span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-[11px]" style={{ tableLayout: 'fixed' }}>
                    <thead className="sticky top-0 z-10" style={{ backgroundColor: COLORS.accent.invoice }}>
                        <tr>
                            <th
                                className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[100px] cursor-pointer hover:bg-[#5a8ab5] select-none"
                                onClick={() => handleSort('invoiceNumber')}
                            >
                                <div className="flex items-center gap-1">
                                    Invoice No.
                                    {sortColumn === 'invoiceNumber' && (
                                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium cursor-pointer hover:bg-[#5a8ab5] select-none"
                                onClick={() => handleSort('description')}
                            >
                                <div className="flex items-center gap-1">
                                    Description
                                    {sortColumn === 'description' && (
                                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[160px] cursor-pointer hover:bg-[#5a8ab5] select-none"
                                onClick={() => handleSort('costLine')}
                            >
                                <div className="flex items-center gap-1">
                                    Cost Line
                                    {sortColumn === 'costLine' && (
                                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[80px] cursor-pointer hover:bg-[#5a8ab5] select-none"
                                onClick={() => handleSort('period')}
                            >
                                <div className="flex items-center gap-1">
                                    Period
                                    {sortColumn === 'period' && (
                                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[90px] cursor-pointer hover:bg-[#5a8ab5] select-none"
                                onClick={() => handleSort('invoiceDate')}
                            >
                                <div className="flex items-center gap-1">
                                    Date
                                    {sortColumn === 'invoiceDate' && (
                                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="border border-[#5080a0] px-2 py-2 text-right text-[#1e1e1e] font-medium w-[100px] cursor-pointer hover:bg-[#5a8ab5] select-none"
                                onClick={() => handleSort('amountCents')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Amount ex GST
                                    {sortColumn === 'amountCents' && (
                                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="border border-[#5080a0] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[80px] cursor-pointer hover:bg-[#5a8ab5] select-none"
                                onClick={() => handleSort('paidStatus')}
                            >
                                <div className="flex items-center gap-1">
                                    Status
                                    {sortColumn === 'paidStatus' && (
                                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th className="border border-[#5080a0] px-2 py-2 text-center text-[#1e1e1e] font-medium w-[40px]">
                                <button
                                    onClick={() => setShowAddRow(true)}
                                    disabled={showAddRow}
                                    className="p-0.5 text-[#1e1e1e] hover:text-[#0e639c] transition-colors disabled:opacity-50"
                                    title="Add Invoice"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-[#858585] bg-[#1e1e1e]">Loading invoices...</td>
                            </tr>
                        ) : sortedInvoices.length === 0 && !showAddRow ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-[#858585] bg-[#1e1e1e]">
                                    No invoices yet. Click the + icon to add one.
                                </td>
                            </tr>
                        ) : (
                            sortedInvoices.map((invoice) => (
                                <InvoiceRow
                                    key={invoice.id}
                                    invoice={invoice}
                                    costLines={costLines}
                                    onUpdate={updateInvoice}
                                    onDelete={() => setDeleteConfirm({ id: invoice.id, invoiceNo: invoice.invoiceNumber })}
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
                    {sortedInvoices.length > 0 && (
                        <tfoot className="bg-[#2d2d30] font-semibold">
                            <tr>
                                <td colSpan={5} className="border border-[#3e3e42] px-2 py-1.5 text-right text-[#858585]">
                                    Total:
                                </td>
                                <td className="border border-[#3e3e42] px-2 py-1.5 text-right font-mono text-[#cccccc]">
                                    {formatCurrency(sortedInvoices.reduce((sum, inv) => sum + inv.amountCents, 0))}
                                </td>
                                <td className="border border-[#3e3e42] px-2 py-1.5"></td>
                                <td className="border border-[#3e3e42] px-2 py-1.5"></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <DeleteConfirmDialog
                    itemName={deleteConfirm.invoiceNo}
                    itemType="invoice"
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={() => handleDeleteInvoice(deleteConfirm.id)}
                    isSubmitting={isSubmitting}
                />
            )}
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
    onDelete: () => void;
}

function InvoiceRow({ invoice, costLines, onUpdate, onDelete }: InvoiceRowProps) {
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Determine if status is paid (treat partial as unpaid for display purposes)
    const isPaid = invoice.paidStatus === 'paid';

    const inputClass = "w-full p-0 bg-transparent border-none rounded text-[11px] text-[#cccccc] focus:outline-none";
    const numberInputClass = `${inputClass} text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

    const periodDate = new Date(invoice.periodYear, invoice.periodMonth - 1);
    const periodLabel = periodDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });

    // Sort cost lines alphabetically by cost code or description
    const sortedCostLines = [...costLines].sort((a, b) => {
        const aKey = a.costCode || a.activity;
        const bKey = b.costCode || b.activity;
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
        <tr className="group bg-[#252526] hover:bg-[#2a2d2e] border-b border-[#3e3e42] transition-colors">
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
                    title={invoice.costLine?.activity || ''}
                >
                    <option value="">None</option>
                    {sortedCostLines.map((line) => {
                        const disciplineOrTrade = line.discipline?.disciplineName || line.trade?.tradeName || '';
                        const label = line.costCode
                            ? disciplineOrTrade
                                ? `${line.costCode} - ${disciplineOrTrade} - ${line.activity}`
                                : `${line.costCode} - ${line.activity}`
                            : disciplineOrTrade
                                ? `${disciplineOrTrade} - ${line.activity}`
                                : line.activity;
                        return (
                            <option key={line.id} value={line.id} title={label}>
                                {label}
                            </option>
                        );
                    })}
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
                <button
                    onClick={() => onUpdate(invoice.id, { paidStatus: isPaid ? 'unpaid' : 'paid' })}
                    className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${
                        isPaid
                            ? 'bg-green-900/40 text-green-400 border-green-600 hover:bg-green-900/60'
                            : 'bg-yellow-900/40 text-yellow-400 border-yellow-600 hover:bg-yellow-900/60'
                    }`}
                >
                    {isPaid ? 'Paid' : 'Unpaid'}
                </button>
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1 text-center w-[40px]">
                <button
                    onClick={onDelete}
                    className="p-0.5 text-[#858585] hover:text-[#f87171] hover:bg-[#4e4e52] rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete invoice"
                >
                    <Trash className="h-3 w-3" />
                </button>
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
        const aKey = a.costCode || a.activity;
        const bKey = b.costCode || b.activity;
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
                    title={formData.costLineId ? sortedCostLines.find(l => l.id === formData.costLineId)?.activity : ''}
                >
                    <option value="">None</option>
                    {sortedCostLines.map((line) => {
                        const disciplineOrTrade = line.discipline?.disciplineName || line.trade?.tradeName || '';
                        const label = line.costCode
                            ? disciplineOrTrade
                                ? `${line.costCode} - ${disciplineOrTrade} - ${line.activity}`
                                : `${line.costCode} - ${line.activity}`
                            : disciplineOrTrade
                                ? `${disciplineOrTrade} - ${line.activity}`
                                : line.activity;
                        return (
                            <option key={line.id} value={line.id} title={label}>
                                {label}
                            </option>
                        );
                    })}
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
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paidStatus: formData.paidStatus === 'paid' ? 'unpaid' : 'paid' })}
                        className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${
                            formData.paidStatus === 'paid'
                                ? 'bg-green-900/40 text-green-400 border-green-600 hover:bg-green-900/60'
                                : 'bg-yellow-900/40 text-yellow-400 border-yellow-600 hover:bg-yellow-900/60'
                        }`}
                    >
                        {formData.paidStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </button>
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
            <td className="border-x border-[#3e3e42] px-1 py-1 w-[40px]"></td>
        </tr>
    );
}

interface DeleteConfirmDialogProps {
    itemName: string;
    itemType: string;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
}

function DeleteConfirmDialog({ itemName, itemType, onClose, onConfirm, isSubmitting }: DeleteConfirmDialogProps) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#252526] rounded-lg shadow-xl w-full max-w-sm border border-[#3e3e42]">
                <div className="px-4 py-3 border-b border-[#3e3e42]">
                    <h2 className="text-sm font-semibold text-[#cccccc]">Delete {itemType}</h2>
                </div>
                <div className="p-4 space-y-4">
                    <p className="text-sm text-[#cccccc]">
                        Are you sure you want to delete <strong>&quot;{itemName}&quot;</strong>?
                    </p>
                    <p className="text-xs text-[#858585]">
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs text-[#858585] hover:text-[#cccccc] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs bg-[#f87171] text-white rounded hover:bg-[#ef4444] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InvoicesPanel;
