'use client';

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFilesFromDropEvent } from '@/lib/utils/folder-drop';
import type { ActiveCategory, Subcategory } from '@/lib/constants/categories';

/**
 * Props for the CategoryTile component.
 */
interface CategoryTileProps {
    /** The category to display. */
    category: ActiveCategory;
    /** Optional subcategory to display. If present, this tile represents a subcategory. */
    subcategory?: Subcategory;
    /** Callback when files are dropped or categorized. */
    onFilesDropped: (files: File[], categoryId?: string, subcategoryId?: string, subcategoryName?: string) => void;
    /** Callback for click events (expansion or selection). */
    onClick?: () => void;
    /** Callback for regular click to toggle category filter. */
    onCategoryClick?: () => void;
    /** Callback for Ctrl+click to bulk-select all documents in this category. */
    onBulkSelectCategory?: (categoryId: string, subcategoryId?: string) => void;
    /** Callback when files are added to Knowledge category (triggers RAG). */
    onKnowledgeAction?: (files: File[]) => void;
    /** Whether the category is expanded (for categories with subcategories). */
    isExpanded?: boolean;
    /** Whether this tile is a subcategory tile. */
    isSubcategory?: boolean;
    /** Whether documents are currently selected for bulk categorization. */
    hasSelection?: boolean;
    /** Whether a file upload is currently in progress for this tile. */
    isUploading?: boolean;
    /** Whether this is the special upload tile. */
    isUploadTile?: boolean;
    /** Whether this tile is currently selected/active (permanent highlight state). */
    isSelected?: boolean;
    /** Whether this tile is currently filtered (solid fill highlight). */
    isFiltered?: boolean;
    /** Whether a subcategory filter is active while the tile is collapsed. */
    hasActiveSubcategoryFilter?: boolean;
    /** Whether this is a stakeholder category (Consultants/Contractors) - uses grey styling. */
    isStakeholderCategory?: boolean;
    /** Whether the Ingest (knowledge) source is currently processing documents. */
    isIngesting?: boolean;
}

/**
 * A tile component representing a document category or subcategory.
 * Supports drag-and-drop file uploads and click interactions for expansion or bulk categorization.
 */
export function CategoryTile({
    category,
    subcategory,
    onFilesDropped,
    onClick,
    onCategoryClick,
    onBulkSelectCategory,
    onKnowledgeAction,
    isExpanded,
    isSubcategory = false,
    hasSelection = false,
    isUploading = false,
    isUploadTile = false,
    isSelected = false,
    isFiltered = false,
    hasActiveSubcategoryFilter = false,
    isStakeholderCategory = false,
    isIngesting = false,
}: CategoryTileProps) {
    // Check if this is the Knowledge category (triggers auto-RAG)
    const isKnowledgeCategory = category.isKnowledgeSource === true;
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            // Upload tile should not pass categoryId
            if (isUploadTile) {
                onFilesDropped(acceptedFiles);
            } else if (isKnowledgeCategory) {
                // Knowledge category: upload to Uncategorized (no categoryId), then trigger RAG
                onFilesDropped(acceptedFiles); // No categoryId = Uncategorized
                if (onKnowledgeAction && acceptedFiles.length > 0) {
                    onKnowledgeAction(acceptedFiles);
                }
            } else if (subcategory) {
                onFilesDropped(acceptedFiles, category.id, subcategory.id, subcategory.name);
            } else if (!category.hasSubcategories) {
                // Categories without subcategories can always accept drops
                onFilesDropped(acceptedFiles, category.id);
            }
            // For categories with subcategories, don't accept drops directly (need to expand first)
        },
        noClick: true, // We handle clicks separately
        getFilesFromEvent: getFilesFromDropEvent,
    });

    const handleClick = (event: React.MouseEvent) => {
        // Upload tile should not handle clicks
        if (isUploadTile) return;

        // Ctrl+click (or Cmd+click on Mac) handling
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();

            // With selection: categorize files into this category
            if (hasSelection) {
                // Knowledge category: only trigger RAG, don't change document category
                if (isKnowledgeCategory && onKnowledgeAction) {
                    onKnowledgeAction([]); // Empty array signals "use selected documents"
                    return;
                }

                // Categorize selected files
                if (subcategory) {
                    onFilesDropped([], category.id, subcategory.id, subcategory.name);
                } else if (!category.hasSubcategories) {
                    onFilesDropped([], category.id);
                }
                return;
            }

            // Without selection: bulk-select all documents in this category
            if (onBulkSelectCategory) {
                if (subcategory) {
                    onBulkSelectCategory(category.id, subcategory.id);
                } else {
                    onBulkSelectCategory(category.id);
                }
            }
            return;
        }

        // Regular click: expand (if has subcategories) or filter
        if (category.hasSubcategories && !subcategory) {
            onClick?.(); // Expand/collapse subcategories
        } else {
            onCategoryClick?.(); // Toggle filter
        }
    };

    const displayName = subcategory ? subcategory.name : category.name;

    // Compute hover tooltip based on selection state and tile type
    const tooltipText = isUploadTile
        ? undefined
        : hasSelection
            ? (category.hasSubcategories && !subcategory)
                ? 'Click to expand subcategories'
                : `Ctrl+Click to assign documents to ${displayName}`
            : `Ctrl+Click to select all ${displayName} documents`;

    const isActive = isSelected || isExpanded || isFiltered || hasActiveSubcategoryFilter || isKnowledgeCategory;
    const accent = isKnowledgeCategory
        ? (isIngesting ? 'var(--sw-peach)' : 'var(--sw-rose)')
        : isStakeholderCategory
            ? 'var(--sw-muted)'
            : 'var(--sw-rose)';
    const tileStyle: React.CSSProperties = {
        fontFamily: 'var(--sw-font-mono)',
        fontSize: isSubcategory ? 13 : 14,
        background: isDragActive ? 'var(--sw-rose-tint)' : isActive ? '#E6E9EE' : 'transparent',
        borderColor: isActive ? 'var(--sw-ink)' : 'var(--sw-rule-dk-2)',
        color: isActive ? 'var(--sw-ink)' : 'var(--sw-muted)',
        letterSpacing: '0.01em',
    };

    return (
        <div
            {...getRootProps()}
            onClick={handleClick}
            title={tooltipText}
            className={cn(
                'relative rounded-none transition-colors duration-150 ease-in-out cursor-pointer group',
                'flex items-center justify-center text-center overflow-hidden whitespace-nowrap',
                isSubcategory ? 'h-8 px-2.5 py-1' : 'h-8 px-3 py-1',
                // Upload tile special styling - dashed border
                isUploadTile && 'border border-dashed hover:bg-[#2F363E] hover:text-[var(--sw-paper)]',
                // All category tiles - base styling. Active tiles keep their light fill;
                // inactive tiles get the dark nav-style wash on hover.
                !isUploadTile && isActive && 'border hover:bg-[#E6E9EE]',
                !isUploadTile && !isActive && 'border hover:bg-[#2F363E] hover:text-[var(--sw-paper)] hover:border-[var(--sw-paper)]',
                // Drag active state - ring
                isDragActive && !isUploadTile && 'ring-1 ring-[var(--sw-ink)]'
            )}
            style={{
                ...tileStyle,
                ...(isDragActive && isUploadTile && {
                    borderColor: 'var(--sw-ink)',
                    backgroundColor: 'var(--sw-rose-tint)',
                }),
            }}
        >
            <input {...getInputProps()} />

            {/* Upload tile content */}
            {isUploadTile ? (
                <div className="flex flex-col items-center justify-center gap-1">
                    <Upload
                        className="w-4 h-4 text-[var(--sw-muted)] group-hover:text-[var(--sw-ink)] transition-colors"
                    />
                </div>
            ) : isKnowledgeCategory ? (
                <div className="flex items-center justify-center w-full relative z-10 gap-2 min-w-0">
                    <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ background: accent }}
                    />
                    <span className="font-semibold transition-colors truncate">
                        {displayName}
                    </span>
                </div>
            ) : (
                <div className="flex items-center justify-center w-full relative z-10 gap-2 min-w-0">
                    {isActive && (
                        <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ background: accent }}
                        />
                    )}
                    <span
                        className={cn(
                            'transition-colors truncate',
                            isActive ? 'font-semibold' : 'font-medium'
                        )}
                    >
                        {displayName}
                    </span>
                </div>
            )}

            {isUploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-primary)]" />
                </div>
            )}

            {/* Active subcategory filter indicator (shown when collapsed) */}
            {hasActiveSubcategoryFilter && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--sw-rose)] animate-in fade-in duration-200" />
            )}
        </div>
    );
}
