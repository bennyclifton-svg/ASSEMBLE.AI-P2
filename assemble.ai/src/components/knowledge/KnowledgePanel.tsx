'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Trash, Eye, EyeOff, Users } from 'lucide-react';
import { useKnowledgeSubcategories, type KnowledgeSubcategory } from '@/lib/hooks/use-knowledge-subcategories';
import { useKnowledgeSubcategoryRefresh } from '@/lib/contexts/knowledge-subcategory-refresh-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KnowledgePanelProps {
  projectId: string;
}

const GROUP_ORDER = ['planning', 'procurement', 'delivery', 'authorities'] as const;
const DESIGN_GROUP_ORDER = ['scheme-design', 'detail-design', 'ifc-design'] as const;
const ALL_GROUPS = [...GROUP_ORDER, ...DESIGN_GROUP_ORDER] as const;
type KnowledgeGroup = typeof ALL_GROUPS[number];

const GROUP_LABELS: Record<KnowledgeGroup, string> = {
  planning: 'Planning',
  procurement: 'Procurement',
  delivery: 'Delivery',
  authorities: 'Authorities',
  'scheme-design': 'Scheme Design',
  'detail-design': 'Detail Design',
  'ifc-design': 'IFC Design',
};

export function KnowledgePanel({ projectId }: KnowledgePanelProps) {
  const {
    subcategories,
    isLoading,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    bulkDeleteSubcategories,
    refetch,
  } = useKnowledgeSubcategories(projectId);

  const { triggerRefresh } = useKnowledgeSubcategoryRefresh();

  // Quick add state
  const [quickAddGroup, setQuickAddGroup] = useState<KnowledgeGroup | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Group delete state
  const [groupToDelete, setGroupToDelete] = useState<KnowledgeGroup | null>(null);

  // Visibility state
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  // Adopt consultant state
  const [adoptingGroup, setAdoptingGroup] = useState<string | null>(null);

  // Fetch visibility on mount
  useEffect(() => {
    async function fetchVisibility() {
      try {
        const res = await fetch(`/api/projects/${projectId}/category-visibility`);
        if (res.ok) {
          const data = await res.json();
          setVisibility(data);
        }
      } catch { /* ignore */ }
    }
    fetchVisibility();
  }, [projectId]);

  const toggleVisibility = async (categoryId: string) => {
    const current = visibility[categoryId] !== false; // default true
    const newValue = !current;
    setVisibility(prev => ({ ...prev, [categoryId]: newValue }));
    try {
      await fetch(`/api/projects/${projectId}/category-visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, isVisible: newValue }),
      });
    } catch {
      setVisibility(prev => ({ ...prev, [categoryId]: current }));
    }
  };

  const handleAdoptConsultants = async (categoryId: string) => {
    setAdoptingGroup(categoryId);
    try {
      const res = await fetch(`/api/projects/${projectId}/knowledge-subcategories/adopt-consultants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId }),
      });
      if (res.ok) {
        await refetch();
        triggerRefresh();
      }
    } catch { /* ignore */ } finally {
      setAdoptingGroup(null);
    }
  };

  // Selection handler (click/ctrl+click/shift+click)
  const handleSelect = (id: string, event: React.MouseEvent) => {
    // Prevent text selection on shift+click
    if (event.shiftKey) {
      event.preventDefault();
    }

    const newSelected = new Set(selectedIds);
    const isSelected = newSelected.has(id);
    const allItems = ALL_GROUPS.flatMap(g => subcategories[g] || []);

    if (event.shiftKey && lastSelectedId) {
      const start = allItems.findIndex(s => s.id === lastSelectedId);
      const end = allItems.findIndex(s => s.id === id);
      if (start !== -1 && end !== -1) {
        const [low, high] = start < end ? [start, end] : [end, start];
        allItems.slice(low, high + 1).forEach(s => newSelected.add(s.id));
      }
      setLastSelectedId(id);
    } else if (event.ctrlKey || event.metaKey) {
      isSelected ? newSelected.delete(id) : newSelected.add(id);
      setLastSelectedId(id);
    } else {
      if (selectedIds.size === 1 && selectedIds.has(id)) {
        newSelected.clear();
        setLastSelectedId(null);
      } else {
        newSelected.clear();
        newSelected.add(id);
        setLastSelectedId(id);
      }
    }
    setSelectedIds(newSelected);
  };

  // Quick add handler
  const handleQuickAddSubmit = async (group: KnowledgeGroup, name: string) => {
    if (!name.trim()) return;
    await createSubcategory(group, name.trim());
    setQuickAddGroup(null);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    await bulkDeleteSubcategories(idsToDelete);
    setSelectedIds(new Set());
    setLastSelectedId(null);
    setShowDeleteConfirm(false);
  };

  // Group delete handler
  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    const groupItems = subcategories[groupToDelete] || [];
    await bulkDeleteSubcategories(groupItems.map(item => item.id));
    setGroupToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="h-full p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarGutter: 'stable both-edges' }}>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Column 1: Operational categories */}
          <div className="space-y-4">
            {GROUP_ORDER.map(group => {
              const items = subcategories[group] || [];
              const selectedInGroup = items.filter(s => selectedIds.has(s.id)).length;
              const hasSelectedInGroup = selectedInGroup > 0;

              return (
                <GroupCard
                  key={group}
                  group={group}
                  items={items}
                  onUpdate={updateSubcategory}
                  onDelete={deleteSubcategory}
                  onDeleteGroup={() => setGroupToDelete(group)}
                  onDeleteSelected={() => setShowDeleteConfirm(true)}
                  hasSelectedInGroup={hasSelectedInGroup}
                  selectedInGroup={selectedInGroup}
                  quickAddGroup={quickAddGroup}
                  onQuickAdd={() => setQuickAddGroup(group)}
                  onQuickAddSubmit={handleQuickAddSubmit}
                  onQuickAddCancel={() => setQuickAddGroup(null)}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  isVisible={visibility[group] !== false}
                  onToggleVisibility={() => toggleVisibility(group)}
                />
              );
            })}
          </div>

          {/* Column 2: Design categories */}
          <div className="space-y-4">
            {DESIGN_GROUP_ORDER.map(group => {
              const items = subcategories[group] || [];
              const selectedInGroup = items.filter(s => selectedIds.has(s.id)).length;
              const hasSelectedInGroup = selectedInGroup > 0;

              return (
                <GroupCard
                  key={group}
                  group={group}
                  items={items}
                  onUpdate={updateSubcategory}
                  onDelete={deleteSubcategory}
                  onDeleteGroup={() => setGroupToDelete(group)}
                  onDeleteSelected={() => setShowDeleteConfirm(true)}
                  hasSelectedInGroup={hasSelectedInGroup}
                  selectedInGroup={selectedInGroup}
                  quickAddGroup={quickAddGroup}
                  onQuickAdd={() => setQuickAddGroup(group)}
                  onQuickAddSubmit={handleQuickAddSubmit}
                  onQuickAddCancel={() => setQuickAddGroup(null)}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  isVisible={visibility[group] !== false}
                  onToggleVisibility={() => toggleVisibility(group)}
                  isDesignCategory={true}
                  onAdoptConsultants={() => handleAdoptConsultants(group)}
                  isAdopting={adoptingGroup === group}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Selected Subcategories"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-primary)]">
            Are you sure you want to delete {selectedIds.size} selected subcategor
            {selectedIds.size !== 1 ? 'ies' : 'y'}?
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Group Delete Confirmation Modal */}
      <Modal
        isOpen={groupToDelete !== null}
        onClose={() => setGroupToDelete(null)}
        title={`Delete All ${groupToDelete ? GROUP_LABELS[groupToDelete] : ''} Subcategories`}
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-primary)]">
            Are you sure you want to delete all {groupToDelete ? (subcategories[groupToDelete] || []).length : 0}{' '}
            {groupToDelete ? GROUP_LABELS[groupToDelete].toLowerCase() : ''} subcategor
            {groupToDelete && (subcategories[groupToDelete] || []).length !== 1 ? 'ies' : 'y'}?
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGroupToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>
              Delete All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Inline editable field component (same pattern as StakeholderRow)
interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
}

function InlineEdit({ value, onSave, className }: InlineEditProps) {
  const [editValue, setEditValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused && !isSaving) {
      setEditValue(value);
    }
  }, [value, isFocused, isSaving]);

  const handleSave = async () => {
    if (editValue === value) return;

    setIsSaving(true);
    try {
      await onSave(editValue);
    } catch {
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    handleSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={editValue}
      onChange={e => setEditValue(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={isSaving}
      className={cn(
        'w-full bg-transparent outline-none focus-visible:outline-none text-sm',
        'placeholder:text-[var(--color-text-muted)]',
        'hover:bg-[var(--color-bg-secondary)] focus:bg-[var(--color-bg-secondary)]',
        'px-1 py-0.5 transition-colors',
        isFocused
          ? 'border border-[var(--color-accent-primary)]'
          : 'border border-transparent',
        className
      )}
    />
  );
}

// Group card component
interface GroupCardProps {
  group: KnowledgeGroup;
  items: KnowledgeSubcategory[];
  onUpdate: (id: string, name: string) => Promise<KnowledgeSubcategory | null>;
  onDelete: (id: string) => Promise<boolean>;
  onDeleteGroup: () => void;
  onDeleteSelected: () => void;
  hasSelectedInGroup: boolean;
  selectedInGroup: number;
  quickAddGroup: KnowledgeGroup | null;
  onQuickAdd: () => void;
  onQuickAddSubmit: (group: KnowledgeGroup, name: string) => void;
  onQuickAddCancel: () => void;
  selectedIds: Set<string>;
  onSelect: (id: string, event: React.MouseEvent) => void;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  isDesignCategory?: boolean;
  onAdoptConsultants?: () => void;
  isAdopting?: boolean;
}

function GroupCard({
  group,
  items,
  onUpdate,
  onDelete,
  onDeleteGroup,
  onDeleteSelected,
  hasSelectedInGroup,
  selectedInGroup,
  quickAddGroup,
  onQuickAdd,
  onQuickAddSubmit,
  onQuickAddCancel,
  selectedIds,
  onSelect,
  isVisible,
  onToggleVisibility,
  isDesignCategory,
  onAdoptConsultants,
  isAdopting,
}: GroupCardProps) {
  const handleTrashClick = () => {
    if (hasSelectedInGroup) {
      onDeleteSelected();
    } else {
      onDeleteGroup();
    }
  };

  const trashTitle = hasSelectedInGroup
    ? `Delete ${selectedInGroup} selected subcategor${selectedInGroup !== 1 ? 'ies' : 'y'}`
    : `Delete all ${GROUP_LABELS[group]} subcategories`;

  return (
    <div className="border border-[var(--color-border)]/50 rounded overflow-hidden flex flex-col">
      {/* Header with copper tint background */}
      <div
        className="flex items-center justify-between px-4 py-2.5 backdrop-blur-md border-b border-[var(--color-border)]/50"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 60%, transparent)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onQuickAdd}
            className={cn(
              'p-1 rounded transition-colors',
              'text-blue-500 hover:text-blue-400 hover:bg-blue-500/10'
            )}
            title={`Add ${GROUP_LABELS[group]} subcategory`}
          >
            <Plus className="w-4 h-4" />
          </button>
          {isDesignCategory && onAdoptConsultants && (
            <button
              onClick={onAdoptConsultants}
              disabled={isAdopting}
              className={cn(
                'p-1 rounded transition-colors',
                isAdopting
                  ? 'text-[var(--color-text-muted)]/50 cursor-wait animate-pulse'
                  : 'text-[var(--color-text-muted)] hover:text-blue-400 hover:bg-blue-500/10'
              )}
              title="Populate from consultant list"
            >
              <Users className="w-4 h-4" />
            </button>
          )}
          <span className="text-[var(--color-text-primary)] font-bold text-sm uppercase tracking-wide">
            {GROUP_LABELS[group]} ({items.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className={cn(
                'p-1 rounded transition-colors',
                isVisible
                  ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)]/30 hover:text-[var(--color-text-muted)]'
              )}
              title={isVisible ? 'Visible in Document Repository (click to hide)' : 'Hidden from Document Repository (click to show)'}
            >
              {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleTrashClick}
            className={cn(
              'p-1 rounded transition-colors',
              items.length > 0 || hasSelectedInGroup
                ? 'text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10'
                : 'text-[var(--color-text-muted)]/30 cursor-not-allowed'
            )}
            title={trashTitle}
            disabled={items.length === 0 && !hasSelectedInGroup}
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div
        className="flex-1 backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)]/50">
              <th className="px-3 py-2 text-left text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider w-32">
                Category
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                Subcategory
              </th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {/* Quick Add Row */}
            {quickAddGroup === group && (
              <QuickAddRow
                group={group}
                onSubmit={onQuickAddSubmit}
                onCancel={onQuickAddCancel}
              />
            )}

            {/* Subcategory rows */}
            {items.map(item => (
              <KnowledgeRow
                key={item.id}
                item={item}
                group={group}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isSelected={selectedIds.has(item.id)}
                onSelect={onSelect}
              />
            ))}

            {/* Empty state */}
            {items.length === 0 && quickAddGroup !== group && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                  No {GROUP_LABELS[group].toLowerCase()} subcategories yet. Click + to add.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Quick add row with text input
interface QuickAddRowProps {
  group: KnowledgeGroup;
  onSubmit: (group: KnowledgeGroup, name: string) => void;
  onCancel: () => void;
}

function QuickAddRow({ group, onSubmit, onCancel }: QuickAddRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputRef.current?.value.trim()) {
      onSubmit(group, inputRef.current.value.trim());
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    if (inputRef.current?.value.trim()) {
      onSubmit(group, inputRef.current.value.trim());
    } else {
      onCancel();
    }
  };

  return (
    <tr className="bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
      <td className="px-3 py-2 text-sm text-[var(--color-text-muted)]">
        {GROUP_LABELS[group]}
      </td>
      <td className="px-3 py-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Subcategory name..."
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            'w-full px-2 py-1 text-sm rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)]',
            'focus:outline-none focus:border-[var(--color-accent-copper)]',
            'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]'
          )}
        />
      </td>
      <td className="px-3 py-2 w-10">
        <button
          onClick={onCancel}
          className="p-1 text-[var(--color-text-muted)] hover:text-red-500"
        >
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// Individual subcategory row
interface KnowledgeRowProps {
  item: KnowledgeSubcategory;
  group: KnowledgeGroup;
  onUpdate: (id: string, name: string) => Promise<KnowledgeSubcategory | null>;
  onDelete: (id: string) => Promise<boolean>;
  isSelected: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
}

function KnowledgeRow({ item, group, onUpdate, onDelete, isSelected, onSelect }: KnowledgeRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <tr
      className={cn(
        'border-b border-[var(--color-border)]/30 cursor-pointer transition-colors select-none',
        isSelected
          ? 'bg-[var(--color-bg-tertiary)]'
          : 'hover:bg-[var(--color-bg-secondary)]'
      )}
      onClick={e => onSelect(item.id, e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td className="px-3 py-2 text-sm text-[var(--color-text-muted)]">
        {GROUP_LABELS[group]}
      </td>
      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
        <InlineEdit
          value={item.name}
          onSave={async (newName) => {
            await onUpdate(item.id, newName);
          }}
        />
      </td>
      <td className="px-3 py-2 w-10">
        {(isHovered || isSelected) && (
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
            title="Delete subcategory"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
