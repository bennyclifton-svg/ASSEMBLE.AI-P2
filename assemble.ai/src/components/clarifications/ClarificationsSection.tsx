'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FilePlus, Loader2, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProcurementSectionShell } from '@/components/procurement';
import { useClarifications } from '@/lib/hooks/use-clarifications';
import type {
    Clarification,
    ClarificationMateriality,
    ClarificationStatus,
    EvaluationFirm,
    RecommendationState,
} from '@/types/evaluation';

const CLARIFICATION_ACCENT = 'var(--sw-peach)';
const STATUS_OPTIONS: ClarificationStatus[] = ['draft', 'issued', 'responded', 'closed'];
const MATERIALITY_OPTIONS: ClarificationMateriality[] = ['low', 'medium', 'high'];

interface ClarificationsSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
    displayMode?: 'accordion' | 'detail';
}

function formatLabel(value: string): string {
    return value.replace(/_/g, ' ');
}

function stateLabel(state: RecommendationState | null): string {
    switch (state) {
        case 'conditional':
            return 'Conditional';
        case 'final':
            return 'Final';
        default:
            return 'Draft';
    }
}

function isUnresolvedHigh(clarification: Clarification): boolean {
    return clarification.materiality === 'high' && !['responded', 'closed'].includes(clarification.status);
}

export function ClarificationsSection({
    projectId,
    stakeholderId,
    displayMode = 'accordion',
}: ClarificationsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(displayMode === 'detail');
    const [firms, setFirms] = useState<EvaluationFirm[]>([]);
    const [recommendationState, setRecommendationState] = useState<RecommendationState>('draft');
    const [questionText, setQuestionText] = useState('');
    const [category, setCategory] = useState('');
    const [materiality, setMateriality] = useState<ClarificationMateriality>('medium');
    const [firmId, setFirmId] = useState('');
    const [isConfirmingFinal, setIsConfirmingFinal] = useState(false);

    const {
        clarifications,
        isLoading,
        createClarification,
        updateClarification,
        promoteToAddendum,
        refetch,
    } = useClarifications({ projectId, stakeholderId });

    const unresolvedHighCount = useMemo(
        () => clarifications.filter(isUnresolvedHigh).length,
        [clarifications]
    );

    const selectedFirm = firms.find((firm) => firm.id === firmId) ?? firms[0];

    const loadEvaluationContext = useCallback(async () => {
        if (!stakeholderId) return;
        const response = await fetch(`/api/evaluation/${projectId}/stakeholder/${stakeholderId}`);
        if (!response.ok) return;
        const payload = await response.json();
        const data = payload.data ?? payload;
        setFirms(data.firms ?? []);
        setRecommendationState(data.evaluation?.recommendationState ?? 'draft');
        if (!firmId && data.firms?.[0]?.id) {
            setFirmId(data.firms[0].id);
        }
    }, [projectId, stakeholderId, firmId]);

    useEffect(() => {
        void loadEvaluationContext();
    }, [loadEvaluationContext]);

    const handleCreate = useCallback(async () => {
        if (!selectedFirm || !questionText.trim()) return;

        const created = await createClarification({
            firmId: selectedFirm.id,
            firmType: selectedFirm.firmType || 'consultant',
            questionText: questionText.trim(),
            category: category.trim() || null,
            materiality,
        });

        if (created) {
            setQuestionText('');
            setCategory('');
            setMateriality('medium');
            await loadEvaluationContext();
        }
    }, [selectedFirm, questionText, createClarification, category, materiality, loadEvaluationContext]);

    const handleUpdate = useCallback(async (
        clarification: Clarification,
        patch: Partial<Pick<Clarification, 'status' | 'materiality' | 'responseText'>>
    ) => {
        await updateClarification(clarification.id, patch);
        await loadEvaluationContext();
    }, [updateClarification, loadEvaluationContext]);

    const handlePromote = useCallback(async (clarification: Clarification) => {
        await promoteToAddendum(clarification.id);
        await refetch();
    }, [promoteToAddendum, refetch]);

    const handleConfirmFinal = useCallback(async () => {
        if (!stakeholderId || unresolvedHighCount > 0) return;
        setIsConfirmingFinal(true);
        try {
            const response = await fetch(`/api/evaluation/${projectId}/stakeholder/${stakeholderId}/recommendation-state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'user_confirms_final' }),
            });
            if (response.ok) {
                const payload = await response.json();
                setRecommendationState(payload.data?.recommendationState ?? 'final');
            }
        } finally {
            setIsConfirmingFinal(false);
        }
    }, [projectId, stakeholderId, unresolvedHighCount]);

    const sectionExpanded = displayMode === 'detail' || isExpanded;
    const meta = `${clarifications.length} items / ${stateLabel(recommendationState).toLowerCase()}`;

    return (
        <div className={displayMode === 'detail' ? '' : 'mt-2'}>
            <ProcurementSectionShell
                label={displayMode === 'detail' ? 'clarifications record' : 'clarifications'}
                meta={meta}
                accentColor={displayMode === 'detail' ? CLARIFICATION_ACCENT : undefined}
                isExpanded={sectionExpanded}
                onToggleExpanded={() => setIsExpanded(!isExpanded)}
                displayMode={displayMode}
                menuContent={
                    <div className="flex min-w-0 items-center gap-2">
                        <span
                            className="inline-flex h-6 items-center border px-2 text-[10px] uppercase"
                            style={{
                                borderColor: 'var(--sw-rule)',
                                color: recommendationState === 'final' ? 'var(--sw-green)' : CLARIFICATION_ACCENT,
                                fontFamily: 'var(--sw-font-mono)',
                                letterSpacing: '0.08em',
                            }}
                        >
                            {stateLabel(recommendationState)}
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={unresolvedHighCount > 0 || isConfirmingFinal}
                            onClick={handleConfirmFinal}
                            className="h-7 rounded-none px-2 text-[11px]"
                        >
                            {isConfirmingFinal ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Final
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3 bg-white p-3">
                    <div
                        className="grid gap-2 border-b pb-3 md:grid-cols-[160px_130px_120px_minmax(220px,1fr)_auto]"
                        style={{ borderColor: 'var(--sw-rule-2)' }}
                    >
                        <select
                            value={selectedFirm?.id ?? ''}
                            onChange={(event) => setFirmId(event.target.value)}
                            className="h-8 border bg-white px-2 text-xs"
                            style={{ borderColor: 'var(--sw-rule)' }}
                        >
                            {firms.map((firm) => (
                                <option key={firm.id} value={firm.id}>
                                    {firm.companyName}
                                </option>
                            ))}
                        </select>
                        <input
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                            className="h-8 border bg-white px-2 text-xs"
                            style={{ borderColor: 'var(--sw-rule)' }}
                            placeholder="Category"
                        />
                        <div className="flex h-8 border" style={{ borderColor: 'var(--sw-rule)' }}>
                            {MATERIALITY_OPTIONS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setMateriality(option)}
                                    className="flex-1 px-2 text-[10px] uppercase"
                                    style={{
                                        background: materiality === option ? CLARIFICATION_ACCENT : 'white',
                                        color: materiality === option ? 'white' : 'var(--sw-muted)',
                                    }}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        <input
                            value={questionText}
                            onChange={(event) => setQuestionText(event.target.value)}
                            className="h-8 min-w-0 border bg-white px-2 text-xs"
                            style={{ borderColor: 'var(--sw-rule)' }}
                            placeholder="Question"
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCreate}
                            disabled={!selectedFirm || !questionText.trim()}
                            className="h-8 rounded-none px-2 text-[11px]"
                        >
                            <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
                            Add
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-[var(--sw-muted)]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading clarifications...
                        </div>
                    ) : clarifications.length === 0 ? (
                        <div className="py-4 text-sm text-[var(--sw-muted)]">No clarifications</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] border-collapse text-sm">
                                <thead>
                                    <tr
                                        className="border-b text-left text-[10px] uppercase tracking-[0.08em] text-[var(--sw-muted)]"
                                        style={{ borderColor: 'var(--sw-rule-2)', fontFamily: 'var(--sw-font-mono)' }}
                                    >
                                        <th className="px-2 py-2 font-semibold">Tenderer</th>
                                        <th className="px-2 py-2 font-semibold">Question</th>
                                        <th className="px-2 py-2 font-semibold">Materiality</th>
                                        <th className="px-2 py-2 font-semibold">Status</th>
                                        <th className="px-2 py-2 font-semibold">Response</th>
                                        <th className="px-2 py-2 text-right font-semibold">Addendum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clarifications.map((clarification) => {
                                        const firm = firms.find((candidate) => candidate.id === clarification.firmId);
                                        return (
                                            <tr key={clarification.id} className="border-b" style={{ borderColor: 'var(--sw-rule-2)' }}>
                                                <td className="px-2 py-2 align-top text-xs">
                                                    {firm?.companyName ?? clarification.firmId}
                                                </td>
                                                <td className="max-w-[280px] px-2 py-2 align-top text-xs">
                                                    <div className="font-medium text-[var(--sw-ink)]">{clarification.questionText}</div>
                                                    {clarification.category ? (
                                                        <div className="mt-1 text-[10px] uppercase text-[var(--sw-muted)]">
                                                            {clarification.category}
                                                        </div>
                                                    ) : null}
                                                </td>
                                                <td className="px-2 py-2 align-top">
                                                    <div className="flex h-7 border" style={{ borderColor: 'var(--sw-rule)' }}>
                                                        {MATERIALITY_OPTIONS.map((option) => (
                                                            <button
                                                                key={option}
                                                                type="button"
                                                                onClick={() => handleUpdate(clarification, { materiality: option })}
                                                                className="px-1.5 text-[10px] uppercase"
                                                                style={{
                                                                    background: clarification.materiality === option ? CLARIFICATION_ACCENT : 'white',
                                                                    color: clarification.materiality === option ? 'white' : 'var(--sw-muted)',
                                                                }}
                                                            >
                                                                {option}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 align-top">
                                                    <div className="flex h-7 border" style={{ borderColor: 'var(--sw-rule)' }}>
                                                        {STATUS_OPTIONS.map((option) => (
                                                            <button
                                                                key={option}
                                                                type="button"
                                                                title={formatLabel(option)}
                                                                onClick={() => handleUpdate(clarification, { status: option })}
                                                                className="px-1.5 text-[10px] uppercase"
                                                                style={{
                                                                    background: clarification.status === option ? 'var(--sw-ink)' : 'white',
                                                                    color: clarification.status === option ? 'white' : 'var(--sw-muted)',
                                                                }}
                                                            >
                                                                {option[0]}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 align-top">
                                                    <textarea
                                                        defaultValue={clarification.responseText ?? ''}
                                                        onBlur={(event) => handleUpdate(clarification, { responseText: event.target.value })}
                                                        className="min-h-8 w-full resize-y border bg-white px-2 py-1 text-xs"
                                                        style={{ borderColor: 'var(--sw-rule)' }}
                                                        placeholder="Response"
                                                    />
                                                </td>
                                                <td className="px-2 py-2 text-right align-top">
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePromote(clarification)}
                                                        disabled={!!clarification.linkedAddendumId}
                                                        title={clarification.linkedAddendumId ? 'Addendum linked' : 'Promote to addendum candidate'}
                                                        className="inline-flex h-7 items-center justify-center border px-2 text-[10px] uppercase disabled:opacity-50"
                                                        style={{ borderColor: 'var(--sw-rule)', color: CLARIFICATION_ACCENT }}
                                                    >
                                                        {clarification.linkedAddendumId ? (
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <FilePlus className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </ProcurementSectionShell>
        </div>
    );
}
