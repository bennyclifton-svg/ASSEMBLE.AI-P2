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
                isDragActive ? "border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/10" : "border-[var(--color-border)] hover:border-[var(--color-accent-green)] hover:bg-[var(--color-accent-green)]/5",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-2 text-[var(--color-text-muted)]">
                <UploadCloud className="h-10 w-10 mb-2" />
                {isDragActive ? (
                    <p className="text-[var(--color-text-primary)]">Drop the files here ...</p>
                ) : (
                    <>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">Drag & drop files here, or click to select files</p>
                        <p className="text-xs">Max file size: 50MB</p>
                    </>
                )}
            </div>
        </div>
    );
}
