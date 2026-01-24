/**
 * Report Contents Toolbar Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Toolbar with Standard/Detailed/Custom contents type buttons.
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportContentsType } from '@/types/notes-meetings-reports';

interface ReportContentsToolbarProps {
    currentType: ReportContentsType;
    onSelectType: (type: ReportContentsType) => void;
    onAddSection?: () => void;
    isLoading?: boolean;
    className?: string;
}

const CONTENTS_TYPES: Array<{
    key: ReportContentsType;
    label: string;
    description: string;
}> = [
    {
        key: 'standard',
        label: 'Standard',
        description: '8 fixed report sections',
    },
    {
        key: 'detailed',
        label: 'Detailed',
        description: 'Standard + stakeholder sub-sections',
    },
    {
        key: 'custom',
        label: 'Custom',
        description: 'Define your own structure',
    },
];

export function ReportContentsToolbar({
    currentType,
    onSelectType,
    onAddSection,
    isLoading = false,
    className,
}: ReportContentsToolbarProps) {
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

            {CONTENTS_TYPES.map((type) => {
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

export default ReportContentsToolbar;
