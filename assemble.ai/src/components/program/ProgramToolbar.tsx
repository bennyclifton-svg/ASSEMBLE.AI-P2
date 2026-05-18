'use client';

import React, { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
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

interface ProgramControlButtonProps {
    label: string;
    accent: string;
    selected?: boolean;
    disabled?: boolean;
    title?: string;
    onClick: () => void;
}

function ProgramControlButton({
    label,
    accent,
    selected,
    disabled = false,
    title,
    onClick,
}: ProgramControlButtonProps) {
    const isSelected = selected === true;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={selected === undefined ? undefined : selected}
            title={title}
            className={`inline-flex h-7 items-center gap-1.5 border px-2.5 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                    ? 'border-[var(--sw-ink)] bg-white text-[var(--sw-ink)]'
                    : 'border-[var(--sw-rule)] bg-white text-[var(--sw-muted)] hover:border-[var(--sw-ink)] hover:text-[var(--sw-ink)]'
            }`}
            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.02em' }}
        >
            <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0"
                style={{ background: accent }}
            />
            <span>{label}</span>
        </button>
    );
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
        <div className="relative z-10 flex w-full flex-wrap items-center gap-1.5">
            <div role="group" aria-label="Programme view and actions" className="flex flex-wrap items-center gap-1.5">
                <ProgramControlButton
                    label="Week"
                    accent="var(--sw-cyan)"
                    selected={zoomLevel === 'week'}
                    onClick={() => onZoomChange('week')}
                />
                <ProgramControlButton
                    label="Month"
                    accent="var(--sw-lav)"
                    selected={zoomLevel === 'month'}
                    onClick={() => onZoomChange('month')}
                />
                <ProgramControlButton
                    label="Fit"
                    accent="var(--sw-peach)"
                    selected={zoomLevel === 'fit'}
                    title="Fit entire programme"
                    onClick={() => onZoomChange('fit')}
                />
                <ProgramControlButton
                    label={isClearing ? 'Clearing...' : 'Clear all'}
                    accent="var(--sw-rose)"
                    disabled={isClearing}
                    title="Delete all programme activities"
                    onClick={handleClearAllClick}
                />
                <ProgramControlButton
                    label={isExporting ? 'Exporting...' : 'Export'}
                    accent="var(--sw-cyan)"
                    disabled={isExporting}
                    title="Export to PDF"
                    onClick={handleExport}
                />
            </div>

            <AuroraConfirmDialog
                open={clearAllDialogOpen}
                onOpenChange={setClearAllDialogOpen}
                onConfirm={handleConfirmClearAll}
                title="Delete all activities?"
                description="This will delete all programme activities. This action cannot be undone."
                variant="destructive"
                confirmLabel="Delete All"
            />

            <div role="group" aria-label="Programme primary actions" className="ml-auto flex shrink-0 items-center gap-2">
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
                    className={`${toolbarButtonBase} border-[var(--sw-cta)] bg-[var(--sw-cta)] text-[var(--sw-cta-fg)] hover:bg-[var(--sw-cta-hover)] hover:text-[var(--sw-cta-fg)]`}
                    style={toolbarButtonStyle}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add Activity
                </button>
            </div>
        </div>
    );
}
