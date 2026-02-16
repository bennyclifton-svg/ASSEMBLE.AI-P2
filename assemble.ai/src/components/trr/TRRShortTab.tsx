/**
 * TRRShortTab Component
 * Renders the SHORT tab content for TRR (Tender Recommendation Report)
 * Includes: Header, Executive Summary, Tender Process, Addendum, Evaluation, Clarifications, Recommendation, Attachments
 * Feature 012 - TRR Report
 */

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { TRR, TRRUpdateData, TenderProcessFirm, TRRAddendumRow } from '@/types/trr';
import { TRRHeaderTable } from './TRRHeaderTable';
import { TRREditableSection } from './TRREditableSection';
import { TRRTenderProcessTable } from './TRRTenderProcessTable';
import { TRRAddendumTable } from './TRRAddendumTable';
import { TRREvaluationPrice } from './TRREvaluationPrice';
import { TRREvaluationNonPrice } from './TRREvaluationNonPrice';
import { TRRAttachments } from './TRRAttachments';

interface TRRShortTabProps {
    projectId: string;
    trr: TRR & { transmittalCount?: number };
    stakeholderId?: string | null;
    contextType: 'discipline' | 'trade';
    contextName: string;
    onUpdateTRR: (data: TRRUpdateData) => Promise<TRR>;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    onDownloadTransmittal?: () => void;
    canSaveTransmittal?: boolean;
    isDownloading?: boolean;
}

interface ProjectDetails {
    projectName: string;
    address: string;
}

export function TRRShortTab({
    projectId,
    trr,
    stakeholderId,
    contextType,
    contextName,
    onUpdateTRR,
    onSaveTransmittal,
    onLoadTransmittal,
    onDownloadTransmittal,
    canSaveTransmittal,
    isDownloading,
}: TRRShortTabProps) {
    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [firms, setFirms] = useState<TenderProcessFirm[]>([]);
    const [addenda, setAddenda] = useState<TRRAddendumRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Editable content state
    const [executiveSummary, setExecutiveSummary] = useState(trr.executiveSummary || '');
    const [clarifications, setClarifications] = useState(trr.clarifications || '');
    const [recommendation, setRecommendation] = useState(trr.recommendation || '');
    const [reportDate, setReportDate] = useState(trr.reportDate || new Date().toISOString().split('T')[0]);

    // Debounce timer ref
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch all data when component mounts
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch project details from planning API
                const planningRes = await fetch(`/api/planning/${projectId}`);
                if (planningRes.ok) {
                    const data = await planningRes.json();
                    if (data.details) {
                        setProjectDetails({
                            projectName: data.details.projectName || 'Untitled Project',
                            address: data.details.address || '',
                        });
                    }
                }

                // Fetch firms for the discipline/trade
                // Use the correct firms endpoint with contextName (discipline/trade name)
                if (contextType === 'discipline' && contextName) {
                    const firmsRes = await fetch(`/api/consultants/firms?projectId=${projectId}&discipline=${encodeURIComponent(contextName)}`);
                    if (firmsRes.ok) {
                        const firmsData = await firmsRes.json();
                        const disciplineFirms = firmsData.map((f: { id: string; companyName: string; contactPerson?: string; shortlisted: boolean }) => ({
                            id: f.id,
                            companyName: f.companyName,
                            contactPerson: f.contactPerson || null,
                            shortlisted: f.shortlisted,
                            rftDate: null, // Will be fetched from RFT
                        }));
                        setFirms(disciplineFirms);
                    }
                } else if (contextType === 'trade' && contextName) {
                    const firmsRes = await fetch(`/api/contractors/firms?projectId=${projectId}&trade=${encodeURIComponent(contextName)}`);
                    if (firmsRes.ok) {
                        const firmsData = await firmsRes.json();
                        const tradeFirms = firmsData.map((f: { id: string; companyName: string; contactPerson?: string; shortlisted: boolean }) => ({
                            id: f.id,
                            companyName: f.companyName,
                            contactPerson: f.contactPerson || null,
                            shortlisted: f.shortlisted,
                            rftDate: null,
                        }));
                        setFirms(tradeFirms);
                    }
                }

                // Fetch addenda for the stakeholder
                const addendaParams = new URLSearchParams({ projectId });
                if (stakeholderId) addendaParams.set('stakeholderId', stakeholderId);

                const addendaRes = await fetch(`/api/addenda?${addendaParams.toString()}`);
                if (addendaRes.ok) {
                    const addendaData = await addendaRes.json();
                    const addendaRows: TRRAddendumRow[] = addendaData.map((a: { id: string; addendumNumber: number; content?: string; addendumDate?: string }) => ({
                        id: a.id,
                        addendumNumber: a.addendumNumber,
                        summary: a.content ? a.content.substring(0, 100) + (a.content.length > 100 ? '...' : '') : '',
                        date: a.addendumDate || null,
                    }));
                    setAddenda(addendaRows);
                }

            } catch (error) {
                console.error('Error fetching TRR data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId, stakeholderId, contextType, contextName]);

    // Update local state when TRR changes
    useEffect(() => {
        setExecutiveSummary(trr.executiveSummary || '');
        setClarifications(trr.clarifications || '');
        setRecommendation(trr.recommendation || '');
        setReportDate(trr.reportDate || new Date().toISOString().split('T')[0]);
    }, [trr]);

    // Debounced save function
    const debouncedSave = useCallback((data: TRRUpdateData) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                await onUpdateTRR(data);
            } catch (error) {
                console.error('Failed to save TRR:', error);
            } finally {
                setIsSaving(false);
            }
        }, 500); // 500ms debounce
    }, [onUpdateTRR]);

    const handleExecutiveSummaryBlur = useCallback(() => {
        if (executiveSummary !== trr.executiveSummary) {
            debouncedSave({ executiveSummary });
        }
    }, [executiveSummary, trr.executiveSummary, debouncedSave]);

    const handleClarificationsBlur = useCallback(() => {
        if (clarifications !== trr.clarifications) {
            debouncedSave({ clarifications });
        }
    }, [clarifications, trr.clarifications, debouncedSave]);

    const handleRecommendationBlur = useCallback(() => {
        if (recommendation !== trr.recommendation) {
            debouncedSave({ recommendation });
        }
    }, [recommendation, trr.recommendation, debouncedSave]);

    const handleDateChange = useCallback((newDate: string) => {
        setReportDate(newDate);
        debouncedSave({ reportDate: newDate });
    }, [debouncedSave]);

    // TRR AI generation — calls dedicated /api/trr/[id]/generate endpoint
    const createTrrGenerateHandler = useMemo(() => {
        const makeHandler = (field: 'executiveSummary' | 'clarifications' | 'recommendation') => {
            return async (_currentValue: string): Promise<string> => {
                const res = await fetch(`/api/trr/${trr.id}/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ field }),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Generation failed' }));
                    throw new Error(err.error || 'Failed to generate');
                }

                const data = await res.json();
                return data.content;
            };
        };

        return {
            executiveSummary: makeHandler('executiveSummary'),
            clarifications: makeHandler('clarifications'),
            recommendation: makeHandler('recommendation'),
        };
    }, [trr.id]);

    if (isLoading) {
        return (
            <div className="p-8 text-center text-[var(--color-text-muted)]">
                <p>Loading TRR data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Saving indicator */}
            {isSaving && (
                <div className="fixed top-4 right-4 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-1.5 text-xs text-[var(--color-accent-copper)] z-50">
                    Saving...
                </div>
            )}

            {/* 1. Header Table */}
            <TRRHeaderTable
                projectName={projectDetails?.projectName || 'Loading...'}
                address={projectDetails?.address || ''}
                documentTitle={`Tender Recommendation Report, ${contextName} ${String(trr.trrNumber).padStart(2, '0')}`}
                reportDate={reportDate}
                onDateChange={handleDateChange}
            />

            {/* 2. Executive Summary */}
            <TRREditableSection
                title="Executive Summary"
                value={executiveSummary}
                onChange={setExecutiveSummary}
                onBlur={handleExecutiveSummaryBlur}
                placeholder="Enter executive summary..."
                onGenerate={createTrrGenerateHandler.executiveSummary}
            />

            {/* 3. Tender Process Table */}
            <TRRTenderProcessTable
                firms={firms}
                projectId={projectId}
                stakeholderId={stakeholderId}
            />

            {/* 4. Addendum Table */}
            <TRRAddendumTable addenda={addenda} />

            {/* 5. Evaluation Price */}
            <TRREvaluationPrice
                projectId={projectId}
                stakeholderId={stakeholderId}
            />

            {/* 6. Evaluation Non-Price */}
            <TRREvaluationNonPrice
                projectId={projectId}
                stakeholderId={stakeholderId}
            />

            {/* 7. Clarifications */}
            <TRREditableSection
                title="Clarifications"
                value={clarifications}
                onChange={setClarifications}
                onBlur={handleClarificationsBlur}
                placeholder="Enter clarifications..."
                onGenerate={createTrrGenerateHandler.clarifications}
            />

            {/* 8. Recommendation */}
            <TRREditableSection
                title="Recommendation"
                value={recommendation}
                onChange={setRecommendation}
                onBlur={handleRecommendationBlur}
                placeholder="Enter recommendation..."
                onGenerate={createTrrGenerateHandler.recommendation}
            />

            {/* 9. Attachments */}
            <TRRAttachments
                trrId={trr.id}
                transmittalCount={trr.transmittalCount}
                onSaveTransmittal={onSaveTransmittal}
                onLoadTransmittal={onLoadTransmittal}
                onDownloadTransmittal={onDownloadTransmittal}
                canSaveTransmittal={canSaveTransmittal}
                isDownloading={isDownloading}
            />
        </div>
    );
}
