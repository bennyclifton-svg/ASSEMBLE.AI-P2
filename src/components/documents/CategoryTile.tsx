'use client';

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, CloudUpload, ChevronRight } from 'lucide-react';
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
    onFilesDropped: (files: File[], categoryId?: string, subcategoryId?: string) => void;
    /** Callback for click events (expansion or selection). */
    onClick?: () => void;
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
    isExpanded,
    isSubcategory = false,
    hasSelection = false,
    isUploading = false,
    isUploadTile = false,
}: CategoryTileProps) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            // Upload tile should not pass categoryId
            if (isUploadTile) {
                onFilesDropped(acceptedFiles);
            } else if (subcategory) {
                onFilesDropped(acceptedFiles, category.id, subcategory.id);
            } else if (!category.hasSubcategories) {
                // Categories without subcategories can always accept drops
                onFilesDropped(acceptedFiles, category.id);
            }
            // For categories with subcategories, don't accept drops directly (need to expand first)
        },
        noClick: true, // We handle clicks separately
    });

    const handleClick = () => {
        // Upload tile should not handle clicks
        if (isUploadTile) return;

        if (hasSelection) {
            // If files are selected, clicking categorizes them (no files passed)
            if (subcategory) {
                onFilesDropped([], category.id, subcategory.id);
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

    const brightColor = isUploadTile ? '#aaaaaa' : brightenColor(tileColor);

    return (
        <div
            {...getRootProps()}
            onClick={handleClick}
            className={cn(
                'relative rounded-lg transition-all duration-200 ease-in-out cursor-pointer group',
                'flex items-center justify-center text-center overflow-hidden',
                // Compact size
                isSubcategory ? 'h-14 px-3 py-2' : 'h-16 px-3 py-2',
                // Upload tile special styling
                isUploadTile && 'border-4 border-dashed border-[#555555] bg-[#252526] hover:border-[#0e639c] hover:bg-[#0e639c]/5',
                // Regular tiles - no border
                !isUploadTile && 'border-0',
                // Selection state
                hasSelection && 'ring-2 ring-[#0e639c] ring-offset-2 ring-offset-[#1e1e1e]'
            )}
            style={{
                ...(!isUploadTile && {
                    backgroundColor: hexToRgba(tileColor, 0.3),
                }),
                ...(isDragActive && !isUploadTile && {
                    backgroundColor: hexToRgba(tileColor, 0.5),
                    boxShadow: `0 0 0 2px ${tileColor}`,
                }),
                ...(isDragActive && isUploadTile && {
                    borderColor: '#0e639c',
                    backgroundColor: hexToRgba('#0e639c', 0.1),
                }),
            }}
        >
            <input {...getInputProps()} />

            {/* Subtle hover glow effect */}
            {!isUploadTile && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at center, ${hexToRgba(tileColor, 0.3)} 0%, transparent 70%)`,
                    }}
                />
            )}

            {/* Upload tile content */}
            {isUploadTile ? (
                <div className="flex flex-col items-center justify-center gap-1">
                    <CloudUpload
                        className="w-8 h-8 group-hover:text-[#cccccc] transition-colors"
                        style={{ color: brightColor }}
                    />
                </div>
            ) : (
                /* Regular tile content */
                <div className="flex items-center justify-between w-full relative z-10">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CloudUpload
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: brightColor }}
                        />
                        <span
                            className={cn(
                                'font-medium truncate',
                                isSubcategory ? 'text-sm' : 'text-base'
                            )}
                            style={{ color: brightColor }}
                        >
                            {displayName}
                        </span>
                    </div>
                    {category.hasSubcategories && !isSubcategory && (
                        <ChevronRight
                            className={cn(
                                'w-3 h-3 flex-shrink-0 ml-2 transition-transform opacity-60',
                                isExpanded && 'rotate-90'
                            )}
                            style={{ color: brightColor }}
                        />
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
