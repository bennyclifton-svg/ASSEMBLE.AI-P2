'use client';

import React, { useState, useMemo } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCenter,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TreeNode, TreeNodeData } from './TreeNode';

interface TreeViewProps {
    data: TreeNodeData[];
    selectedIds: Set<string>;
    onSelect: (id: string, event: React.MouseEvent, allIds: string[]) => void;
    onDrop: (targetId: string, droppedIds: string[]) => void;
}

export function TreeView({ data, selectedIds, onSelect, onDrop }: TreeViewProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [activeId, setActiveId] = useState<string | null>(null);

    // Configure sensors for both pointer and keyboard
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Get all node IDs (both files and folders) for SortableContext
    const allNodeIds = useMemo(() => {
        const ids: string[] = [];
        const traverse = (nodes: TreeNodeData[]) => {
            nodes.forEach(node => {
                ids.push(node.id);
                if (node.children) {
                    traverse(node.children);
                }
            });
        };
        traverse(data);
        return ids;
    }, [data]);

    // Get all file IDs in order for range selection
    const allFileIds = useMemo(() => {
        const ids: string[] = [];
        const traverse = (nodes: TreeNodeData[]) => {
            nodes.forEach(node => {
                if (node.type === 'file') {
                    ids.push(node.id);
                }
                if (node.children) {
                    traverse(node.children);
                }
            });
        };
        traverse(data);
        return ids;
    }, [data]);

    const handleToggle = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelect = (id: string, event: React.MouseEvent) => {
        onSelect(id, event, allFileIds);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        console.log('Drag started:', event.active.id);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // This is called continuously as the drag moves over different drop targets
        // We can use this for visual feedback if needed
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        console.log('Drag ended:', { active: active.id, over: over?.id });

        setActiveId(null);

        if (!over) {
            console.log('No drop target');
            return;
        }

        const activeData = active.data.current;
        const overData = over.data.current;

        // Only allow dropping files onto folders
        if (activeData?.type === 'file' && overData?.type === 'folder') {
            const droppedIds = selectedIds.has(active.id as string)
                ? Array.from(selectedIds)
                : [active.id as string];

            console.log('Calling onDrop:', over.id, droppedIds);
            onDrop(over.id as string, droppedIds);
        } else if (activeData?.type === 'file' && over.id !== active.id) {
            // Dropped on another file - could be used for sorting later
            console.log('Dropped file on file - no action');
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={allNodeIds} strategy={verticalListSortingStrategy}>
                <div className="bg-[#1e1e1e] text-[#cccccc] min-h-[400px] rounded-md overflow-auto">
                    {data.length === 0 ? (
                        <div className="flex items-center justify-center p-12 text-sm text-[#858585]">
                            No documents yet. Upload files to get started.
                        </div>
                    ) : (
                        data.map((node) => (
                            <TreeNode
                                key={node.id}
                                node={node}
                                level={0}
                                selectedIds={selectedIds}
                                expandedIds={expandedIds}
                                onSelect={handleSelect}
                                onToggle={handleToggle}
                            />
                        ))
                    )}
                </div>
            </SortableContext>

            {/* Optional: DragOverlay for better visual feedback while dragging */}
            <DragOverlay>
                {activeId ? (
                    <div className="bg-[#37373d] text-[#cccccc] px-3 py-2 rounded shadow-lg text-sm">
                        {selectedIds.size > 1 && selectedIds.has(activeId) ? (
                            `Moving ${selectedIds.size} files...`
                        ) : (
                            'Moving file...'
                        )}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
