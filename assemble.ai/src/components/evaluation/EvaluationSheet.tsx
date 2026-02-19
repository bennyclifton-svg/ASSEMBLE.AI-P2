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
import { Trash, Plus, AlertTriangle, Merge, GripVertical, Upload } from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import type { EvaluationRow, EvaluationFirm, EvaluationRowSource } from '@/types/evaluation';
import { EVALUATION_TABLE_COLUMNS, getEvaluationTableWidth } from '@/types/evaluation';
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
    // Whether to show firm names in header (default: true)
    showFirmHeaders?: boolean;
    // Row reordering
    onRowReorder?: (rowId: string, newIndex: number) => void;
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
    showFirmHeaders = true,
    onRowReorder,
}: EvaluationSheetProps) {
    const [editingCell, setEditingCell] = useState<{ rowId: string; firmId: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    // T101-T103: Editing description state
    const [editingDescriptionRowId, setEditingDescriptionRowId] = useState<string | null>(null);
    const [editDescriptionValue, setEditDescriptionValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const descriptionInputRef = useRef<HTMLInputElement>(null);
    // Row drag state
    const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
    const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
    // Container-level file drag state (replaces per-cell drag handlers)
    const [isFileDragActive, setIsFileDragActive] = useState(false);
    const [dragOverFirmId, setDragOverFirmId] = useState<string | null>(null);
    const dragOverFirmIdRef = useRef<string | null>(null);
    const fileDragCounterRef = useRef(0);

    // Focus input when editing starts
    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingCell]);

    // Focus description input when editing starts
    useEffect(() => {
        if (editingDescriptionRowId && descriptionInputRef.current) {
            descriptionInputRef.current.focus();
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

    // Row drag handlers for reordering
    const handleRowDragStart = useCallback((e: React.DragEvent, rowId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', rowId);
        setDraggedRowId(rowId);
    }, []);

    const handleRowDragEnd = useCallback(() => {
        setDraggedRowId(null);
        setDragOverRowId(null);
    }, []);

    const handleRowDragOver = useCallback((e: React.DragEvent, rowId: string) => {
        e.preventDefault();
        // Only handle row reorder drags (not file drops)
        if (e.dataTransfer.types.includes('Files')) return;
        e.dataTransfer.dropEffect = 'move';
        setDragOverRowId(rowId);
    }, []);

    const handleRowDrop = useCallback((e: React.DragEvent, targetRowId: string) => {
        e.preventDefault();
        // Only handle row reorder drags (not file drops)
        if (e.dataTransfer.types.includes('Files')) return;

        const sourceRowId = e.dataTransfer.getData('text/plain');
        if (sourceRowId && sourceRowId !== targetRowId && onRowReorder) {
            const targetIndex = rows.findIndex(r => r.id === targetRowId);
            if (targetIndex !== -1) {
                onRowReorder(sourceRowId, targetIndex);
            }
        }
        setDraggedRowId(null);
        setDragOverRowId(null);
    }, [rows, onRowReorder]);

    // Container-level file drag handlers
    // Uses mouse position + known column widths to detect target firm column.
    // Single drag counter on the container eliminates flicker from crossing
    // internal cell boundaries.

    const validateFile = useCallback((file: File): boolean => {
        return file.name.toLowerCase().endsWith('.pdf');
    }, []);

    const getFirmIdFromTarget = useCallback((target: EventTarget | null): string | null => {
        if (!target || !(target instanceof HTMLElement)) return null;
        const el = target.closest('[data-firm-id]');
        return el?.getAttribute('data-firm-id') ?? null;
    }, []);

    const handleContainerDragEnter = useCallback((e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        // Block drag visuals while a parse is in-flight
        if (parsingFirmId) return;
        e.preventDefault();

        fileDragCounterRef.current++;
        if (fileDragCounterRef.current === 1) {
            setIsFileDragActive(true);
        }
    }, [parsingFirmId]);

    const handleContainerDragLeave = useCallback((e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();

        fileDragCounterRef.current--;
        if (fileDragCounterRef.current <= 0) {
            fileDragCounterRef.current = 0;
            setIsFileDragActive(false);
            setDragOverFirmId(null);
            dragOverFirmIdRef.current = null;
        }
    }, []);

    const handleContainerDragOver = useCallback((e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        const firmId = getFirmIdFromTarget(e.target);
        setDragOverFirmId(firmId);
        dragOverFirmIdRef.current = firmId;
    }, [getFirmIdFromTarget]);

    const handleContainerDrop = useCallback(async (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();

        fileDragCounterRef.current = 0;
        setIsFileDragActive(false);
        const targetFirmId = dragOverFirmIdRef.current;
        setDragOverFirmId(null);
        dragOverFirmIdRef.current = null;

        // Block drops while a parse is in-flight
        if (parsingFirmId) return;

        if (!onFileDrop || !targetFirmId) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0];
        if (!validateFile(file)) return;

        await onFileDrop(file, targetFirmId);
    }, [onFileDrop, validateFile, parsingFirmId]);

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

    // Calculate fixed table width to ensure alignment with Grand Total
    const tableWidth = getEvaluationTableWidth(firms.length);

    return (
        <div
            className="relative overflow-x-auto w-full"
            onDragEnter={handleContainerDragEnter}
            onDragLeave={handleContainerDragLeave}
            onDragOver={handleContainerDragOver}
            onDrop={handleContainerDrop}
        >
            <table className="border-collapse w-full table-fixed">
                <colgroup>
                    {/* Drag handle / add row column */}
                    <col style={{ width: `${EVALUATION_TABLE_COLUMNS.dragHandle}px` }} />
                    {/* Description column */}
                    <col style={{ width: `${EVALUATION_TABLE_COLUMNS.description}px` }} />
                    {/* Firm columns */}
                    {firms.map(firm => (
                        <col key={firm.id} style={{ width: `${EVALUATION_TABLE_COLUMNS.firmColumn}px` }} />
                    ))}
                    {/* AI indicator column */}
                    <col style={{ width: `${EVALUATION_TABLE_COLUMNS.aiIndicator}px` }} />
                    {/* Delete button column */}
                    <col style={{ width: `${EVALUATION_TABLE_COLUMNS.deleteButton}px` }} />
                </colgroup>

                {/* Header with merge button and firm names */}
                <thead>
                    <tr className="border-b border-[var(--color-border)]">
                        {/* Add row button column */}
                        <th
                            className="px-2 text-center"
                            style={{ height: cellHeight }}
                        >
                            <button
                                onClick={onAddRow}
                                className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-accent-copper)] hover:bg-[var(--color-accent-copper)]/15 hover:scale-110 transition-all duration-150"
                                title="Add row"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </th>
                        {/* Title / description column header */}
                        <th
                            className="px-3 text-left text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide"
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
                                        className="h-5 px-1.5 text-[10px] text-[var(--color-accent-copper)] hover:text-[var(--color-accent-copper)] hover:bg-[var(--color-accent-copper)]/10"
                                    >
                                        <Merge className="w-3 h-3 mr-1" />
                                        Merge ({selectedRowIds.size})
                                    </Button>
                                )}
                            </div>
                        </th>
                        {/* Firm column headers with drop zone support */}
                        {firms.map(firm => {
                            const isColumnDragOver = dragOverFirmId === firm.id;
                            return showFirmHeaders ? (
                                <th
                                    key={firm.id}
                                    data-firm-id={firm.id}
                                    className={`p-0 relative ${
                                        isColumnDragOver ? 'bg-[var(--color-accent-copper)]/20' :
                                        isFileDragActive ? 'bg-[var(--color-accent-copper)]/5' : ''
                                    }`}
                                    style={{ height: cellHeight }}
                                >
                                    <div
                                        className="px-3 text-right text-xs font-medium text-[var(--color-text-primary)] flex items-center justify-end"
                                        style={{ height: cellHeight }}
                                    >
                                        <span className="truncate">{firm.companyName}</span>
                                    </div>
                                    {/* Column drop zone borders + upload indicator */}
                                    {isColumnDragOver && (
                                        <>
                                            <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                            <div className="absolute inset-y-0 left-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                            <div className="absolute inset-y-0 right-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <Upload className="w-3.5 h-3.5 text-[var(--color-accent-copper)]" />
                                            </div>
                                        </>
                                    )}
                                </th>
                            ) : (
                                <th
                                    key={firm.id}
                                    data-firm-id={firm.id}
                                    className={`p-0 relative ${
                                        isColumnDragOver ? 'bg-[var(--color-accent-copper)]/20' :
                                        isFileDragActive ? 'bg-[var(--color-accent-copper)]/5' : ''
                                    }`}
                                    style={{ height: cellHeight }}
                                >
                                    {isColumnDragOver && (
                                        <>
                                            <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                            <div className="absolute inset-y-0 left-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                            <div className="absolute inset-y-0 right-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                        </>
                                    )}
                                </th>
                            );
                        })}
                        {/* AI indicator column header */}
                        <th
                            style={{ height: cellHeight }}
                        />
                        {/* Delete button column header */}
                        <th
                            style={{ height: cellHeight }}
                        />
                    </tr>
                </thead>

                {/* Body */}
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            {/* Empty drag handle cell */}
                            <td
                                style={{ height: cellHeight }}
                            />
                            <td
                                className="px-3 text-sm text-[var(--color-text-muted)]"
                                style={{ height: cellHeight }}
                            >
                                No line items
                            </td>
                            {/* Individual firm cells so column highlight flows through */}
                            {firms.map(firm => {
                                const isColumnDragOver = dragOverFirmId === firm.id;
                                return (
                                    <td
                                        key={firm.id}
                                        data-firm-id={firm.id}
                                        className={`relative ${isColumnDragOver ? 'bg-[var(--color-accent-copper)]/20' : ''}`}
                                        style={{ height: cellHeight }}
                                    >
                                        {isColumnDragOver && (
                                            <>
                                                <div className="absolute inset-y-0 left-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                                <div className="absolute inset-y-0 right-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                            </>
                                        )}
                                    </td>
                                );
                            })}
                            {/* Empty AI indicator cell */}
                            <td
                                style={{ height: cellHeight }}
                            />
                            {/* Empty delete cell */}
                            <td style={{ height: cellHeight }} />
                        </tr>
                    ) : (
                        rows.map((row, rowIndex) => {
                            const isSelected = selectedRowIds.has(row.id);
                            const isAIRow = isAIGeneratedRow(row.source);
                            const isEditingDescription = editingDescriptionRowId === row.id;
                            const isDragging = draggedRowId === row.id;
                            const isDragOver = dragOverRowId === row.id;

                            return (
                                <tr
                                    key={row.id}
                                    className={`group cursor-pointer ${
                                        // T093: Visual highlight for selected rows
                                        isSelected
                                            ? 'bg-[var(--color-accent-copper-tint)]'
                                            : 'hover:bg-[var(--color-text-primary)]/5'
                                    } ${isDragging ? 'opacity-50' : ''}`}
                                    style={isDragOver ? { boxShadow: 'inset 0 2px 0 var(--color-accent-copper)' } : undefined}
                                    onClick={(e) => onRowSelect(row.id, e)}
                                    onDragOver={(e) => handleRowDragOver(e, row.id)}
                                    onDrop={(e) => handleRowDrop(e, row.id)}
                                    onDragLeave={() => setDragOverRowId(null)}
                                >
                                    {/* Drag handle cell */}
                                    <td
                                        className="px-1 text-center cursor-grab active:cursor-grabbing"
                                        style={{ height: cellHeight }}
                                        draggable
                                        onDragStart={(e) => handleRowDragStart(e, row.id)}
                                        onDragEnd={handleRowDragEnd}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <GripVertical className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-40 group-hover:opacity-100 transition-opacity mx-auto" />
                                    </td>

                                    {/* Description cell with T101-T103 inline editing */}
                                    <td
                                        className="px-3 text-sm text-[var(--color-text-primary)] overflow-hidden"
                                        style={{ height: cellHeight }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDescriptionClick(row, e);
                                        }}
                                    >
                                        <div className="flex items-center h-full">
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
                                                    className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
                                                />
                                            ) : (
                                                <span className="truncate">
                                                    {getDisplayDescription(row.description)}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Firm amount cells with full column drop zones */}
                                    {firms.map(firm => {
                                        const value = getCellValue(row, firm.id);
                                        const { isAI, confidence } = getCellInfo(row, firm.id);
                                        const lowConfidence = isLowConfidence(confidence);
                                        const isEditing = editingCell?.rowId === row.id && editingCell?.firmId === firm.id;
                                        const isColumnDragOver = dragOverFirmId === firm.id;

                                        return (
                                            <td
                                                key={firm.id}
                                                data-firm-id={firm.id}
                                                className={`px-0 cursor-pointer relative ${
                                                    // Low confidence warning indicator only
                                                    isAI && lowConfidence
                                                        ? 'border-l-2 border-l-yellow-500/50'
                                                        : ''
                                                } ${isColumnDragOver ? 'bg-[var(--color-accent-copper)]/20' : ''}`}
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
                                                        className="w-full px-3 text-right text-sm bg-transparent text-[var(--color-text-primary)] outline-none"
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
                                                                value ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'
                                                            }`}
                                                            style={{ height: cellHeight, lineHeight: `${cellHeight}px` }}
                                                        >
                                                            {formatCurrency(value) || '-'}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Column drag - left/right borders for unified rectangle */}
                                                {isColumnDragOver && (
                                                    <>
                                                        <div className="absolute inset-y-0 left-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                                        <div className="absolute inset-y-0 right-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                                    </>
                                                )}
                                            </td>
                                        );
                                    })}

                                    {/* AI indicator cell */}
                                    <td
                                        className="text-center"
                                        style={{ height: cellHeight }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {isAIRow && (
                                            <span title="AI-generated row">
                                                <DiamondIcon variant="empty" className="w-3 h-3 text-[var(--color-accent-copper)] mx-auto" />
                                            </span>
                                        )}
                                    </td>

                                    {/* Delete button cell */}
                                    <td
                                        className="text-center"
                                        style={{ height: cellHeight }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => handleDelete(row.id)}
                                            className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-accent-coral)] transition-all"
                                            title="Delete row"
                                        >
                                            <Trash className="w-3 h-3 mx-auto" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}

                    {/* Subtotal row */}
                    <tr className="border-t border-[var(--color-border)]">
                        {/* Empty drag handle cell */}
                        <td
                            style={{ height: cellHeight }}
                        />
                        <td
                            className="px-3 text-sm font-semibold text-[var(--color-text-primary)]"
                            style={{ height: cellHeight }}
                        >
                            Sub-Total
                        </td>
                        {firms.map(firm => {
                            const isColumnDragOver = dragOverFirmId === firm.id;
                            return (
                                <td
                                    key={firm.id}
                                    data-firm-id={firm.id}
                                    className={`px-3 text-right text-sm font-semibold text-[var(--color-accent-copper)] relative ${
                                        isColumnDragOver ? 'bg-[var(--color-accent-copper)]/20' : ''
                                    }`}
                                    style={{ height: cellHeight }}
                                >
                                    {formatCurrency(subtotals[firm.id] || 0)}
                                    {/* Bottom border and left/right borders for unified rectangle */}
                                    {isColumnDragOver && (
                                        <>
                                            <div className="absolute inset-y-0 left-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                            <div className="absolute inset-y-0 right-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                        </>
                                    )}
                                </td>
                            );
                        })}
                        {/* Empty AI indicator cell */}
                        <td
                            style={{ height: cellHeight }}
                        />
                        {/* Empty delete cell */}
                        <td style={{ height: cellHeight }} />
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
