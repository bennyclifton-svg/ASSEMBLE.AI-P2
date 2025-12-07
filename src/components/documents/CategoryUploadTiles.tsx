'use client';

import React, { useState } from 'react';
import { CategoryTile } from './CategoryTile';
import { useActiveCategories } from '@/lib/hooks/use-active-categories';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryUploadTilesProps {
    projectId: string;
    onFilesDropped: (files: File[], categoryId?: string, subcategoryId?: string, subcategoryName?: string) => void;
    selectedDocumentIds?: string[];
    /** Callback for Ctrl+click to bulk-select all documents in a category. */
    onBulkSelectCategory?: (categoryId: string, subcategoryId?: string) => void;
}

export function CategoryUploadTiles({
    projectId,
    onFilesDropped,
    selectedDocumentIds = [],
    onBulkSelectCategory,
}: CategoryUploadTilesProps) {
    const { categories, isLoading } = useActiveCategories(projectId);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-11 w-full" />
                ))}
            </div>
        );
    }

    const hasSelection = selectedDocumentIds.length > 0;

    // Create a dummy "upload" category for the upload tile
    const uploadCategory = {
        id: 'upload',
        name: 'Upload',
        color: '#000000',
        row: 0,
        hasSubcategories: false,
    };

    return (
        <div className="space-y-3">
            {/* Main grid with upload tile + all categories */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
                {/* Upload tile - always first */}
                <CategoryTile
                    key="upload"
                    category={uploadCategory}
                    onFilesDropped={onFilesDropped}
                    isUploadTile
                />

                {/* All category tiles */}
                {categories.map(category => (
                    <CategoryTile
                        key={category.id}
                        category={category}
                        onFilesDropped={onFilesDropped}
                        onClick={category.hasSubcategories ? () => toggleCategory(category.id) : undefined}
                        onBulkSelectCategory={onBulkSelectCategory}
                        isExpanded={expandedCategories.has(category.id)}
                        hasSelection={hasSelection}
                    />
                ))}
            </div>

            {/* Subcategory sections (full-width, flex-wrap) */}
            {categories.map(category => {
                if (!expandedCategories.has(category.id) || !category.subcategories?.length) {
                    return null;
                }

                return (
                    <div key={`${category.id}-subs`} className="space-y-2">
                        <div className="text-xs text-[#858585] font-medium pl-1">
                            {category.name} Subcategories
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {category.subcategories.map(subcategory => (
                                <div key={subcategory.id} className="flex-grow min-w-[140px] max-w-[200px]">
                                    <CategoryTile
                                        category={category}
                                        subcategory={subcategory}
                                        onFilesDropped={onFilesDropped}
                                        onBulkSelectCategory={onBulkSelectCategory}
                                        isSubcategory
                                        hasSelection={hasSelection}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
