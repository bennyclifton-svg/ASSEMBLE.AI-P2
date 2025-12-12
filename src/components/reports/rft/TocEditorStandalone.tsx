/**
 * TocEditorStandalone Component
 *
 * Standalone TOC editor with:
 * - Drag-and-drop reordering via @dnd-kit
 * - Linked icon indicator for default 7 sections
 * - Auto-save functionality
 * - Add/remove/reorder sections
 */

'use client';

import { useState, useEffect } from 'react';
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
import { v4 as uuidv4 } from 'uuid';
import { GripVertical, Trash, Plus, ChevronsRight, ChevronsLeft, Link2 } from 'lucide-react';
import { isLinkedSection, getLinkedSectionSource, type LinkedTocSection } from '@/lib/constants/default-toc-sections';

interface TocEditorStandaloneProps {
  sections: LinkedTocSection[];
  onSectionsChange: (sections: LinkedTocSection[]) => void;
  disabled?: boolean;
  isSaving?: boolean;
}

interface SortableSectionProps {
  section: LinkedTocSection;
  onUpdate: (id: string, updates: Partial<LinkedTocSection>) => void;
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
  const isLinked = isLinkedSection(section.id);
  const linkedSource = isLinked ? getLinkedSectionSource(section.id) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 h-9 px-2 hover:bg-[#2a2d2e] transition-colors ${isDragging ? 'bg-[#37373d]' : ''}`}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-[#4a4a4a] hover:text-[#858585] transition-colors flex-shrink-0"
        {...attributes}
        {...listeners}
        disabled={disabled}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Level toggle */}
      <button
        className={`flex-shrink-0 transition-colors ${
          isSubsection
            ? 'text-[#4fc1ff]'
            : 'text-[#858585] hover:text-[#cccccc]'
        }`}
        onClick={() => onUpdate(section.id, { level: isSubsection ? 1 : 2 })}
        disabled={disabled}
        title={isSubsection ? 'Make this a section' : 'Make this a subsection'}
      >
        {isSubsection ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
      </button>

      {/* Title input - indented for subsections */}
      <input
        type="text"
        className={`flex-1 min-w-0 px-2 py-1 bg-transparent text-[#cccccc] placeholder-[#858585] border-0 focus:outline-none focus:bg-[#1e1e1e] rounded transition-colors ${isSubsection ? 'ml-4' : ''}`}
        value={section.title}
        onChange={e => onUpdate(section.id, { title: e.target.value })}
        placeholder="Section title"
        disabled={disabled}
      />

      {/* Linked indicator - only for default 7 sections */}
      <button
        className={`flex-shrink-0 transition-colors ${
          isLinked ? 'text-[#4fc3f7] cursor-help' : 'text-[#4a4a4a] hover:text-[#858585]'
        }`}
        title={isLinked ? `Linked to: ${linkedSource}` : 'Link section'}
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>

      {/* Delete button */}
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

export function TocEditorStandalone({
  sections,
  onSectionsChange,
  disabled = false,
  isSaving = false,
}: TocEditorStandaloneProps) {
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
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      onSectionsChange(arrayMove(sections, oldIndex, newIndex));
    }
  };

  // Update section
  const handleUpdate = (id: string, updates: Partial<LinkedTocSection>) => {
    onSectionsChange(
      sections.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Delete section
  const handleDelete = (id: string) => {
    onSectionsChange(sections.filter(s => s.id !== id));
  };

  // Add new section
  const handleAddSection = () => {
    const newSection: LinkedTocSection = {
      id: uuidv4(),
      title: 'New Section',
      level: 1,
    };
    onSectionsChange([...sections, newSection]);
  };

  return (
    <div className="space-y-2">
      {/* Saving indicator */}
      {isSaving && (
        <div className="flex items-center gap-2 text-xs text-[#858585] mb-2">
          <div className="w-3 h-3 border-2 border-[#0e639c] border-t-transparent rounded-full animate-spin"></div>
          <span>Saving...</span>
        </div>
      )}

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
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Section button */}
        <button
          className="flex items-center gap-2 w-full px-3 h-9 text-[#858585] text-sm hover:text-[#cccccc] hover:bg-[#2a2d2e] border-t border-[#2d2d30] transition-colors"
          onClick={handleAddSection}
          disabled={disabled}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Section
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-[#858585] px-1">
        <Link2 className="w-3 h-3 text-[#4fc3f7]" />
        <span>Linked to project data (auto-populated during generation)</span>
      </div>
    </div>
  );
}
