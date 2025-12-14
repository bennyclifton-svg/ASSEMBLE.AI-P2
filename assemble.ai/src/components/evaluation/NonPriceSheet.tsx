/**
 * Feature 013: NonPriceSheet Component (T013)
 * Main table component for non-price evaluation criteria
 * Custom implementation (not FortuneSheet) for text content support (FR-004)
 * Inline editing: content editable on click, rating buttons always visible
 */

'use client';

import { useCallback } from 'react';
import { NonPriceCell } from './NonPriceCell';
import { ThDropZone } from './EvaluationDropZone';
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

    // Wrap onFileDrop to add firmType (ThDropZone doesn't know about firmType)
    const handleFileDrop = useCallback(
        async (file: File, firmId: string) => {
            if (onFileDrop) {
                await onFileDrop(file, firmId, firmType);
            }
        },
        [onFileDrop, firmType]
    );

    // Sort criteria by order index
    const sortedCriteria = [...criteria].sort((a, b) => a.orderIndex - b.orderIndex);

    return (
        <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-lg overflow-hidden">
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
                        <tr className="bg-[#252526] border-b border-[#3e3e42]">
                            <th
                                className="px-3 text-left text-xs font-medium text-[#858585] border-r border-[#3e3e42]"
                                style={{ height: cellHeight }}
                            >
                                Criteria
                            </th>
                            {firms.map(firm => (
                                onFileDrop ? (
                                    <ThDropZone
                                        key={firm.id}
                                        firmId={firm.id}
                                        firmName={firm.companyName}
                                        onFileDrop={handleFileDrop}
                                        isProcessing={isParsing && parsingFirmId === firm.id}
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
                        </tr>
                    </thead>

                    {/* Criteria rows (FR-001) */}
                    <tbody>
                        {sortedCriteria.map((criterion) => {
                            const definition = getCriteriaDefinition(criterion.criteriaKey);

                            return (
                                <tr key={criterion.id} className="border-b border-[#3e3e42] last:border-b-0">
                                    {/* Criteria label column (FR-003) */}
                                    <td
                                        className="px-3 py-2 border-r border-[#3e3e42] align-top bg-[#252526]"
                                        title={definition?.description}
                                    >
                                        <div className="text-xs font-medium text-[#cccccc]">
                                            {criterion.criteriaLabel}
                                        </div>
                                        {definition?.description && (
                                            <div className="text-[10px] text-[#858585] mt-0.5">
                                                {definition.description}
                                            </div>
                                        )}
                                    </td>

                                    {/* Firm cells */}
                                    {firms.map(firm => {
                                        const cell = getCellForFirm(criterion.id, firm.id);

                                        return (
                                            <td
                                                key={firm.id}
                                                className="p-0 align-top"
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
            <div className="flex items-center gap-4 px-3 py-2 border-t border-[#3e3e42] bg-[#252526]">
                <div className="flex items-center gap-1 text-[10px] text-[#858585]">
                    <span className="text-[#4fc1ff]">&#10024;</span>
                    <span>AI-extracted</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#858585]">
                    <span className="text-yellow-500">&#9888;</span>
                    <span>Low confidence (manual review suggested)</span>
                </div>
            </div>
        </div>
    );
}
