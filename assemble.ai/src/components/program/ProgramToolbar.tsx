'use client';

import React, { useState } from 'react';
import { Plus, ChevronDown, Download } from 'lucide-react';
import { useCreateActivity, useInsertTemplate } from '@/lib/hooks/use-program';
import { useRefetch } from './ProgramPanel';
import { PROGRAM_TEMPLATES } from '@/lib/constants/program-templates';
import type { ZoomLevel } from '@/types/program';

interface ProgramToolbarProps {
    projectId: string;
    zoomLevel: ZoomLevel;
    onZoomChange: (level: ZoomLevel) => void;
}

export function ProgramToolbar({ projectId, zoomLevel, onZoomChange }: ProgramToolbarProps) {
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const createActivity = useCreateActivity(projectId);
    const insertTemplate = useInsertTemplate(projectId);
    const refetch = useRefetch();

    const handleAddActivity = () => {
        createActivity.mutate({ name: 'New Activity' }, refetch);
    };

    const handleInsertTemplate = (templateKey: string) => {
        insertTemplate.mutate({ templateKey }, refetch);
        setShowTemplateMenu(false);
    };

    const handleClearAll = async () => {
        const confirmed = window.confirm(
            'Are you sure you want to delete all program activities? This action cannot be undone.'
        );

        if (!confirmed) {
            return;
        }

        try {
            setIsClearing(true);
            const response = await fetch(
                `/api/projects/${projectId}/program/activities/clear`,
                {
                    method: 'DELETE',
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to clear activities');
            }

            const result = await response.json();
            alert(result.message || 'All activities cleared');
            refetch();
        } catch (error) {
            console.error('Clear error:', error);
            alert(
                error instanceof Error ? error.message : 'Failed to clear activities'
            );
        } finally {
            setIsClearing(false);
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const response = await fetch(`/api/projects/${projectId}/program/export`);
            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Program_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export program');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex items-center gap-2 border-b border-[var(--color-accent-copper)] bg-[#f0f0f0] px-3 py-2">
            {/* Week/Month Toggle - Segmented Control */}
            <div className="relative flex rounded-full bg-[var(--color-bg-tertiary)] p-0.5">
                {/* Sliding background indicator */}
                <div
                    className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-[var(--color-accent-green)] transition-transform duration-200 ease-out ${
                        zoomLevel === 'month' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                    }`}
                />
                <button
                    onClick={() => onZoomChange('week')}
                    className={`relative z-10 px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                        zoomLevel === 'week'
                            ? 'text-[var(--primary-foreground)]'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                    }`}
                >
                    Week
                </button>
                <button
                    onClick={() => onZoomChange('month')}
                    className={`relative z-10 px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                        zoomLevel === 'month'
                            ? 'text-[var(--primary-foreground)]'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                    }`}
                >
                    Month
                </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Template Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)]"
                >
                    Template
                    <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {showTemplateMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowTemplateMenu(false)}
                        />
                        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-lg">
                            {PROGRAM_TEMPLATES.map((template) => (
                                <button
                                    key={template.key}
                                    onClick={() => handleInsertTemplate(template.key)}
                                    disabled={insertTemplate.isLoading}
                                    className="w-full px-3 py-1.5 text-left text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
                                >
                                    {template.name}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Add Activity Button */}
            <button
                onClick={handleAddActivity}
                disabled={createActivity.isLoading}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--primary-foreground)] bg-[var(--color-accent-green)] hover:bg-[var(--primitive-green-dark)] disabled:opacity-50"
            >
                <Plus className="h-3.5 w-3.5" />
                Add Activity
            </button>

            {/* Clear All Button */}
            <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="rounded px-2.5 py-1.5 text-xs font-medium text-[var(--primary-foreground)] bg-[var(--color-accent-coral)] hover:bg-[var(--primitive-red-dark)] disabled:opacity-50"
                title="Delete all program activities"
            >
                {isClearing ? 'Clearing...' : 'Clear All'}
            </button>

            {/* Export Button */}
            <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] disabled:opacity-50"
                title="Export to PDF"
            >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export'}
            </button>
        </div>
    );
}
