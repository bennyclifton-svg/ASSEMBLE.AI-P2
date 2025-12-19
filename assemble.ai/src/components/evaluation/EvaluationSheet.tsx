/**
 * T015, T020: EvaluationSheet Component
 * T048-T051: Drop zone integration and AI cell highlighting
 * T089-T093: Row selection (Click, Shift+Click, Ctrl+Click)
 * T098-T100: Merge button integration
 * T101-T103: Editable descriptions
 * T104-T106: AI row indicators with sparkle icon
 * Table component for displaying and editing evaluation data
 * Matches Cost Plan table styling
 * Feature 011 - Evaluation Report
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Trash2, Plus, AlertTriangle, Sparkles, Merge } from 'lucide-react';
import type { EvaluationRow, EvaluationFirm, EvaluationRowSource } from '@/types/evaluation';
import { ThDropZone } from './EvaluationDropZone';
import { Button } from '@/components/ui/button';

interface EvaluationSheetProps {
    rows: EvaluationRow[];
    firms: EvaluationFirm[];
    tableType: 'initial_price' | 'adds_subs';
    onCellUpdate: (rowId: string, firmId: string, amountCents: number) => Promise<void>;
    onDeleteRow: (rowId: string) => Promise<void>;
    onAddRow: () => void;
    onFileDrop?: (file: File, firmId: string) => Promise<void>;
    // T088: Description update
    onDescriptionUpdate?: (rowId: string, description: string) => Promise<boolean>;
    // T089-T093: Row selection
    selectedRowIds: Set<string>;
    onRowSelect: (rowId: string, event: React.MouseEvent) => void;
    // T098-T100: Merge button
    onMergeClick?: () => void;
    parsingFirmId?: string | null;
    subtotals: { [firmId: string]: number };
    title: string;
}

export function EvaluationSheet({
    rows,
    firms,
    tableType,
    onCellUpdate,
    onDeleteRow,
    onAddRow,
    onFileDrop,
    onDescriptionUpdate,
    selectedRowIds,
    onRowSelect,
    onMergeClick,
    parsingFirmId,
    subtotals,
    title,
}: EvaluationSheetProps) {
    const [editingCell, setEditingCell] = useState<{ rowId: string; firmId: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    // T101-T103: Editing description state
    const [editingDescriptionRowId, setEditingDescriptionRowId] = useState<string | null>(null);
    const [editDescriptionValue, setEditDescriptionValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const descriptionInputRef = useRef<HTMLInputElement>(null);

    // Focus input when editing starts
    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);

    // Focus description input when editing starts
    useEffect(() => {
        if (editingDescriptionRowId && descriptionInputRef.current) {
            descriptionInputRef.current.focus();
            descriptionInputRef.current.select();
        }
    }, [editingDescriptionRowId]);

    // Format currency for display
    const formatCurrency = (cents: number): string => {
        if (cents === 0) return '';
        const dollars = cents / 100;
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(dollars);
    };

    // Parse currency input to cents
    const parseCurrencyToCents = (value: string): number => {
        const cleaned = value.replace(/[$,\s]/g, '');
        const parsed = parseFloat(cleaned);
        if (isNaN(parsed)) return 0;
        return Math.round(parsed * 100);
    };

    // Get cell value for a row/firm combination
    const getCellValue = (row: EvaluationRow, firmId: string): number => {
        const cell = row.cells?.find(c => c.firmId === firmId);
        return cell?.amountCents || 0;
    };

    // Check if cell was AI-populated and get confidence
    const getCellInfo = (row: EvaluationRow, firmId: string): { isAI: boolean; confidence: number | null } => {
        const cell = row.cells?.find(c => c.firmId === firmId);
        return {
            isAI: cell?.source === 'ai',
            confidence: cell?.confidence ?? null,
        };
    };

    // T050: Check if cell has low confidence (< 70%)
    // Note: confidence is stored as integer percentage (0-100), not decimal
    const isLowConfidence = (confidence: number | null): boolean => {
        return confidence !== null && confidence < 70;
    };

    // T104-T106: Check if row was AI-generated
    const isAIGeneratedRow = (source?: EvaluationRowSource): boolean => {
        return source === 'ai_parsed';
    };

    // Handle cell click to start editing
    const handleCellClick = (rowId: string, firmId: string, currentValue: number, event: React.MouseEvent) => {
        // Don't start editing if row is being selected with modifier keys
        if (event.shiftKey || event.ctrlKey || event.metaKey) return;

        setEditingCell({ rowId, firmId });
        setEditValue(currentValue === 0 ? '' : (currentValue / 100).toString());
    };

    // Handle cell blur to save
    const handleCellBlur = useCallback(async () => {
        if (!editingCell) return;

        const amountCents = parseCurrencyToCents(editValue);
        await onCellUpdate(editingCell.rowId, editingCell.firmId, amountCents);
        setEditingCell(null);
        setEditValue('');
    }, [editingCell, editValue, onCellUpdate]);

    // Handle key press in edit mode
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCellBlur();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setEditValue('');
        }
    };

    // T101-T103: Handle description click to start editing
    const handleDescriptionClick = (row: EvaluationRow, event: React.MouseEvent) => {
        // Don't start editing if using modifier keys for selection
        if (event.shiftKey || event.ctrlKey || event.metaKey) return;
        // Don't start editing system rows
        if (row.isSystemRow) return;

        setEditingDescriptionRowId(row.id);
        setEditDescriptionValue(row.description || '');
    };

    // T101-T103: Handle description blur to save
    const handleDescriptionBlur = useCallback(async () => {
        if (!editingDescriptionRowId || !onDescriptionUpdate) return;

        await onDescriptionUpdate(editingDescriptionRowId, editDescriptionValue);
        setEditingDescriptionRowId(null);
        setEditDescriptionValue('');
    }, [editingDescriptionRowId, editDescriptionValue, onDescriptionUpdate]);

    // Handle description key press
    const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleDescriptionBlur();
        } else if (e.key === 'Escape') {
            setEditingDescriptionRowId(null);
            setEditDescriptionValue('');
        }
    };

    // Handle delete row
    const handleDelete = async (rowId: string) => {
        await onDeleteRow(rowId);
    };

    // Fixed cell height style
    const cellHeight = 28;

    // Strip leading numbers (e.g., "1.", "5.") from adds_subs descriptions
    const getDisplayDescription = (description: string | null | undefined): string => {
        if (!description) return '';
        if (tableType === 'adds_subs') {
            // Remove leading number + period pattern (e.g., "1.", "5.", "10.")
            return description.replace(/^\d+\.\s*/, '');
        }
        return description;
    };

    return (
        <div className="relative overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
                <colgroup>
                    <col style={{ width: '200px' }} />
                    {firms.map(firm => (
                        <col key={firm.id} style={{ width: '120px' }} />
                    ))}
                    <col style={{ width: '32px' }} />
                </colgroup>

                {/* Header with T037-T039 drop zones and T098-T100 merge button */}
                <thead>
                    <tr className="bg-[#252526] border-b border-[#3e3e42]">
                        <th
                            className="px-3 text-left text-xs font-medium text-[#858585] border-r border-[#3e3e42]"
                            style={{ height: cellHeight }}
                        >
                            <div className="flex items-center gap-2">
                                <span>{title}</span>
                                {/* T098-T100: Merge button when 2+ rows selected */}
                                {selectedRowIds.size >= 2 && onMergeClick && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onMergeClick}
                                        className="h-5 px-1.5 text-[10px] text-[#4fc1ff] hover:text-[#4fc1ff] hover:bg-[#4fc1ff]/10"
                                    >
                                        <Merge className="w-3 h-3 mr-1" />
                                        Merge ({selectedRowIds.size})
                                    </Button>
                                )}
                            </div>
                        </th>
                        {firms.map(firm => (
                            onFileDrop ? (
                                <ThDropZone
                                    key={firm.id}
                                    firmId={firm.id}
                                    firmName={firm.companyName}
                                    onFileDrop={onFileDrop}
                                    isProcessing={parsingFirmId === firm.id}
                                    height={cellHeight}
                                />
                            ) : (
                                <th
                                    key={firm.id}
                                    className="p-0 border-r border-[#3e3e42]"
                                    style={{ height: cellHeight }}
                                >
                                    <div
                                        className="px-3 text-right text-xs font-medium text-[#858585] flex items-center justify-end"
                                        style={{ height: cellHeight }}
                                    >
                                        <span className="truncate">{firm.companyName}</span>
                                    </div>
                                </th>
                            )
                        ))}
                        {/* Add button column */}
                        <th className="px-2 text-center" style={{ height: cellHeight }}>
                            <button
                                onClick={onAddRow}
                                className="text-[#858585] hover:text-[#cccccc] transition-colors"
                                title="Add row"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </th>
                    </tr>
                </thead>

                {/* Body */}
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={firms.length + 2}
                                className="px-3 text-center text-sm text-[#585858] border-b border-[#2d2d30]"
                                style={{ height: cellHeight }}
                            >
                                No line items
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => {
                            const isSelected = selectedRowIds.has(row.id);
                            const isAIRow = isAIGeneratedRow(row.source);
                            const isEditingDescription = editingDescriptionRowId === row.id;

                            return (
                                <tr
                                    key={row.id}
                                    className={`border-b border-[#2d2d30] group cursor-pointer ${
                                        // T093: Visual highlight for selected rows
                                        isSelected
                                            ? 'bg-[#094771]'
                                            : 'bg-[#1e1e1e] hover:bg-[#252526]'
                                    }`}
                                    onClick={(e) => onRowSelect(row.id, e)}
                                >
                                    {/* Description cell with T104-T106 AI indicator and T101-T103 inline editing */}
                                    <td
                                        className="px-3 text-sm text-[#cccccc] border-r border-[#3e3e42] overflow-hidden"
                                        style={{ height: cellHeight }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDescriptionClick(row, e);
                                        }}
                                    >
                                        <div className="flex items-center gap-1.5 h-full">
                                            {/* T104-T106: AI row indicator */}
                                            {isAIRow && (
                                                <span title="AI-generated row">
                                                    <Sparkles className="w-3 h-3 text-[#4fc1ff] flex-shrink-0" />
                                                </span>
                                            )}
                                            {/* T101-T103: Inline description editing */}
                                            {isEditingDescription ? (
                                                <input
                                                    ref={descriptionInputRef}
                                                    type="text"
                                                    value={editDescriptionValue}
                                                    onChange={(e) => setEditDescriptionValue(e.target.value)}
                                                    onBlur={handleDescriptionBlur}
                                                    onKeyDown={handleDescriptionKeyDown}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex-1 bg-transparent text-sm text-[#cccccc] outline-none border-b border-[#4fc1ff]"
                                                />
                                            ) : (
                                                <span className="truncate">
                                                    {getDisplayDescription(row.description)}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Firm amount cells with T048-T051 AI indicators */}
                                    {firms.map(firm => {
                                        const value = getCellValue(row, firm.id);
                                        const { isAI, confidence } = getCellInfo(row, firm.id);
                                        const lowConfidence = isLowConfidence(confidence);
                                        const isEditing = editingCell?.rowId === row.id && editingCell?.firmId === firm.id;

                                        return (
                                            <td
                                                key={firm.id}
                                                className={`px-0 border-r cursor-pointer relative ${
                                                    // Low confidence warning indicator only
                                                    isAI && lowConfidence
                                                        ? 'border-l-2 border-l-yellow-500/50 border-[#3e3e42]'
                                                        : 'border-[#3e3e42]'
                                                }`}
                                                style={{ height: cellHeight }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCellClick(row.id, firm.id, value, e);
                                                }}
                                                title={isAI ? `AI-extracted (${confidence || 0}% confidence)` : undefined}
                                            >
                                                {isEditing ? (
                                                    <input
                                                        ref={inputRef}
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={handleCellBlur}
                                                        onKeyDown={handleKeyDown}
                                                        className="w-full px-3 text-right text-sm bg-transparent text-[#cccccc] outline-none"
                                                        style={{ height: cellHeight, lineHeight: `${cellHeight}px` }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-end">
                                                        {/* T050: Low confidence warning indicator */}
                                                        {isAI && lowConfidence && (
                                                            <span title={`Low confidence: ${confidence || 0}%`}>
                                                                <AlertTriangle
                                                                    className="w-3 h-3 text-yellow-500 mr-1 flex-shrink-0"
                                                                />
                                                            </span>
                                                        )}
                                                        <div
                                                            className={`px-2 text-right text-sm ${
                                                                value ? 'text-[#cccccc]' : 'text-[#3e3e42]'
                                                            }`}
                                                            style={{ height: cellHeight, lineHeight: `${cellHeight}px` }}
                                                        >
                                                            {formatCurrency(value) || '-'}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}

                                    {/* Delete button column */}
                                    <td
                                        className="px-2 text-center"
                                        style={{ height: cellHeight }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => handleDelete(row.id)}
                                            className="opacity-0 group-hover:opacity-100 text-[#585858] hover:text-red-400 transition-all"
                                            title="Delete row"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}

                    {/* Subtotal row */}
                    <tr className="bg-[#252526]">
                        <td
                            className="px-3 text-sm font-medium text-[#cccccc] border-r border-[#3e3e42]"
                            style={{ height: cellHeight }}
                        >
                            Sub-Total
                        </td>
                        {firms.map(firm => (
                            <td
                                key={firm.id}
                                className="px-3 text-right text-sm font-medium text-[#4ec9b0] border-r border-[#3e3e42]"
                                style={{ height: cellHeight }}
                            >
                                {formatCurrency(subtotals[firm.id] || 0)}
                            </td>
                        ))}
                        <td style={{ height: cellHeight }}></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
