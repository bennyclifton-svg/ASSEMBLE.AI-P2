/**
 * T054: ReportGenerator Component
 * Main container for report generation workflow
 */

'use client';

import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { useReportGeneration, useReport, type GenerateReportRequest } from '@/lib/hooks/use-report-generation';
import { useReportStream, getStreamProgress } from '@/lib/hooks/use-report-stream';
import { useReportLock } from '@/lib/hooks/use-report-lock';
import { useRAGRepos, useRepoSelection, type RAGRepo } from '@/lib/hooks/use-rag-repos';
import { REPO_TYPE_LABELS, type RepoType, type GenerationMode, type ContentLength } from '@/lib/db/rag-schema';
import { TocEditor, type TocEditorHandle } from './TocEditor';
import { SectionViewer } from './SectionViewer';
import UnifiedReportEditor from './UnifiedReportEditor';
import { sectionsToHTML, formatTransmittalAsHTML } from '@/lib/utils/report-formatting';
import type { TableOfContents } from '@/lib/langgraph/state';

// Default organization ID until organization management is implemented
const DEFAULT_ORGANIZATION_ID = 'default-org';

interface ReportGeneratorProps {
    projectId: string;
    initialReportId?: string;
    /** Pre-fill discipline/trade name */
    discipline?: string;
    /** Consultant discipline ID for filtering */
    disciplineId?: string;
    /** Contractor trade ID for filtering */
    tradeId?: string;
    /** Context type for filtering */
    contextType?: 'discipline' | 'trade';
    /** Generation mode from DisciplineRepoTiles */
    generationMode?: GenerationMode;
    /** Content length for Long RFT (T099l) */
    contentLength?: ContentLength;
    onComplete?: (reportId: string) => void;
    onCancel?: () => void;
    /** Render in compact inline mode */
    inline?: boolean;
}

// Expose methods to parent via ref
export interface ReportGeneratorHandle {
    startTocGeneration: (mode?: GenerationMode, length?: ContentLength) => Promise<void>;
    cancel: () => void;
    isSubmitting: boolean;
    sectionCount: number;
}

type GenerationStep = 'config' | 'toc_approval' | 'generating' | 'complete';

export const ReportGenerator = forwardRef<ReportGeneratorHandle, ReportGeneratorProps>(function ReportGenerator({
    projectId,
    initialReportId,
    discipline: initialDiscipline,
    disciplineId,
    tradeId,
    contextType = 'discipline',
    generationMode: externalGenerationMode,
    contentLength: externalContentLength, // T099l
    onComplete,
    onCancel,
    inline = false,
}, ref) {
    // Ref to TocEditor for external control
    const tocEditorRef = useRef<TocEditorHandle>(null);
    // Ref to track generation mode for approval flow (avoids async state race)
    const currentGenerationModeRef = useRef<GenerationMode | undefined>(externalGenerationMode);
    // Ref to track content length for approval flow (T099l)
    const currentContentLengthRef = useRef<ContentLength | undefined>(externalContentLength);

    // State
    const [step, setStep] = useState<GenerationStep>(initialReportId ? 'toc_approval' : 'config');
    const [reportId, setReportId] = useState<string | null>(initialReportId ?? null);
    const [formData, setFormData] = useState<Partial<GenerateReportRequest>>({
        projectId,
        reportType: 'tender_request',
        title: initialDiscipline ? `Request For Tender ${initialDiscipline}` : '',
        discipline: initialDiscipline ?? '',
        disciplineId: contextType === 'discipline' ? disciplineId : undefined,
        tradeId: contextType === 'trade' ? tradeId : undefined,
        documentSetIds: [],
        generationMode: externalGenerationMode || 'ai_assisted', // Use prop or default
    });

    // Hooks
    const { startGeneration, approveToc, isGenerating, error: genError } = useReportGeneration(projectId);
    const { report, isLoading: isLoadingReport, refresh } = useReport(reportId);
    const stream = useReportStream(step === 'generating' ? reportId : null);
    const lock = useReportLock(reportId);

    // RAG repos for context selection
    const {
        globalRepos,
        projectRepo,
        isFetching: isFetchingRepos,
        needsInitialization,
        initializeRepos,
    } = useRAGRepos(projectId, DEFAULT_ORGANIZATION_ID);

    // Repo selection - default to project repo selected
    const repoSelection = useRepoSelection(projectRepo ? [projectRepo.id] : []);

    // Update selection when project repo becomes available
    useEffect(() => {
        if (projectRepo && repoSelection.selectionCount === 0) {
            repoSelection.selectRepo(projectRepo.id);
        }
    }, [projectRepo]);

    // Update formData when external generation mode changes
    useEffect(() => {
        if (externalGenerationMode) {
            setFormData(prev => ({ ...prev, generationMode: externalGenerationMode }));
        }
    }, [externalGenerationMode]);

    // Initialize repos if needed
    useEffect(() => {
        if (needsInitialization && !isFetchingRepos) {
            initializeRepos();
        }
    }, [needsInitialization, isFetchingRepos, initializeRepos]);

    // Calculate total synced documents across selected repos
    const totalSyncedDocuments = useMemo(() => {
        let count = 0;
        const allRepos = [...globalRepos, projectRepo].filter(Boolean) as RAGRepo[];
        for (const repo of allRepos) {
            if (repoSelection.isSelected(repo.id)) {
                count += repo.syncedCount || 0;
            }
        }
        return count;
    }, [globalRepos, projectRepo, repoSelection]);

    // Acquire lock when entering toc_approval
    useEffect(() => {
        if (step === 'toc_approval' && reportId && !lock.isOwner) {
            lock.acquireLock();
        }
    }, [step, reportId, lock]);

    // Update step based on report status
    useEffect(() => {
        if (!report) return;

        if (report.status === 'toc_pending') {
            setStep('toc_approval');
        } else if (report.status === 'generating') {
            setStep('generating');
        } else if (report.status === 'complete') {
            setStep('complete');
        }
    }, [report?.status]);

    // Handle form submit (start generation)
    const handleStart = async () => {
        if (!formData.title) {
            return;
        }

        try {
            // Use selected repo IDs for RAG retrieval
            // The backend will fetch document IDs from these repos
            const requestData = {
                ...formData,
                documentSetIds: repoSelection.selectedRepoIds,
            } as GenerateReportRequest;

            const newReport = await startGeneration(requestData);
            setReportId(newReport.id);
            setStep('toc_approval');
        } catch (err) {
            // Error handled by hook
        }
    };

    // Handle TOC approval
    const handleTocApproval = async (toc: TableOfContents) => {
        if (!reportId) return;

        try {
            // Pass generation mode and content length from refs (set by startTocGeneration)
            await approveToc(
                reportId,
                toc,
                currentGenerationModeRef.current,
                currentContentLengthRef.current // T099l
            );
            setStep('generating');
        } catch (err) {
            // Error handled by hook
        }
    };

    // Handle cancel
    const handleCancel = () => {
        if (lock.isOwner) {
            lock.releaseLock();
        }
        onCancel?.();
    };

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        startTocGeneration: async (mode?: GenerationMode, length?: ContentLength) => {
            // Store mode and length in refs before approval (avoids async state race condition)
            currentGenerationModeRef.current = mode ?? externalGenerationMode ?? 'ai_assisted';
            currentContentLengthRef.current = length ?? externalContentLength ?? 'concise'; // T099l
            if (tocEditorRef.current) {
                await tocEditorRef.current.approve();
            }
        },
        cancel: handleCancel,
        isSubmitting: tocEditorRef.current?.isSubmitting ?? false,
        sectionCount: tocEditorRef.current?.sectionCount ?? 0,
    }), [handleCancel, externalGenerationMode, externalContentLength, tocEditorRef.current?.isSubmitting, tocEditorRef.current?.sectionCount]);

    // Render based on step
    const renderStep = () => {
        switch (step) {
            case 'config':
                return (
                    <div className="space-y-3">
                        {!inline && <h2 className="text-lg font-semibold">Create Report</h2>}

                        {/* Request For Tender (RFT) */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border rounded bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] focus:outline-none focus:border-[#3e3e42]"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder={`e.g., Request For Tender ${initialDiscipline || 'Fire Services'}`}
                            />
                            <button
                                className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] disabled:opacity-50 text-sm whitespace-nowrap"
                                onClick={handleStart}
                                disabled={!formData.title || isGenerating}
                            >
                                {isGenerating ? 'Starting...' : 'Start RFT'}
                            </button>
                        </div>

                        {/* Tender Recommendation Report (TRR) - Placeholder */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border rounded bg-[#3c3c3c] border-[#3e3e42] text-[#858585]"
                                value={initialDiscipline ? `Tender Recommendation Report ${initialDiscipline}` : ''}
                                disabled
                                placeholder={`e.g., Tender Recommendation Report ${initialDiscipline || 'Fire Services'}`}
                            />
                            <button
                                className="px-4 py-2 bg-[#3e3e42] text-[#858585] rounded text-sm whitespace-nowrap cursor-not-allowed"
                                disabled
                                title="Coming soon"
                            >
                                Start TRR
                            </button>
                        </div>

                        {/* Show discipline field only if not pre-filled via inline */}
                        {!initialDiscipline && (
                            <div>
                                <label className="block text-sm font-medium mb-1 text-[#cccccc]">Discipline</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc]"
                                    value={formData.discipline ?? ''}
                                    onChange={e => setFormData({ ...formData, discipline: e.target.value })}
                                    placeholder="e.g., Fire Services"
                                />
                            </div>
                        )}

                        {genError && (
                            <p className="text-red-500 text-sm">{genError}</p>
                        )}
                    </div>
                );

            case 'toc_approval':
                if (isLoadingReport || !report?.tableOfContents) {
                    return <div className="p-4">Loading table of contents...</div>;
                }

                return (
                    <TocEditor
                        ref={tocEditorRef}
                        initialToc={report.tableOfContents}
                        onApprove={handleTocApproval}
                        onCancel={handleCancel}
                        isLocked={lock.locked && !lock.isOwner}
                        lockOwner={lock.lockedByName ?? undefined}
                    />
                );

            case 'generating':
                if (isLoadingReport || !report) {
                    return <div className="p-4">Loading report...</div>;
                }

                // Calculate progress from report data (more reliable than SSE events)
                const completedSections = report.sections?.filter(s => s.status === 'complete').length ?? 0;
                const totalSections = report.tableOfContents?.sections?.length ?? 0;
                const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Generating Report</h2>
                            <span className="text-sm text-muted-foreground">
                                {completedSections}/{totalSections} sections ({progress}% complete)
                            </span>
                        </div>

                        <div className="w-full bg-muted rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <SectionViewer
                            report={report}
                            streamState={stream}
                        />
                    </div>
                );

            case 'complete':
                // T134: Render unified editor for new reports (viewMode='unified')
                if (report && report.viewMode === 'unified') {
                    // Convert sections to HTML for unified editor
                    const initialHTML = report.editedContent || sectionsToHTML(
                        report.sections,
                        report.tableOfContents
                    );

                    return (
                        <div className="h-screen">
                            <UnifiedReportEditor
                                reportId={report.id}
                                reportTitle={report.title}
                                initialContent={initialHTML}
                                isEdited={report.isEdited || false}
                                onSave={async (content) => {
                                    // Save edited content to database
                                    await fetch(`/api/reports/${report.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            editedContent: content,
                                            isEdited: true,
                                        }),
                                    });
                                    refresh();
                                }}
                                onRefresh={async () => {
                                    // Re-generate report from latest data
                                    await fetch(`/api/reports/${report.id}/refresh`, {
                                        method: 'POST',
                                    });
                                    refresh();
                                }}
                            />
                        </div>
                    );
                }

                // Legacy view for existing reports (viewMode='sections')
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-green-500">✓</span>
                                <h2 className={`font-semibold text-green-500 ${inline ? 'text-base' : 'text-lg'}`}>
                                    Report Complete
                                </h2>
                            </div>
                            <button
                                className="px-3 py-1 border border-[#3e3e42] rounded hover:bg-[#3e3e42] text-[#cccccc] text-sm"
                                onClick={handleCancel}
                            >
                                {inline ? 'Close' : 'Done'}
                            </button>
                        </div>

                        {/* Show completed sections */}
                        {report && (
                            <SectionViewer
                                report={report}
                                streamState={stream}
                            />
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    // Use different styling for inline vs standalone mode
    const containerClass = inline
        ? '' // No extra container when inline
        : 'p-4 bg-card rounded-lg border';

    return (
        <div className={containerClass}>
            {renderStep()}
        </div>
    );
});

// ============================================
// Helper Components
// ============================================

interface RepoCheckboxProps {
    repo: RAGRepo;
    isSelected: boolean;
    onToggle: () => void;
    variant: 'project' | 'global';
}

function RepoCheckbox({ repo, isSelected, onToggle, variant }: RepoCheckboxProps) {
    const repoLabel = REPO_TYPE_LABELS[repo.repoType as RepoType] || repo.name;
    const hasSyncedDocs = (repo.syncedCount || 0) > 0;

    // Visual styling based on variant
    const borderColor = variant === 'project' ? 'border-[#0e639c]' : 'border-[#3e3e42]';
    const bgColor = isSelected
        ? variant === 'project'
            ? 'bg-[#1e3a5f]'
            : 'bg-[#2a2a2a]'
        : 'bg-[#1e1e1e]';

    return (
        <label
            className={`flex items-center gap-2 p-2 rounded border ${borderColor} ${bgColor} cursor-pointer hover:bg-[#2a2a2a] transition-colors`}
        >
            <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggle}
                className="w-4 h-4 rounded border-[#3e3e42] bg-[#3c3c3c] accent-[#0e639c]"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#cccccc] truncate">{repoLabel}</span>
                    {variant === 'project' && (
                        <span className="text-xs px-1 py-0.5 bg-[#0e639c]/30 text-[#8bb8e8] rounded">
                            Project
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#858585]">
                {hasSyncedDocs ? (
                    <>
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>{repo.syncedCount}</span>
                    </>
                ) : (
                    <>
                        <span className="w-2 h-2 rounded-full bg-gray-500" />
                        <span>0</span>
                    </>
                )}
            </div>
        </label>
    );
}
