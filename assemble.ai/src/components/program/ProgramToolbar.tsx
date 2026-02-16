'use client';

import React, { useState } from 'react';
import { Plus, ChevronDown, Download } from 'lucide-react';
import { useCreateActivity, useInsertTemplate } from '@/lib/hooks/use-program';
import { useRefetch } from './ProgramPanel';
import { PROGRAM_TEMPLATES } from '@/lib/constants/program-templates';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import { useToast } from '@/lib/hooks/use-toast';
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
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
    const createActivity = useCreateActivity(projectId);
    const insertTemplate = useInsertTemplate(projectId);
    const refetch = useRefetch();
    const { toast } = useToast();

    const handleAddActivity = () => {
        createActivity.mutate({ name: 'New Activity' }, refetch);
    };

    const handleInsertTemplate = async (templateKey: string) => {
        setShowTemplateMenu(false);
        try {
            await insertTemplate.mutate({ templateKey }, refetch);
        } catch {
            // Error is already set in the hook
        }
    };

    const handleClearAllClick = () => {
        setClearAllDialogOpen(true);
    };

    const handleConfirmClearAll = async () => {
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

            await response.json();
            refetch();
        } catch (error) {
            console.error('Clear error:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to clear activities',
                variant: 'destructive',
            });
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
            toast({
                title: 'Error',
                description: 'Failed to export program',
                variant: 'destructive',
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative z-10 flex items-center gap-2 border-b border-[var(--color-border)]/50 backdrop-blur-sm px-3 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 30%, transparent)' }}>
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
                    className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-white bg-[#1776c1] hover:opacity-90"
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
                                    className="w-full px-3 py-1.5 text-left text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-accent-teal)]/10 hover:text-[var(--color-accent-teal)]"
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
                onClick={handleClearAllClick}
                disabled={isClearing}
                className="rounded px-2.5 py-1.5 text-xs font-medium text-white bg-[var(--color-accent-coral)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-coral)] focus:ring-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete all program activities"
            >
                {isClearing ? 'Clearing...' : 'Clear All'}
            </button>

            {/* Clear All Confirmation Dialog */}
            <AuroraConfirmDialog
                open={clearAllDialogOpen}
                onOpenChange={setClearAllDialogOpen}
                onConfirm={handleConfirmClearAll}
                title="Delete all activities?"
                description="This will delete all program activities. This action cannot be undone."
                variant="destructive"
                confirmLabel="Delete All"
            />

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
