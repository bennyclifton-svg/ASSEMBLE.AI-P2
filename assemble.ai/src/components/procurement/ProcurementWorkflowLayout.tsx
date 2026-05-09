'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { RFTNewSection } from '@/components/rft-new';
import { AddendumSection } from '@/components/addendum';
import { EvaluationPriceSection, EvaluationNonPriceSection } from '@/components/evaluation';
import { TRRSection } from '@/components/trr';
import { useRftNew } from '@/lib/hooks/use-rft-new';
import { useAddenda } from '@/lib/hooks/use-addenda';
import { useTRR } from '@/lib/hooks/use-trr';
import { useEvaluationPrice } from '@/lib/hooks/use-evaluation-price';
import { cn } from '@/lib/utils';

type ProcurementReportKey =
    | 'request-for-tender'
    | 'addendum'
    | 'evaluation-price'
    | 'evaluation-non-price'
    | 'tender-recommendation-report';

interface ProcurementReportDefinition {
    key: ProcurementReportKey;
    typeLabel: string;
    status: string;
    accent: string;
}

const PROCUREMENT_REPORTS: ProcurementReportDefinition[] = [
    {
        key: 'request-for-tender',
        typeLabel: 'request for tender',
        status: 'versions',
        accent: 'var(--sw-cyan)',
    },
    {
        key: 'addendum',
        typeLabel: 'addendum',
        status: 'addenda',
        accent: 'var(--sw-peach)',
    },
    {
        key: 'evaluation-price',
        typeLabel: 'evaluation price',
        status: 'reports',
        accent: 'var(--sw-rose)',
    },
    {
        key: 'evaluation-non-price',
        typeLabel: 'evaluation non-price',
        status: 'criteria',
        accent: 'var(--sw-lav)',
    },
    {
        key: 'tender-recommendation-report',
        typeLabel: 'tender recommendation report',
        status: 'reports',
        accent: 'var(--sw-cyan)',
    },
];

function mostRecent(dates: Array<string | null | undefined>): string | null {
    let latest: string | null = null;
    for (const d of dates) {
        if (!d) continue;
        if (!latest || d > latest) latest = d;
    }
    return latest;
}

function formatIssuedDate(value: string | null): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat('en-AU', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
    }).format(parsed);
}

interface ProcurementWorkflowLayoutProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName: string;
    contextType: 'discipline' | 'trade';
    selectedDocumentIds?: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
}

export function ProcurementWorkflowLayout({
    projectId,
    stakeholderId,
    stakeholderName,
    contextType,
    selectedDocumentIds = [],
    onSetSelectedDocumentIds,
}: ProcurementWorkflowLayoutProps) {
    const [activeReportKey, setActiveReportKey] = useState<ProcurementReportKey>('request-for-tender');
    const activeReport = useMemo(
        () => PROCUREMENT_REPORTS.find((report) => report.key === activeReportKey) ?? PROCUREMENT_REPORTS[0],
        [activeReportKey]
    );

    const { rfts } = useRftNew({ projectId, stakeholderId });
    const { addenda } = useAddenda({ projectId, stakeholderId });
    const { trrs } = useTRR({ projectId, stakeholderId });
    const { evaluationPrices } = useEvaluationPrice({ projectId, stakeholderId });

    const issuedDates = useMemo<Record<ProcurementReportKey, string | null>>(() => ({
        'request-for-tender': mostRecent(rfts.map((r) => r.rftDate)),
        'addendum': mostRecent(addenda.map((a) => a.addendumDate)),
        'evaluation-price': mostRecent(evaluationPrices.map((evaluation) => evaluation.createdAt ?? evaluation.updatedAt)),
        'evaluation-non-price': null,
        'tender-recommendation-report': mostRecent(trrs.map((t) => t.reportDate ?? null)),
    }), [rfts, addenda, evaluationPrices, trrs]);

    const transmittalProps = {
        selectedDocumentIds,
        onLoadTransmittal: onSetSelectedDocumentIds,
        onSaveTransmittal: () => selectedDocumentIds,
    };

    const detail = (() => {
        switch (activeReportKey) {
            case 'request-for-tender':
                return (
                    <RFTNewSection
                        projectId={projectId}
                        stakeholderId={stakeholderId}
                        stakeholderName={stakeholderName}
                        displayMode="detail"
                        {...transmittalProps}
                    />
                );
            case 'addendum':
                return (
                    <AddendumSection
                        projectId={projectId}
                        stakeholderId={stakeholderId}
                        stakeholderName={stakeholderName}
                        displayMode="detail"
                        {...transmittalProps}
                    />
                );
            case 'evaluation-price':
                return (
                    <EvaluationPriceSection
                        projectId={projectId}
                        stakeholderId={stakeholderId}
                        stakeholderName={stakeholderName}
                        displayMode="detail"
                    />
                );
            case 'evaluation-non-price':
                return (
                    <EvaluationNonPriceSection
                        projectId={projectId}
                        stakeholderId={stakeholderId}
                        stakeholderName={stakeholderName}
                        displayMode="detail"
                    />
                );
            case 'tender-recommendation-report':
                return (
                    <TRRSection
                        projectId={projectId}
                        stakeholderId={stakeholderId}
                        stakeholderName={stakeholderName}
                        contextType={contextType}
                        displayMode="detail"
                        {...transmittalProps}
                    />
                );
            default:
                return null;
        }
    })();

    return (
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[380px_minmax(0,1fr)]">
            <section
                className="min-w-0 self-start overflow-hidden"
                aria-label={`${stakeholderName} procurement reports`}
                style={{
                    background: 'rgba(255, 255, 255, 0.72)',
                    border: '1px solid var(--sw-rule)',
                }}
            >
                <div
                    className="grid h-8 grid-cols-[minmax(0,1fr)_88px_74px] items-center border-b border-[var(--sw-rule-2)] px-3"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        color: 'var(--sw-muted)',
                    }}
                >
                    <span>type</span>
                    <span className="text-right">date</span>
                    <span className="text-right">state</span>
                </div>

                <div>
                    {PROCUREMENT_REPORTS.map((report) => {
                        const isActive = report.key === activeReport.key;
                        const dateLabel = formatIssuedDate(issuedDates[report.key]);

                        return (
                            <button
                                key={report.key}
                                type="button"
                                onClick={() => setActiveReportKey(report.key)}
                                className={cn(
                                    'grid h-10 w-full grid-cols-[minmax(0,1fr)_88px_74px] items-center border-b border-l-2 border-[var(--sw-rule-2)] px-3 text-left transition-colors last:border-b-0',
                                    isActive
                                        ? 'border-l-4 bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-[var(--sw-ink)]'
                                        : 'bg-transparent hover:bg-[var(--sw-paper-2)]'
                                )}
                                style={{
                                    borderLeftColor: report.accent,
                                    fontFamily: 'var(--sw-font-mono)',
                                }}
                                aria-pressed={isActive}
                            >
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <span
                                        aria-hidden="true"
                                        className="h-1.5 w-1.5 shrink-0"
                                        style={{ background: report.accent }}
                                    />
                                    <span
                                        className={cn(
                                            'truncate text-[10px] font-semibold',
                                            isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-ink)]',
                                            isActive && 'font-bold'
                                        )}
                                        title={report.typeLabel}
                                    >
                                        {report.typeLabel}
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        'truncate text-right text-[10px] tabular-nums',
                                        isActive ? 'text-[rgba(232,228,218,0.72)]' : 'text-[var(--sw-muted)]'
                                    )}
                                    title={dateLabel}
                                >
                                    {dateLabel}
                                </span>
                                <span className={cn(
                                    'flex items-center justify-end gap-1 text-[10px]',
                                    isActive ? 'text-[rgba(232,228,218,0.72)]' : 'text-[var(--sw-muted)]'
                                )}>
                                    <span className="truncate">{report.status}</span>
                                    {isActive ? <Check className="h-3 w-3 shrink-0 text-[var(--sw-paper)]" /> : null}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="min-w-0 overflow-x-auto">
                {detail}
            </div>
        </div>
    );
}
