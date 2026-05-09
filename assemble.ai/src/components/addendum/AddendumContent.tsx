/**
 * T113: AddendumContent Component
 * Displays project info table and rich text editor for addendum details
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { type Addendum } from '@/lib/hooks/use-addenda';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

export type AddendumDetailViewMode = 'short' | 'long';

const ADDENDUM_HIGHLIGHT_COLOR = 'var(--sw-peach)';

function formatDisplayDate(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

interface ProjectDetails {
    projectName: string;
    address: string;
}

interface AddendumContentProps {
    projectId: string;
    addendum: Addendum;
    onUpdateContent: (addendumId: string, content: string) => Promise<boolean>;
    onUpdateDate: (addendumId: string, date: string) => Promise<boolean>;
    surface?: 'procurement' | 'record';
    viewMode?: AddendumDetailViewMode;
}

const fetcher = async (url: string): Promise<ProjectDetails> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch project details');
    const data = await res.json();
    return {
        projectName: data.projectName || data.name || 'Untitled Project',
        address: data.address || '',
    };
};

export function AddendumContent({
    projectId,
    addendum,
    onUpdateContent,
    onUpdateDate,
    surface = 'procurement',
    viewMode = 'long',
}: AddendumContentProps) {
    const [content, setContent] = useState(addendum.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [addendumDate, setAddendumDate] = useState(addendum.addendumDate || new Date().toISOString().split('T')[0]);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const usesRecordSurface = surface === 'record';

    // Fetch project details for the info table (from planning API)
    const { data: projectDetails } = useSWR<ProjectDetails>(
        `/api/planning/${projectId}/details`,
        fetcher,
        { revalidateOnFocus: false }
    );

    const handleDateClick = useCallback(() => {
        dateInputRef.current?.showPicker();
    }, []);

    const handleDateChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setAddendumDate(newDate);
        await onUpdateDate(addendum.id, newDate);
    }, [addendum.id, onUpdateDate]);

    const handleContentChange = useCallback((value: string) => {
        setContent(value);
    }, []);

    const handleBlur = useCallback(async () => {
        if (content !== addendum.content) {
            setIsSaving(true);
            await onUpdateContent(addendum.id, content);
            setIsSaving(false);
        }
    }, [addendum.id, addendum.content, content, onUpdateContent]);

    const addendumLabel = `Addendum ${String(addendum.addendumNumber).padStart(2, '0')}`;

    if (usesRecordSurface) {
        return (
            <div
                className="flex min-h-0 flex-col px-4 pb-4 pt-0 transition-colors"
                style={{ backgroundColor: 'white', color: 'var(--color-text-primary)' }}
            >
                <div
                    className="-mx-4 overflow-hidden"
                    style={{
                        borderBottom: '1px solid var(--sw-rule-2)',
                    }}
                >
                    <table className="w-full text-sm">
                        <tbody>
                            <tr style={{ borderBottom: '1px solid var(--sw-rule-2)' }}>
                                <td
                                    className="w-36 px-4 py-2.5 font-medium"
                                    style={{ color: ADDENDUM_HIGHLIGHT_COLOR }}
                                >
                                    Project Name
                                </td>
                                <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                    {projectDetails?.projectName || 'Loading...'}
                                </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--sw-rule-2)' }}>
                                <td
                                    className="px-4 py-2.5 font-medium"
                                    style={{ color: ADDENDUM_HIGHLIGHT_COLOR }}
                                >
                                    Address
                                </td>
                                <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                    {projectDetails?.address || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td
                                    className="px-4 py-2.5 font-medium"
                                    style={{ color: ADDENDUM_HIGHLIGHT_COLOR }}
                                >
                                    Document
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-[var(--color-text-primary)]">
                                    {addendumLabel}
                                </td>
                                <td
                                    className="relative w-44 cursor-pointer px-4 py-2.5 text-right font-medium transition-colors hover:bg-[var(--sw-paper)]"
                                    style={{ color: ADDENDUM_HIGHLIGHT_COLOR }}
                                    onClick={handleDateClick}
                                >
                                    <span className="select-none">Issued {formatDisplayDate(addendumDate)}</span>
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={addendumDate}
                                        onChange={handleDateChange}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                        tabIndex={-1}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="min-h-0">
                    <RichTextEditor
                        content={content}
                        onChange={handleContentChange}
                        onBlur={handleBlur}
                        placeholder="Enter addendum details, changes, clarifications..."
                        variant="mini"
                        toolbarVariant="mini"
                        transparentBg
                        className="border-0 rounded-none"
                        editorClassName={`bg-white hover:bg-[var(--sw-paper)] transition-colors ${viewMode === 'long' ? 'min-h-[112px]' : 'min-h-[72px]'}`}
                    />
                </div>

                {isSaving ? (
                    <span className="mt-2 text-xs text-[var(--sw-muted)]">Saving...</span>
                ) : null}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Project Info Table */}
            <div className="overflow-hidden rounded-lg">
                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b border-[var(--color-border)]">
                            <td className="w-36 px-4 py-2.5 font-medium" style={{ color: ADDENDUM_HIGHLIGHT_COLOR }}>
                                Project Name
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                {projectDetails?.projectName || 'Loading...'}
                            </td>
                        </tr>
                        <tr className="border-b border-[var(--color-border)]">
                            <td className="px-4 py-2.5 font-medium" style={{ color: ADDENDUM_HIGHLIGHT_COLOR }}>
                                Address
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                {projectDetails?.address || '-'}
                            </td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2.5 font-medium" style={{ color: ADDENDUM_HIGHLIGHT_COLOR }}>
                                Document
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-semibold">
                                {addendumLabel}
                            </td>
                            <td
                                className="w-44 px-4 py-2.5 font-medium cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors relative text-right"
                                style={{ color: ADDENDUM_HIGHLIGHT_COLOR }}
                                onClick={handleDateClick}
                            >
                                <span className="select-none">Issued {formatDisplayDate(addendumDate)}</span>
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    value={addendumDate}
                                    onChange={handleDateChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    tabIndex={-1}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                        Addendum Details
                    </h3>
                    {isSaving && (
                        <span className="text-xs text-[var(--color-accent-copper)]">Saving...</span>
                    )}
                </div>
                <div className="overflow-hidden rounded-lg">
                    <RichTextEditor
                        content={content}
                        onChange={handleContentChange}
                        onBlur={handleBlur}
                        placeholder="Enter addendum details, changes, clarifications..."
                        variant="mini"
                        toolbarVariant="mini"
                        transparentBg
                        className="border-0 rounded-none"
                        editorClassName="bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)] transition-colors"
                    />
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                    Content auto-saves when you click outside the text area
                </p>
            </div>
        </div>
    );
}
