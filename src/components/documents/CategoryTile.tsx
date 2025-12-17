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

    const tileColor = category.color;
    const displayName = subcategory ? subcategory.name : category.name;

    // Check if this is a Consultants or Contractors tile
    const isConsultantsOrContractors = category.id === 'consultants' || category.id === 'contractors';

    // Helper to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Helper to brighten color (increase RGB values)
    const brightenColor = (hex: string, amount: number = 80) => {
        const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
        const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
        const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
        return `rgb(${r}, ${g}, ${b})`;
    };

    const brightColor = isUploadTile || isConsultantsOrContractors ? '#aaaaaa' : brightenColor(tileColor);

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
                isUploadTile && 'border-2 border-dashed border-[#555555] bg-[#252526] hover:border-[#0e639c] hover:bg-[#0e639c]/5',
                // Consultants and Contractors category tiles - solid border, thinner (no bg hover)
                isConsultantsOrContractors && !isSubcategory && 'border-2 border-solid border-[#555555] bg-[#252526] hover:border-[#0e639c]',
                // Consultants and Contractors subcategory tiles - solid border (no bg hover)
                isConsultantsOrContractors && isSubcategory && 'border-2 border-solid border-[#555555] bg-[#252526] hover:border-[#0e639c]',
                // Regular tiles - no border
                !isUploadTile && !isConsultantsOrContractors && 'border-0'
            )}
            style={{
                ...(!isUploadTile && !isConsultantsOrContractors && {
                    backgroundColor: hexToRgba(tileColor, 0.3),
                }),
                ...(isDragActive && !isUploadTile && !isConsultantsOrContractors && {
                    backgroundColor: hexToRgba(tileColor, 0.5),
                    boxShadow: `0 0 0 2px ${tileColor}`,
                }),
                ...(isDragActive && (isUploadTile || isConsultantsOrContractors) && {
                    borderColor: '#0e639c',
                    backgroundColor: hexToRgba('#0e639c', 0.1),
                }),
            }}
        >
            <input {...getInputProps()} />

            {/* Subtle hover glow effect - not for upload, consultants, or contractors tiles */}
            {!isUploadTile && !isConsultantsOrContractors && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at center, ${hexToRgba(tileColor, 0.3)} 0%, transparent 70%)`,
                    }}
                />
            )}

            {/* Upload tile content */}
            {isUploadTile ? (
                <div className="flex flex-col items-center justify-center gap-1">
                    <Upload
                        className="w-6 h-6 text-[#aaaaaa] group-hover:text-[#0e639c] transition-colors"
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
                        className="text-[#4fc1ff] group-hover:text-[#6fd1ff] transition-colors flex-shrink-0"
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
                    <span
                        className="font-medium text-base transition-colors"
                        style={{ color: brightColor }}
                    >
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
                                isConsultantsOrContractors && 'text-[#aaaaaa] group-hover:text-[#0e639c]'
                            )}
                            style={!isConsultantsOrContractors ? { color: brightColor } : undefined}
                        />
                        <span
                            className={cn(
                                'font-medium truncate transition-colors',
                                isSubcategory ? 'text-sm' : 'text-base',
                                isConsultantsOrContractors && 'text-[#aaaaaa] group-hover:text-[#0e639c]'
                            )}
                            style={!isConsultantsOrContractors ? { color: brightColor } : undefined}
                        >
                            {displayName}
                        </span>
                    </div>
                    {category.hasSubcategories && !isSubcategory && (
                        <svg
                            className={cn(
                                'w-4 h-4 flex-shrink-0 ml-2 transition-transform',
                                isExpanded && 'rotate-90',
                                isConsultantsOrContractors ? 'text-[#aaaaaa] group-hover:text-[#0e639c]' : ''
                            )}
                            style={!isConsultantsOrContractors ? { color: brightColor } : undefined}
                            viewBox="0 0 12 12"
                            fill="currentColor"
                        >
                            <polygon points="2,0 12,6 2,12" />
                        </svg>
                    )}
                </div>
            )}

            {isUploading && (
                <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center rounded-lg z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
            )}
        </div>
    );
}
