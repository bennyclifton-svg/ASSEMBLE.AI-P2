/**
 * Meeting Stakeholder Selector Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Group filter buttons for adding stakeholders to a meeting.
 * Buttons: Client, Authority, Consultant, Contractor
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StakeholderGroup } from '@/types/stakeholder';

interface MeetingStakeholderSelectorProps {
    onSelectGroup: (group: StakeholderGroup) => void;
    onAddAdhoc?: () => void;
    selectedGroups?: StakeholderGroup[];
    disabled?: boolean;
    className?: string;
}

const STAKEHOLDER_GROUPS: Array<{
    key: StakeholderGroup;
    label: string;
    accent: string;
}> = [
    { key: 'client', label: 'Client', accent: 'var(--sw-cyan)' },
    { key: 'authority', label: 'Authority', accent: 'var(--sw-peach)' },
    { key: 'consultant', label: 'Consultant', accent: 'var(--sw-lav)' },
    { key: 'contractor', label: 'Contractor', accent: 'var(--sw-rose)' },
];

export function MeetingStakeholderSelector({
    onSelectGroup,
    onAddAdhoc,
    selectedGroups = [],
    disabled = false,
    className,
}: MeetingStakeholderSelectorProps) {
    return (
        <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
            {onAddAdhoc && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddAdhoc}
                    className="h-8 rounded-none border-[var(--sw-rule)] bg-transparent px-2 text-[var(--sw-ink)] hover:bg-[var(--sw-paper)]"
                    title="Add ad-hoc attendee"
                    disabled={disabled}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            )}

            {STAKEHOLDER_GROUPS.map((group) => {
                const isSelected = selectedGroups.includes(group.key);
                return (
                    <Button
                        key={group.key}
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectGroup(group.key)}
                        disabled={disabled}
                        className={cn(
                            'h-8 gap-1.5 rounded-none px-2 text-[11px] font-semibold transition-colors',
                            isSelected
                                ? 'border-[var(--sw-ink)] bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-[var(--sw-ink)] hover:text-[var(--sw-paper)]'
                                : 'border-[var(--sw-rule)] bg-transparent text-[var(--sw-ink)] hover:border-[var(--sw-ink)] hover:bg-white'
                        )}
                        style={{ fontFamily: 'var(--sw-font-mono)' }}
                    >
                        <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0"
                            style={{ background: group.accent }}
                        />
                        {group.label}
                    </Button>
                );
            })}
        </div>
    );
}

export default MeetingStakeholderSelector;
