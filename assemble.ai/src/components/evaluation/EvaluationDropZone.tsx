/**
 * T037-T039: EvaluationDropZone Component
 * Drag-and-drop zone for tender PDF parsing per firm column
 * Feature 011 - Evaluation Report
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface EvaluationDropZoneProps {
    firmId: string;
    firmName: string;
    onFileDrop: (file: File, firmId: string) => Promise<void>;
    isProcessing: boolean;
    className?: string;
}

export function EvaluationDropZone({
    firmId,
    firmName,
    onFileDrop,
    isProcessing,
    className = '',
}: EvaluationDropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // T039: Validate file type (PDF only)
    const validateFile = (file: File): boolean => {
        const filename = file.name.toLowerCase();
        if (!filename.endsWith('.pdf')) {
            setError('Only PDF files are accepted');
            return false;
        }
        setError(null);
        return true;
    };

    // T038: Handle drag events
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    // T037: Handle file drop
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0]; // Only process first file
        if (!validateFile(file)) return;

        await onFileDrop(file, firmId);
    }, [firmId, onFileDrop]);

    // Handle click to open file dialog
    const handleClick = () => {
        if (!isProcessing) {
            fileInputRef.current?.click();
        }
    };

    // Handle file input change
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!validateFile(file)) return;

        await onFileDrop(file, firmId);

        // Reset input
        e.target.value = '';
    };

    return (
        <div
            className={`relative ${className}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* T038: Drop zone visual overlay */}
            {isDragOver && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-accent-copper)]/20 border-2 border-dashed border-[var(--color-accent-copper)] rounded">
                    <div className="flex flex-col items-center text-[var(--color-accent-copper)]">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs font-medium">Drop PDF</span>
                    </div>
                </div>
            )}

            {/* Processing overlay */}
            {isProcessing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg-primary)]/90 rounded">
                    <div className="flex flex-col items-center text-[var(--color-accent-copper)]">
                        <Loader2 className="w-5 h-5 animate-spin mb-1" />
                        <span className="text-xs">Parsing...</span>
                    </div>
                </div>
            )}

            {/* Error indicator */}
            {error && !isDragOver && !isProcessing && (
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center py-1 bg-red-500/10 border-t border-red-500/30">
                    <AlertCircle className="w-3 h-3 text-red-400 mr-1" />
                    <span className="text-[10px] text-red-400">{error}</span>
                </div>
            )}
        </div>
    );
}

/**
 * T037: Column header drop zone wrapper
 * Wraps the firm column header with drag-drop functionality
 */
interface ColumnDropZoneProps {
    firmId: string;
    firmName: string;
    onFileDrop: (file: File, firmId: string) => Promise<void>;
    isProcessing: boolean;
    children: React.ReactNode;
}

export function ColumnDropZone({
    firmId,
    firmName,
    onFileDrop,
    isProcessing,
    children,
}: ColumnDropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const dragCounterRef = useRef(0);

    // T039: Validate file type
    const validateFile = (file: File): boolean => {
        const filename = file.name.toLowerCase();
        if (!filename.endsWith('.pdf')) {
            setError('PDF only');
            setTimeout(() => setError(null), 3000);
            return false;
        }
        setError(null);
        return true;
    };

    // Use drag counter to handle nested element drag events properly
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        console.log(`[DropZone ${firmName}] dragEnter, counter: ${dragCounterRef.current}`);
        if (dragCounterRef.current === 1) {
            setIsDragOver(true);
        }
    }, [firmName]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        console.log(`[DropZone ${firmName}] dragLeave, counter: ${dragCounterRef.current}`);
        if (dragCounterRef.current === 0) {
            setIsDragOver(false);
        }
    }, [firmName]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Set dropEffect to show it's a valid drop target
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`[DropZone ${firmName}] drop!`);
        dragCounterRef.current = 0;
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        console.log(`[DropZone ${firmName}] files:`, files);
        if (files.length === 0) return;

        const file = files[0];
        if (!validateFile(file)) return;

        await onFileDrop(file, firmId);
    }, [firmId, firmName, onFileDrop]);

    return (
        <div
            ref={dropZoneRef}
            className={`relative h-full w-full ${
                isDragOver ? 'ring-2 ring-[var(--color-accent-copper)] ring-inset bg-[var(--color-accent-copper)]/20' : ''
            } ${isProcessing ? 'opacity-50' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {children}

            {/* Drag over indicator */}
            {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-[var(--color-accent-copper)]/30">
                    <Upload className="w-4 h-4 text-[var(--color-accent-copper)]" />
                </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-secondary)]/80 pointer-events-none">
                    <Loader2 className="w-4 h-4 text-[var(--color-accent-copper)] animate-spin" />
                </div>
            )}

            {/* Error toast */}
            {error && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-red-500/90 text-white text-[10px] rounded whitespace-nowrap z-20">
                    {error}
                </div>
            )}
        </div>
    );
}

/**
 * T037: Table header cell drop zone
 * A th element with integrated drag-drop functionality
 */
interface ThDropZoneProps {
    firmId: string;
    firmName: string;
    onFileDrop: (file: File, firmId: string) => Promise<void>;
    isProcessing: boolean;
    height: number;
}

export function ThDropZone({
    firmId,
    firmName,
    onFileDrop,
    isProcessing,
    height,
}: ThDropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dragCounterRef = useRef(0);

    const validateFile = (file: File): boolean => {
        const filename = file.name.toLowerCase();
        if (!filename.endsWith('.pdf')) {
            setError('PDF only');
            setTimeout(() => setError(null), 3000);
            return false;
        }
        setError(null);
        return true;
    };

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        console.log(`[ThDropZone ${firmName}] dragEnter, counter: ${dragCounterRef.current}`);
        if (dragCounterRef.current === 1) {
            setIsDragOver(true);
        }
    }, [firmName]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragOver(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`[ThDropZone ${firmName}] drop event!`);
        dragCounterRef.current = 0;
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        console.log(`[ThDropZone ${firmName}] files:`, files.map(f => f.name));
        if (files.length === 0) {
            console.log(`[ThDropZone ${firmName}] no files in drop event`);
            return;
        }

        const file = files[0];
        if (!validateFile(file)) {
            console.log(`[ThDropZone ${firmName}] file validation failed:`, file.name);
            return;
        }

        console.log(`[ThDropZone ${firmName}] calling onFileDrop for:`, file.name);
        await onFileDrop(file, firmId);
        console.log(`[ThDropZone ${firmName}] onFileDrop completed`);
    }, [firmId, firmName, onFileDrop]);

    return (
        <th
            className={`p-0 border-r border-[var(--color-border)] relative ${
                isDragOver ? 'bg-[var(--color-accent-copper)]/20' : ''
            }`}
            style={{ height }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                className={`px-3 text-right text-xs font-medium cursor-pointer flex items-center justify-end ${
                    isProcessing ? 'opacity-50' : ''
                }`}
                style={{ height, minWidth: '100px' }}
                title={`Drop PDF to parse tender for ${firmName}`}
            >
                <span className="truncate">{firmName}</span>
            </div>

            {/* Drag over indicator */}
            {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-[var(--color-accent-copper)]/30 border-2 border-dashed border-[var(--color-accent-copper)]">
                    <Upload className="w-4 h-4 text-[var(--color-accent-copper)]" />
                </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-secondary)]/80 pointer-events-none">
                    <Loader2 className="w-4 h-4 text-[var(--color-accent-copper)] animate-spin" />
                </div>
            )}

            {/* Error toast */}
            {error && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-red-500/90 text-white text-[10px] rounded whitespace-nowrap z-20">
                    {error}
                </div>
            )}
        </th>
    );
}
