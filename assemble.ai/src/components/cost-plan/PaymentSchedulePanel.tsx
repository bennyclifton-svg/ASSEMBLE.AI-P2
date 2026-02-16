'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useCostPlan } from '@/lib/hooks/cost-plan';
import { useInvoices, useVariations } from '@/lib/hooks/cost-plan';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { formatCurrency, sumContractOnlyInvoicesForCostLine, sumInvoicesForVariation } from '@/lib/calculations/cost-plan-formulas';

interface PaymentSchedulePanelProps {
    projectId: string;
}

interface ProjectDetails {
    projectName?: string;
    address?: string;
}

export function PaymentSchedulePanel({ projectId }: PaymentSchedulePanelProps) {
    // Month selector state
    const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number }>({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
    });
    const [selectedStakeholderId, setSelectedStakeholderId] = useState<string | null>(null);
    const [projectDetails, setProjectDetails] = useState<ProjectDetails>({});

    // Data hooks
    const { costLines, isLoading: isCostPlanLoading } = useCostPlan(projectId, selectedMonth);
    const { invoices, isLoading: isInvoicesLoading } = useInvoices(projectId);
    const { variations, isLoading: isVariationsLoading } = useVariations(projectId);
    const { stakeholders } = useStakeholders({ projectId });

    // Only show loading on initial load, not on background poll refetches
    const hasLoadedOnce = useRef(false);
    if (!isCostPlanLoading && !isInvoicesLoading && !isVariationsLoading) {
        hasLoadedOnce.current = true;
    }
    const isLoading = !hasLoadedOnce.current && (isCostPlanLoading || isInvoicesLoading || isVariationsLoading);

    // Fetch project details for header
    useEffect(() => {
        if (!projectId) return;
        fetch(`/api/planning/${projectId}/details`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data) setProjectDetails(data); })
            .catch(() => {});
    }, [projectId]);

    // Stakeholders that actually have cost lines assigned
    const stakeholdersWithCostLines = useMemo(() => {
        const stakeholderIds = new Set(costLines.filter(cl => cl.stakeholderId).map(cl => cl.stakeholderId!));
        return stakeholders
            .filter(s => stakeholderIds.has(s.id) && (s.stakeholderGroup === 'consultant' || s.stakeholderGroup === 'contractor'))
            .sort((a, b) => (a.name || a.disciplineOrTrade || '').localeCompare(b.name || b.disciplineOrTrade || ''));
    }, [stakeholders, costLines]);

    const selectedStakeholder = useMemo(
        () => stakeholders.find(s => s.id === selectedStakeholderId) ?? null,
        [stakeholders, selectedStakeholderId]
    );

    // Filter data for selected stakeholder
    const filteredCostLines = useMemo(
        () => selectedStakeholderId ? costLines.filter(cl => cl.stakeholderId === selectedStakeholderId) : [],
        [costLines, selectedStakeholderId]
    );

    const costLineIds = useMemo(
        () => new Set(filteredCostLines.map(cl => cl.id)),
        [filteredCostLines]
    );

    const filteredVariations = useMemo(
        () => variations.filter(v => v.costLineId && costLineIds.has(v.costLineId) && (v.status === 'Approved' || v.status === 'Forecast')),
        [variations, costLineIds]
    );

    const filteredInvoices = useMemo(
        () => invoices.filter(inv => inv.costLineId && costLineIds.has(inv.costLineId)),
        [invoices, costLineIds]
    );

    // Split invoices: contract-only (no variationId) vs variation-tagged
    const contractInvoices = useMemo(
        () => filteredInvoices.filter(inv => !inv.variationId),
        [filteredInvoices]
    );

    // Contract summary subtotals (uses contract-only invoices, excludes variation-tagged)
    const contractSubtotal = useMemo(() => {
        return filteredCostLines.reduce(
            (acc, cl) => {
                const sums = sumContractOnlyInvoicesForCostLine(contractInvoices, cl.id, selectedMonth);
                return {
                    totalLet: acc.totalLet + cl.approvedContractCents,
                    completedToDate: acc.completedToDate + sums.claimedToDateCents,
                    lessPrior: acc.lessPrior + (sums.claimedToDateCents - sums.currentMonthCents),
                    thisClaim: acc.thisClaim + sums.currentMonthCents,
                };
            },
            { totalLet: 0, completedToDate: 0, lessPrior: 0, thisClaim: 0 }
        );
    }, [filteredCostLines, contractInvoices, selectedMonth]);

    // Variation subtotals (approved amounts + claimed from variation-tagged invoices)
    const variationSubtotal = useMemo(() => {
        const approved = filteredVariations.filter(v => v.status === 'Approved');
        const totalApproved = approved.reduce((sum, v) => sum + v.amountApprovedCents, 0);
        const invoiceSums = filteredVariations.reduce(
            (acc, v) => {
                const sums = sumInvoicesForVariation(filteredInvoices, v.id, selectedMonth);
                return {
                    completedToDate: acc.completedToDate + sums.claimedToDateCents,
                    lessPrior: acc.lessPrior + (sums.claimedToDateCents - sums.currentMonthCents),
                    thisClaim: acc.thisClaim + sums.currentMonthCents,
                };
            },
            { completedToDate: 0, lessPrior: 0, thisClaim: 0 }
        );
        return {
            approved: totalApproved,
            ...invoiceSums,
        };
    }, [filteredVariations, filteredInvoices, selectedMonth]);

    // Adjusted contract sum
    const adjustedTotal = useMemo(() => {
        const totalExGst = contractSubtotal.thisClaim + variationSubtotal.thisClaim;
        const gst = Math.round(totalExGst * 0.10);
        return {
            totalExGst,
            gst,
            totalIncGst: totalExGst + gst,
            grandTotalLet: contractSubtotal.totalLet + variationSubtotal.approved,
            grandCompletedToDate: contractSubtotal.completedToDate + variationSubtotal.completedToDate,
            grandLessPrior: contractSubtotal.lessPrior + variationSubtotal.lessPrior,
            grandThisClaim: contractSubtotal.thisClaim + variationSubtotal.thisClaim,
        };
    }, [contractSubtotal, variationSubtotal]);

    // Payment list: group invoices by period, sorted chronologically
    const paymentList = useMemo(() => {
        const sorted = [...filteredInvoices].sort((a, b) => {
            const aPeriod = a.periodYear * 100 + a.periodMonth;
            const bPeriod = b.periodYear * 100 + b.periodMonth;
            return aPeriod - bPeriod;
        });
        return sorted;
    }, [filteredInvoices]);

    const paymentListTotal = useMemo(() => {
        return paymentList.reduce(
            (acc, inv) => ({
                amountExGst: acc.amountExGst + inv.amountCents,
                gst: acc.gst + inv.gstCents,
                amountIncGst: acc.amountIncGst + inv.amountCents + inv.gstCents,
            }),
            { amountExGst: 0, gst: 0, amountIncGst: 0 }
        );
    }, [paymentList]);

    // Claim number: count of distinct periods with invoices
    const claimNumber = useMemo(() => {
        const periods = new Set(filteredInvoices.map(inv => `${inv.periodYear}-${inv.periodMonth}`));
        return periods.size;
    }, [filteredInvoices]);

    // Month options (last 24 months)
    const monthOptions = useMemo(() => {
        const options: { year: number; month: number; label: string; value: string }[] = [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        for (let i = 23; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - 1 - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            if (year > currentYear || (year === currentYear && month > currentMonth)) continue;

            const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            const value = `${year}-${String(month).padStart(2, '0')}`;
            options.push({ year, month, label, value });
        }
        return options;
    }, []);

    // Format period for display (e.g., "AUG24")
    const formatPeriodShort = useCallback((year: number, month: number) => {
        const date = new Date(year, month - 1);
        const monthStr = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        const yearStr = String(year).slice(-2);
        return `${monthStr}${yearStr}`;
    }, []);

    // Completion percentage helper
    const completionPct = (completed: number, total: number): string => {
        if (total <= 0) return '0.0%';
        return `${((completed / total) * 100).toFixed(1)}%`;
    };

    // Period label for header
    const selectedPeriodLabel = formatPeriodShort(selectedMonth.year, selectedMonth.month);

    // TRR-style cell classes
    const tdClass = 'px-4 py-2.5 text-sm';
    const tdRight = `${tdClass} text-right tabular-nums`;

    if (!selectedStakeholderId) {
        return (
            <div className="h-full flex flex-col">
                {/* Toolbar */}
                <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-[var(--color-border)]/50 backdrop-blur-sm flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 30%, transparent)' }}>
                    <select
                        value=""
                        onChange={(e) => setSelectedStakeholderId(e.target.value || null)}
                        className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2 py-1 rounded hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-teal)] transition-colors cursor-pointer min-w-[200px]"
                    >
                        <option value="">Discipline...</option>
                        {stakeholdersWithCostLines.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name || s.disciplineOrTrade || 'Unknown'}
                            </option>
                        ))}
                    </select>
                    <select
                        value={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`}
                        onChange={(e) => {
                            const [year, month] = e.target.value.split('-').map(Number);
                            setSelectedMonth({ year, month });
                        }}
                        className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2 py-1 rounded hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-teal)] transition-colors cursor-pointer"
                    >
                        {monthOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Empty state */}
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-[var(--color-text-muted)]">Select a discipline to view payment schedule</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-[var(--color-border)]/50 backdrop-blur-sm flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 30%, transparent)' }}>
                <select
                    value={selectedStakeholderId}
                    onChange={(e) => setSelectedStakeholderId(e.target.value || null)}
                    className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2 py-1 rounded hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-teal)] transition-colors cursor-pointer min-w-[200px]"
                >
                    <option value="">Discipline...</option>
                    {stakeholdersWithCostLines.map(s => (
                        <option key={s.id} value={s.id}>
                            {s.name || s.disciplineOrTrade || 'Unknown'}
                        </option>
                    ))}
                </select>
                <select
                    value={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`}
                    onChange={(e) => {
                        const [year, month] = e.target.value.split('-').map(Number);
                        setSelectedMonth({ year, month });
                    }}
                    className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2 py-1 rounded hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-teal)] transition-colors cursor-pointer"
                >
                    {monthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
                    </div>
                ) : (
                    <div className="max-w-[900px] mx-auto p-6 bg-[var(--color-bg-secondary)] rounded-md shadow-sm space-y-6">
                        {/* ============================================================ */}
                        {/* HEADER SECTION */}
                        {/* ============================================================ */}
                        <div className="overflow-hidden rounded-lg">
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b border-[var(--color-border)]">
                                        <td className="w-40 px-4 py-2.5 text-[var(--color-text-primary)] font-medium">
                                            Project
                                        </td>
                                        <td className="px-4 py-2.5 text-black" colSpan={3}>
                                            {projectDetails.projectName || '—'}
                                        </td>
                                    </tr>
                                    <tr className="border-b border-[var(--color-border)]">
                                        <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-medium">
                                            Address
                                        </td>
                                        <td className="px-4 py-2.5 text-black" colSpan={2}>
                                            {projectDetails.address || '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                            <span className="text-[var(--color-text-primary)] font-medium">Claim</span>
                                            <span className="ml-3 text-black">{String(claimNumber).padStart(2, '0')}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-medium">
                                            Document
                                        </td>
                                        <td className="px-4 py-2.5 text-black" colSpan={2}>
                                            Payment Schedule — {selectedStakeholder?.name || selectedStakeholder?.disciplineOrTrade || '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                            <span className="text-[var(--color-text-primary)] font-medium">Period</span>
                                            <span className="ml-3 text-black">{selectedPeriodLabel}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ============================================================ */}
                        {/* CONTRACT SUMMARY */}
                        {/* ============================================================ */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-black uppercase tracking-wide">
                                Contract Summary
                            </h3>
                            <div className="overflow-hidden rounded-lg">
                                <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '3%' }} />
                                        <col />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '7%' }} />
                                        <col style={{ width: '14%' }} />
                                        <col style={{ width: '14%' }} />
                                        <col style={{ width: '14%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)]">
                                            <th className="px-2 py-2.5 text-left text-black font-medium">#</th>
                                            <th className="px-4 py-2.5 text-left text-black font-medium">Description</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">Total Let ($)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium">(%)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">Completed ($)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">Less Prior ($)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">This Claim ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCostLines.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-4 text-center text-black/60 text-sm">
                                                    No cost lines for this discipline
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {filteredCostLines.map((cl, idx) => {
                                                    const totalLet = cl.approvedContractCents;
                                                    const sums = sumContractOnlyInvoicesForCostLine(contractInvoices, cl.id, selectedMonth);
                                                    const completed = sums.claimedToDateCents;
                                                    const pct = completionPct(completed, totalLet);
                                                    const lessPrior = completed - sums.currentMonthCents;
                                                    const thisClaim = sums.currentMonthCents;

                                                    return (
                                                        <tr key={cl.id}>
                                                            <td className="px-4 py-2.5 text-black/60">{idx + 1}</td>
                                                            <td className="px-4 py-2.5 text-black">{cl.activity}</td>
                                                            <td className={tdRight + ' text-black'}>{formatCurrency(totalLet)}</td>
                                                            <td className={tdRight + ' text-black/60'}>{pct}</td>
                                                            <td className={tdRight + ' text-black'}>{formatCurrency(completed)}</td>
                                                            <td className={tdRight + ' text-black'}>{formatCurrency(lessPrior)}</td>
                                                            <td className={tdRight + ' text-black'}>{formatCurrency(thisClaim)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* SUB TOTAL */}
                                                <tr className="border-t border-[var(--color-border)]">
                                                    <td className="px-4 py-2.5" />
                                                    <td className="px-4 py-2.5 text-black font-semibold">SUB TOTAL ($)</td>
                                                    <td className={tdRight + ' text-black font-semibold'}>{formatCurrency(contractSubtotal.totalLet)}</td>
                                                    <td className={tdRight + ' text-black/60'}>
                                                        {completionPct(contractSubtotal.completedToDate, contractSubtotal.totalLet)}
                                                    </td>
                                                    <td className={tdRight + ' text-black font-semibold'}>{formatCurrency(contractSubtotal.completedToDate)}</td>
                                                    <td className={tdRight + ' text-black font-semibold'}>{formatCurrency(contractSubtotal.lessPrior)}</td>
                                                    <td className={tdRight + ' text-black font-semibold'}>{formatCurrency(contractSubtotal.thisClaim)}</td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ============================================================ */}
                        {/* VARIATIONS */}
                        {/* ============================================================ */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-black uppercase tracking-wide">
                                Variations
                            </h3>
                            <div className="overflow-hidden rounded-lg">
                                <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '3%' }} />
                                        <col />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '7%' }} />
                                        <col style={{ width: '14%' }} />
                                        <col style={{ width: '14%' }} />
                                        <col style={{ width: '14%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)]">
                                            <th className="px-2 py-2.5 text-left text-black font-medium" />
                                            <th className="px-4 py-2.5 text-left text-black font-medium">Description</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">Approved ($)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium">(%)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">Completed ($)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">Less Prior ($)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">This Claim ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredVariations.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-4 text-center text-black/60 text-sm">
                                                    No variations
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {filteredVariations.map((v) => {
                                                    const isApproved = v.status === 'Approved';
                                                    const approvedAmt = isApproved ? v.amountApprovedCents : 0;
                                                    const vSums = sumInvoicesForVariation(filteredInvoices, v.id, selectedMonth);
                                                    const vCompleted = vSums.claimedToDateCents;
                                                    const vLessPrior = vCompleted - vSums.currentMonthCents;
                                                    const vThisClaim = vSums.currentMonthCents;

                                                    return (
                                                        <tr key={v.id}>
                                                            <td className="px-4 py-2.5 text-black/60" />
                                                            <td className="px-4 py-2.5 text-black">
                                                                <span className="font-medium">{v.variationNumber}</span>
                                                                <span className="mx-1">-</span>
                                                                {v.description}
                                                                {!isApproved && (
                                                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                                                        Forecast
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className={tdRight + ' text-black'}>
                                                                {isApproved ? formatCurrency(approvedAmt) : '—'}
                                                            </td>
                                                            <td className={tdRight + ' text-black/60'}>
                                                                {approvedAmt > 0 ? completionPct(vCompleted, approvedAmt) : '—'}
                                                            </td>
                                                            <td className={tdRight + ' text-black'}>
                                                                {vCompleted > 0 ? formatCurrency(vCompleted) : '—'}
                                                            </td>
                                                            <td className={tdRight + ' text-black'}>
                                                                {vCompleted > 0 ? formatCurrency(vLessPrior) : '—'}
                                                            </td>
                                                            <td className={tdRight + ' text-black'}>
                                                                {vThisClaim > 0 ? formatCurrency(vThisClaim) : '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* SUB TOTAL */}
                                                <tr className="border-t border-[var(--color-border)]">
                                                    <td className="px-4 py-2.5" />
                                                    <td className="px-4 py-2.5 text-black font-semibold">SUB TOTAL ($)</td>
                                                    <td className={tdRight + ' text-black font-semibold'}>{formatCurrency(variationSubtotal.approved)}</td>
                                                    <td className={tdRight} />
                                                    <td className={tdRight + ' text-black font-semibold'}>{formatCurrency(variationSubtotal.completedToDate)}</td>
                                                    <td className={tdRight + ' text-black font-semibold'}>{formatCurrency(variationSubtotal.lessPrior)}</td>
                                                    <td className={tdRight + ' text-black font-semibold'}>{formatCurrency(variationSubtotal.thisClaim)}</td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ============================================================ */}
                        {/* ADJUSTED CONTRACT SUM / TOTALS */}
                        {/* ============================================================ */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-black uppercase tracking-wide">
                                Adjusted Contract Sum
                            </h3>
                            <div className="overflow-hidden rounded-lg">
                                <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '3%' }} />
                                        <col />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '7%' }} />
                                        <col style={{ width: '14%' }} />
                                        <col style={{ width: '14%' }} />
                                        <col style={{ width: '14%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)]">
                                            <th className="px-2 py-2.5 text-left text-black font-medium" />
                                            <th className="px-4 py-2.5 text-left text-black font-medium" />
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">Total ($)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium">(%)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">Completed ($)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">Less Prior ($)</th>
                                            <th className="px-2 py-2.5 text-right text-black font-medium whitespace-nowrap">This Claim ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t border-[var(--color-border)]">
                                            <td className="px-4 py-2.5" />
                                            <td className="px-4 py-2.5 text-black font-bold">TOTAL (EXC GST)</td>
                                            <td className={tdRight + ' text-black font-bold'}>{formatCurrency(adjustedTotal.grandTotalLet)}</td>
                                            <td className={tdRight + ' text-black/60'}>
                                                {completionPct(adjustedTotal.grandCompletedToDate, adjustedTotal.grandTotalLet)}
                                            </td>
                                            <td className={tdRight + ' text-black font-bold'}>{formatCurrency(adjustedTotal.grandCompletedToDate)}</td>
                                            <td className={tdRight + ' text-black font-bold'}>{formatCurrency(adjustedTotal.grandLessPrior)}</td>
                                            <td className={tdRight + ' text-black font-bold'}>{formatCurrency(adjustedTotal.grandThisClaim)}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* GST Summary - right-aligned block */}
                                <div className="flex justify-end p-4 border-t border-[var(--color-border)]">
                                    <table className="text-sm">
                                        <tbody>
                                            <tr>
                                                <td className="pr-8 py-1.5 text-black/60 font-medium">TOTAL (EXC GST)</td>
                                                <td className="text-right py-1.5 tabular-nums font-semibold text-black">
                                                    {formatCurrency(adjustedTotal.totalExGst)}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="pr-8 py-1.5 text-black/60 font-medium">GST ($)</td>
                                                <td className="text-right py-1.5 tabular-nums text-black">
                                                    {formatCurrency(adjustedTotal.gst)}
                                                </td>
                                            </tr>
                                            <tr className="border-t border-[var(--color-border)]">
                                                <td className="pr-8 py-1.5 text-black font-bold">TOTAL (INC GST)</td>
                                                <td className="text-right py-1.5 tabular-nums font-bold text-black">
                                                    {formatCurrency(adjustedTotal.totalIncGst)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ============================================================ */}
                        {/* PAYMENT LIST */}
                        {/* ============================================================ */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-black uppercase tracking-wide">
                                Payment List
                            </h3>
                            <div className="overflow-hidden rounded-lg">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)]">
                                            <th className="px-4 py-2.5 text-left text-black font-medium w-[80px]">Period</th>
                                            <th className="px-4 py-2.5 text-left text-black font-medium w-[60px]">Claim</th>
                                            <th className="px-4 py-2.5 text-left text-black font-medium w-[100px]">Invoice No</th>
                                            <th className="px-4 py-2.5 text-left text-black font-medium">Invoice Date</th>
                                            <th className="px-4 py-2.5 text-left text-black font-medium w-[90px]">Allocation</th>
                                            <th className="px-4 py-2.5 text-right text-black font-medium min-w-[110px]">Value ($)</th>
                                            <th className="px-4 py-2.5 text-right text-black font-medium min-w-[100px]">GST ($)</th>
                                            <th className="px-4 py-2.5 text-right text-black font-medium min-w-[110px]">Total ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentList.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-4 text-center text-black/60 text-sm">
                                                    No payments recorded
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {paymentList.map((inv, idx) => (
                                                    <tr key={inv.id}>
                                                        <td className="px-4 py-2.5 text-black">
                                                            {formatPeriodShort(inv.periodYear, inv.periodMonth)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-black">
                                                            {String(idx + 1).padStart(2, '0')}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-black">
                                                            {inv.invoiceNumber}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-black">
                                                            {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-AU') : '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-black">
                                                            {inv.variation ? (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                                                                    {inv.variation.variationNumber}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-black/40">Contract</span>
                                                            )}
                                                        </td>
                                                        <td className={tdRight + ' text-black'}>{formatCurrency(inv.amountCents)}</td>
                                                        <td className={tdRight + ' text-black'}>{formatCurrency(inv.gstCents)}</td>
                                                        <td className={tdRight + ' text-black'}>{formatCurrency(inv.amountCents + inv.gstCents)}</td>
                                                    </tr>
                                                ))}
                                                {/* TOTAL */}
                                                <tr className="border-t border-[var(--color-border)]">
                                                    <td className="px-4 py-2.5 text-black font-bold">TOTAL</td>
                                                    <td className="px-4 py-2.5" />
                                                    <td className="px-4 py-2.5" />
                                                    <td className="px-4 py-2.5" />
                                                    <td className="px-4 py-2.5" />
                                                    <td className={tdRight + ' text-black font-bold'}>{formatCurrency(paymentListTotal.amountExGst)}</td>
                                                    <td className={tdRight + ' text-black font-bold'}>{formatCurrency(paymentListTotal.gst)}</td>
                                                    <td className={tdRight + ' text-black font-bold'}>{formatCurrency(paymentListTotal.amountIncGst)}</td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
