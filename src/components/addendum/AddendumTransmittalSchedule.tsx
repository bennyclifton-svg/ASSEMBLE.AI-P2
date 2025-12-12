/**
 * T114: AddendumTransmittalSchedule Component
 * Displays a read-only table of transmittal documents attached to an addendum
 */

'use client';

import { useAddendumTransmittal } from '@/lib/hooks/use-addendum-transmittal';
import { FileText, Loader2, Folder } from 'lucide-react';
import { getCategoryById } from '@/lib/constants/categories';

interface AddendumTransmittalScheduleProps {
    addendumId: string;
}

/**
 * Get category color by ID - falls back to constants if not in database
 */
function getCategoryColor(categoryId: string | null): string {
    if (!categoryId) return '#858585';

    // Try to get from constants first (for color)
    const category = getCategoryById(categoryId);
    if (category) return category.color;

    // Default gray
    return '#858585';
}

export function AddendumTransmittalSchedule({ addendumId }: AddendumTransmittalScheduleProps) {
    const { transmittal, isLoading, hasTransmittal, documentCount } = useAddendumTransmittal({
        addendumId,
    });

    return (
        <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#858585] uppercase tracking-wide">
                    Transmittal Document Schedule
                </label>
                {hasTransmittal && (
                    <span className="text-xs text-[#6e6e6e]">
                        {documentCount} document{documentCount !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            <div className="border border-[#3e3e42] rounded overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-[#858585]">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading transmittal...
                    </div>
                ) : !hasTransmittal ? (
                    <div className="flex flex-col items-center justify-center py-8 text-[#6e6e6e]">
                        <FileText className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No transmittal documents</p>
                        <p className="text-xs mt-1">
                            Select documents and click "Save Transmittal"
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#2d2d30] text-[#858585]">
                                <th className="text-left px-4 py-2.5 font-medium w-10">#</th>
                                <th className="text-left px-4 py-2.5 font-medium">Document</th>
                                <th className="text-center px-4 py-2.5 font-medium w-16">Rev</th>
                                <th className="text-left px-4 py-2.5 font-medium w-36">Category</th>
                                <th className="text-left px-4 py-2.5 font-medium w-40">Subcategory</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transmittal?.documents.map((doc, index) => {
                                const categoryColor = getCategoryColor(doc.categoryId);

                                return (
                                    <tr
                                        key={doc.id}
                                        className="border-t border-[#3e3e42] hover:bg-[#2d2d30]/50"
                                    >
                                        <td className="px-4 py-2.5 text-[#6e6e6e]">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-2.5 text-[#cccccc] truncate max-w-[300px]">
                                            {doc.originalName}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-[#cccccc]">
                                            {String(doc.versionNumber).padStart(2, '0')}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {doc.categoryName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Folder
                                                        className="w-3.5 h-3.5 flex-shrink-0"
                                                        style={{ color: categoryColor }}
                                                    />
                                                    <span
                                                        className="text-sm truncate"
                                                        style={{ color: categoryColor }}
                                                    >
                                                        {doc.categoryName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[#6e6e6e]">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {doc.subcategoryName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Folder
                                                        className="w-3.5 h-3.5 flex-shrink-0"
                                                        style={{ color: categoryColor }}
                                                    />
                                                    <span
                                                        className="text-sm truncate"
                                                        style={{ color: categoryColor }}
                                                    >
                                                        {doc.subcategoryName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[#6e6e6e]">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
