'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';
import { useTradePriceItems, PriceItem } from '@/lib/hooks/use-trade-price-items';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PriceStructureSectionProps {
  tradeId: string | null;
  tradeName: string;
}

interface SortablePriceItemProps {
  item: PriceItem;
  onUpdate: (id: string, description: string) => void;
  onDelete: (id: string) => void;
}

function SortablePriceItem({ item, onUpdate, onDelete }: SortablePriceItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.description);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== item.description) {
      onUpdate(item.id, editValue.trim());
    } else {
      setEditValue(item.description);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(item.description);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-1.5 px-2 bg-[#2d2d30] rounded border border-[#3e3e42] group hover:border-[#505050]"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-[#858585] hover:text-[#cccccc] touch-none"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-6 text-xs bg-[#3c3c3c] border-[#007acc] text-[#cccccc]"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-[#3e3e42]"
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-6 w-6 p-0 text-[#858585] hover:text-[#cccccc] hover:bg-[#3e3e42]"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <span
            className="flex-1 text-xs text-[#cccccc] cursor-pointer hover:text-white"
            onClick={() => setIsEditing(true)}
          >
            {item.description}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(item.id)}
            className="h-6 w-6 p-0 text-[#858585] hover:text-red-400 hover:bg-[#3e3e42] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </>
      )}
    </div>
  );
}

export function PriceStructureSection({ tradeId, tradeName }: PriceStructureSectionProps) {
  const { items, isLoading, addItem, updateItem, deleteItem, reorderItems } = useTradePriceItems(tradeId);
  const [isAdding, setIsAdding] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const newItemInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isAdding && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [isAdding]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      reorderItems(newOrder.map((item) => item.id));
    }
  };

  const handleAddItem = async () => {
    if (newItemText.trim()) {
      await addItem(newItemText.trim());
      setNewItemText('');
      setIsAdding(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    } else if (e.key === 'Escape') {
      setNewItemText('');
      setIsAdding(false);
    }
  };

  if (!tradeId) {
    return (
      <div className="text-xs text-[#858585] italic">
        Select a trade to manage price structure
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-[#cccccc]">
          Price Structure ({items.length} items)
        </h4>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsAdding(true)}
          className="h-6 px-2 text-xs text-[#007acc] hover:text-[#3794ff] hover:bg-[#3e3e42]"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Item
        </Button>
      </div>

      {isLoading ? (
        <div className="text-xs text-[#858585]">Loading...</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {items.map((item) => (
                <SortablePriceItem
                  key={item.id}
                  item={item}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isAdding && (
        <div className="flex items-center gap-1 mt-2">
          <Input
            ref={newItemInputRef}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="Enter price item description..."
            className="flex-1 h-7 text-xs bg-[#3c3c3c] border-[#007acc] text-[#cccccc]"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-[#3e3e42]"
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNewItemText('');
              setIsAdding(false);
            }}
            className="h-7 px-2 text-[#858585] hover:text-[#cccccc] hover:bg-[#3e3e42]"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {items.length === 0 && !isAdding && !isLoading && (
        <div className="text-xs text-[#858585] italic py-2">
          No price items defined. Click &quot;Add Item&quot; to create price structure line items.
        </div>
      )}
    </div>
  );
}
