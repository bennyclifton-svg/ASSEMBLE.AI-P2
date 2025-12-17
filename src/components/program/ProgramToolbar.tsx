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
        <div className="flex items-center gap-2 border-b border-[#3e3e42] bg-[#252526] px-3 py-2">
            {/* Add Activity Button */}
            <button
                onClick={handleAddActivity}
                disabled={createActivity.isLoading}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-white bg-[#0e639c] hover:bg-[#1177bb] disabled:opacity-50"
            >
                <Plus className="h-3.5 w-3.5" />
                Add Activity
            </button>

            {/* Template Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-[#3e3e42] hover:bg-[#4e4e52]"
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
                        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded border border-[#3e3e42] bg-[#252526] py-1 shadow-lg">
                            {PROGRAM_TEMPLATES.map((template) => (
                                <button
                                    key={template.key}
                                    onClick={() => handleInsertTemplate(template.key)}
                                    disabled={insertTemplate.isLoading}
                                    className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-[#3e3e42] disabled:opacity-50"
                                >
                                    {template.name}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Zoom Toggle */}
            <div className="flex rounded border border-[#3e3e42]">
                <button
                    onClick={() => onZoomChange('week')}
                    className={`px-2.5 py-1 text-xs font-medium ${
                        zoomLevel === 'week'
                            ? 'bg-[#0e639c] text-white'
                            : 'bg-[#252526] text-gray-400 hover:bg-[#3e3e42]'
                    }`}
                >
                    Week
                </button>
                <button
                    onClick={() => onZoomChange('month')}
                    className={`px-2.5 py-1 text-xs font-medium ${
                        zoomLevel === 'month'
                            ? 'bg-[#0e639c] text-white'
                            : 'bg-[#252526] text-gray-400 hover:bg-[#3e3e42]'
                    }`}
                >
                    Month
                </button>
            </div>

            {/* Export Button */}
            <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-[#3e3e42] hover:bg-[#4e4e52] disabled:opacity-50"
                title="Export to PDF"
            >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export'}
            </button>
        </div>
    );
}
