'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Upload, Check, X, Trash, ChevronUp, ChevronDown } from 'lucide-react';
import { useVariations, useVariationMutations, useCostLines } from '@/lib/hooks/cost-plan';
import { formatCurrency } from '@/lib/calculations/cost-plan-formulas';
import type { VariationStatus, VariationCategory, VariationWithCostLine, CreateVariationInput } from '@/types/variation';
import type { CostLineWithCalculations } from '@/types/cost-plan';

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
        variation: '#D4A574',
    },
    status: {
        forecast: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', border: 'border-yellow-600' },
        approved: { bg: 'bg-green-900/40', text: 'text-green-400', border: 'border-green-600' },
        rejected: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-600' },
        withdrawn: { bg: 'bg-gray-700/40', text: 'text-gray-400', border: 'border-gray-600' },
    },
    category: {
        Principal: 'bg-blue-900/40 text-blue-400 border-blue-600',
        Contractor: 'bg-purple-900/40 text-purple-400 border-purple-600',
        'Lessor Works': 'bg-orange-900/40 text-orange-400 border-orange-600',
    },
};

// Sort column type for sortable headers
type SortColumn = 'variationNumber' | 'description' | 'costLine' | 'status' | 'forecast' | 'approved' | 'date' | 'category';

interface VariationsPanelProps {
    projectId: string;
}

export function VariationsPanel({ projectId }: VariationsPanelProps) {
    const { variations, isLoading, error, refetch } = useVariations(projectId);
    const { createVariation, updateVariation, deleteVariation, isSubmitting } = useVariationMutations(projectId, refetch);
    const { costLines } = useCostLines(projectId);

    const [showAddRow, setShowAddRow] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; variationNo: string } | null>(null);
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

    // Sort variations based on current sort state
    const sortedVariations = useMemo(() => {
        if (!sortColumn) return variations;

        return [...variations].sort((a, b) => {
            let aVal: string | number;
            let bVal: string | number;

            switch (sortColumn) {
                case 'variationNumber':
                    aVal = a.variationNumber.toLowerCase();
                    bVal = b.variationNumber.toLowerCase();
                    break;
                case 'description':
                    aVal = a.description.toLowerCase();
                    bVal = b.description.toLowerCase();
                    break;
                case 'costLine':
                    aVal = (a.costLine?.activity || '').toLowerCase();
                    bVal = (b.costLine?.activity || '').toLowerCase();
                    break;
                case 'status':
                    aVal = a.status.toLowerCase();
                    bVal = b.status.toLowerCase();
                    break;
                case 'forecast':
                    aVal = a.amountForecastCents;
                    bVal = b.amountForecastCents;
                    break;
                case 'approved':
                    aVal = a.amountApprovedCents;
                    bVal = b.amountApprovedCents;
                    break;
                case 'date':
                    aVal = a.dateSubmitted || '';
                    bVal = b.dateSubmitted || '';
                    break;
                case 'category':
                    aVal = a.category.toLowerCase();
                    bVal = b.category.toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [variations, sortColumn, sortDirection]);

    const handleAddVariation = async (data: Omit<CreateVariationInput, 'projectId'>) => {
        await createVariation(data);
        setShowAddRow(false);
    };

    const handleDeleteVariation = async (id: string) => {
        await deleteVariation(id);
        setDeleteConfirm(null);
    };

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="text-center">
                    <p className="text-[#f87171] mb-2">Failed to load variations</p>
                    <button onClick={() => refetch()} className="text-sm text-[#0e639c] hover:text-[#1177bb]">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Render sort indicator
    const SortIndicator = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-xs">
            {/* Toolbar */}
            <div className="flex items-center justify-end px-4 py-2 border-b border-[#3e3e42] bg-[#252526]">
                <span className="text-[10px] text-[#6e6e6e] flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Drop Variation
                </span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-[11px]" style={{ tableLayout: 'fixed' }}>
                    <thead className="sticky top-0 z-10" style={{ backgroundColor: COLORS.accent.variation }}>
                        <tr>
                            <th
                                className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[100px] cursor-pointer hover:bg-[#c09060] select-none"
                                onClick={() => handleSort('variationNumber')}
                            >
                                <div className="flex items-center gap-1">
                                    Variation No.
                                    <SortIndicator column="variationNumber" />
                                </div>
                            </th>
                            <th
                                className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium cursor-pointer hover:bg-[#c09060] select-none"
                                onClick={() => handleSort('description')}
                            >
                                <div className="flex items-center gap-1">
                                    Description
                                    <SortIndicator column="description" />
                                </div>
                            </th>
                            <th
                                className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[200px] cursor-pointer hover:bg-[#c09060] select-none"
                                onClick={() => handleSort('costLine')}
                            >
                                <div className="flex items-center gap-1">
                                    Cost Line
                                    <SortIndicator column="costLine" />
                                </div>
                            </th>
                            <th
                                className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[90px] cursor-pointer hover:bg-[#c09060] select-none"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center gap-1">
                                    Status
                                    <SortIndicator column="status" />
                                </div>
                            </th>
                            <th
                                className="border border-[#a08050] px-2 py-2 text-right text-[#1e1e1e] font-medium w-[100px] cursor-pointer hover:bg-[#c09060] select-none"
                                onClick={() => handleSort('forecast')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Forecast
                                    <SortIndicator column="forecast" />
                                </div>
                            </th>
                            <th
                                className="border border-[#a08050] px-2 py-2 text-right text-[#1e1e1e] font-medium w-[100px] cursor-pointer hover:bg-[#c09060] select-none"
                                onClick={() => handleSort('approved')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Approved
                                    <SortIndicator column="approved" />
                                </div>
                            </th>
                            <th
                                className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[100px] cursor-pointer hover:bg-[#c09060] select-none"
                                onClick={() => handleSort('date')}
                            >
                                <div className="flex items-center gap-1">
                                    Date
                                    <SortIndicator column="date" />
                                </div>
                            </th>
                            <th
                                className="border border-[#a08050] px-2 py-2 text-center text-[#1e1e1e] font-medium w-[60px] cursor-pointer hover:bg-[#c09060] select-none"
                                onClick={() => handleSort('category')}
                            >
                                <div className="flex items-center justify-center gap-1">
                                    Cat
                                    <SortIndicator column="category" />
                                </div>
                            </th>
                            <th className="border border-[#a08050] px-2 py-2 text-center text-[#1e1e1e] font-medium w-[40px]">
                                <button
                                    onClick={() => setShowAddRow(true)}
                                    disabled={showAddRow}
                                    className="p-0.5 text-[#1e1e1e] hover:text-[#0e639c] transition-colors disabled:opacity-50"
                                    title="Add Variation"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} className="text-center py-8 text-[#858585] bg-[#1e1e1e]">Loading variations...</td>
                            </tr>
                        ) : sortedVariations.length === 0 && !showAddRow ? (
                            <tr>
                                <td colSpan={9} className="text-center py-8 text-[#858585] bg-[#1e1e1e]">
                                    No variations yet. Click the + icon to add one.
                                </td>
                            </tr>
                        ) : (
                            sortedVariations.map((variation) => (
                                <VariationRow
                                    key={variation.id}
                                    variation={variation}
                                    costLines={costLines}
                                    onUpdate={updateVariation}
                                    onDelete={() => setDeleteConfirm({ id: variation.id, variationNo: variation.variationNumber })}
                                />
                            ))
                        )}
                        {/* Inline Add Row - at bottom */}
                        {showAddRow && (
                            <AddVariationRow
                                costLines={costLines}
                                onSave={handleAddVariation}
                                onCancel={() => setShowAddRow(false)}
                                isSubmitting={isSubmitting}
                            />
                        )}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <DeleteConfirmDialog
                    itemName={deleteConfirm.variationNo}
                    itemType="variation"
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={() => handleDeleteVariation(deleteConfirm.id)}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}

interface VariationRowProps {
    variation: VariationWithCostLine;
    costLines: CostLineWithCalculations[];
    onUpdate: (id: string, data: Partial<{
        status: VariationStatus;
        category: VariationCategory;
        description: string;
        costLineId: string | null;
        amountForecastCents: number;
        amountApprovedCents: number;
        dateSubmitted: string;
    }>) => Promise<any>;
    onDelete: () => void;
}

function VariationRow({ variation, costLines, onUpdate, onDelete }: VariationRowProps) {
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    const inputClass = "w-full p-0 bg-transparent border-none rounded text-[11px] text-[#cccccc] focus:outline-none";
    const numberInputClass = `${inputClass} text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

    // Sort cost lines alphabetically by cost code or description
    const sortedCostLines = [...costLines].sort((a, b) => {
        const aKey = a.costCode || a.activity;
        const bKey = b.costCode || b.activity;
        return aKey.localeCompare(bKey, undefined, { numeric: true });
    });

    useEffect(() => {
        if (editingField && inputRef.current) {
            inputRef.current.focus();
            // Auto-open date picker
            if (editingField === 'dateSubmitted') {
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
        if (field === 'description') {
            if (editValue.trim() && editValue !== variation.description) {
                await onUpdate(variation.id, { description: editValue.trim() });
            }
        } else if (field === 'forecast') {
            const cents = Math.round(parseFloat(editValue || '0') * 100);
            if (cents !== variation.amountForecastCents) {
                await onUpdate(variation.id, { amountForecastCents: cents });
            }
        } else if (field === 'approved') {
            const cents = Math.round(parseFloat(editValue || '0') * 100);
            if (cents !== variation.amountApprovedCents) {
                await onUpdate(variation.id, { amountApprovedCents: cents });
            }
        } else if (field === 'dateSubmitted') {
            if (editValue !== variation.dateSubmitted) {
                await onUpdate(variation.id, { dateSubmitted: editValue });
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

    const handleStatusChange = async (newStatus: VariationStatus) => {
        const updateData: Partial<{
            status: VariationStatus;
            amountApprovedCents: number;
        }> = { status: newStatus };

        // When changing to Approved, copy forecast amount to approved amount if approved is 0
        if (newStatus === 'Approved' && variation.amountApprovedCents === 0) {
            updateData.amountApprovedCents = variation.amountForecastCents;
        }

        await onUpdate(variation.id, updateData);
    };

    const handleCategoryChange = async (newCategory: VariationCategory) => {
        await onUpdate(variation.id, { category: newCategory });
    };

    const handleCostLineChange = async (costLineId: string) => {
        await onUpdate(variation.id, { costLineId: costLineId || null });
    };

    return (
        <tr className="group bg-[#252526] hover:bg-[#2a2d2e] border-b border-[#3e3e42] transition-colors">
            <td className="border-x border-[#3e3e42] px-2 py-1.5 font-mono font-medium text-[#D4A574] w-[100px]">
                {variation.variationNumber}
            </td>
            <td
                className="border-x border-[#3e3e42] px-2 py-1.5 cursor-pointer"
                title={variation.description}
                onClick={() => handleStartEdit('description', variation.description)}
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
                        {variation.description}
                    </span>
                )}
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1 w-[200px]">
                <select
                    value={variation.costLineId || ''}
                    onChange={(e) => handleCostLineChange(e.target.value)}
                    className="w-full px-1 py-0.5 bg-transparent border border-transparent hover:border-[#3e3e42] focus:border-[#0e639c] rounded text-[11px] text-[#858585] focus:outline-none cursor-pointer"
                    title={variation.costLine?.activity || ''}
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
            <td className="border-x border-[#3e3e42] px-1 py-1 w-[90px]">
                <select
                    value={variation.status}
                    onChange={(e) => handleStatusChange(e.target.value as VariationStatus)}
                    className="w-full px-1 py-0.5 bg-transparent border border-transparent hover:border-[#3e3e42] focus:border-[#0e639c] rounded text-[11px] text-[#cccccc] focus:outline-none cursor-pointer"
                >
                    <option value="Forecast">Forecast</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Withdrawn">Withdrawn</option>
                </select>
            </td>
            <td
                className="border-x border-[#3e3e42] px-2 py-1.5 text-right cursor-pointer w-[100px]"
                onClick={() => handleStartEdit('forecast', (variation.amountForecastCents / 100).toString())}
            >
                {editingField === 'forecast' ? (
                    <input
                        ref={inputRef}
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit('forecast')}
                        onKeyDown={(e) => handleKeyDown(e, 'forecast')}
                        className={numberInputClass}
                    />
                ) : (
                    <span className="font-mono text-[#cccccc] hover:text-white">
                        {formatCurrency(variation.amountForecastCents)}
                    </span>
                )}
            </td>
            <td
                className="border-x border-[#3e3e42] px-2 py-1.5 text-right cursor-pointer w-[100px]"
                onClick={() => handleStartEdit('approved', (variation.amountApprovedCents / 100).toString())}
            >
                {editingField === 'approved' ? (
                    <input
                        ref={inputRef}
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit('approved')}
                        onKeyDown={(e) => handleKeyDown(e, 'approved')}
                        className={numberInputClass}
                    />
                ) : (
                    <span className="font-mono text-[#cccccc] hover:text-white">
                        {variation.amountApprovedCents > 0 ? formatCurrency(variation.amountApprovedCents) : '-'}
                    </span>
                )}
            </td>
            <td
                className="border-x border-[#3e3e42] px-2 py-1.5 text-[#858585] cursor-pointer w-[100px]"
                onClick={() => handleStartEdit('dateSubmitted', variation.dateSubmitted || '')}
            >
                {editingField === 'dateSubmitted' ? (
                    <input
                        ref={inputRef}
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit('dateSubmitted')}
                        onKeyDown={(e) => handleKeyDown(e, 'dateSubmitted')}
                        className={`${inputClass} text-[10px]`}
                    />
                ) : (
                    <span className="hover:text-white">
                        {variation.dateSubmitted ? new Date(variation.dateSubmitted).toLocaleDateString() : '-'}
                    </span>
                )}
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1 w-[60px]">
                <select
                    value={variation.category}
                    onChange={(e) => handleCategoryChange(e.target.value as VariationCategory)}
                    className="w-full px-0.5 py-0.5 bg-transparent border border-transparent hover:border-[#3e3e42] focus:border-[#0e639c] rounded text-[10px] text-[#cccccc] focus:outline-none cursor-pointer text-center"
                >
                    <option value="Principal">PV</option>
                    <option value="Contractor">CV</option>
                    <option value="Lessor Works">LV</option>
                </select>
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1 text-center w-[40px]">
                <button
                    onClick={onDelete}
                    className="p-0.5 text-[#858585] hover:text-[#f87171] hover:bg-[#4e4e52] rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete variation"
                >
                    <Trash className="h-3 w-3" />
                </button>
            </td>
        </tr>
    );
}

interface AddVariationRowProps {
    costLines: CostLineWithCalculations[];
    onSave: (data: Omit<CreateVariationInput, 'projectId'>) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
}

function AddVariationRow({ costLines, onSave, onCancel, isSubmitting }: AddVariationRowProps) {
    const descriptionRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        category: 'Principal' as VariationCategory,
        costLineId: '',
        description: '',
        amountForecastCents: 0,
    });

    // Sort cost lines alphabetically by cost code or description
    const sortedCostLines = [...costLines].sort((a, b) => {
        const aKey = a.costCode || a.activity;
        const bKey = b.costCode || b.activity;
        return aKey.localeCompare(bKey, undefined, { numeric: true });
    });

    // Auto-focus description field
    useEffect(() => {
        descriptionRef.current?.focus();
    }, []);

    const handleSave = async () => {
        if (!formData.description.trim()) return;
        await onSave({
            category: formData.category,
            costLineId: formData.costLineId || undefined,
            description: formData.description,
            amountForecastCents: formData.amountForecastCents,
            status: 'Forecast',
            dateSubmitted: new Date().toISOString().split('T')[0],
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
            <td className="border-x border-[#3e3e42] px-2 py-1.5 font-mono text-[#6e6e6e] italic">
                Auto
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <input
                    ref={descriptionRef}
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description..."
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
            <td className="border-x border-[#3e3e42] px-2 py-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] border bg-yellow-900/40 text-yellow-400 border-yellow-600">
                    Forecast
                </span>
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <input
                    type="number"
                    value={formData.amountForecastCents / 100 || ''}
                    onChange={(e) => setFormData({ ...formData, amountForecastCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    placeholder="0.00"
                    className={numberInputClass}
                />
            </td>
            <td className="border-x border-[#3e3e42] px-2 py-1.5 text-right font-mono text-[#6e6e6e]">
                -
            </td>
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={handleSave}
                        disabled={!formData.description.trim() || isSubmitting}
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
            <td className="border-x border-[#3e3e42] px-1 py-1">
                <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as VariationCategory })}
                    className={`${inputClass} text-center`}
                >
                    <option value="Principal">PV</option>
                    <option value="Contractor">CV</option>
                    <option value="Lessor Works">LV</option>
                </select>
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

export default VariationsPanel;
