/**
 * T113: AddendumContent Component
 * Displays project info table and rich text editor for addendum details
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
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

interface ProjectDetails {
    projectName: string;
    address: string;
}

interface AddendumContentProps {
    projectId: string;
    addendum: Addendum;
    onUpdateContent: (addendumId: string, content: string) => Promise<boolean>;
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
    onDelete,
}: AddendumContentProps) {
    const [content, setContent] = useState(addendum.content || '');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch project details for the info table (from planning API)
    const { data: projectDetails } = useSWR<ProjectDetails>(
        `/api/planning/${projectId}/details`,
        fetcher,
        { revalidateOnFocus: false }
    );

    // Update local content when addendum changes
    useEffect(() => {
        setContent(addendum.content || '');
    }, [addendum.id, addendum.content]);

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
                            <td className="px-4 py-2.5 text-[#cccccc]">
                                {projectDetails?.projectName || 'Loading...'}
                            </td>
                        </tr>
                        <tr className="border-b border-[#3e3e42]">
                            <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Address
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc]">
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
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#858585] uppercase tracking-wide">
                        Addendum Details
                    </label>
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
                <Textarea
                    value={content}
                    onChange={handleContentChange}
                    onBlur={handleBlur}
                    placeholder="Enter addendum details, changes, clarifications..."
                    rows={6}
                    className="bg-[#1e1e1e] border-[#3e3e42] text-[#cccccc] placeholder:text-[#6e6e6e] resize-none focus:border-[#0e639c] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <p className="text-xs text-[#6e6e6e]">
                    Content auto-saves when you click outside the text area
                </p>
            </div>
        </div>
    );
}
