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
    onBulkSelectCategory,
    onKnowledgeAction,
    isExpanded,
    isSubcategory = false,
    hasSelection = false,
    isUploading = false,
    isUploadTile = false,
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

        // Ctrl+click (or Cmd+click on Mac) triggers bulk category selection
        if ((event.ctrlKey || event.metaKey) && onBulkSelectCategory) {
            event.preventDefault();
            if (subcategory) {
                onBulkSelectCategory(category.id, subcategory.id);
            } else {
                onBulkSelectCategory(category.id);
            }
            return;
        }

        if (hasSelection) {
            // Knowledge category: only trigger RAG, don't change document category
            if (isKnowledgeCategory && onKnowledgeAction) {
                onKnowledgeAction([]); // Empty array signals "use selected documents"
                return;
            }

            // If files are selected, clicking categorizes them (no files passed)
            if (subcategory) {
                onFilesDropped([], category.id, subcategory.id, subcategory.name);
            } else if (!category.hasSubcategories) {
                // Only allow categorizing to categories without subcategories
                onFilesDropped([], category.id);
            } else if (onClick) {
                // For categories with subcategories, expand them
                onClick();
            }
        } else if (onClick) {
            // Otherwise, handle expansion
            onClick();
        }
    };

    const displayName = subcategory ? subcategory.name : category.name;

    // Check if this is a Consultants or Contractors tile
    const isConsultantsOrContractors = category.id === 'consultants' || category.id === 'contractors';

    // Map category IDs to accent colors for theme support
    const getAccentColorClasses = (categoryId: string): { bg: string; bgHover: string; text: string; ring: string } => {
        switch (categoryId) {
            case 'planning':
                return {
                    bg: 'bg-[var(--color-accent-green)]/20',
                    bgHover: 'hover:bg-[var(--color-accent-green)]/30',
                    text: 'text-[var(--color-accent-green)]',
                    ring: 'ring-[var(--color-accent-green)]',
                };
            case 'scheme-design':
                return {
                    bg: 'bg-[var(--color-accent-yellow)]/20',
                    bgHover: 'hover:bg-[var(--color-accent-yellow)]/30',
                    text: 'text-[var(--color-accent-yellow)]',
                    ring: 'ring-[var(--color-accent-yellow)]',
                };
            case 'detail-design':
                return {
                    bg: 'bg-[var(--color-accent-purple)]/20',
                    bgHover: 'hover:bg-[var(--color-accent-purple)]/30',
                    text: 'text-[var(--color-accent-purple)]',
                    ring: 'ring-[var(--color-accent-purple)]',
                };
            case 'procurement':
                return {
                    bg: 'bg-[var(--color-accent-coral)]/20',
                    bgHover: 'hover:bg-[var(--color-accent-coral)]/30',
                    text: 'text-[var(--color-accent-coral)]',
                    ring: 'ring-[var(--color-accent-coral)]',
                };
            case 'cost-planning':
                return {
                    bg: 'bg-[var(--color-accent-yellow)]/20',
                    bgHover: 'hover:bg-[var(--color-accent-yellow)]/30',
                    text: 'text-[var(--color-accent-yellow)]',
                    ring: 'ring-[var(--color-accent-yellow)]',
                };
            case 'administration':
                return {
                    bg: 'bg-[var(--color-text-muted)]/15',
                    bgHover: 'hover:bg-[var(--color-text-muted)]/25',
                    text: 'text-[var(--color-text-secondary)]',
                    ring: 'ring-[var(--color-text-muted)]',
                };
            case 'meetings':
            case 'knowledge':
            default:
                return {
                    bg: 'bg-[var(--color-accent-teal)]/20',
                    bgHover: 'hover:bg-[var(--color-accent-teal)]/30',
                    text: 'text-[var(--color-accent-teal)]',
                    ring: 'ring-[var(--color-accent-teal)]',
                };
        }
    };

    const accentColors = getAccentColorClasses(category.id);
    const textColorClass = isUploadTile || isConsultantsOrContractors ? 'text-[var(--color-text-secondary)]' : accentColors.text;

    return (
        <div
            {...getRootProps()}
            onClick={handleClick}
            className={cn(
                'relative rounded-lg transition-all duration-200 ease-in-out cursor-pointer group',
                'flex items-center justify-center text-center overflow-hidden',
                // Compact size
                isSubcategory ? 'h-10 px-3 py-1' : 'h-11 px-3 py-1',
                // Upload tile special styling - thinner border
                isUploadTile && 'border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-green)] hover:bg-[var(--color-accent-green)]/5',
                // Consultants and Contractors category tiles - solid border, thinner (no bg hover)
                isConsultantsOrContractors && !isSubcategory && 'border-2 border-solid border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-green)]',
                // Consultants and Contractors subcategory tiles - solid border (no bg hover)
                isConsultantsOrContractors && isSubcategory && 'border-2 border-solid border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-green)]',
                // Regular category tiles - use accent colors
                !isUploadTile && !isConsultantsOrContractors && accentColors.bg,
                !isUploadTile && !isConsultantsOrContractors && accentColors.bgHover,
                !isUploadTile && !isConsultantsOrContractors && 'border-0',
                // Drag active state for regular tiles
                isDragActive && !isUploadTile && !isConsultantsOrContractors && 'ring-2',
                isDragActive && !isUploadTile && !isConsultantsOrContractors && accentColors.ring
            )}
            style={{
                ...(isDragActive && (isUploadTile || isConsultantsOrContractors) && {
                    borderColor: 'var(--color-accent-green)',
                    backgroundColor: 'var(--color-accent-green-10)',
                }),
            }}
        >
            <input {...getInputProps()} />

            {/* Upload tile content */}
            {isUploadTile ? (
                <div className="flex flex-col items-center justify-center gap-1">
                    <Upload
                        className="w-6 h-6 text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-green)] transition-colors"
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
                                isConsultantsOrContractors ? 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-green)]' : textColorClass
                            )}
                        />
                        <span
                            className={cn(
                                'font-medium truncate transition-colors',
                                isSubcategory ? 'text-sm' : 'text-base',
                                isConsultantsOrContractors ? 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-green)]' : textColorClass
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
                                isConsultantsOrContractors ? 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-green)]' : textColorClass
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
