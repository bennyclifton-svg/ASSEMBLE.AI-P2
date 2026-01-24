/**
 * Meeting Agenda Toolbar Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Toolbar with Standard/Detailed/Custom agenda type buttons.
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingAgendaType } from '@/types/notes-meetings-reports';

interface MeetingAgendaToolbarProps {
    currentType: MeetingAgendaType;
    onSelectType: (type: MeetingAgendaType) => void;
    onAddSection?: () => void;
    isLoading?: boolean;
    className?: string;
}

const AGENDA_TYPES: Array<{
    key: MeetingAgendaType;
    label: string;
    description: string;
}> = [
    {
        key: 'standard',
        label: 'Standard',
        description: '8 fixed agenda headings',
    },
    {
        key: 'detailed',
        label: 'Detailed',
        description: 'Standard + stakeholder sub-headings',
    },
    {
        key: 'custom',
        label: 'Custom',
        description: 'Define your own structure',
    },
];

export function MeetingAgendaToolbar({
    currentType,
    onSelectType,
    onAddSection,
    isLoading = false,
    className,
}: MeetingAgendaToolbarProps) {
    return (
        <div className={cn('flex items-center gap-2 flex-wrap', className)}>
            {onAddSection && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddSection}
                    disabled={isLoading}
                    className="h-8 gap-1.5"
                    title="Add custom section"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            )}

            {AGENDA_TYPES.map((type) => {
                const isSelected = currentType === type.key;
                return (
                    <Button
                        key={type.key}
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectType(type.key)}
                        disabled={isLoading}
                        className={cn(
                            'h-8',
                            isSelected
                                ? 'bg-[var(--color-accent-copper-tint)] border-[var(--color-accent-copper)] text-[var(--color-accent-copper)] hover:bg-[var(--color-accent-copper-tint)]'
                                : 'hover:bg-[var(--color-accent-copper-tint)] hover:border-[var(--color-accent-copper)] hover:text-[var(--color-accent-copper)]'
                        )}
                        title={type.description}
                    >
                        {type.label}
                    </Button>
                );
            })}
        </div>
    );
}

export default MeetingAgendaToolbar;
