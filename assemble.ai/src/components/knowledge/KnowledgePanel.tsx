'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, EyeOff, Loader2, Minus, Plus, Trash, Users, X } from 'lucide-react';
import { useKnowledgeSubcategories, type KnowledgeSubcategory } from '@/lib/hooks/use-knowledge-subcategories';
import { useKnowledgeSubcategoryRefresh } from '@/lib/contexts/knowledge-subcategory-refresh-context';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KnowledgePanelProps {
  projectId: string;
  projectName?: string;
  buildingClass?: string | null;
  projectType?: string | null;
  profileData?: {
    subclass?: string[];
    scaleData?: Record<string, number>;
    complexity?: Record<string, string | string[]>;
    workScope?: string[];
  };
  className?: string;
}

const GROUP_ORDER = ['planning', 'procurement', 'delivery', 'authorities'] as const;
const DESIGN_GROUP_ORDER = ['scheme-design', 'detail-design', 'ifc-design'] as const;
const ALL_GROUPS = [
  'planning',
  'scheme-design',
  'detail-design',
  'ifc-design',
  'procurement',
  'delivery',
  'authorities',
] as const;
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

const GROUP_ACCENTS: Record<KnowledgeGroup, string> = {
  planning: 'var(--sw-cyan)',
  procurement: 'var(--sw-lav)',
  delivery: 'var(--sw-rose)',
  authorities: 'var(--sw-amber)',
  'scheme-design': 'var(--sw-peach)',
  'detail-design': 'var(--sw-cyan)',
  'ifc-design': 'var(--sw-lav)',
};

const DESIGN_GROUP_SET = new Set<KnowledgeGroup>(DESIGN_GROUP_ORDER);
const muted = 'var(--sw-muted)';

type DeleteIntent =
  | { type: 'selected'; group: KnowledgeGroup; ids: string[] }
  | { type: 'group'; group: KnowledgeGroup; ids: string[] }
  | null;

function slugifyProjectName(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function KnowledgeBreadcrumb({
  projectName,
  activeCrumb,
}: {
  projectName: string;
  activeCrumb: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2"
      style={{
        fontFamily: 'var(--sw-font-mono)',
        fontSize: 12,
        color: muted,
      }}
    >
      <span>{slugifyProjectName(projectName)}</span>
      <span style={{ opacity: 0.5 }}>/</span>
      <span style={{ color: 'var(--sw-ink)' }}>KNOWLEDGE</span>
      <span style={{ opacity: 0.5 }}>/</span>
      <span style={{ color: 'var(--sw-ink)' }}>{activeCrumb}</span>
    </nav>
  );
}

export function KnowledgePanel({
  projectId,
  projectName = 'project',
  className,
}: KnowledgePanelProps) {
  const {
    subcategories,
    isLoading,
    error,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    bulkDeleteSubcategories,
    refetch,
  } = useKnowledgeSubcategories(projectId);

  const { triggerRefresh } = useKnowledgeSubcategoryRefresh();

  const [activeGroup, setActiveGroup] = useState<KnowledgeGroup>('planning');

  // Quick add state
  const [quickAddGroup, setQuickAddGroup] = useState<KnowledgeGroup | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const response = await fetch(`/api/projects/${projectId}/category-visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, isVisible: newValue }),
      });
      if (!response.ok) throw new Error('Failed to update category visibility');
      triggerRefresh();
    } catch {
      setVisibility(prev => ({ ...prev, [categoryId]: current }));
    }
  };

  const handleAdoptConsultants = async (categoryId: KnowledgeGroup) => {
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

  const activeItems = useMemo(() => subcategories[activeGroup] || [], [activeGroup, subcategories]);
  const activeSelectedIds = useMemo(
    () => activeItems.filter(item => selectedIds.has(item.id)).map(item => item.id),
    [activeItems, selectedIds]
  );
  const activeSelectedCount = activeSelectedIds.length;
  const allActiveSelected = activeItems.length > 0 && activeSelectedCount === activeItems.length;
  const someActiveSelected = activeSelectedCount > 0;
  useEffect(() => {
    const availableIds = new Set(ALL_GROUPS.flatMap(group => (subcategories[group] || []).map(item => item.id)));
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id => availableIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [subcategories]);

  // Selection handler (click/ctrl+click/shift+click)
  const handleSelect = (id: string, event: React.MouseEvent) => {
    // Prevent text selection on shift+click
    if (event.shiftKey) {
      event.preventDefault();
    }

    const newSelected = new Set(selectedIds);
    const isSelected = newSelected.has(id);

    if (event.shiftKey && lastSelectedId) {
      const start = activeItems.findIndex(s => s.id === lastSelectedId);
      const end = activeItems.findIndex(s => s.id === id);
      if (start !== -1 && end !== -1) {
        const [low, high] = start < end ? [start, end] : [end, start];
        activeItems.slice(low, high + 1).forEach(s => newSelected.add(s.id));
      }
      setLastSelectedId(id);
    } else if (event.ctrlKey || event.metaKey) {
      if (isSelected) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
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

  const handleToggleSelectActive = useCallback(() => {
    if (activeItems.length === 0) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allActiveSelected) {
        activeItems.forEach(item => next.delete(item.id));
      } else {
        activeItems.forEach(item => next.add(item.id));
      }
      return next;
    });
    setLastSelectedId(allActiveSelected ? null : activeItems[activeItems.length - 1]?.id ?? null);
  }, [activeItems, allActiveSelected]);

  // Quick add handler
  const handleQuickAddSubmit = async (group: KnowledgeGroup, name: string) => {
    if (!name.trim()) return;
    await createSubcategory(group, name.trim());
    setQuickAddGroup(null);
  };

  const handleRequestTableDelete = () => {
    if (activeSelectedCount > 0) {
      setDeleteIntent({ type: 'selected', group: activeGroup, ids: activeSelectedIds });
      return;
    }

    if (activeItems.length > 0) {
      setDeleteIntent({ type: 'group', group: activeGroup, ids: activeItems.map(item => item.id) });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteIntent || deleteIntent.ids.length === 0) return;
    setIsDeleting(true);
    try {
      if (deleteIntent.ids.length === 1 && deleteIntent.type === 'selected') {
        await deleteSubcategory(deleteIntent.ids[0]);
      } else {
        await bulkDeleteSubcategories(deleteIntent.ids);
      }
      const deleted = new Set(deleteIntent.ids);
      setSelectedIds(prev => new Set([...prev].filter(id => !deleted.has(id))));
      setLastSelectedId(null);
    } finally {
      setIsDeleting(false);
      setDeleteIntent(null);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex h-full flex-col', className)} style={{ background: 'var(--sw-canvas)' }}>
        <div className="p-4">
          <div className="border border-[var(--sw-rule)] bg-[var(--sw-shell)]">
            <Skeleton className="h-10 w-full rounded-none" />
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-10 w-full rounded-none" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const deleteTitle = deleteIntent?.type === 'group'
    ? `Delete all ${deleteIntent ? GROUP_LABELS[deleteIntent.group] : ''} entries?`
    : `Delete ${deleteIntent?.ids.length ?? 0} selected knowledge entr${deleteIntent?.ids.length === 1 ? 'y' : 'ies'}?`;
  const deleteDescription = deleteIntent?.type === 'group'
    ? `This will permanently delete every entry in ${GROUP_LABELS[deleteIntent.group]}.`
    : 'This will permanently delete the selected knowledge entries.';

  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)} style={{ background: 'var(--sw-canvas)' }}>
      <header className="shrink-0 px-4 pt-2 pb-3" style={{ borderBottom: '1px solid var(--sw-rule-2)' }}>
        <div className="mb-2 flex items-center justify-between gap-4">
          <KnowledgeBreadcrumb projectName={projectName} activeCrumb={GROUP_LABELS[activeGroup].toUpperCase()} />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2
              className="text-[30px] font-bold leading-none text-[var(--sw-ink)]"
              style={{ fontFamily: 'var(--sw-font-sans)', letterSpacing: 0 }}
            >
              Knowledge
            </h2>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[360px_minmax(520px,1fr)]">
        <CategoryRegister
          activeGroup={activeGroup}
          selectedIds={selectedIds}
          subcategories={subcategories}
          visibility={visibility}
          onSelectGroup={setActiveGroup}
          onToggleVisibility={toggleVisibility}
        />

        <section className="flex min-h-[260px] min-w-0 flex-col overflow-hidden border border-[var(--sw-rule)] bg-[var(--sw-shell)]">
          <div
            className="flex h-9 shrink-0 items-center gap-2 px-3"
            style={{ background: 'var(--sw-ink)', color: 'var(--sw-paper)' }}
          >
            <span
              aria-hidden="true"
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: GROUP_ACCENTS[activeGroup] }}
            />
            <span
              className="min-w-0 truncate text-[10px] font-semibold uppercase"
              style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.18em' }}
            >
              {GROUP_LABELS[activeGroup]}
            </span>
            <span
              className="ml-auto truncate text-[10px]"
              style={{ fontFamily: 'var(--sw-font-mono)', color: 'rgba(232,228,218,0.6)' }}
            >
              {activeItems.length} entr{activeItems.length === 1 ? 'y' : 'ies'}
              {activeSelectedCount > 0 ? ` / ${activeSelectedCount} selected` : ''}
            </span>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--sw-rule-2)] px-3 py-2">
            <div className="min-w-0">
              <div
                className="truncate text-[10px] font-semibold uppercase"
                style={{
                  fontFamily: 'var(--sw-font-mono)',
                  letterSpacing: '0.18em',
                  color: GROUP_ACCENTS[activeGroup],
                }}
              >
                Category entries
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <IconButton
                title={visibility[activeGroup] !== false ? 'Visible in Document Repository' : 'Hidden from Document Repository'}
                onClick={() => toggleVisibility(activeGroup)}
              >
                {visibility[activeGroup] !== false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </IconButton>

              {DESIGN_GROUP_SET.has(activeGroup) && (
                <IconButton
                  title="Populate from consultant list"
                  onClick={() => handleAdoptConsultants(activeGroup)}
                  disabled={adoptingGroup === activeGroup}
                >
                  {adoptingGroup === activeGroup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                </IconButton>
              )}

              <IconButton
                title={`Add ${GROUP_LABELS[activeGroup]} entry`}
                onClick={() => setQuickAddGroup(activeGroup)}
              >
                <Plus className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>

          {error && (
            <div className="border-b border-[var(--sw-rule-2)] bg-[var(--sw-rose-tint)] px-3 py-2 text-xs text-[var(--sw-rose-dk)]" style={{ fontFamily: 'var(--sw-font-mono)' }}>
              {error}
            </div>
          )}

          <KnowledgeEntriesTable
            activeGroup={activeGroup}
            items={activeItems}
            quickAddGroup={quickAddGroup}
            selectedIds={selectedIds}
            allActiveSelected={allActiveSelected}
            someActiveSelected={someActiveSelected}
            activeSelectedCount={activeSelectedCount}
            isDeleting={isDeleting}
            onToggleSelectActive={handleToggleSelectActive}
            onQuickAddSubmit={handleQuickAddSubmit}
            onQuickAddCancel={() => setQuickAddGroup(null)}
            onUpdate={updateSubcategory}
            onDelete={deleteSubcategory}
            onSelect={handleSelect}
            onDeleteFromTable={handleRequestTableDelete}
          />
        </section>
      </div>

      <AuroraConfirmDialog
        open={deleteIntent !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIntent(null);
        }}
        onConfirm={handleConfirmDelete}
        title={deleteTitle}
        description={deleteDescription}
      />
    </div>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function IconButton({ children, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-ink)] disabled:cursor-not-allowed disabled:opacity-45',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface CategoryRegisterProps {
  activeGroup: KnowledgeGroup;
  selectedIds: Set<string>;
  subcategories: Record<string, KnowledgeSubcategory[]>;
  visibility: Record<string, boolean>;
  onSelectGroup: (group: KnowledgeGroup) => void;
  onToggleVisibility: (group: KnowledgeGroup) => void;
}

function CategoryRegister({
  activeGroup,
  selectedIds,
  subcategories,
  visibility,
  onSelectGroup,
  onToggleVisibility,
}: CategoryRegisterProps) {
  return (
    <section
      className="min-w-0 self-start overflow-hidden border border-[var(--sw-rule)] bg-[var(--sw-shell)]"
      aria-label="Knowledge category register"
    >
      <div
        className="grid h-8 grid-cols-[minmax(0,1fr)_76px_42px] items-center border-b border-[var(--sw-rule-2)] px-3"
        style={{
          fontFamily: 'var(--sw-font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--sw-muted)',
        }}
      >
        <span>category</span>
        <span className="text-right">entries</span>
        <span className="text-right">show</span>
      </div>

      <div>
        {ALL_GROUPS.map(group => {
          const items = subcategories[group] || [];
          const isActive = activeGroup === group;
          const isVisible = visibility[group] !== false;
          const selectedInGroup = items.filter(item => selectedIds.has(item.id)).length;

          return (
            <div
              key={group}
              role="button"
              tabIndex={0}
              onClick={() => onSelectGroup(group)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectGroup(group);
                }
              }}
              className={cn(
                'grid h-8 cursor-pointer grid-cols-[minmax(0,1fr)_76px_42px] items-center border-b border-l-2 border-[var(--sw-rule-2)] px-3 text-left transition-colors last:border-b-0',
                isActive
                  ? 'border-l-4 bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-[var(--sw-ink)]'
                  : 'bg-transparent hover:bg-[var(--sw-canvas)]',
                !isVisible && !isActive && 'opacity-55'
              )}
              style={{
                borderLeftColor: GROUP_ACCENTS[group],
                fontFamily: 'var(--sw-font-mono)',
              }}
              aria-pressed={isActive}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0"
                  style={{ background: GROUP_ACCENTS[group] }}
                />
                <span
                  className={cn(
                    'truncate text-[10px] font-semibold',
                    isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-ink)]',
                    isActive && 'font-bold'
                  )}
                  title={GROUP_LABELS[group]}
                >
                  {GROUP_LABELS[group]}
                </span>
              </span>
              <span className={cn(
                'flex items-center justify-end gap-1 text-[10px]',
                isActive ? 'text-[rgba(232,228,218,0.72)]' : 'text-[var(--sw-muted)]'
              )}>
                <span>{items.length}</span>
                {selectedInGroup > 0 && (
                  <span className={isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-rose)]'}>/{selectedInGroup}</span>
                )}
                {isActive ? <Check className="h-3 w-3 shrink-0 text-[var(--sw-paper)]" /> : null}
              </span>
              <span className="flex justify-end">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleVisibility(group);
                  }}
                  className={cn(
                    'p-1 transition-colors',
                    isActive
                      ? 'text-[rgba(232,228,218,0.72)] hover:bg-[rgba(232,228,218,0.12)] hover:text-[var(--sw-paper)]'
                      : 'text-[var(--sw-muted)] hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-ink)]'
                  )}
                  title={isVisible ? 'Visible in Document Repository' : 'Hidden from Document Repository'}
                >
                  {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface KnowledgeEntriesTableProps {
  activeGroup: KnowledgeGroup;
  items: KnowledgeSubcategory[];
  quickAddGroup: KnowledgeGroup | null;
  selectedIds: Set<string>;
  allActiveSelected: boolean;
  someActiveSelected: boolean;
  activeSelectedCount: number;
  isDeleting: boolean;
  onToggleSelectActive: () => void;
  onQuickAddSubmit: (group: KnowledgeGroup, name: string) => void;
  onQuickAddCancel: () => void;
  onUpdate: (id: string, name: string) => Promise<KnowledgeSubcategory | null>;
  onDelete: (id: string) => Promise<boolean>;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onDeleteFromTable: () => void;
}

function KnowledgeEntriesTable({
  activeGroup,
  items,
  quickAddGroup,
  selectedIds,
  allActiveSelected,
  someActiveSelected,
  activeSelectedCount,
  isDeleting,
  onToggleSelectActive,
  onQuickAddSubmit,
  onQuickAddCancel,
  onUpdate,
  onDelete,
  onSelect,
  onDeleteFromTable,
}: KnowledgeEntriesTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <table
        className="w-full table-fixed caption-bottom text-[11px]"
        style={{ fontFamily: 'var(--sw-font-mono)', lineHeight: 1.1 }}
      >
        <thead>
          <tr className="border-b border-[var(--sw-rule-2)] bg-[var(--sw-shell)] hover:bg-[var(--sw-shell)]">
            <th
              className="w-12 px-3 py-2 text-left text-[10px] font-semibold uppercase text-[var(--sw-muted)]"
              style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.24em' }}
            >
              <button
                type="button"
                onClick={onToggleSelectActive}
                disabled={items.length === 0}
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                  someActiveSelected
                    ? 'border-[var(--sw-rose)] bg-[var(--sw-rose)] text-[var(--sw-ink)]'
                    : 'border-[var(--sw-rule)] bg-white hover:border-[var(--sw-ink)]'
                )}
                title={allActiveSelected ? 'Clear visible selection' : 'Select all entries in this category'}
              >
                {allActiveSelected ? <Check className="h-2.5 w-2.5" /> : someActiveSelected ? <Minus className="h-2.5 w-2.5" /> : null}
              </button>
            </th>
            <th
              className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-[var(--sw-muted)]"
              style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.24em' }}
            >
              Entry{' '}
              <span className={activeSelectedCount > 0 ? 'text-[var(--sw-rose)]' : 'text-[var(--sw-muted)]'}>
                ({activeSelectedCount > 0 ? activeSelectedCount : items.length})
              </span>
            </th>
            <th className="w-10 px-1 py-2 text-right">
              <button
                type="button"
                onClick={onDeleteFromTable}
                disabled={items.length === 0 || isDeleting}
                className="p-1 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)] disabled:cursor-not-allowed disabled:opacity-35"
                title={activeSelectedCount > 0 ? `Delete ${activeSelectedCount} selected entr${activeSelectedCount === 1 ? 'y' : 'ies'}` : `Delete all ${GROUP_LABELS[activeGroup]} entries`}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {quickAddGroup === activeGroup && (
            <QuickAddRow
              group={activeGroup}
              onSubmit={onQuickAddSubmit}
              onCancel={onQuickAddCancel}
            />
          )}

          {items.map(item => (
            <KnowledgeRow
              key={item.id}
              item={item}
              group={activeGroup}
              onUpdate={onUpdate}
              onDelete={onDelete}
              isSelected={selectedIds.has(item.id)}
              onSelect={onSelect}
            />
          ))}

          {items.length === 0 && quickAddGroup !== activeGroup && (
            <tr>
              <td colSpan={3} className="px-4 py-12 text-center text-xs text-[var(--sw-muted)]" style={{ fontFamily: 'var(--sw-font-mono)' }}>
                No {GROUP_LABELS[activeGroup].toLowerCase()} entries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

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
        'h-7 w-full border bg-transparent px-1.5 text-[11px] text-[var(--sw-ink)] outline-none transition-colors',
        'hover:bg-[var(--sw-canvas)] focus:bg-white focus:border-[var(--sw-rose)]',
        isFocused ? 'border-[var(--sw-rose)]' : 'border-transparent',
        className
      )}
      style={{ fontFamily: 'var(--sw-font-mono)' }}
    />
  );
}

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
    <tr className="border-b border-[var(--sw-rule-2)] bg-[var(--sw-paper-2)]">
      <td className="w-12 px-3 py-1" />
      <td className="px-2 py-1">
        <input
          ref={inputRef}
          type="text"
          placeholder="Entry name..."
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="h-7 w-full border border-[var(--sw-rose)] bg-white px-1.5 text-[11px] text-[var(--sw-ink)] outline-none placeholder:text-[var(--sw-muted)]"
          style={{ fontFamily: 'var(--sw-font-mono)' }}
        />
      </td>
      <td className="w-10 px-1 py-1 text-right">
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)]"
          title="Cancel entry"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

interface KnowledgeRowProps {
  item: KnowledgeSubcategory;
  group: KnowledgeGroup;
  onUpdate: (id: string, name: string) => Promise<KnowledgeSubcategory | null>;
  onDelete: (id: string) => Promise<boolean>;
  isSelected: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
}

function KnowledgeRow({ item, group, onUpdate, onDelete, isSelected, onSelect }: KnowledgeRowProps) {
  return (
    <tr
      className={cn(
        'h-9 cursor-pointer select-none border-b border-l-2 border-[var(--sw-rule-2)] transition-colors',
        'hover:bg-[var(--sw-canvas)]',
        isSelected && 'bg-[var(--sw-canvas)] hover:bg-[var(--sw-canvas)]'
      )}
      style={{ borderLeftColor: GROUP_ACCENTS[group] }}
      onClick={e => onSelect(item.id, e)}
      onMouseDown={(event) => {
        if (event.shiftKey) event.preventDefault();
      }}
      aria-selected={isSelected}
    >
      <td className="w-12 px-3 py-1">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0"
            style={{ background: GROUP_ACCENTS[group] }}
          />
          {isSelected && <Check className="h-3 w-3 shrink-0 text-[var(--sw-rose)]" />}
        </div>
      </td>
      <td className="min-w-0 px-2 py-1" onClick={e => e.stopPropagation()}>
        <InlineEdit
          value={item.name}
          onSave={async (newName) => {
            await onUpdate(item.id, newName);
          }}
        />
      </td>
      <td className="w-10 px-1 py-1 text-right">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="p-1 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)]"
          title="Delete entry"
        >
          <Trash className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}
