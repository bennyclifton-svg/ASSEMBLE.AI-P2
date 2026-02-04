/**
 * Feature 013: NonPriceSheet Component (T013)
 * Main table component for non-price evaluation criteria
 * Custom implementation (not FortuneSheet) for text content support (FR-004)
 * Inline editing: content editable on click, rating buttons always visible
 */

'use client';

import { useCallback, useState, useRef } from 'react';
import { NonPriceCell } from './NonPriceCell';
import { Loader2 } from 'lucide-react';
import type {
    EvaluationNonPriceCriteria,
    EvaluationNonPriceCell,
    EvaluationFirm,
    QualityRating,
} from '@/types/evaluation';
import { NON_PRICE_CRITERIA } from '@/lib/constants/non-price-criteria';
import { getDisplayContent, getDisplayRating } from '@/types/evaluation';

interface NonPriceSheetProps {
    criteria: EvaluationNonPriceCriteria[];
    cells: EvaluationNonPriceCell[];
    firms: EvaluationFirm[];
    onCellUpdate: (
        criteriaId: string,
        firmId: string,
        firmType: 'consultant' | 'contractor',
        content: string,
        rating: QualityRating
    ) => Promise<boolean>;
    onFileDrop?: (file: File, firmId: string, firmType: 'consultant' | 'contractor') => Promise<void>;
    isParsing?: boolean;
    parsingFirmId?: string | null;
    firmType: 'consultant' | 'contractor';
}

export function NonPriceSheet({
    criteria,
    cells,
    firms,
    onCellUpdate,
    onFileDrop,
    isParsing = false,
    parsingFirmId = null,
    firmType,
}: NonPriceSheetProps) {
    // Fixed cell height to match PRICE table styling
    const cellHeight = 28;

    // Column drop zone state for full-column highlighting
    const [dragOverFirmId, setDragOverFirmId] = useState<string | null>(null);
    const dragCounterRef = useRef<{ [key: string]: number }>({});

    // Column file drop handlers
    const validateFile = useCallback((file: File): boolean => {
        return file.name.toLowerCase().endsWith('.pdf');
    }, []);

    const handleColumnDragEnter = useCallback((e: React.DragEvent, firmId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.dataTransfer.types.includes('Files')) return;

        if (!dragCounterRef.current[firmId]) {
            dragCounterRef.current[firmId] = 0;
        }
        dragCounterRef.current[firmId]++;
        if (dragCounterRef.current[firmId] === 1) {
            setDragOverFirmId(firmId);
        }
    }, []);

    const handleColumnDragLeave = useCallback((e: React.DragEvent, firmId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dragCounterRef.current[firmId]) return;

        dragCounterRef.current[firmId]--;
        if (dragCounterRef.current[firmId] === 0) {
            setDragOverFirmId(null);
        }
    }, []);

    const handleColumnDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }, []);

    const handleColumnDrop = useCallback(async (e: React.DragEvent, firmId: string) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current[firmId] = 0;
        setDragOverFirmId(null);

        if (!onFileDrop) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0];
        if (!validateFile(file)) return;

        await onFileDrop(file, firmId, firmType);
    }, [onFileDrop, validateFile, firmType]);

    // Get cell for a specific criteria and firm
    const getCellForFirm = useCallback(
        (criteriaId: string, firmId: string): EvaluationNonPriceCell | undefined => {
            return cells.find(c => c.criteriaId === criteriaId && c.firmId === firmId);
        },
        [cells]
    );

    // Get criteria definition (for description tooltip)
    const getCriteriaDefinition = useCallback((key: string) => {
        return NON_PRICE_CRITERIA.find(c => c.key === key);
    }, []);

    // Handle inline content change
    const handleContentChange = useCallback(
        async (criteriaId: string, firmId: string, content: string) => {
            const cell = getCellForFirm(criteriaId, firmId);
            const currentRating = cell ? getDisplayRating(cell) ?? 'average' : 'average';
            await onCellUpdate(criteriaId, firmId, firmType, content, currentRating);
        },
        [getCellForFirm, firmType, onCellUpdate]
    );

    // Handle inline rating change
    const handleRatingChange = useCallback(
        async (criteriaId: string, firmId: string, rating: QualityRating) => {
            const cell = getCellForFirm(criteriaId, firmId);
            const currentContent = cell ? getDisplayContent(cell) || '' : '';
            await onCellUpdate(criteriaId, firmId, firmType, currentContent, rating);
        },
        [getCellForFirm, firmType, onCellUpdate]
    );

    // Sort criteria by order index
    const sortedCriteria = [...criteria].sort((a, b) => a.orderIndex - b.orderIndex);

    return (
        <div className="overflow-hidden w-full">
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <colgroup>
                        <col style={{ width: '100px', minWidth: '100px' }} />
                        {firms.map(firm => (
                            <col key={firm.id} style={{ width: '200px', minWidth: '180px' }} />
                        ))}
                    </colgroup>

                    {/* Header row with firm names and drop zones (FR-002, T035) */}
                    <thead>
                        <tr className="border-b border-[var(--color-border)]">
                            <th
                                className="px-3 text-left text-xs font-semibold text-black uppercase tracking-wide"
                                style={{ height: cellHeight }}
                            >
                                Criteria
                            </th>
                            {firms.map(firm => {
                                const isColumnDragOver = dragOverFirmId === firm.id;
                                const isProcessing = isParsing && parsingFirmId === firm.id;
                                return (
                                    <th
                                        key={firm.id}
                                        className={`p-0 relative ${
                                            isColumnDragOver ? 'bg-[var(--color-accent-copper)]/20' : ''
                                        }`}
                                        style={{ height: cellHeight }}
                                        onDragEnter={(e) => handleColumnDragEnter(e, firm.id)}
                                        onDragLeave={(e) => handleColumnDragLeave(e, firm.id)}
                                        onDragOver={handleColumnDragOver}
                                        onDrop={(e) => handleColumnDrop(e, firm.id)}
                                    >
                                        <div
                                            className={`px-3 text-right text-xs font-medium text-black flex items-center justify-end ${
                                                isProcessing ? 'opacity-50' : ''
                                            }`}
                                            style={{ height: cellHeight }}
                                            title={onFileDrop ? `Drop PDF to parse tender for ${firm.companyName}` : undefined}
                                        >
                                            <span className="truncate">{firm.companyName}</span>
                                        </div>
                                        {/* Top and left/right borders of column drop zone */}
                                        {isColumnDragOver && (
                                            <>
                                                <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                                <div className="absolute inset-y-0 left-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                                <div className="absolute inset-y-0 right-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none" />
                                            </>
                                        )}
                                        {/* Processing indicator */}
                                        {isProcessing && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none">
                                                <Loader2 className="w-4 h-4 text-[var(--color-accent-copper)] animate-spin" />
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    {/* Criteria rows (FR-001) */}
                    <tbody>
                        {sortedCriteria.map((criterion, criterionIndex) => {
                            const definition = getCriteriaDefinition(criterion.criteriaKey);
                            const isLastRow = criterionIndex === sortedCriteria.length - 1;

                            return (
                                <tr key={criterion.id}>
                                    {/* Criteria label column (FR-003) */}
                                    <td
                                        className="px-3 py-2 align-top"
                                        title={definition?.description}
                                    >
                                        <div className="text-xs font-medium text-black">
                                            {criterion.criteriaLabel}
                                        </div>
                                        {definition?.description && (
                                            <div className="text-[10px] text-black/50 mt-0.5">
                                                {definition.description}
                                            </div>
                                        )}
                                    </td>

                                    {/* Firm cells with column drop zone support */}
                                    {firms.map(firm => {
                                        const cell = getCellForFirm(criterion.id, firm.id);
                                        const isColumnDragOver = dragOverFirmId === firm.id;

                                        return (
                                            <td
                                                key={firm.id}
                                                className={`p-0 align-top relative ${
                                                    isColumnDragOver ? 'bg-[var(--color-accent-copper)]/20' : ''
                                                }`}
                                                onDragEnter={(e) => handleColumnDragEnter(e, firm.id)}
                                                onDragLeave={(e) => handleColumnDragLeave(e, firm.id)}
                                                onDragOver={handleColumnDragOver}
                                                onDrop={(e) => handleColumnDrop(e, firm.id)}
                                            >
                                                <NonPriceCell
                                                    cell={cell}
                                                    onContentChange={(content) =>
                                                        handleContentChange(criterion.id, firm.id, content)
                                                    }
                                                    onRatingChange={(rating) =>
                                                        handleRatingChange(criterion.id, firm.id, rating)
                                                    }
                                                    disabled={isParsing && parsingFirmId === firm.id}
                                                />
                                                {/* Column drag - left/right borders for unified rectangle, bottom on last row */}
                                                {isColumnDragOver && (
                                                    <>
                                                        <div className="absolute inset-y-0 left-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none z-10" />
                                                        <div className="absolute inset-y-0 right-0 w-0.5 bg-[var(--color-accent-copper)] pointer-events-none z-10" />
                                                        {isLastRow && (
                                                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--color-accent-copper)] pointer-events-none z-10" />
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-3 py-2 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-1 text-[10px] text-black/50">
                    <span className="text-[var(--color-accent-copper)]">&#10024;</span>
                    <span>AI-extracted</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-black/50">
                    <span className="text-yellow-500">&#9888;</span>
                    <span>Low confidence (manual review suggested)</span>
                </div>
            </div>
        </div>
    );
}
