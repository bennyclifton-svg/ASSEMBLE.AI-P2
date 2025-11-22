'use client';

import React from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

export interface TreeNodeData {
    id: string;
    type: 'folder' | 'file';
    label: string;
    children?: TreeNodeData[];
    metadata?: {
        version?: number;
        size?: number;
        date?: string;
    };
    categoryId?: string;
    subcategoryId?: string;
}

interface TreeNodeProps {
    node: TreeNodeData;
    level: number;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    onSelect: (id: string, event: React.MouseEvent) => void;
    onToggle: (id: string) => void;
}

export function TreeNode({
    node,
    level,
    selectedIds,
    expandedIds,
    onSelect,
    onToggle,
}: TreeNodeProps) {
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedIds.has(node.id);
    const isFolder = node.type === 'folder';

    // dnd-kit sortable hook – files are draggable, folders are not
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isOver,
    } = useSortable({
        id: node.id,
        data: { type: node.type, node },
        disabled: isFolder,
    });

    const handleRowClick = (e: React.MouseEvent) => {
        // ignore clicks on the expand/collapse button
        if ((e.target as HTMLElement).closest('button')) return;
        if (isFolder) onToggle(node.id);
        onSelect(node.id, e);
    };

    const formatSize = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

    return (
        <div>
            <div
                ref={setNodeRef}
                style={{
                    paddingLeft: `${level * 12 + 4}px`,
                    transform: CSS.Transform.toString(transform),
                    transition,
                }}
                {...attributes}
                {...(!isFolder ? listeners : {})}
                className={cn(
                    'flex items-center gap-1 px-2 py-1 select-none transition-colors',
                    !isFolder && 'cursor-move',
                    isFolder && 'cursor-pointer',
                    'hover:bg-[#2a2d2e]',
                    isSelected && 'bg-[#37373d]',
                    isOver && isFolder && 'bg-[#094771] border-l-2 border-blue-500',
                    isDragging && 'opacity-50'
                )}
                onClick={handleRowClick}
                onDragStart={(e) => {
                    // Prevent the browser from opening the file in a new tab
                    if (!isFolder) e.preventDefault();
                }}
            >
                {/* Expand / collapse button for folders */}
                {isFolder && (
                    <button
                        className="flex-shrink-0 w-4 h-4 flex items-center justify-center hover:bg-[#3e3e42] rounded"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(node.id);
                        }}
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-[#c5c5c5]" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-[#c5c5c5]" />
                        )}
                    </button>
                )}
                {!isFolder && <div className="w-4" />}

                {/* Icon */}
                <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {isFolder ? (
                        isExpanded ? (
                            <FolderOpen className="w-4 h-4 text-[#dcb67a]" />
                        ) : (
                            <Folder className="w-4 h-4 text-[#dcb67a]" />
                        )
                    ) : (
                        <FileText className="w-4 h-4 text-[#519aba]" />
                    )}
                </div>

                {/* Label */}
                <span className="flex-1 text-sm text-[#cccccc] truncate">{node.label}</span>

                {/* Metadata for files */}
                {!isFolder && node.metadata && (
                    <div className="flex items-center gap-3 text-xs text-[#858585]">
                        {node.metadata.version && <span>v{node.metadata.version}</span>}
                        {node.metadata.size && (
                            <span className="w-16 text-right">{formatSize(node.metadata.size)}</span>
                        )}
                        {node.metadata.date && (
                            <span className="w-20 text-right">{formatDate(node.metadata.date)}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Render children recursively */}
            {isFolder && isExpanded && node.children && (
                <div>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            onSelect={onSelect}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
