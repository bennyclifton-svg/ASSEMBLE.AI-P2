'use client';

import React, { useState } from 'react';
import { CategoryTile } from './CategoryTile';
import { useActiveCategories } from '@/lib/hooks/use-active-categories';
import { useHorizontalScroll } from '@/lib/hooks/use-horizontal-scroll';
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

    // Horizontal scroll for category row
    const categoryScroll = useHorizontalScroll<HTMLDivElement>();
    // Horizontal scroll for subcategory row
    const subcategoryScroll = useHorizontalScroll<HTMLDivElement>();

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            if (prev.has(categoryId)) {
                return new Set(); // collapse
            }
            return new Set([categoryId]); // replace with only the new one
        });
    };

    if (isLoading) {
        return (
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-9 w-28 flex-shrink-0" />
                ))}
            </div>
        );
    }

    const hasSelection = selectedDocumentIds.length > 0;

    // Find the currently expanded category that has subcategories
    const expandedCategoryWithSubs = categories.find(
        cat => expandedCategories.has(cat.id) && cat.subcategories?.length
    );

    // Scroll fade mask style
    const getFadeMaskStyle = (canScrollLeft: boolean, canScrollRight: boolean): React.CSSProperties => {
        if (canScrollLeft && canScrollRight) {
            return {
                maskImage: 'linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent)',
            };
        }
        if (canScrollLeft) {
            return {
                maskImage: 'linear-gradient(to right, transparent, black 48px)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 48px)',
            };
        }
        if (canScrollRight) {
            return {
                maskImage: 'linear-gradient(to right, black calc(100% - 48px), transparent)',
                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 48px), transparent)',
            };
        }
        return {};
    };

    return (
        <div className="space-y-2">
            {/* Category row — single horizontal scrolling row */}
            <div
                ref={categoryScroll.scrollRef}
                onWheel={categoryScroll.onWheel}
                onScroll={categoryScroll.updateOverflow}
                className={cn(
                    'flex gap-3 overflow-x-auto',
                    // Hide scrollbar
                    '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                    // Snap to tiles
                    'snap-x snap-mandatory',
                )}
                style={getFadeMaskStyle(categoryScroll.canScrollLeft, categoryScroll.canScrollRight)}
            >
                {/* All category tiles — Ingest first, Consultants/Contractors last */}
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
                        <div key={category.id} className="flex-shrink-0 snap-start">
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

            {/* Subcategory row — single horizontal scrolling row (slides in when expanded) */}
            {expandedCategoryWithSubs && (
                <div
                        ref={subcategoryScroll.scrollRef}
                        onWheel={subcategoryScroll.onWheel}
                        onScroll={subcategoryScroll.updateOverflow}
                        className={cn(
                            'flex gap-3 overflow-x-auto',
                            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                            'snap-x snap-mandatory',
                        )}
                        style={getFadeMaskStyle(subcategoryScroll.canScrollLeft, subcategoryScroll.canScrollRight)}
                    >
                        {expandedCategoryWithSubs.subcategories!.map(subcategory => (
                            <div key={subcategory.id} className="flex-shrink-0 snap-start">
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
