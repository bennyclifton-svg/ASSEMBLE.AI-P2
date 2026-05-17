'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRightToLine, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { EvaluationCellValueType, EvaluationTableType } from '@/types/evaluation';

export interface CostPlanPushRow {
    id: string;
    tableType: EvaluationTableType;
    description: string;
    amountCents: number;
    valueType: EvaluationCellValueType;
    defaultSelected: boolean;
}

export interface CostPlanPushSection {
    id: EvaluationTableType;
    title: string;
    rows: CostPlanPushRow[];
}

interface CostPlanPushDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    firmName: string;
    sections: CostPlanPushSection[];
    onConfirm: (rowIds: string[]) => Promise<void>;
}

function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(dollars);
}

function formatCellValue(row: CostPlanPushRow): string {
    if (row.valueType === 'included') return 'Incl.';
    if (row.valueType === 'assumed_included') return 'Assumed';
    if (row.valueType === 'excluded') return 'Excluded';
    if (row.valueType === 'tbc') return 'TBC';
    if (row.valueType === 'na') return 'N/A';
    return formatCurrency(row.amountCents);
}

export function CostPlanPushDialog({
    open,
    onOpenChange,
    firmName,
    sections,
    onConfirm,
}: CostPlanPushDialogProps) {
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const allRows = useMemo(
        () => sections.flatMap(section => section.rows),
        [sections]
    );

    useEffect(() => {
        if (!open) return;
        setSelectedRowIds(new Set(allRows.filter(row => row.defaultSelected).map(row => row.id)));
    }, [open, allRows]);

    const selectedRows = useMemo(
        () => allRows.filter(row => selectedRowIds.has(row.id)),
        [allRows, selectedRowIds]
    );

    const selectedTotal = selectedRows.reduce((sum, row) => sum + row.amountCents, 0);

    const toggleRow = (rowId: string, checked: boolean) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(rowId);
            } else {
                next.delete(rowId);
            }
            return next;
        });
    };

    const toggleSection = (section: CostPlanPushSection, checked: boolean) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            for (const row of section.rows) {
                if (checked) {
                    next.add(row.id);
                } else {
                    next.delete(row.id);
                }
            }
            return next;
        });
    };

    const handleConfirm = async () => {
        if (selectedRowIds.size === 0) return;
        setIsSubmitting(true);
        try {
            await onConfirm(Array.from(selectedRowIds));
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-[var(--color-bg-primary)] border-[var(--color-border)]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
                        <ArrowRightToLine className="h-4 w-4" />
                        Push Awarded Price to Cost Plan
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 text-xs">
                        <div>
                            <div className="font-semibold text-[var(--color-text-primary)]">{firmName}</div>
                            <div className="text-[var(--color-text-muted)]">
                                Existing cost plan lines for this package will be replaced.
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-semibold text-[var(--role-money)] font-mono">
                                {formatCurrency(selectedTotal)}
                            </div>
                            <div className="text-[var(--color-text-muted)]">
                                {selectedRows.length} selected
                            </div>
                        </div>
                    </div>

                    {allRows.length === 0 ? (
                        <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                            No awarded pricing rows available.
                        </div>
                    ) : (
                        <div className="max-h-[420px] overflow-y-auto space-y-4 pr-1">
                            {sections.map(section => {
                                const sectionSelectedCount = section.rows.filter(row => selectedRowIds.has(row.id)).length;
                                const checked = sectionSelectedCount === section.rows.length && section.rows.length > 0
                                    ? true
                                    : sectionSelectedCount > 0
                                        ? 'indeterminate'
                                        : false;

                                if (section.rows.length === 0) return null;

                                return (
                                    <div key={section.id} className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={(value) => toggleSection(section, value === true)}
                                                className="h-3.5 w-3.5"
                                            />
                                            {section.title}
                                        </label>

                                        <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                                            {section.rows.map(row => {
                                                // Only tint truly monetary rows peach — placeholder rows
                                                // ("Incl.", "TBC", "N/A", etc.) stay neutral so the role
                                                // colour keeps meaning "this is a $ value".
                                                const isMonetary = !['included', 'assumed_included', 'excluded', 'tbc', 'na'].includes(row.valueType);
                                                return (
                                                <label
                                                    key={row.id}
                                                    className="grid grid-cols-[24px_minmax(0,1fr)_96px] items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-bg-secondary)]"
                                                >
                                                    <Checkbox
                                                        checked={selectedRowIds.has(row.id)}
                                                        onCheckedChange={(value) => toggleRow(row.id, value === true)}
                                                    />
                                                    <span className="truncate text-[var(--color-text-primary)]">
                                                        {row.description || '(no description)'}
                                                    </span>
                                                    <span
                                                        className="text-right font-mono text-xs"
                                                        style={{ color: isMonetary ? 'var(--role-money)' : 'var(--color-text-primary)' }}
                                                    >
                                                        {formatCellValue(row)}
                                                    </span>
                                                </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSubmitting || selectedRowIds.size === 0}
                        className="bg-[var(--color-text-primary)] text-white hover:bg-[var(--color-text-secondary)]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Pushing...
                            </>
                        ) : (
                            <>
                                <ArrowRightToLine className="mr-2 h-4 w-4" />
                                Push to Cost Plan
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
