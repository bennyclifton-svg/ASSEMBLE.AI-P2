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

const toolbarButtonBase =
    'inline-flex h-9 items-center gap-1.5 border px-3 text-[11px] font-semibold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const toolbarButtonStyle: React.CSSProperties = {
    fontFamily: 'var(--sw-font-mono)',
    letterSpacing: '0.06em',
};

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
            a.download = `Programme_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: 'Error',
                description: 'Failed to export programme',
                variant: 'destructive',
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative z-10 flex shrink-0 items-center gap-2">
            <div
                role="group"
                aria-label="Timeline zoom"
                className="inline-flex h-9 items-stretch border border-[var(--sw-rule)] bg-white"
                style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.06em' }}
            >
                <button
                    type="button"
                    onClick={() => onZoomChange('week')}
                    className={`px-3 text-[11px] font-semibold uppercase transition-colors ${
                        zoomLevel === 'week'
                            ? 'bg-[var(--sw-ink)] text-[var(--sw-paper)]'
                            : 'text-[var(--sw-muted)] hover:bg-[var(--sw-paper)] hover:text-[var(--sw-ink)]'
                    }`}
                >
                    Week
                </button>
                <button
                    type="button"
                    onClick={() => onZoomChange('month')}
                    className={`border-l border-[var(--sw-rule)] px-3 text-[11px] font-semibold uppercase transition-colors ${
                        zoomLevel === 'month'
                            ? 'bg-[var(--sw-ink)] text-[var(--sw-paper)]'
                            : 'text-[var(--sw-muted)] hover:bg-[var(--sw-paper)] hover:text-[var(--sw-ink)]'
                    }`}
                >
                    Month
                </button>
            </div>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className={`${toolbarButtonBase} border-[var(--sw-ink)] bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-transparent hover:text-[var(--sw-ink)]`}
                    style={toolbarButtonStyle}
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
                        <div className="absolute right-0 top-full z-20 mt-1 w-56 border border-[var(--sw-rule)] bg-white py-1">
                            {PROGRAM_TEMPLATES.map((template) => (
                                <button
                                    type="button"
                                    key={template.key}
                                    onClick={() => handleInsertTemplate(template.key)}
                                    className="w-full px-3 py-2 text-left text-[11px] text-[var(--sw-ink)] transition-colors hover:bg-[var(--sw-paper)]"
                                    style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.04em' }}
                                >
                                    {template.name}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <button
                type="button"
                onClick={handleAddActivity}
                disabled={createActivity.isLoading}
                className={`${toolbarButtonBase} border-[var(--sw-rose)] bg-[var(--sw-rose)] text-[var(--sw-ink)] hover:bg-[var(--sw-rose-dk)] hover:text-white`}
                style={toolbarButtonStyle}
            >
                <Plus className="h-3.5 w-3.5" />
                Add Activity
            </button>

            <button
                type="button"
                onClick={handleClearAllClick}
                disabled={isClearing}
                className={`${toolbarButtonBase} border-[var(--sw-rule)] bg-transparent text-[var(--sw-rose-dk)] hover:bg-[var(--sw-rose-tint)]`}
                style={toolbarButtonStyle}
                title="Delete all programme activities"
            >
                {isClearing ? 'Clearing...' : 'Clear All'}
            </button>

            <AuroraConfirmDialog
                open={clearAllDialogOpen}
                onOpenChange={setClearAllDialogOpen}
                onConfirm={handleConfirmClearAll}
                title="Delete all activities?"
                description="This will delete all programme activities. This action cannot be undone."
                variant="destructive"
                confirmLabel="Delete All"
            />

            <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className={`${toolbarButtonBase} border-[var(--sw-rule)] bg-transparent text-[var(--sw-muted)] hover:bg-[var(--sw-paper)] hover:text-[var(--sw-ink)]`}
                style={toolbarButtonStyle}
                title="Export to PDF"
            >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export'}
            </button>
        </div>
    );
}
