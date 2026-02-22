'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, X, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useCoachingChecklists, type CoachingChecklist } from '@/lib/hooks/use-coaching-checklists';
import type { CoachingModule } from '@/lib/constants/coaching-checklists';

interface GuidedChecklistProps {
    projectId: string;
    module: CoachingModule;
}

export function GuidedChecklist({ projectId, module }: GuidedChecklistProps) {
    const {
        checklists,
        dismissedChecklists,
        toggleItem,
        dismissChecklist,
        isLoading,
    } = useCoachingChecklists(projectId, module);

    const [showDismissed, setShowDismissed] = useState(false);

    if (isLoading || checklists.length === 0) return null;

    // Aggregate progress across all active checklists
    const totalItems = checklists.reduce((sum, c) => sum + c.items.length, 0);
    const checkedItems = checklists.reduce(
        (sum, c) => sum + c.items.filter((i) => i.isChecked).length,
        0
    );

    return (
        <div className="mb-2">
            {checklists.map((checklist) => (
                <ChecklistBanner
                    key={checklist.id}
                    checklist={checklist}
                    projectId={projectId}
                    onToggleItem={toggleItem}
                    onDismiss={(isDismissed) => dismissChecklist(checklist.id, isDismissed)}
                />
            ))}

            {dismissedChecklists.length > 0 && (
                <button
                    onClick={() => setShowDismissed(!showDismissed)}
                    className="text-xs opacity-50 hover:opacity-80 transition-opacity mt-1 flex items-center gap-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    <Eye className="w-3 h-3" />
                    {showDismissed ? 'Hide' : 'Show'} {dismissedChecklists.length} dismissed
                </button>
            )}

            {showDismissed &&
                dismissedChecklists.map((checklist) => (
                    <ChecklistBanner
                        key={checklist.id}
                        checklist={checklist}
                        projectId={projectId}
                        onToggleItem={toggleItem}
                        onDismiss={(isDismissed) => dismissChecklist(checklist.id, isDismissed)}
                        isDismissedView
                    />
                ))}
        </div>
    );
}

interface ChecklistBannerProps {
    checklist: CoachingChecklist;
    projectId: string;
    onToggleItem: (checklistId: string, itemId: string, isChecked: boolean) => void;
    onDismiss: (isDismissed: boolean) => void;
    isDismissedView?: boolean;
}

function ChecklistBanner({
    checklist,
    onToggleItem,
    onDismiss,
    isDismissedView,
}: ChecklistBannerProps) {
    const storageKey = `coaching-checklist-expanded-${checklist.id}`;
    const [isExpanded, setIsExpanded] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(storageKey) === 'true';
    });

    useEffect(() => {
        localStorage.setItem(storageKey, String(isExpanded));
    }, [isExpanded, storageKey]);

    const checkedCount = checklist.items.filter((i) => i.isChecked).length;
    const totalCount = checklist.items.length;
    const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

    const progressColor =
        progressPercent >= 71
            ? 'var(--color-accent-green)'
            : progressPercent >= 41
              ? 'var(--color-accent-yellow)'
              : 'var(--color-accent-coral)';

    return (
        <div
            className="rounded-md border mb-1 overflow-hidden transition-all"
            style={{
                borderColor: 'var(--color-border)',
                backgroundColor: isDismissedView
                    ? 'var(--color-bg-primary)'
                    : 'var(--color-accent-copper-tint)',
                opacity: isDismissedView ? 0.6 : 1,
            }}
        >
            {/* Collapsed header bar */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:opacity-80 transition-opacity"
                style={{ minHeight: '36px' }}
            >
                {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                )}

                <span
                    className="text-xs font-medium truncate flex-1"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {checklist.title}
                </span>

                {/* Progress bar */}
                <div className="flex items-center gap-2 shrink-0">
                    <div
                        className="w-16 h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--color-border)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${progressPercent}%`,
                                backgroundColor: progressColor,
                            }}
                        />
                    </div>
                    <span
                        className="text-xs tabular-nums"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {checkedCount}/{totalCount}
                    </span>
                </div>

                {/* Dismiss/Restore button */}
                {isDismissedView ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(false);
                        }}
                        className="text-xs px-1.5 py-0.5 rounded hover:opacity-80"
                        style={{
                            color: 'var(--color-accent-copper)',
                            border: '1px solid var(--color-accent-copper)',
                        }}
                    >
                        Restore
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(true);
                        }}
                        className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
                        title="Dismiss checklist"
                    >
                        <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                )}
            </button>

            {/* Expanded items */}
            {isExpanded && (
                <div
                    className="px-3 pb-2 space-y-1 overflow-y-auto"
                    style={{ maxHeight: '280px' }}
                >
                    {checklist.items.map((item) => (
                        <label
                            key={item.id}
                            className="flex items-start gap-2 py-1 cursor-pointer group/item rounded px-1 hover:bg-white/5"
                        >
                            <Checkbox
                                checked={item.isChecked}
                                onCheckedChange={(checked) =>
                                    onToggleItem(checklist.id, item.id, checked === true)
                                }
                                className="mt-0.5 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <span
                                    className={`text-xs leading-tight block ${
                                        item.isChecked ? 'line-through opacity-50' : ''
                                    }`}
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    {item.label}
                                </span>
                                <span
                                    className="text-[11px] leading-tight block mt-0.5"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                >
                                    {item.description}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
