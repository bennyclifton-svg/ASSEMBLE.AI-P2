/**
 * T113: AddendumContent Component
 * Displays project info table and rich text editor for addendum details
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { type Addendum } from '@/lib/hooks/use-addenda';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
    onDelete: () => void;
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
    onDelete,
}: AddendumContentProps) {
    const [content, setContent] = useState(addendum.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [addendumDate, setAddendumDate] = useState(addendum.addendumDate || new Date().toISOString().split('T')[0]);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Fetch project details for the info table (from planning API)
    const { data: projectDetails } = useSWR<ProjectDetails>(
        `/api/planning/${projectId}/details`,
        fetcher,
        { revalidateOnFocus: false }
    );

    // Update local content when addendum changes
    useEffect(() => {
        setContent(addendum.content || '');
        setAddendumDate(addendum.addendumDate || new Date().toISOString().split('T')[0]);
    }, [addendum.id, addendum.content, addendum.addendumDate]);

    const handleDateClick = useCallback(() => {
        dateInputRef.current?.showPicker();
    }, []);

    const handleDateChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setAddendumDate(newDate);
        await onUpdateDate(addendum.id, newDate);
    }, [addendum.id, onUpdateDate]);

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    }, []);

    const handleBlur = useCallback(async () => {
        if (content !== addendum.content) {
            setIsSaving(true);
            await onUpdateContent(addendum.id, content);
            setIsSaving(false);
        }
    }, [addendum.id, addendum.content, content, onUpdateContent]);

    const addendumLabel = `Addendum ${String(addendum.addendumNumber).padStart(2, '0')}`;

    return (
        <div className="space-y-4">
            {/* Project Info Table */}
            <div className="border border-[#3e3e42] rounded overflow-hidden">
                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b border-[#3e3e42]">
                            <td className="w-36 px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Project Name
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc]" colSpan={2}>
                                {projectDetails?.projectName || 'Loading...'}
                            </td>
                        </tr>
                        <tr className="border-b border-[#3e3e42]">
                            <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Address
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc]" colSpan={2}>
                                {projectDetails?.address || '-'}
                            </td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Document
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc] font-semibold">
                                {addendumLabel}
                            </td>
                            <td
                                className="w-36 px-4 py-2.5 text-[#cccccc] border-l border-[#3e3e42] cursor-pointer hover:bg-[#2a2a2a] transition-colors relative"
                                onClick={handleDateClick}
                            >
                                <span className="select-none">{formatDisplayDate(addendumDate)}</span>
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
                    <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                        Addendum Details
                    </h3>
                    <div className="flex items-center gap-2">
                        {isSaving && (
                            <span className="text-xs text-[#4fc1ff]">Saving...</span>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#252526] border-[#3e3e42]">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2 text-[#cccccc]">
                                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                        Delete {addendumLabel}?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-[#858585]">
                                        This will permanently delete the addendum and all its associated transmittal documents.
                                        This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-[#3e3e42] text-[#cccccc] hover:bg-[#4e4e52] border-[#3e3e42]">
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={onDelete}
                                        className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    <Textarea
                        value={content}
                        onChange={handleContentChange}
                        onBlur={handleBlur}
                        placeholder="Enter addendum details, changes, clarifications..."
                        className="w-full bg-[#1a1a1a] border-0 text-[#cccccc] placeholder:text-[#6e6e6e] resize-y min-h-[100px] p-4 border-l-2 border-l-[#4fc1ff]/30 hover:border-l-[#4fc1ff] hover:bg-[#1e1e1e] transition-colors cursor-text focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                        style={{ fieldSizing: 'content' } as React.CSSProperties}
                    />
                </div>
                <p className="text-xs text-[#6e6e6e]">
                    Content auto-saves when you click outside the text area
                </p>
            </div>
        </div>
    );
}
