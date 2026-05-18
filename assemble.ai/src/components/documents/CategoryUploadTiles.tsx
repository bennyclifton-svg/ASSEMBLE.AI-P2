'use client';

import { useCallback, useState } from 'react';
import { CategoryTile } from './CategoryTile';
import { useActiveCategories } from '@/lib/hooks/use-active-categories';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CategoryUploadTilesProps {
    projectId: string;
    onFilesDropped: (files: File[], categoryId?: string, subcategoryId?: string, subcategoryName?: string) => void;
    selectedDocumentIds?: string[];
    /** Callback for Ctrl+click to bulk-select all documents in a category. */
    onBulkSelectCategory?: (categoryId: string, subcategoryId?: string) => void;
    /** Callback when files are added to Knowledge category (triggers RAG). Empty array = use selected documents. */
    onKnowledgeAction?: (files: File[]) => void;
    /** Currently filtered category ID (null = no filter). */
    filterCategoryId?: string | null;
    /** Currently filtered subcategory ID (null = no subcategory filter). */
    filterSubcategoryId?: string | null;
    /** Whether filtering by synced documents only (Knowledge tile active). */
    filterBySyncedOnly?: boolean;
    /** Callback when filter changes. */
    onFilterChange?: (categoryId: string | null, subcategoryId?: string | null, syncedOnly?: boolean) => void;
}

export function CategoryUploadTiles({
    projectId,
    onFilesDropped,
    selectedDocumentIds = [],
    onBulkSelectCategory,
    onKnowledgeAction,
    filterCategoryId,
    filterSubcategoryId,
    filterBySyncedOnly,
    onFilterChange,
}: CategoryUploadTilesProps) {
    const { categories, isLoading } = useActiveCategories(projectId);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            if (prev.has(categoryId)) {
                return new Set(); // collapse
            }
            return new Set([categoryId]); // replace with only the new one
        });
    };

    const handleHorizontalWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        const el = event.currentTarget;
        if (el.scrollWidth <= el.clientWidth) return;

        const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
            ? event.deltaY
            : event.deltaX;
        if (delta === 0) return;

        event.preventDefault();
        el.scrollLeft += delta;
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-nowrap gap-2 overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-8 w-28 flex-shrink-0 rounded-none" />
                ))}
            </div>
        );
    }

    const hasSelection = selectedDocumentIds.length > 0;

    // Find the currently expanded category that has subcategories
    const expandedCategoryWithSubs = categories.find(
        cat => expandedCategories.has(cat.id) && cat.subcategories?.length
    );

    return (
        <div className="space-y-2">
            {/* Category row - single row, horizontal scroll via wheel or subtle scrollbar. */}
            <div
                onWheel={handleHorizontalWheel}
                className={cn(
                    'firms-scrollbar flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap',
                )}
            >
                {/* All category tiles - Ingest first, Consultants/Contractors last */}
                {[...categories].sort((a, b) => {
                    // Ingest (knowledge source) goes first
                    if (a.isKnowledgeSource) return -1;
                    if (b.isKnowledgeSource) return 1;
                    // Consultants/Contractors go last
                    const isStakeholderA = a.subcategorySource === 'consultants' || a.subcategorySource === 'contractors';
                    const isStakeholderB = b.subcategorySource === 'consultants' || b.subcategorySource === 'contractors';
                    if (isStakeholderA && !isStakeholderB) return 1;
                    if (!isStakeholderA && isStakeholderB) return -1;
                    return 0; // preserve original order for the rest
                }).map(category => {
                    const isKnowledgeCategory = category.isKnowledgeSource === true;
                    const hasActiveSubcategoryFilter = !!(
                        filterCategoryId === category.id &&
                        filterSubcategoryId &&
                        !expandedCategories.has(category.id)
                    );
                    const isStakeholderCategory = category.subcategorySource === 'consultants' || category.subcategorySource === 'contractors';
                    return (
                        <div key={category.id} className="flex-shrink-0">
                            <CategoryTile
                                category={category}
                                onFilesDropped={onFilesDropped}
                                onClick={category.hasSubcategories ? () => toggleCategory(category.id) : undefined}
                                hasActiveSubcategoryFilter={hasActiveSubcategoryFilter}
                                isStakeholderCategory={isStakeholderCategory}
                                onCategoryClick={() => {
                                    // Knowledge tile: toggle filter by synced documents
                                    if (isKnowledgeCategory) {
                                        if (filterBySyncedOnly) {
                                            onFilterChange?.(null, null, false);
                                        } else {
                                            onFilterChange?.(null, null, true);
                                        }
                                        return;
                                    }
                                    // Toggle filter for this category (only for categories without subcategories)
                                    if (!category.hasSubcategories) {
                                        if (filterCategoryId === category.id && !filterSubcategoryId) {
                                            onFilterChange?.(null);
                                        } else {
                                            onFilterChange?.(category.id);
                                        }
                                    }
                                }}
                                onBulkSelectCategory={onBulkSelectCategory}
                                onKnowledgeAction={onKnowledgeAction}
                                isExpanded={expandedCategories.has(category.id)}
                                hasSelection={hasSelection}
                                isSelected={expandedCategories.has(category.id)}
                                isFiltered={isKnowledgeCategory ? filterBySyncedOnly : (filterCategoryId === category.id && !filterSubcategoryId)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Subcategory row - same single-row scroll treatment as the parent row. */}
            {expandedCategoryWithSubs && (
                <div
                        onWheel={handleHorizontalWheel}
                        className={cn(
                            'firms-scrollbar flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap',
                        )}
                    >
                        {expandedCategoryWithSubs.subcategories!.map(subcategory => (
                            <div key={subcategory.id} className="flex-shrink-0">
                                <CategoryTile
                                    category={expandedCategoryWithSubs}
                                    subcategory={subcategory}
                                    onFilesDropped={onFilesDropped}
                                    onCategoryClick={() => {
                                        if (filterCategoryId === expandedCategoryWithSubs.id && filterSubcategoryId === subcategory.id) {
                                            onFilterChange?.(null);
                                        } else {
                                            onFilterChange?.(expandedCategoryWithSubs.id, subcategory.id);
                                        }
                                    }}
                                    onBulkSelectCategory={onBulkSelectCategory}
                                    isSubcategory
                                    hasSelection={hasSelection}
                                    isFiltered={filterCategoryId === expandedCategoryWithSubs.id && filterSubcategoryId === subcategory.id}
                                />
                            </div>
                        ))}
                    </div>
            )}
        </div>
    );
}
