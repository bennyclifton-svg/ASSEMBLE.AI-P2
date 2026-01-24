'use client';

import React, { useState } from 'react';
import { Plus, ChevronDown, Download, Trash2 } from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
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
    const [isGenerating, setIsGenerating] = useState(false);
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

    const handleGenerateFromProjectType = async () => {
        try {
            setIsGenerating(true);
            const response = await fetch(
                `/api/projects/${projectId}/program/generate-from-template`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        answers: {}, // Use default answers for now
                        startDate: new Date().toISOString().split('T')[0],
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate program');
            }

            const result = await response.json();
            alert(result.message || 'Program generated successfully');
            refetch();
        } catch (error) {
            console.error('Generate error:', error);
            alert(
                error instanceof Error
                    ? error.message
                    : 'Failed to generate program from project type'
            );
        } finally {
            setIsGenerating(false);
        }
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
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2">
            {/* Add Activity Button */}
            <button
                onClick={handleAddActivity}
                disabled={createActivity.isLoading}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--primary-foreground)] bg-[var(--color-accent-green)] hover:bg-[var(--primitive-green-dark)] disabled:opacity-50"
            >
                <Plus className="h-3.5 w-3.5" />
                Add Activity
            </button>

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
                        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-lg">
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

            {/* Generate from Project Type Button */}
            <button
                onClick={handleGenerateFromProjectType}
                disabled={isGenerating}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--primary-foreground)] bg-[var(--color-accent-purple)] hover:bg-[var(--primitive-purple-dark)] disabled:opacity-50"
                title="Generate program activities from project type template"
            >
                <DiamondIcon className="h-3.5 w-3.5" />
                {isGenerating ? 'Generating...' : 'Generate from Project Type'}
            </button>

            {/* Clear All Button */}
            <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--primary-foreground)] bg-[var(--color-accent-coral)] hover:bg-[var(--primitive-red-dark)] disabled:opacity-50"
                title="Delete all program activities"
            >
                <Trash2 className="h-3.5 w-3.5" />
                {isClearing ? 'Clearing...' : 'Clear All'}
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Zoom Toggle */}
            <div className="flex rounded border border-[var(--color-border)]">
                <button
                    onClick={() => onZoomChange('week')}
                    className={`px-2.5 py-1 text-xs font-medium ${
                        zoomLevel === 'week'
                            ? 'bg-[var(--color-accent-green)] text-[var(--primary-foreground)]'
                            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                >
                    Week
                </button>
                <button
                    onClick={() => onZoomChange('month')}
                    className={`px-2.5 py-1 text-xs font-medium ${
                        zoomLevel === 'month'
                            ? 'bg-[var(--color-accent-green)] text-[var(--primary-foreground)]'
                            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                >
                    Month
                </button>
            </div>

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
