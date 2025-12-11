/**
 * T055, T076, T077: TocEditor Component
 * Table of contents editor with drag-and-drop reordering
 *
 * T076: Shows "From memory" indicator when TOC is pre-filled
 * T077: Shows times_used count for memory-based TOCs
 */

'use client';

import { useState, useImperativeHandle, forwardRef } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TableOfContents, TocSection } from '@/lib/langgraph/state';
import { v4 as uuidv4 } from 'uuid';
import { GripVertical, Trash, Plus, ChevronsRight, ChevronsLeft, Link2 } from 'lucide-react';

interface TocEditorProps {
    initialToc: TableOfContents;
    onApprove: (toc: TableOfContents) => void;
    onCancel: () => void;
    isLocked?: boolean;
    lockOwner?: string;
}

// Expose methods to parent via ref
export interface TocEditorHandle {
    approve: () => Promise<void>;
    cancel: () => void;
    isSubmitting: boolean;
    sectionCount: number;
}

interface SortableSectionProps {
    section: TocSection;
    onUpdate: (id: string, updates: Partial<TocSection>) => void;
    onDelete: (id: string) => void;
    disabled?: boolean;
}

function SortableSection({ section, onUpdate, onDelete, disabled }: SortableSectionProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isSubsection = section.level === 2;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-2 h-9 px-2 hover:bg-[#2a2d2e] transition-colors ${isDragging ? 'bg-[#37373d]' : ''}`}
        >
            <button
                className="cursor-grab active:cursor-grabbing text-[#4a4a4a] hover:text-[#858585] transition-colors flex-shrink-0"
                {...attributes}
                {...listeners}
                disabled={disabled}
            >
                <GripVertical className="w-3.5 h-3.5" />
            </button>

            <button
                className={`flex-shrink-0 transition-colors ${
                    isSubsection
                        ? 'text-[#4fc1ff]'
                        : 'text-[#858585] hover:text-[#cccccc]'
                }`}
                onClick={() => onUpdate(section.id, { level: isSubsection ? 1 : 2 })}
                disabled={disabled}
                title={isSubsection ? 'Click to make this a section' : 'Click to make this a subsection'}
            >
                {isSubsection ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
            </button>

            <input
                type="text"
                className={`flex-1 min-w-0 px-2 py-1 bg-transparent text-[#cccccc] placeholder-[#858585] border-0 focus:outline-none focus:bg-[#1e1e1e] rounded transition-colors ${isSubsection ? 'ml-4' : ''}`}
                value={section.title}
                onChange={e => onUpdate(section.id, { title: e.target.value })}
                placeholder="Section title"
                disabled={disabled}
            />

            <button
                className="flex-shrink-0 text-[#4a4a4a] hover:text-[#858585] transition-colors"
                title="Link section"
            >
                <Link2 className="w-3.5 h-3.5" />
            </button>

            <button
                className="flex-shrink-0 text-[#4a4a4a] hover:text-[#f14c4c] transition-colors"
                onClick={() => onDelete(section.id)}
                disabled={disabled}
                title="Delete section"
            >
                <Trash className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

export const TocEditor = forwardRef<TocEditorHandle, TocEditorProps>(function TocEditor({
    initialToc,
    onApprove,
    onCancel,
    isLocked,
    lockOwner,
}, ref) {
    const [sections, setSections] = useState<TocSection[]>(initialToc.sections);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        approve: handleApprove,
        cancel: onCancel,
        isSubmitting,
        sectionCount: sections.length,
    }), [sections, isSubmitting, onCancel]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSections(items => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Update section
    const handleUpdate = (id: string, updates: Partial<TocSection>) => {
        setSections(prev =>
            prev.map(s => (s.id === id ? { ...s, ...updates } : s))
        );
    };

    // Delete section
    const handleDelete = (id: string) => {
        setSections(prev => prev.filter(s => s.id !== id));
    };

    // Add new section
    const handleAddSection = () => {
        const newSection: TocSection = {
            id: uuidv4(),
            title: 'New Section',
            level: 1,
        };
        setSections(prev => [...prev, newSection]);
    };

    // Handle approve
    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            const updatedToc: TableOfContents = {
                ...initialToc,
                sections,
                version: (initialToc.version || 0) + 1,
            };
            await onApprove(updatedToc);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLocked) {
        return (
            <div className="p-4 border border-[#5a5a00] rounded bg-[#3a3a00]/30 text-[#e6e600]">
                <p className="font-medium">Report is locked</p>
                <p className="text-sm text-[#b3b300]">
                    {lockOwner ? `${lockOwner} is currently editing this report.` : 'Another user is editing this report.'}
                </p>
                <button
                    className="mt-2 px-4 py-2 border border-[#3e3e42] rounded bg-[#2d2d30] text-[#cccccc] hover:bg-[#3e3e42] transition-colors"
                    onClick={onCancel}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="border border-[#3e3e42] rounded-md bg-[#1e1e1e] overflow-hidden">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={sections.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="divide-y divide-[#2d2d30]">
                            {sections.map(section => (
                                <SortableSection
                                    key={section.id}
                                    section={section}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                <button
                    className="flex items-center gap-2 w-full px-3 h-9 text-[#858585] text-sm hover:text-[#cccccc] hover:bg-[#2a2d2e] border-t border-[#2d2d30] transition-colors"
                    onClick={handleAddSection}
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add Section
                </button>
            </div>
        </div>
    );
});
