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
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import {
    STANDARD_AGENDA_SECTIONS,
    STANDARD_CONTENTS_SECTIONS,
    DETAILED_SECTION_STAKEHOLDER_MAPPING,
    COST_PLANNING_SUB_SECTIONS,
    generateStakeholderSectionKey,
} from '@/lib/constants/sections';

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
            // Reset transient dialog state when the modal is opened.
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
            <div className="relative flex max-h-[540px] w-[420px] flex-col border border-[var(--sw-rule)] bg-white">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--sw-rule-2)] px-4 py-3">
                    <div>
                        <h3
                            className="text-sm font-medium text-[var(--sw-ink)]"
                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                        >
                            {dialogTitle}
                        </h3>
                        {entityTitle && (
                            <p className="mt-0.5 text-xs text-[var(--sw-muted)]">
                                Adding to: {entityTitle}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-paper)] hover:text-[var(--sw-ink)]"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3">
                    {stakeholdersLoading ? (
                        <div className="py-8 text-center text-xs text-[var(--sw-muted)]">
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
                                    <div key={group.key} className="overflow-hidden border border-[var(--sw-rule)]">
                                        {/* Parent Row */}
                                        <div
                                            className={`flex cursor-pointer items-center gap-2 p-2.5 transition-colors hover:bg-[var(--sw-paper)] ${isParentSelected ? 'bg-[var(--sw-paper)]' : ''}`}
                                        >
                                            {/* Expand/Collapse chevron */}
                                            <button
                                                onClick={() => hasChildren && toggleGroupExpand(group.key)}
                                                className="p-0.5"
                                            >
                                                {hasChildren ? (
                                                    isExpanded ? (
                                                        <ChevronDown className="h-3.5 w-3.5 text-[var(--sw-muted)]" />
                                                    ) : (
                                                        <ChevronRight className="h-3.5 w-3.5 text-[var(--sw-muted)]" />
                                                    )
                                                ) : (
                                                    <div className="w-3.5" />
                                                )}
                                            </button>

                                            {/* Parent checkbox */}
                                            <button
                                                onClick={() => toggleParent(group)}
                                                className={`
                                                    flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center border
                                                    ${isParentSelected
                                                        ? 'border-[var(--sw-ink)] bg-[var(--sw-ink)]'
                                                        : 'border-[var(--sw-rule)]'
                                                    }
                                                `}
                                            >
                                                {isParentSelected && <Check className="h-2.5 w-2.5 text-[var(--sw-paper)]" />}
                                            </button>

                                            <span
                                                className={`flex-1 text-xs font-medium ${isParentSelected ? 'text-[var(--sw-ink)]' : 'text-[var(--sw-muted)]'}`}
                                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                onClick={() => hasChildren ? toggleGroupExpand(group.key) : toggleParent(group)}
                                            >
                                                <span className="mr-2 inline-block h-1.5 w-1.5 bg-[var(--sw-lav)] align-middle" />
                                                {group.label}
                                            </span>

                                            {totalSelected > 0 && (
                                                <span className="bg-[var(--sw-ink)] px-1.5 py-0.5 text-[10px] text-[var(--sw-paper)]">
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
                                                                flex w-full items-center gap-2 p-2 text-left text-xs transition-all
                                                                ${isSelected
                                                                    ? 'border border-[var(--sw-ink)] bg-white'
                                                                    : 'border border-transparent bg-[var(--sw-paper)] hover:border-[var(--sw-rule)]'
                                                                }
                                                            `}
                                                        >
                                                            <div className={`
                                                                flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center border
                                                                ${isSelected
                                                                    ? 'border-[var(--sw-ink)] bg-[var(--sw-ink)]'
                                                                    : 'border-[var(--sw-rule)]'
                                                                }
                                                            `}>
                                                                {isSelected && <Check className="h-2.5 w-2.5 text-[var(--sw-paper)]" />}
                                                            </div>
                                                            <span className={isSelected ? 'text-[var(--sw-ink)]' : 'text-[var(--sw-muted)]'}>
                                                                <span className="mr-2 inline-block h-1.5 w-1.5 bg-[var(--sw-cyan)] align-middle" />
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
                <div className="flex items-center justify-between border-t border-[var(--sw-rule-2)] px-4 py-3">
                    <span className="text-xs text-[var(--sw-muted)]">
                        {selectedKeys.size} selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleClose}
                            className="border border-[var(--sw-rule)] px-3 py-1.5 text-xs text-[var(--sw-ink)] transition-colors hover:bg-[var(--sw-paper)]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={selectedKeys.size === 0}
                            className="bg-[var(--sw-ink)] px-3 py-1.5 text-xs text-[var(--sw-paper)] transition-opacity hover:bg-[var(--sw-rose-dk)] disabled:cursor-not-allowed disabled:opacity-50"
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
