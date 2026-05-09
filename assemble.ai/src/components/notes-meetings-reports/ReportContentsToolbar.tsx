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
        <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
            {onAddSection && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddSection}
                    disabled={isLoading}
                    className="h-8 gap-1.5 rounded-none border-[var(--sw-rule)] bg-transparent text-[var(--sw-ink)] hover:bg-white"
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
                            'h-8 rounded-none px-2 text-[11px] font-semibold',
                            isSelected
                                ? 'border-[var(--sw-ink)] bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-[var(--sw-ink)] hover:text-[var(--sw-paper)]'
                                : 'border-[var(--sw-rule)] bg-transparent text-[var(--sw-ink)] hover:border-[var(--sw-ink)] hover:bg-white'
                        )}
                        style={{ fontFamily: 'var(--sw-font-mono)' }}
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
