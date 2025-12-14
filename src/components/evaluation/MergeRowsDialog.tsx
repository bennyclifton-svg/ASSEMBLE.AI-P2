/**
 * T094-T097: MergeRowsDialog Component
 * Dialog for merging selected evaluation rows
 * Feature 011 - Evaluation Report - User Story 7
 */

'use client';

import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Merge } from 'lucide-react';
import type { EvaluationRow, EvaluationFirm } from '@/types/evaluation';

interface MergeRowsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedRows: EvaluationRow[];
    firms: EvaluationFirm[];
    onConfirm: (newDescription: string) => Promise<void>;
}

export function MergeRowsDialog({
    open,
    onOpenChange,
    selectedRows,
    firms,
    onConfirm,
}: MergeRowsDialogProps) {
    const [description, setDescription] = useState('');
    const [isMerging, setIsMerging] = useState(false);

    // Initialize description with first row's description when dialog opens
    useMemo(() => {
        if (open && selectedRows.length > 0 && !description) {
            setDescription(selectedRows[0].description || '');
        }
    }, [open, selectedRows, description]);

    // Reset description when dialog closes
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setDescription('');
        }
        onOpenChange(newOpen);
    };

    // Calculate summed amounts per firm
    const firmTotals = useMemo(() => {
        const totals: Map<string, number> = new Map();

        // Initialize with 0 for all firms
        firms.forEach(firm => totals.set(firm.id, 0));

        // Sum amounts from selected rows
        for (const row of selectedRows) {
            for (const cell of row.cells || []) {
                const current = totals.get(cell.firmId) || 0;
                totals.set(cell.firmId, current + (cell.amountCents || 0));
            }
        }

        return totals;
    }, [selectedRows, firms]);

    // Format currency
    const formatCurrency = (cents: number): string => {
        const dollars = cents / 100;
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(dollars);
    };

    // Handle confirm
    const handleConfirm = async () => {
        if (!description.trim()) return;

        setIsMerging(true);
        try {
            await onConfirm(description.trim());
            handleOpenChange(false);
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg bg-[#1e1e1e] border-[#3e3e42]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#cccccc]">
                        <Merge className="w-4 h-4" />
                        Merge {selectedRows.length} Rows
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Selected rows preview */}
                    <div className="space-y-2">
                        <Label className="text-sm text-[#858585]">Selected Rows</Label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                            {selectedRows.map((row, index) => (
                                <div
                                    key={row.id}
                                    className="text-xs text-[#cccccc] bg-[#252526] px-2 py-1 rounded"
                                >
                                    {index + 1}. {row.description || '(no description)'}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Merged amounts per firm */}
                    <div className="space-y-2">
                        <Label className="text-sm text-[#858585]">Merged Amounts</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {firms.filter(f => f.shortlisted).map(firm => (
                                <div
                                    key={firm.id}
                                    className="flex justify-between text-xs bg-[#252526] px-2 py-1 rounded"
                                >
                                    <span className="text-[#858585] truncate">{firm.companyName}</span>
                                    <span className="text-[#4ec9b0] font-medium">
                                        {formatCurrency(firmTotals.get(firm.id) || 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* New description input */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm text-[#858585]">
                            Merged Row Description
                        </Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter description for merged row"
                            className="bg-[#252526] border-[#3e3e42] text-[#cccccc]"
                            autoFocus
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => handleOpenChange(false)}
                        disabled={isMerging}
                        className="text-[#858585] hover:text-[#cccccc]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isMerging || !description.trim()}
                        className="bg-[#0e639c] hover:bg-[#1177bb] text-white"
                    >
                        {isMerging ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Merging...
                            </>
                        ) : (
                            <>
                                <Merge className="w-4 h-4 mr-2" />
                                Merge Rows
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
