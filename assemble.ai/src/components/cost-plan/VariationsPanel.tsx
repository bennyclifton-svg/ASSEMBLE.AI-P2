'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Upload, Check, X, Trash, ChevronUp, ChevronDown } from 'lucide-react';
import { useVariations, useVariationMutations, useCostLines } from '@/lib/hooks/cost-plan';
import { formatCurrency } from '@/lib/calculations/cost-plan-formulas';
import { VariationDropZone } from './VariationDropZone';
import type { VariationStatus, VariationCategory, VariationWithCostLine, CreateVariationInput } from '@/types/variation';
import type { CostLineWithCalculations } from '@/types/cost-plan';

// App color palette - consistent with global styles
const COLORS = {
    bg: {
        primary: 'var(--color-bg-primary)',
        secondary: 'var(--color-bg-secondary)',
        tertiary: 'var(--color-bg-tertiary)',
        hover: 'var(--color-bg-tertiary)',
    },
    text: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-muted)',
        muted: 'var(--color-text-muted)',
    },
    border: {
        primary: 'var(--color-border)',
        secondary: 'var(--color-border)',
    },
    accent: {
        blue: 'var(--color-accent-green)',
        variation: 'var(--primitive-copper)',  // copper - unified accent
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
            <div className="h-full flex items-center justify-center bg-[var(--color-bg-primary)]">
                <div className="text-center">
                    <p className="text-[var(--color-accent-coral)] mb-2">Failed to load variations</p>
                    <button onClick={() => refetch()} className="text-sm text-[var(--color-accent-teal)] hover:opacity-80">
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

    // Handle upload complete - refresh variations list
    const handleUploadComplete = () => {
        refetch();
    };

    return (
        <VariationDropZone projectId={projectId} onUploadComplete={handleUploadComplete}>
            <div className="h-full flex flex-col bg-[var(--color-bg-primary)] text-xs">
                {/* Toolbar */}
                <div className="flex items-center justify-end px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        Drop Variation
                    </span>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto @container">
                    <table className="w-full border-collapse text-[11px]" style={{ tableLayout: 'fixed' }}>
                        <thead className="sticky top-0 z-10 bg-[var(--color-accent-copper-tint)]">
                        <tr>
                            <th
                                className="border border-[var(--color-accent-copper)] px-2 py-2 text-left text-[var(--color-accent-copper)] font-medium w-[70px] cursor-pointer hover:bg-[var(--color-accent-copper)]/20 select-none"
                                onClick={() => handleSort('variationNumber')}
                            >
                                <div className="flex items-center gap-1">
                                    Var No.
                                    <SortIndicator column="variationNumber" />
                                </div>
                            </th>
                            <th
                                className="border border-[var(--color-accent-copper)] px-2 py-2 text-left text-[var(--color-accent-copper)] font-medium cursor-pointer hover:bg-[var(--color-accent-copper)]/20 select-none"
                                onClick={() => handleSort('description')}
                            >
                                <div className="flex items-center gap-1">
                                    Description
                                    <SortIndicator column="description" />
                                </div>
                            </th>
                            <th
                                className="border border-[var(--color-accent-copper)] px-2 py-2 text-left text-[var(--color-accent-copper)] font-medium w-[180px] cursor-pointer hover:bg-[var(--color-accent-copper)]/20 select-none hidden @[800px]:table-cell"
                                onClick={() => handleSort('costLine')}
                            >
                                <div className="flex items-center gap-1">
                                    Cost Line
                                    <SortIndicator column="costLine" />
                                </div>
                            </th>
                            <th
                                className="border border-[var(--color-accent-copper)] px-2 py-2 text-left text-[var(--color-accent-copper)] font-medium w-[90px] cursor-pointer hover:bg-[var(--color-accent-copper)]/20 select-none hidden @[700px]:table-cell"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center gap-1">
                                    Status
                                    <SortIndicator column="status" />
                                </div>
                            </th>
                            <th
                                className="border border-[var(--color-accent-copper)] px-2 py-2 text-right text-[var(--color-accent-copper)] font-medium w-[85px] cursor-pointer hover:bg-[var(--color-accent-copper)]/20 select-none"
                                onClick={() => handleSort('forecast')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Forecast
                                    <SortIndicator column="forecast" />
                                </div>
                            </th>
                            <th
                                className="border border-[var(--color-accent-copper)] px-2 py-2 text-right text-[var(--color-accent-copper)] font-medium w-[85px] cursor-pointer hover:bg-[var(--color-accent-copper)]/20 select-none"
                                onClick={() => handleSort('approved')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Approved
                                    <SortIndicator column="approved" />
                                </div>
                            </th>
                            <th
                                className="border border-[var(--color-accent-copper)] px-2 py-2 text-left text-[var(--color-accent-copper)] font-medium w-[90px] cursor-pointer hover:bg-[var(--color-accent-copper)]/20 select-none hidden @[600px]:table-cell"
                                onClick={() => handleSort('date')}
                            >
                                <div className="flex items-center gap-1">
                                    Date
                                    <SortIndicator column="date" />
                                </div>
                            </th>
                            <th
                                className="border border-[var(--color-accent-copper)] px-2 py-2 text-center text-[var(--color-accent-copper)] font-medium w-[50px] cursor-pointer hover:bg-[var(--color-accent-copper)]/20 select-none hidden @[500px]:table-cell"
                                onClick={() => handleSort('category')}
                            >
                                <div className="flex items-center justify-center gap-1">
                                    Cat
                                    <SortIndicator column="category" />
                                </div>
                            </th>
                            <th className="border border-[var(--color-accent-copper)] px-2 py-2 text-center text-[var(--color-accent-copper)] font-medium w-[40px]">
                                <button
                                    onClick={() => setShowAddRow(true)}
                                    disabled={showAddRow}
                                    className="p-0.5 text-[var(--color-accent-copper)] hover:text-[var(--color-accent-teal)] transition-colors disabled:opacity-50"
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
                                <td colSpan={9} className="text-center py-8 text-[var(--color-text-muted)] bg-[var(--color-bg-primary)]">Loading variations...</td>
                            </tr>
                        ) : sortedVariations.length === 0 && !showAddRow ? (
                            <tr>
                                <td colSpan={9} className="text-center py-8 text-[var(--color-text-muted)] bg-[var(--color-bg-primary)]">
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
        </VariationDropZone>
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

    const inputClass = "w-full h-full px-2 py-1 -mx-2 -my-1 bg-transparent border border-[var(--color-border)]/60 text-[11px] text-[var(--color-text-primary)] focus:outline-none";
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
        <tr className="group bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] transition-colors">
            <td className="border-x border-[var(--color-border)] px-2 py-1.5 font-mono font-medium text-[var(--color-accent-yellow)] w-[70px]">
                {variation.variationNumber}
            </td>
            <td
                className="border-x border-[var(--color-border)] px-2 py-1.5 cursor-pointer"
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
                    <span className="truncate block text-[var(--color-text-primary)]">
                        {variation.description}
                    </span>
                )}
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1 w-[180px] hidden @[800px]:table-cell">
                <select
                    value={variation.costLineId || ''}
                    onChange={(e) => handleCostLineChange(e.target.value)}
                    className="w-full px-1 py-0.5 bg-transparent border-0 hover:bg-[var(--color-bg-tertiary)] focus:bg-[var(--color-bg-tertiary)] rounded text-[11px] text-[var(--color-text-primary)] focus:outline-none cursor-pointer"
                    title={variation.costLine?.activity || ''}
                    style={{ colorScheme: 'dark' }}
                >
                    <option value="" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">None</option>
                    {sortedCostLines.map((line) => {
                        const stakeholderName = line.stakeholder?.name || '';
                        const label = line.costCode
                            ? stakeholderName
                                ? `${line.costCode} - ${stakeholderName} - ${line.activity}`
                                : `${line.costCode} - ${line.activity}`
                            : stakeholderName
                                ? `${stakeholderName} - ${line.activity}`
                                : line.activity;
                        return (
                            <option key={line.id} value={line.id} title={label} className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                                {label}
                            </option>
                        );
                    })}
                </select>
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1 w-[90px] hidden @[700px]:table-cell">
                <select
                    value={variation.status}
                    onChange={(e) => handleStatusChange(e.target.value as VariationStatus)}
                    className="w-full px-1 py-0.5 bg-transparent border-0 hover:bg-[var(--color-bg-tertiary)] focus:bg-[var(--color-bg-tertiary)] rounded text-[11px] text-[var(--color-text-primary)] focus:outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                >
                    <option value="Forecast" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">Forecast</option>
                    <option value="Approved" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">Approved</option>
                    <option value="Rejected" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">Rejected</option>
                    <option value="Withdrawn" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">Withdrawn</option>
                </select>
            </td>
            <td
                className="border-x border-[var(--color-border)] px-2 py-1.5 text-right cursor-pointer w-[85px]"
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
                    <span className="font-mono text-[var(--color-text-primary)]">
                        {formatCurrency(variation.amountForecastCents)}
                    </span>
                )}
            </td>
            <td
                className="border-x border-[var(--color-border)] px-2 py-1.5 text-right cursor-pointer w-[85px]"
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
                    <span className="font-mono text-[var(--color-text-primary)]">
                        {variation.amountApprovedCents > 0 ? formatCurrency(variation.amountApprovedCents) : '-'}
                    </span>
                )}
            </td>
            <td
                className="border-x border-[var(--color-border)] px-2 py-1.5 text-[var(--color-text-muted)] cursor-pointer w-[90px] hidden @[600px]:table-cell"
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
                    <span>
                        {variation.dateSubmitted ? new Date(variation.dateSubmitted).toLocaleDateString() : '-'}
                    </span>
                )}
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1 w-[50px] hidden @[500px]:table-cell">
                <select
                    value={variation.category}
                    onChange={(e) => handleCategoryChange(e.target.value as VariationCategory)}
                    className="w-full px-0.5 py-0.5 bg-transparent border-0 hover:bg-[var(--color-bg-tertiary)] focus:bg-[var(--color-bg-tertiary)] rounded text-[10px] text-[var(--color-text-primary)] focus:outline-none cursor-pointer text-center"
                    style={{ colorScheme: 'dark' }}
                >
                    <option value="Principal" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">PV</option>
                    <option value="Contractor" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">CV</option>
                    <option value="Lessor Works" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">LV</option>
                </select>
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1 text-center w-[40px]">
                <button
                    onClick={onDelete}
                    className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent-coral)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors opacity-0 group-hover:opacity-100"
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

    const inputClass = "w-full h-full px-2 py-1 -mx-1 -my-0.5 bg-transparent border border-[var(--color-border)]/60 text-[11px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none";
    const numberInputClass = `${inputClass} text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

    return (
        <tr className="bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]" onKeyDown={handleKeyDown}>
            <td className="border-x border-[var(--color-border)] px-2 py-1.5 font-mono text-[var(--color-text-muted)] italic">
                Auto
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1">
                <input
                    ref={descriptionRef}
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description..."
                    className={inputClass}
                />
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1 hidden @[800px]:table-cell">
                <select
                    value={formData.costLineId}
                    onChange={(e) => setFormData({ ...formData, costLineId: e.target.value })}
                    className="w-full px-1.5 py-1 bg-transparent border-0 hover:bg-[var(--color-bg-tertiary)] focus:bg-[var(--color-bg-tertiary)] rounded text-[11px] text-[var(--color-text-primary)] focus:outline-none cursor-pointer"
                    title={formData.costLineId ? sortedCostLines.find(l => l.id === formData.costLineId)?.activity : ''}
                    style={{ colorScheme: 'dark' }}
                >
                    <option value="" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">None</option>
                    {sortedCostLines.map((line) => {
                        const stakeholderName = line.stakeholder?.name || '';
                        const label = line.costCode
                            ? stakeholderName
                                ? `${line.costCode} - ${stakeholderName} - ${line.activity}`
                                : `${line.costCode} - ${line.activity}`
                            : stakeholderName
                                ? `${stakeholderName} - ${line.activity}`
                                : line.activity;
                        return (
                            <option key={line.id} value={line.id} title={label} className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                                {label}
                            </option>
                        );
                    })}
                </select>
            </td>
            <td className="border-x border-[var(--color-border)] px-2 py-1.5 hidden @[700px]:table-cell">
                <span className="px-1.5 py-0.5 rounded text-[10px] border bg-yellow-900/40 text-yellow-400 border-yellow-600">
                    Forecast
                </span>
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1 w-[85px]">
                <input
                    type="number"
                    value={formData.amountForecastCents / 100 || ''}
                    onChange={(e) => setFormData({ ...formData, amountForecastCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    placeholder="0.00"
                    className={numberInputClass}
                />
            </td>
            <td className="border-x border-[var(--color-border)] px-2 py-1.5 text-right font-mono text-[var(--color-text-muted)] w-[85px]">
                -
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1 hidden @[600px]:table-cell">
                <span className="text-[var(--color-text-muted)] text-[10px]">-</span>
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1 w-[50px] hidden @[500px]:table-cell">
                <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as VariationCategory })}
                    className="w-full px-0.5 py-0.5 bg-transparent border-0 hover:bg-[var(--color-bg-tertiary)] focus:bg-[var(--color-bg-tertiary)] rounded text-[10px] text-[var(--color-text-primary)] focus:outline-none cursor-pointer text-center"
                    style={{ colorScheme: 'dark' }}
                >
                    <option value="Principal" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">PV</option>
                    <option value="Contractor" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">CV</option>
                    <option value="Lessor Works" className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">LV</option>
                </select>
            </td>
            <td className="border-x border-[var(--color-border)] px-1 py-1 w-[40px]">
                <div className="flex items-center justify-center gap-0.5">
                    <button
                        onClick={handleSave}
                        disabled={!formData.description.trim() || isSubmitting}
                        className="p-0.5 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Save (Enter)"
                    >
                        <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="p-0.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded disabled:opacity-50 transition-colors"
                        title="Cancel (Esc)"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </td>
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
    // Handle Enter key to confirm delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !isSubmitting) {
                e.preventDefault();
                onConfirm();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onConfirm, onClose, isSubmitting]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-xl w-full max-w-sm border border-[var(--color-border)]">
                <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Delete {itemType}</h2>
                </div>
                <div className="p-4 space-y-4">
                    <p className="text-sm text-[var(--color-text-primary)]">
                        Are you sure you want to delete <strong>&quot;{itemName}&quot;</strong>?
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs bg-[var(--color-accent-coral)] text-white rounded hover:bg-[var(--color-accent-coral)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
