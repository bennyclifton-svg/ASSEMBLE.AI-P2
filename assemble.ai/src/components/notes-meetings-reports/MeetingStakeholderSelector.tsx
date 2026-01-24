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
import { Plus, Users, Building2, HardHat, Briefcase } from 'lucide-react';
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
    icon: React.ReactNode;
}> = [
    { key: 'client', label: 'Client', icon: <Briefcase className="h-4 w-4" /> },
    { key: 'authority', label: 'Authority', icon: <Building2 className="h-4 w-4" /> },
    { key: 'consultant', label: 'Consultant', icon: <Users className="h-4 w-4" /> },
    { key: 'contractor', label: 'Contractor', icon: <HardHat className="h-4 w-4" /> },
];

export function MeetingStakeholderSelector({
    onSelectGroup,
    onAddAdhoc,
    selectedGroups = [],
    disabled = false,
    className,
}: MeetingStakeholderSelectorProps) {
    return (
        <div className={cn('flex items-center gap-2 flex-wrap', className)}>
            {onAddAdhoc && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddAdhoc}
                    className="h-8 gap-1.5"
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
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onSelectGroup(group.key)}
                        disabled={disabled}
                        className={cn(
                            'h-8 gap-1.5',
                            isSelected && 'bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)]'
                        )}
                    >
                        {group.icon}
                        <span>{group.label}</span>
                    </Button>
                );
            })}
        </div>
    );
}

export default MeetingStakeholderSelector;
