'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { useProgram } from '@/lib/hooks/use-program';
import type { ProgramActivity } from '@/types/program';

interface ProgramActivitySelectorProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedActivities: ProgramActivity[]) => void;
    sourceLine?: {
        id: string;
        activity: string;
        stakeholderId: string | null;
    };
}

export function ProgramActivitySelector({
    projectId,
    isOpen,
    onClose,
    onConfirm,
    sourceLine,
}: ProgramActivitySelectorProps) {
    const { activities, isLoading } = useProgram(projectId);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Auto-expand all parents
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

    // Auto-expand all parents when activities load
    useEffect(() => {
        if (activities.length > 0) {
            const parentIds = activities.filter(a => a.parentId === null).map(a => a.id);
            setExpandedParents(new Set(parentIds));
        }
    }, [activities]);

    // Build hierarchical structure: parent activities with children
    const hierarchicalActivities = useMemo(() => {
        const parents = activities.filter(a => a.parentId === null);
        const childrenMap = new Map<string, ProgramActivity[]>();

        activities.forEach(a => {
            if (a.parentId) {
                const existing = childrenMap.get(a.parentId) || [];
                existing.push(a);
                childrenMap.set(a.parentId, existing);
            }
        });

        return parents.map(parent => ({
            ...parent,
            children: childrenMap.get(parent.id) || [],
        }));
    }, [activities]);

    const toggleParentExpand = (parentId: string) => {
        setExpandedParents(prev => {
            const next = new Set(prev);
            if (next.has(parentId)) {
                next.delete(parentId);
            } else {
                next.add(parentId);
            }
            return next;
        });
    };

    const toggleSelection = (activityId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(activityId)) {
                next.delete(activityId);
            } else {
                next.add(activityId);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        const selectedActivities = activities.filter(a => selectedIds.has(a.id));
        onConfirm(selectedActivities);
        setSelectedIds(new Set());
        onClose();
    };

    const handleClose = () => {
        setSelectedIds(new Set());
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Dialog */}
            <div className="relative bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-xl w-[400px] max-h-[500px] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                    <div>
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                            Select Program Activities
                        </h3>
                        {sourceLine && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                Adding to: {sourceLine.activity}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3">
                    {isLoading ? (
                        <div className="text-center py-8 text-[var(--color-text-muted)] text-xs">
                            Loading activities...
                        </div>
                    ) : hierarchicalActivities.length === 0 ? (
                        <div className="text-center py-8 text-[var(--color-text-muted)] text-xs">
                            No program activities found
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {hierarchicalActivities.map(parent => {
                                const isExpanded = expandedParents.has(parent.id);
                                const hasChildren = parent.children.length > 0;
                                const isParentSelected = selectedIds.has(parent.id);
                                const selectedChildCount = parent.children.filter(c => selectedIds.has(c.id)).length;
                                const totalSelected = selectedChildCount + (isParentSelected ? 1 : 0);

                                return (
                                    <div key={parent.id} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                                        {/* Parent Row */}
                                        <div
                                            className={`flex items-center gap-2 p-2.5 hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer ${isParentSelected ? 'bg-[var(--color-accent-copper-tint)]' : ''}`}
                                        >
                                            {/* Expand/Collapse chevron */}
                                            <button
                                                onClick={() => hasChildren && toggleParentExpand(parent.id)}
                                                className="p-0.5"
                                            >
                                                {hasChildren ? (
                                                    isExpanded ? (
                                                        <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                                    ) : (
                                                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                                    )
                                                ) : (
                                                    <div className="w-3.5" />
                                                )}
                                            </button>
                                            {/* Parent checkbox */}
                                            <button
                                                onClick={() => toggleSelection(parent.id)}
                                                className={`
                                                    w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0
                                                    ${isParentSelected
                                                        ? 'bg-[var(--color-accent-copper)] border-[var(--color-accent-copper)]'
                                                        : 'border-[var(--color-border)]'
                                                    }
                                                `}
                                            >
                                                {isParentSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                            </button>
                                            <span
                                                className={`flex-1 text-xs font-medium ${isParentSelected ? 'text-[var(--color-accent-copper)]' : 'text-[var(--color-text-secondary)]'}`}
                                                onClick={() => hasChildren && toggleParentExpand(parent.id)}
                                            >
                                                {parent.name}
                                            </span>
                                            {totalSelected > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-copper)] text-white">
                                                    {totalSelected}
                                                </span>
                                            )}
                                        </div>

                                        {/* Children */}
                                        {isExpanded && hasChildren && (
                                            <div className="px-2 pb-2 space-y-1">
                                                {parent.children.map(child => {
                                                    const isSelected = selectedIds.has(child.id);
                                                    return (
                                                        <button
                                                            key={child.id}
                                                            onClick={() => toggleSelection(child.id)}
                                                            className={`
                                                                w-full flex items-center gap-2 p-2 rounded text-left text-xs transition-all
                                                                ${isSelected
                                                                    ? 'bg-[var(--color-accent-copper-tint)] border border-[var(--color-accent-copper)]'
                                                                    : 'bg-[var(--color-bg-secondary)] border border-transparent hover:border-[var(--color-border)]'
                                                                }
                                                            `}
                                                        >
                                                            <div className={`
                                                                w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0
                                                                ${isSelected
                                                                    ? 'bg-[var(--color-accent-copper)] border-[var(--color-accent-copper)]'
                                                                    : 'border-[var(--color-border)]'
                                                                }
                                                            `}>
                                                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                            </div>
                                                            <span className={isSelected ? 'text-[var(--color-accent-copper)]' : 'text-[var(--color-text-secondary)]'}>
                                                                {child.name}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-muted)]">
                        {selectedIds.size} selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleClose}
                            className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedIds.size === 0}
                            className="px-3 py-1.5 text-xs bg-[var(--color-accent-copper)] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
