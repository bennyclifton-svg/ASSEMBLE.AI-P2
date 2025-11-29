'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
    onFilesSelected: (files: File[]) => void;
    className?: string;
    disabled?: boolean;
}

export function UploadZone({ onFilesSelected, className, disabled }: UploadZoneProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onFilesSelected(acceptedFiles);
        }
    }, [onFilesSelected]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled,
        maxSize: 50 * 1024 * 1024, // 50MB
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "border-4 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive ? "border-[#0e639c] bg-[#0e639c]/10" : "border-[#3e3e42] hover:border-[#0e639c] hover:bg-[#0e639c]/5",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-2 text-[#858585]">
                <UploadCloud className="h-10 w-10 mb-2" />
                {isDragActive ? (
                    <p className="text-[#cccccc]">Drop the files here ...</p>
                ) : (
                    <>
                        <p className="text-sm font-medium text-[#cccccc]">Drag & drop files here, or click to select files</p>
                        <p className="text-xs">Max file size: 50MB</p>
                    </>
                )}
            </div>
        </div>
    );
}
