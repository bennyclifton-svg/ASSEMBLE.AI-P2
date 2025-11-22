import React from 'react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { FileIcon, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadFileStatus {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
}

interface UploadProgressProps {
    files: UploadFileStatus[];
    className?: string;
}

export function UploadProgress({ files, className }: UploadProgressProps) {
    if (files.length === 0) return null;

    return (
        <div className={cn("space-y-3", className)}>
            {files.map((item, index) => (
                <div key={`${item.file.name}-${index}`} className="flex items-center space-x-4 p-3 border border-[#3e3e42] rounded-lg bg-[#252526]">
                    <div className="flex-shrink-0">
                        <FileIcon className="h-8 w-8 text-[#519aba]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                            <p className="text-sm font-medium truncate text-[#cccccc]">{item.file.name}</p>
                            <span className="text-xs text-[#858585]">
                                {item.status === 'uploading' && `${Math.round(item.progress)}%`}
                                {item.status === 'completed' && 'Done'}
                                {item.status === 'error' && 'Failed'}
                                {item.status === 'pending' && 'Waiting...'}
                            </span>
                        </div>
                        {item.status === 'uploading' && <ProgressBar value={item.progress} className="h-1" />}
                        {item.status === 'error' && <p className="text-xs text-[#f48771] mt-1">{item.error}</p>}
                    </div>
                    <div className="flex-shrink-0">
                        {item.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-[#4ec9b0]" />}
                        {item.status === 'error' && <XCircle className="h-5 w-5 text-[#f48771]" />}
                        {item.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-[#0e639c]" />}
                    </div>
                </div>
            ))}
        </div>
    );
}
