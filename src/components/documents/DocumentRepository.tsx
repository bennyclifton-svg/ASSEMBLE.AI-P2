'use client';

import { useState } from 'react';
import { UploadZone } from './UploadZone';
import { CategorizedList } from './CategorizedList';
import { UploadProgress, UploadFileStatus } from './UploadProgress';
import { useToast } from '@/components/ui/use-toast';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DocumentRepositoryProps {
    projectId: string;
}

export function DocumentRepository({ projectId }: DocumentRepositoryProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<UploadFileStatus[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [uploadZoneCollapsed, setUploadZoneCollapsed] = useState(false);
    const { toast } = useToast();

    const handleFilesSelected = async (files: File[]) => {
        setUploading(true);

        // Initialize upload status for all files
        const fileStatuses: UploadFileStatus[] = files.map(file => ({
            file,
            progress: 0,
            status: 'pending' as const,
        }));
        setUploadFiles(fileStatuses);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Update to uploading
                setUploadFiles(prev => prev.map((f, idx) =>
                    idx === i ? { ...f, status: 'uploading' as const, progress: 0 } : f
                ));

                const formData = new FormData();
                formData.append('file', file);
                formData.append('projectId', projectId);

                const res = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData,
                });

                if (res.ok) {
                    // Update to completed
                    setUploadFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: 'completed' as const, progress: 100 } : f
                    ));
                } else {
                    const errorData = await res.json();
                    // Update to error
                    setUploadFiles(prev => prev.map((f, idx) =>
                        idx === i ? {
                            ...f,
                            status: 'error' as const,
                            error: errorData.error || 'Upload failed'
                        } : f
                    ));
                }
            }

            const successCount = uploadFiles.filter(f => f.status === 'completed').length;
            if (successCount > 0) {
                toast({
                    title: 'Upload complete',
                    description: `Successfully uploaded ${successCount} file(s).`,
                });
            }

            // Refresh the document list
            setRefreshTrigger(prev => prev + 1);

            // Clear progress after a delay
            setTimeout(() => {
                setUploadFiles([]);
            }, 3000);
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: 'Upload error',
                description: 'An unexpected error occurred during upload.',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-[#3e3e42]">
                <h2 className="text-2xl font-bold text-[#cccccc]">Documents</h2>
            </div>

            {/* Upload Zone - Collapsible */}
            <div className="border-b border-[#3e3e42]">
                <button
                    onClick={() => setUploadZoneCollapsed(!uploadZoneCollapsed)}
                    className="w-full flex items-center justify-between px-6 py-3 text-[#cccccc] hover:bg-[#252526] transition-colors"
                >
                    <span className="text-sm font-medium">Upload Files</span>
                    {uploadZoneCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronUp className="w-4 h-4" />
                    )}
                </button>
                {!uploadZoneCollapsed && (
                    <div className="px-6 pb-4">
                        <UploadZone
                            onFilesSelected={handleFilesSelected}
                            disabled={uploading}
                        />
                        {uploadFiles.length > 0 && (
                            <div className="mt-4">
                                <UploadProgress files={uploadFiles} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Document List - Takes remaining space */}
            <div className="flex-1 overflow-y-auto p-6">
                <CategorizedList refreshTrigger={refreshTrigger} projectId={projectId} />
            </div>
        </div>
    );
}
