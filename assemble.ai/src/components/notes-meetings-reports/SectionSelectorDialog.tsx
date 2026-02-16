/**
 * Section Selector Dialog Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Checkbox dialog for selecting which agenda/contents sections to include.
 * Replaces the 3-button Standard/Detailed/Custom selector.
 * Pattern follows ProgramActivitySelector.tsx.
 */

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Check, X, ListChecks } from 'lucide-react';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import {
    STANDARD_AGENDA_SECTIONS,
    STANDARD_CONTENTS_SECTIONS,
    DETAILED_SECTION_STAKEHOLDER_MAPPING,
    COST_PLANNING_SUB_SECTIONS,
    generateStakeholderSectionKey,
} from '@/lib/constants/sections';
import type { StakeholderGroup as StakeholderGroupType } from '@/types/stakeholder';

// ============================================================================
// TYPES
// ============================================================================

interface SectionSelectorDialogProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onApply: (selectedSectionKeys: string[]) => void;
    currentSectionKeys: string[];
    variant: 'meeting' | 'report';
    entityTitle?: string;
}

interface SectionItem {
    key: string;
    label: string;
    stakeholderId?: string | null;
}

interface SectionGroup {
    key: string;
    label: string;
    children: SectionItem[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SectionSelectorDialog({
    projectId,
    isOpen,
    onClose,
    onApply,
    currentSectionKeys,
    variant,
    entityTitle,
}: SectionSelectorDialogProps) {
    const { stakeholders, isLoading: stakeholdersLoading } = useStakeholders({ projectId });
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Get base sections based on variant
    const baseSections = variant === 'meeting'
        ? STANDARD_AGENDA_SECTIONS
        : STANDARD_CONTENTS_SECTIONS;

    // Build hierarchical section structure
    const sectionGroups = useMemo((): SectionGroup[] => {
        return baseSections.map((section) => {
            const children: SectionItem[] = [];

            // Check for stakeholder sub-sections
            const stakeholderMapping = DETAILED_SECTION_STAKEHOLDER_MAPPING[
                section.key as keyof typeof DETAILED_SECTION_STAKEHOLDER_MAPPING
            ];

            if (stakeholderMapping) {
                const relevantStakeholders = stakeholders.filter(s =>
                    (stakeholderMapping as readonly string[]).includes(s.stakeholderGroup)
                );

                for (const stakeholder of relevantStakeholders) {
                    const subKey = generateStakeholderSectionKey(section.key, stakeholder.id);
                    let subLabel: string;

                    switch (section.key) {
                        case 'procurement':
                            subLabel = stakeholder.organization || stakeholder.name;
                            break;
                        case 'planning_authorities':
                            subLabel = stakeholder.name;
                            break;
                        case 'design':
                            subLabel = stakeholder.disciplineOrTrade || stakeholder.organization || stakeholder.name;
                            break;
                        default:
                            subLabel = stakeholder.name;
                    }

                    children.push({
                        key: subKey,
                        label: subLabel,
                        stakeholderId: stakeholder.id,
                    });
                }
            }

            // Check for cost planning fixed sub-sections
            if (section.key === 'cost_planning') {
                for (const subSection of COST_PLANNING_SUB_SECTIONS) {
                    children.push({
                        key: subSection.key,
                        label: subSection.label,
                    });
                }
            }

            return {
                key: section.key,
                label: section.label,
                children,
            };
        });
    }, [baseSections, stakeholders]);

    // Initialize selection and expanded state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedKeys(new Set(currentSectionKeys));
            // Auto-expand all groups
            setExpandedGroups(new Set(sectionGroups.map(g => g.key)));
        }
    }, [isOpen, currentSectionKeys, sectionGroups]);

    const toggleGroupExpand = useCallback((groupKey: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return next;
        });
    }, []);

    const toggleSelection = useCallback((key: string) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    // Toggle parent: also toggle all children
    const toggleParent = useCallback((group: SectionGroup) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            const isSelected = next.has(group.key);

            if (isSelected) {
                // Deselect parent and all children
                next.delete(group.key);
                for (const child of group.children) {
                    next.delete(child.key);
                }
            } else {
                // Select parent and all children
                next.add(group.key);
                for (const child of group.children) {
                    next.add(child.key);
                }
            }
            return next;
        });
    }, []);

    const handleApply = useCallback(() => {
        onApply(Array.from(selectedKeys));
        onClose();
    }, [selectedKeys, onApply, onClose]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    const dialogTitle = variant === 'meeting' ? 'Select Agenda Sections' : 'Select Contents Sections';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Dialog */}
            <div className="relative bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-xl w-[420px] max-h-[540px] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                    <div>
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                            {dialogTitle}
                        </h3>
                        {entityTitle && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                Adding to: {entityTitle}
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
                    {stakeholdersLoading ? (
                        <div className="text-center py-8 text-[var(--color-text-muted)] text-xs">
                            Loading sections...
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {sectionGroups.map(group => {
                                const isExpanded = expandedGroups.has(group.key);
                                const hasChildren = group.children.length > 0;
                                const isParentSelected = selectedKeys.has(group.key);
                                const selectedChildCount = group.children.filter(c => selectedKeys.has(c.key)).length;
                                const totalSelected = selectedChildCount + (isParentSelected ? 1 : 0);

                                return (
                                    <div key={group.key} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                                        {/* Parent Row */}
                                        <div
                                            className={`flex items-center gap-2 p-2.5 hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer ${isParentSelected ? 'bg-[var(--color-accent-copper-tint)]' : ''}`}
                                        >
                                            {/* Expand/Collapse chevron */}
                                            <button
                                                onClick={() => hasChildren && toggleGroupExpand(group.key)}
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
                                                onClick={() => toggleParent(group)}
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
                                                onClick={() => hasChildren ? toggleGroupExpand(group.key) : toggleParent(group)}
                                            >
                                                {group.label}
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
                                                {group.children.map(child => {
                                                    const isSelected = selectedKeys.has(child.key);
                                                    return (
                                                        <button
                                                            key={child.key}
                                                            onClick={() => toggleSelection(child.key)}
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
                                                                {child.label}
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
                        {selectedKeys.size} selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleClose}
                            className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={selectedKeys.size === 0}
                            className="px-3 py-1.5 text-xs bg-[var(--color-accent-copper)] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SectionSelectorDialog;
