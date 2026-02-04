/**
 * TRREvaluationNonPrice Component
 * Displays non-price evaluation summary table from the Evaluation report
 * Feature 012 - TRR Report / Feature 013 - Non-Price Evaluation
 */

'use client';

import { useState, useEffect } from 'react';
import type {
    EvaluationNonPriceCriteria,
    EvaluationNonPriceCell,
    EvaluationFirm,
} from '@/types/evaluation';
import { getDisplayContent, getDisplayRating } from '@/types/evaluation';
import { InlineRatingButtons } from '@/components/evaluation/RatingBadge';

interface TRREvaluationNonPriceProps {
    projectId: string;
    stakeholderId?: string | null;
}

interface NonPriceData {
    criteria: EvaluationNonPriceCriteria[];
    cells: EvaluationNonPriceCell[];
    firms: EvaluationFirm[];
}

export function TRREvaluationNonPrice({
    projectId,
    stakeholderId,
}: TRREvaluationNonPriceProps) {
    const [data, setData] = useState<NonPriceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNonPriceData = async () => {
            setIsLoading(true);
            try {
                const contextType = 'stakeholder';
                const contextId = stakeholderId;

                if (!contextId) {
                    setIsLoading(false);
                    return;
                }

                const response = await fetch(
                    `/api/evaluation/${projectId}/${contextType}/${contextId}/non-price`
                );

                if (response.ok) {
                    const result = await response.json();
                    if (result.data) {
                        setData({
                            criteria: result.data.criteria || [],
                            cells: result.data.cells || [],
                            firms: (result.data.firms || []).filter((f: EvaluationFirm) => f.shortlisted),
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch non-price evaluation data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (projectId && stakeholderId) {
            fetchNonPriceData();
        }
    }, [projectId, stakeholderId]);

    const getCellForFirm = (criteriaId: string, firmId: string): EvaluationNonPriceCell | undefined => {
        return data?.cells.find(c => c.criteriaId === criteriaId && c.firmId === firmId);
    };

    const sortedCriteria = data?.criteria.sort((a, b) => a.orderIndex - b.orderIndex) || [];
    const hasData = sortedCriteria.length > 0 && data?.firms && data.firms.length > 0;

    // Check if any cell has data
    const hasAnyEvaluation = data?.cells && data.cells.length > 0 && data.cells.some(cell => {
        const content = getDisplayContent(cell);
        const rating = getDisplayRating(cell);
        return content || rating;
    });

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-black uppercase tracking-wide">
                Evaluation Non-Price
            </h3>
            <div className="overflow-hidden">
                {isLoading ? (
                    <div className="px-4 py-3 text-black/60 text-sm">
                        Loading non-price evaluation data...
                    </div>
                ) : hasData && hasAnyEvaluation ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--color-border)]">
                                    <th className="px-4 py-2.5 text-left text-black font-medium min-w-[140px]">
                                        Criteria
                                    </th>
                                    {data?.firms.map((firm) => (
                                        <th
                                            key={firm.id}
                                            className="px-4 py-2.5 text-left text-black font-medium min-w-[180px]"
                                        >
                                            {firm.companyName}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedCriteria.map((criteria) => (
                                    <tr key={criteria.id}>
                                        <td className="px-4 py-2.5 text-black font-medium align-top">
                                            {criteria.criteriaLabel}
                                        </td>
                                        {data?.firms.map((firm) => {
                                            const cell = getCellForFirm(criteria.id, firm.id);
                                            const content = cell ? getDisplayContent(cell) : null;
                                            const rating = cell ? getDisplayRating(cell) : null;

                                            return (
                                                <td
                                                    key={firm.id}
                                                    className="px-4 py-2.5 align-top"
                                                >
                                                    <div className="flex flex-col min-h-[40px]">
                                                        {/* Content - top */}
                                                        {content && (
                                                            <p className="text-black text-xs flex-1 mb-1">
                                                                {content}
                                                            </p>
                                                        )}
                                                        {/* Rating buttons - bottom left */}
                                                        <div className="mt-auto">
                                                            <InlineRatingButtons
                                                                value={rating}
                                                                onChange={() => {}}
                                                                readOnly
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-4 py-3 text-black/60 text-sm">
                        No non-price evaluation completed
                    </div>
                )}
            </div>
        </div>
    );
}
