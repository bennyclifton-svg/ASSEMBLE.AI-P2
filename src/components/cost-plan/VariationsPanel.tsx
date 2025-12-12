'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Check, X } from 'lucide-react';
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

const STATUS_CONFIG: Record<VariationStatus, { icon: typeof Clock; style: { bg: string; text: string; border: string } }> = {
    Forecast: { icon: Clock, style: COLORS.status.forecast },
    Approved: { icon: CheckCircle, style: COLORS.status.approved },
    Rejected: { icon: XCircle, style: COLORS.status.rejected },
    Withdrawn: { icon: AlertTriangle, style: COLORS.status.withdrawn },
};

interface VariationsPanelProps {
    projectId: string;
}

export function VariationsPanel({ projectId }: VariationsPanelProps) {
    const { variations, isLoading, error, refetch } = useVariations(projectId);
    const { createVariation, updateVariation, isSubmitting } = useVariationMutations(projectId, refetch);
    const { costLines } = useCostLines(projectId);

    const [showAddRow, setShowAddRow] = useState(false);
    const [filterStatus, setFilterStatus] = useState<VariationStatus | 'all'>('all');
    const [filterCategory, setFilterCategory] = useState<VariationCategory | 'all'>('all');

    const filteredVariations = variations.filter(v => {
        if (filterStatus !== 'all' && v.status !== filterStatus) return false;
        if (filterCategory !== 'all' && v.category !== filterCategory) return false;
        return true;
    });

    // Summary calculations
    const summary = {
        totalForecast: variations.filter(v => v.status === 'Forecast').reduce((sum, v) => sum + v.amountForecastCents, 0),
        totalApproved: variations.filter(v => v.status === 'Approved').reduce((sum, v) => sum + v.amountApprovedCents, 0),
        forecastCount: variations.filter(v => v.status === 'Forecast').length,
        approvedCount: variations.filter(v => v.status === 'Approved').length,
    };

    const handleAddVariation = async (data: Omit<CreateVariationInput, 'projectId'>) => {
        await createVariation(data);
        setShowAddRow(false);
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

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-xs">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#3e3e42] bg-[#252526]">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[#858585]">Forecast:</span>
                        <span className="font-semibold text-yellow-400">{formatCurrency(summary.totalForecast)}</span>
                        <span className="text-[#6e6e6e]">({summary.forecastCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[#858585]">Approved:</span>
                        <span className="font-semibold text-green-400">{formatCurrency(summary.totalApproved)}</span>
                        <span className="text-[#6e6e6e]">({summary.approvedCount})</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddRow(true)}
                        disabled={showAddRow}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Variation
                    </button>
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
                        onChange={(e) => setFilterStatus(e.target.value as VariationStatus | 'all')}
                        className="px-2 py-1 bg-[#1e1e1e] border border-[#3e3e42] rounded text-xs text-[#cccccc] focus:outline-none focus:border-[#0e639c]"
                    >
                        <option value="all">All</option>
                        <option value="Forecast">Forecast</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Withdrawn">Withdrawn</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-[#858585]">Category:</label>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as VariationCategory | 'all')}
                        className="px-2 py-1 bg-[#1e1e1e] border border-[#3e3e42] rounded text-xs text-[#cccccc] focus:outline-none focus:border-[#0e639c]"
                    >
                        <option value="all">All</option>
                        <option value="Principal">Principal</option>
                        <option value="Contractor">Contractor</option>
                        <option value="Lessor Works">Lessor Works</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-[11px]" style={{ tableLayout: 'fixed' }}>
                    <thead className="sticky top-0 z-10" style={{ backgroundColor: COLORS.accent.variation }}>
                        <tr>
                            <th className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[100px]">Variation No.</th>
                            <th className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium">Description</th>
                            <th className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[200px]">Cost Line</th>
                            <th className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[90px]">Status</th>
                            <th className="border border-[#a08050] px-2 py-2 text-right text-[#1e1e1e] font-medium w-[100px]">Forecast</th>
                            <th className="border border-[#a08050] px-2 py-2 text-right text-[#1e1e1e] font-medium w-[100px]">Approved</th>
                            <th className="border border-[#a08050] px-2 py-2 text-left text-[#1e1e1e] font-medium w-[100px]">Date</th>
                            <th className="border border-[#a08050] px-2 py-2 text-center text-[#1e1e1e] font-medium w-[60px]">Category</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-[#858585] bg-[#1e1e1e]">Loading variations...</td>
                            </tr>
                        ) : filteredVariations.length === 0 && !showAddRow ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-[#858585] bg-[#1e1e1e]">
                                    {variations.length === 0 ? 'No variations yet. Click "Add Variation" to create one.' : 'No variations match the current filters'}
                                </td>
                            </tr>
                        ) : (
                            filteredVariations.map((variation) => (
                                <VariationRow
                                    key={variation.id}
                                    variation={variation}
                                    costLines={costLines}
                                    onUpdate={updateVariation}
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
        </div>
    );
}

interface VariationRowProps {
    variation: VariationWithCostLine;
    costLines: CostLineWithCalculations[];
    onUpdate: (id: string, data: Partial<{
        status: VariationStatus;
        description: string;
        costLineId: string | null;
        amountForecastCents: number;
        amountApprovedCents: number;
        dateSubmitted: string;
    }>) => Promise<any>;
}

function VariationRow({ variation, costLines, onUpdate }: VariationRowProps) {
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    const statusConfig = STATUS_CONFIG[variation.status];
    const categoryStyle = COLORS.category[variation.category];

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

    const handleStatusToggle = async () => {
        const newStatus = variation.status === 'Forecast' ? 'Approved' : 'Forecast';
        const updateData: Partial<{
            status: VariationStatus;
            amountApprovedCents: number;
        }> = { status: newStatus };

        // When toggling from Forecast to Approved, copy forecast amount to approved amount
        if (newStatus === 'Approved' && variation.amountApprovedCents === 0) {
            updateData.amountApprovedCents = variation.amountForecastCents;
        }

        await onUpdate(variation.id, updateData);
    };

    const handleCostLineChange = async (costLineId: string) => {
        await onUpdate(variation.id, { costLineId: costLineId || null });
    };

    return (
        <tr className="bg-[#252526] hover:bg-[#2a2d2e] border-b border-[#3e3e42] transition-colors">
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
                    {sortedCostLines.map((line) => (
                        <option key={line.id} value={line.id} title={line.activity}>
                            {line.costCode ? `${line.costCode} - ${line.activity}` : line.activity}
                        </option>
                    ))}
                </select>
            </td>
            <td className="border-x border-[#3e3e42] px-2 py-1.5 w-[90px]">
                <button
                    onClick={handleStatusToggle}
                    className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${statusConfig.style.bg} ${statusConfig.style.text} ${statusConfig.style.border} hover:opacity-80`}
                    title={`Click to toggle to ${variation.status === 'Forecast' ? 'Approved' : 'Forecast'}`}
                >
                    {variation.status}
                </button>
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
            <td className="border-x border-[#3e3e42] px-2 py-1.5 text-center w-[60px]">
                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${categoryStyle}`}>
                    {variation.category === 'Principal' ? 'PV' : variation.category === 'Contractor' ? 'CV' : 'LV'}
                </span>
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
                    {sortedCostLines.map((line) => (
                        <option key={line.id} value={line.id} title={line.activity}>
                            {line.costCode ? `${line.costCode} - ${line.activity}` : line.activity}
                        </option>
                    ))}
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
                    className={inputClass}
                >
                    <option value="Principal">PV</option>
                    <option value="Contractor">CV</option>
                    <option value="Lessor Works">LV</option>
                </select>
            </td>
        </tr>
    );
}

export default VariationsPanel;
