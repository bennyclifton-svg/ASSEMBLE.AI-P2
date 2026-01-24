/**
 * T114: Discipline Repo Tiles
 * Sources tiles (blue) + Transmittal tiles (green) + Generation Mode tiles
 * Replaces ButtonsSection in ConsultantCard
 * Styled to match CategoryTile component
 */

'use client';

import { useState, useCallback } from 'react';
import { Save, FolderOpen, Loader2 } from 'lucide-react';
import { useRAGRepos } from '@/lib/hooks/use-rag-repos';
import { useTransmittal } from '@/lib/hooks/use-transmittal';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper to brighten color (increase RGB values)
const brightenColor = (hex: string, amount: number = 80) => {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r}, ${g}, ${b})`;
};

// Color constants matching category tile colors
const TILE_COLORS = {
    sources: 'var(--color-accent-green)',      // Blue - matches accent
    transmittal: '#2e7d32',  // Green
};

// Default organization ID until organization management is implemented
const DEFAULT_ORGANIZATION_ID = 'default-org';

export type GenerationMode = 'data_only' | 'ai_assisted';

interface DisciplineRepoTilesProps {
    projectId: string;
    disciplineId?: string;
    tradeId?: string;
    contextName: string;
    selectedDocumentIds: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    generationMode?: GenerationMode;
    onGenerationModeChange?: (mode: GenerationMode) => void;
}

export function DisciplineRepoTiles({
    projectId,
    disciplineId,
    tradeId,
    contextName,
    selectedDocumentIds,
    onSetSelectedDocumentIds,
    generationMode = 'ai_assisted',
    onGenerationModeChange,
}: DisciplineRepoTilesProps) {
    const { toast } = useToast();
    const [isSavingProject, setIsSavingProject] = useState(false);
    const [isLoadingProject, setIsLoadingProject] = useState(false);
    const [isSavingTransmittal, setIsSavingTransmittal] = useState(false);

    // Project repo hook
    const {
        projectRepo,
        isFetching,
        saveToRepo,
        loadFromRepo,
        initializeRepos,
        needsInitialization,
    } = useRAGRepos(projectId, DEFAULT_ORGANIZATION_ID);

    // Transmittal hook
    const {
        transmittal,
        isLoading: isLoadingTransmittal,
        saveTransmittal,
        loadTransmittal,
        hasTransmittal,
    } = useTransmittal({
        projectId,
        disciplineId,
        tradeId,
        contextName,
    });

    // Initialize repos if needed
    if (needsInitialization && !isFetching) {
        initializeRepos();
    }

    // Handle save to project repo
    const handleSaveToProject = useCallback(async () => {
        if (!projectRepo) {
            toast({ title: 'Error', description: 'Project repo not available', variant: 'destructive' });
            return;
        }
        if (selectedDocumentIds.length === 0) {
            toast({ title: 'Error', description: 'No documents selected', variant: 'destructive' });
            return;
        }

        setIsSavingProject(true);
        try {
            const result = await saveToRepo(projectRepo.id, selectedDocumentIds);
            if (result) {
                toast({ title: 'Sources Saved', description: `${result.documentCount} document(s) saved` });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save sources', variant: 'destructive' });
        } finally {
            setIsSavingProject(false);
        }
    }, [projectRepo, selectedDocumentIds, saveToRepo, toast]);

    // Handle load from project repo
    const handleLoadFromProject = useCallback(async () => {
        if (!projectRepo) return;

        setIsLoadingProject(true);
        try {
            const documentIds = await loadFromRepo(projectRepo.id);
            if (documentIds && documentIds.length > 0) {
                onSetSelectedDocumentIds?.(documentIds);
                toast({ title: 'Sources Loaded', description: `${documentIds.length} document(s) selected` });
            } else {
                toast({ title: 'Info', description: 'No sources saved yet' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load sources', variant: 'destructive' });
        } finally {
            setIsLoadingProject(false);
        }
    }, [projectRepo, loadFromRepo, onSetSelectedDocumentIds, toast]);

    // Handle save transmittal
    const handleSaveTransmittal = useCallback(async () => {
        if (selectedDocumentIds.length === 0) {
            toast({ title: 'Error', description: 'No documents selected', variant: 'destructive' });
            return;
        }

        setIsSavingTransmittal(true);
        try {
            await saveTransmittal(selectedDocumentIds);
            toast({ title: 'Transmittal Saved', description: `${selectedDocumentIds.length} document(s)` });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save transmittal', variant: 'destructive' });
        } finally {
            setIsSavingTransmittal(false);
        }
    }, [selectedDocumentIds, saveTransmittal, toast]);

    // Handle load transmittal
    const handleLoadTransmittal = useCallback(() => {
        const documentIds = loadTransmittal();
        if (documentIds.length > 0) {
            onSetSelectedDocumentIds?.(documentIds);
            toast({ title: 'Transmittal Loaded', description: `${documentIds.length} document(s) selected` });
        } else {
            toast({ title: 'Info', description: 'No transmittal to load' });
        }
    }, [loadTransmittal, onSetSelectedDocumentIds, toast]);

    const hasSelection = selectedDocumentIds.length > 0;

    // Compute bright colors for text/icons
    const brightSources = brightenColor(TILE_COLORS.sources);
    const brightTransmittal = brightenColor(TILE_COLORS.transmittal);

    // Common tile classes for uniform sizing
    const tileBaseClasses = cn(
        'relative rounded-lg transition-all duration-200 ease-in-out cursor-pointer group',
        'flex flex-col items-center justify-center text-center',
        'h-16 w-20 flex-shrink-0' // Square-ish, uniform size
    );

    return (
        <div className="flex items-center gap-2 py-2 mb-4 flex-wrap">
            {/* Sources Tiles (Blue) */}
            <div className="flex gap-2">
                {/* Save Sources Tile */}
                <button
                    onClick={handleSaveToProject}
                    disabled={isSavingProject || !hasSelection || isFetching}
                    className={cn(
                        tileBaseClasses,
                        !hasSelection && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                        backgroundColor: hexToRgba(TILE_COLORS.sources, hasSelection ? 0.45 : 0.25),
                    }}
                    title={hasSelection ? 'Save selected documents as sources' : 'Select documents first'}
                >
                    {/* Hover glow effect */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at center, ${hexToRgba(TILE_COLORS.sources, 0.4)} 0%, transparent 70%)`,
                        }}
                    />
                    <div className="relative z-10 flex flex-col items-center">
                        {isSavingProject ? (
                            <Loader2 className="h-4 w-4 animate-spin mb-1" style={{ color: brightSources }} />
                        ) : (
                            <Save className="h-4 w-4 mb-1" style={{ color: brightSources }} />
                        )}
                        <span className="text-xs font-medium" style={{ color: brightSources }}>Sources</span>
                        {hasSelection && (
                            <span className="text-[10px]" style={{ color: brightSources }}>({selectedDocumentIds.length})</span>
                        )}
                    </div>
                </button>

                {/* Load Sources Tile */}
                <button
                    onClick={handleLoadFromProject}
                    disabled={isLoadingProject || isFetching || !projectRepo || projectRepo.memberCount === 0}
                    className={cn(
                        tileBaseClasses,
                        (!projectRepo || projectRepo.memberCount === 0) && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                        backgroundColor: hexToRgba(TILE_COLORS.sources, projectRepo?.memberCount ? 0.45 : 0.25),
                    }}
                    title={projectRepo?.memberCount ? `Load ${projectRepo.memberCount} saved sources` : 'No sources saved'}
                >
                    {/* Hover glow effect */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at center, ${hexToRgba(TILE_COLORS.sources, 0.4)} 0%, transparent 70%)`,
                        }}
                    />
                    <div className="relative z-10 flex flex-col items-center">
                        {isLoadingProject ? (
                            <Loader2 className="h-4 w-4 animate-spin mb-1" style={{ color: brightSources }} />
                        ) : (
                            <FolderOpen className="h-4 w-4 mb-1" style={{ color: brightSources }} />
                        )}
                        <span className="text-xs font-medium" style={{ color: brightSources }}>Sources</span>
                        <span className="text-[10px]" style={{ color: brightSources }}>({projectRepo?.memberCount || 0})</span>
                    </div>
                </button>
            </div>

            {/* Spacer */}
            <div className="flex-1 min-w-0" />

            {/* Transmittal Tiles (Green) */}
            <div className="flex gap-2">
                {/* Save Transmittal Tile */}
                <button
                    onClick={handleSaveTransmittal}
                    disabled={isSavingTransmittal || !hasSelection}
                    className={cn(
                        tileBaseClasses,
                        !hasSelection && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                        backgroundColor: hexToRgba(TILE_COLORS.transmittal, hasSelection ? 0.45 : 0.25),
                    }}
                    title={hasSelection ? 'Save as transmittal' : 'Select documents first'}
                >
                    {/* Hover glow effect */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at center, ${hexToRgba(TILE_COLORS.transmittal, 0.4)} 0%, transparent 70%)`,
                        }}
                    />
                    <div className="relative z-10 flex flex-col items-center">
                        {isSavingTransmittal ? (
                            <Loader2 className="h-4 w-4 animate-spin mb-1" style={{ color: brightTransmittal }} />
                        ) : (
                            <Save className="h-4 w-4 mb-1" style={{ color: brightTransmittal }} />
                        )}
                        <span className="text-xs font-medium" style={{ color: brightTransmittal }}>Transmittal</span>
                        {hasSelection && (
                            <span className="text-[10px]" style={{ color: brightTransmittal }}>({selectedDocumentIds.length})</span>
                        )}
                    </div>
                </button>

                {/* Load Transmittal Tile */}
                <button
                    onClick={handleLoadTransmittal}
                    disabled={isLoadingTransmittal || !hasTransmittal}
                    className={cn(
                        tileBaseClasses,
                        !hasTransmittal && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                        backgroundColor: hexToRgba(TILE_COLORS.transmittal, hasTransmittal ? 0.45 : 0.25),
                    }}
                    title={hasTransmittal ? `Load ${transmittal?.documentCount || 0} documents` : 'No transmittal saved'}
                >
                    {/* Hover glow effect */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at center, ${hexToRgba(TILE_COLORS.transmittal, 0.4)} 0%, transparent 70%)`,
                        }}
                    />
                    <div className="relative z-10 flex flex-col items-center">
                        {isLoadingTransmittal ? (
                            <Loader2 className="h-4 w-4 animate-spin mb-1" style={{ color: brightTransmittal }} />
                        ) : (
                            <FolderOpen className="h-4 w-4 mb-1" style={{ color: brightTransmittal }} />
                        )}
                        <span className="text-xs font-medium" style={{ color: brightTransmittal }}>Transmittal</span>
                        <span className="text-[10px]" style={{ color: brightTransmittal }}>({transmittal?.documentCount || 0})</span>
                    </div>
                </button>
            </div>
        </div>
    );
}
