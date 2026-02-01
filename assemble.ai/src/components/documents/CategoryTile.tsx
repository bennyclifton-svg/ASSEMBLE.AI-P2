'use client';

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
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

    // Determine text color class based on filtered/selected state
    // Filtered state uses inverse text (white on solid fill)
    // Knowledge tile uses teal when selected, others use copper
    const getTextColorClass = () => {
        // Filtered state: white text on solid fill
        if (isFiltered) {
            return 'text-[var(--color-text-inverse)]';
        }
        if (isSelected) {
            if (isKnowledgeCategory) {
                return 'text-[var(--color-accent-teal)]';
            }
            return 'text-[var(--color-accent-copper)]';
        }
        // Default: secondary text that turns copper on hover (or teal for Knowledge)
        if (isKnowledgeCategory) {
            return 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-teal)]';
        }
        return 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-copper)]';
    };
    const textColorClass = getTextColorClass();

    // Get selected state styling based on whether this is Knowledge tile or not
    const getSelectedStyles = () => {
        if (!isSelected) return '';
        if (isKnowledgeCategory) {
            // Knowledge tile uses teal when selected
            return 'border-[var(--color-accent-teal)] bg-[var(--color-accent-teal-tint)]';
        }
        // Regular tiles use copper when selected
        return 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)]';
    };

    // Get hover state styling
    const getHoverStyles = () => {
        if (isSelected || isFiltered) return ''; // No hover change when selected or filtered
        if (isKnowledgeCategory) {
            return 'hover:border-[var(--color-accent-teal)]/50 hover:bg-[var(--color-accent-teal-tint)]';
        }
        return 'hover:border-[var(--color-accent-copper)]/50 hover:bg-[var(--color-accent-copper-tint)]';
    };

    // Get filtered state styling (solid fill, like project type buttons)
    const getFilteredStyles = () => {
        if (!isFiltered) return '';
        if (isKnowledgeCategory) {
            return 'bg-[var(--color-accent-teal)] border-[var(--color-accent-teal)]';
        }
        return 'bg-[var(--color-accent-copper)] border-[var(--color-accent-copper)]';
    };

    return (
        <div
            {...getRootProps()}
            onClick={handleClick}
            className={cn(
                'relative rounded-lg transition-all duration-200 ease-in-out cursor-pointer group',
                'flex items-center justify-center text-center overflow-hidden',
                // Compact size
                isSubcategory ? 'h-10 px-3 py-1' : 'h-11 px-3 py-1',
                // Upload tile special styling - dashed border
                isUploadTile && 'border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-copper)]/50 hover:bg-[var(--color-accent-copper-tint)]',
                // All category tiles - base styling
                !isUploadTile && 'border border-[var(--color-border)] bg-[var(--color-bg-secondary)]',
                // Hover styles (when not selected or filtered)
                !isUploadTile && !isSelected && !isFiltered && getHoverStyles(),
                // Selected state - permanent highlight (transparent tint)
                !isUploadTile && isSelected && !isFiltered && getSelectedStyles(),
                // Filtered state - solid fill (highest priority)
                !isUploadTile && isFiltered && getFilteredStyles(),
                // Drag active state - ring
                isDragActive && !isUploadTile && (isKnowledgeCategory
                    ? 'ring-2 ring-[var(--color-accent-teal)]'
                    : 'ring-2 ring-[var(--color-accent-copper)]')
            )}
            style={{
                ...(isDragActive && isUploadTile && {
                    borderColor: 'var(--color-accent-copper)',
                    backgroundColor: 'var(--color-accent-copper-tint)',
                }),
            }}
        >
            <input {...getInputProps()} />

            {/* Upload tile content */}
            {isUploadTile ? (
                <div className="flex flex-col items-center justify-center gap-1">
                    <Upload
                        className="w-6 h-6 text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-copper)] transition-colors"
                    />
                </div>
            ) : isKnowledgeCategory ? (
                /* Knowledge tile content - diamond icon */
                <div className="flex items-center justify-center w-full relative z-10 gap-2">
                    <svg
                        width={24}
                        height={24}
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={cn('transition-colors flex-shrink-0', textColorClass)}
                    >
                        {/* Outer diamond (square rotated 45 degrees) */}
                        <path
                            d="M8 1L15 8L8 15L1 8L8 1Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                        />
                        {/* Inner diamond (smaller, filled) */}
                        <path
                            d="M8 4.5L11.5 8L8 11.5L4.5 8L8 4.5Z"
                            fill="currentColor"
                        />
                    </svg>
                    <span className={cn('font-medium text-base transition-colors', textColorClass)}>
                        {displayName}
                    </span>
                </div>
            ) : (
                /* Regular tile content */
                <div className="flex items-center justify-between w-full relative z-10">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Upload
                            className={cn(
                                'w-4 h-4 flex-shrink-0 transition-colors',
                                textColorClass
                            )}
                        />
                        <span
                            className={cn(
                                'font-medium truncate transition-colors',
                                isSubcategory ? 'text-sm' : 'text-base',
                                textColorClass
                            )}
                        >
                            {displayName}
                        </span>
                    </div>
                    {category.hasSubcategories && !isSubcategory && (
                        <svg
                            className={cn(
                                'w-4 h-4 flex-shrink-0 ml-2 transition-transform',
                                isExpanded && 'rotate-90',
                                textColorClass
                            )}
                            viewBox="0 0 12 12"
                            fill="currentColor"
                        >
                            <polygon points="2,0 12,6 2,12" />
                        </svg>
                    )}
                </div>
            )}

            {isUploading && (
                <div className="absolute inset-0 bg-[var(--color-bg-primary)]/80 flex items-center justify-center rounded-lg z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-primary)]" />
                </div>
            )}
        </div>
    );
}
